// PULSE — Admin Task Management
// Controls admin-tasks.html only.

document.addEventListener("DOMContentLoaded", () => {
  loadAdminTasks();

  const form = document.getElementById("task-form");

  if (form) {
    form.addEventListener("submit", createTask);
  }
});

async function getCurrentAdmin() {
  if (!window.supabaseClient) {
    throw new Error("Supabase client is not available.");
  }

  const {
    data: { user },
    error: userError
  } = await window.supabaseClient.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } =
    await window.supabaseClient
      .from("profiles")
      .select("name, role")
      .eq("id", user.id)
      .single();

  if (profileError) {
    throw profileError;
  }

  if (!profile || profile.role !== "admin") {
    return null;
  }

  return user;
}

async function loadAdminTasks() {
  const list = document.getElementById("tasks-list");

  if (!list) {
    console.error("tasks-list element not found.");
    return;
  }

  list.innerHTML = "<p>Loading tasks...</p>";

  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      list.innerHTML = `
        <p>Access denied.</p>
        <a href="dashboard.html">Return to Dashboard</a>
      `;
      return;
    }

    const { data: tasks, error } =
      await window.supabaseClient
        .from("tasks")
        .select(`
          id,
          title,
          description,
          points,
          status,
          created_at
        `)
        .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!tasks || tasks.length === 0) {
      list.innerHTML = "<p>No tasks found.</p>";
      return;
    }

    list.innerHTML = tasks.map(renderTask).join("");

    document.querySelectorAll("[data-task-action]").forEach(button => {
      button.addEventListener("click", () => {
        const taskId = button.getAttribute("data-task-id");
        const action = button.getAttribute("data-task-action");

        if (action === "toggle") {
          toggleTaskStatus(taskId);
        }
      });
    });

  } catch (error) {
    console.error("Admin task loading error:", error);

    list.innerHTML = `
      <p>Unable to load tasks.</p>
      <p>Please try again.</p>
    `;
  }
}

function renderTask(task) {
  const status = task.status || "draft";

  let actionText = "Activate";
  let nextAction = "active";

  if (status === "active") {
    actionText = "Complete";
    nextAction = "completed";
  } else if (status === "completed") {
    actionText = "Reactivate";
    nextAction = "active";
  } else if (status === "paused") {
    actionText = "Reactivate";
    nextAction = "active";
  } else if (status === "draft") {
    actionText = "Activate";
    nextAction = "active";
  }

  return `
    <div class="task-card">
      <h3>${escapeHTML(task.title)}</h3>

      <p>${escapeHTML(task.description || "")}</p>

      <p>
        <strong>Points:</strong>
        ${Number(task.points)}
      </p>

      <p>
        <strong>Status:</strong>
        ${escapeHTML(status)}
      </p>

      <button
        type="button"
        data-task-action="toggle"
        data-task-id="${task.id}"
      >
        ${actionText}
      </button>
    </div>
  `;
}

async function createTask(event) {
  event.preventDefault();

  const titleInput = document.getElementById("task-title");
  const descriptionInput = document.getElementById("task-description");
  const pointsInput = document.getElementById("task-points");
  const completedInput = document.getElementById("task-completed");
  const message = document.getElementById("form-message");

  if (!titleInput || !descriptionInput || !pointsInput) {
    console.error("Task form elements are missing.");
    return;
  }

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const points = Number(pointsInput.value);
  const completed = completedInput ? completedInput.checked : false;

  if (!title) {
    showFormMessage("Enter a task title.", true);
    return;
  }

  if (!Number.isInteger(points) || points <= 0) {
    showFormMessage("Points must be a whole number greater than 0.", true);
    return;
  }

  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      showFormMessage("Access denied.", true);
      return;
    }

    if (message) {
      message.textContent = "Creating task...";
    }

    const status = completed ? "completed" : "active";

    const { error } =
      await window.supabaseClient
        .from("tasks")
        .insert({
          title,
          description,
          points,
          status
        });

    if (error) {
      throw error;
    }

    showFormMessage("Task created successfully.", false);

    const form = document.getElementById("task-form");

    if (form) {
      form.reset();
    }

    await loadAdminTasks();

  } catch (error) {
    console.error("Create task error:", error);

    showFormMessage(
      "Unable to create task. Please try again.",
      true
    );
  }
}

async function toggleTaskStatus(taskId) {
  if (!taskId) {
    return;
  }

  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      alert("Access denied.");
      return;
    }

    const { data: task, error: fetchError } =
      await window.supabaseClient
        .from("tasks")
        .select("id, status")
        .eq("id", taskId)
        .single();

    if (fetchError) {
      throw fetchError;
    }

    let newStatus = "active";

    if (task.status === "active") {
      newStatus = "completed";
    } else if (
      task.status === "completed" ||
      task.status === "paused" ||
      task.status === "draft"
    ) {
      newStatus = "active";
    }

    const { error: updateError } =
      await window.supabaseClient
        .from("tasks")
        .update({
          status: newStatus
        })
        .eq("id", taskId);

    if (updateError) {
      throw updateError;
    }

    await loadAdminTasks();

  } catch (error) {
    console.error("Update task status error:", error);

    alert("Unable to update the task. Please try again.");
  }
}

function showFormMessage(text, isError) {
  const message = document.getElementById("form-message");

  if (!message) {
    return;
  }

  message.textContent = text;

  if (isError) {
    message.setAttribute("data-error", "true");
  } else {
    message.removeAttribute("data-error");
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}