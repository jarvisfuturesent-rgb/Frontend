/* =========================
   PULSE ADMIN PANEL
   Task + Reward Management
========================= */

function adminEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================
   CHECK ADMIN
========================= */

async function isCurrentUserAdmin() {
  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return false;

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin";
}


/* =========================
   LOAD TASKS
========================= */

async function loadAdminTasks() {
  const box = document.getElementById("adminTasks");

  if (!box) return;

  const { data: tasks, error } = await db
    .from("tasks")
    .select(`
      id,
      title,
      description,
      points,
      status,
      business_id,
      category_id,
      created_at
    `)
    .order("id", { ascending: false });

  if (error) {
    box.innerHTML = `
      <div class="empty-card">
        Unable to load tasks.
        <small>${adminEscape(error.message)}</small>
      </div>
    `;
    return;
  }

  if (!tasks || tasks.length === 0) {
    box.innerHTML = `
      <div class="empty-card">
        No tasks found.
      </div>
    `;
    return;
  }

  box.innerHTML = tasks.map(task => `
    <div class="history-row">

      <div>
        <strong>${adminEscape(task.title)}</strong>

        <small>
          ${task.points} points
        </small>

        <small>
          Status: ${adminEscape(task.status)}
        </small>

        <small>
          Task ID: ${task.id}
        </small>
      </div>

      <div style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      ">

        <button
          class="outline-button admin-task-edit"
          data-id="${task.id}"
          type="button">
          Edit
        </button>

        ${
          task.status !== "active"
            ? `
              <button
                class="gradient-button admin-task-status"
                data-id="${task.id}"
                data-status="active"
                type="button">
                Activate
              </button>
            `
            : ""
        }

        ${
          task.status === "active"
            ? `
              <button
                class="outline-button admin-task-status"
                data-id="${task.id}"
                data-status="paused"
                type="button">
                Pause
              </button>
            `
            : ""
        }

        ${
          task.status !== "completed"
            ? `
              <button
                class="outline-button admin-task-status"
                data-id="${task.id}"
                data-status="completed"
                type="button">
                Complete
              </button>
            `
            : ""
        }

      </div>

    </div>
  `).join("");


  /* =========================
     STATUS BUTTONS
  ========================= */

  box
    .querySelectorAll(".admin-task-status")
    .forEach(button => {

      button.addEventListener("click", async () => {

        const taskId = Number(button.dataset.id);
        const newStatus = button.dataset.status;

        button.disabled = true;

        const { error } = await db
          .from("tasks")
          .update({
            status: newStatus
          })
          .eq("id", taskId);

        if (error) {

          alert(error.message);

          button.disabled = false;

          return;
        }

        await loadAdminTasks();

        if (typeof refresh === "function") {
          await refresh();
        }

      });

    });


  /* =========================
     EDIT BUTTONS
  ========================= */

  box
    .querySelectorAll(".admin-task-edit")
    .forEach(button => {

      button.addEventListener("click", async () => {

        const taskId = Number(button.dataset.id);

        const task = tasks.find(
          item => Number(item.id) === taskId
        );

        if (!task) return;


        const title = prompt(
          "Task title:",
          task.title
        );

        if (title === null) return;


        const description = prompt(
          "Task description:",
          task.description || ""
        );

        if (description === null) return;


        const pointsText = prompt(
          "Task points:",
          task.points
        );

        if (pointsText === null) return;


        const points = Number(pointsText);

        if (
          !Number.isInteger(points) ||
          points <= 0
        ) {

          alert(
            "Points must be a whole number greater than 0."
          );

          return;
        }


        if (!title.trim()) {

          alert(
            "Task title cannot be empty."
          );

          return;
        }


        const { error } = await db
          .from("tasks")
          .update({
            title: title.trim(),
            description: description.trim(),
            points
          })
          .eq("id", taskId);


        if (error) {

          alert(error.message);

          return;
        }


        await loadAdminTasks();

      });

    });

}


/* =========================
   CREATE TASK
========================= */

async function createAdminTask() {

  const titleInput =
    document.getElementById("adminTaskTitle");

  const descriptionInput =
    document.getElementById("adminTaskDescription");

  const pointsInput =
    document.getElementById("adminTaskPoints");

  const statusInput =
    document.getElementById("adminTaskStatus");

  const message =
    document.getElementById("adminTaskMsg");


  if (
    !titleInput ||
    !pointsInput ||
    !message
  ) {
    return;
  }


  const title =
    titleInput.value.trim();

  const description =
    descriptionInput?.value.trim() || "";

  const points =
    Number(pointsInput.value);

  const status =
    statusInput?.value || "draft";


  if (!title) {

    message.textContent =
      "Enter a task title.";

    return;
  }


  if (
    !Number.isInteger(points) ||
    points <= 0
  ) {

    message.textContent =
      "Points must be a whole number greater than 0.";

    return;
  }


  const { error } = await db
    .from("tasks")
    .insert({
      title,
      description,
      points,
      status
    });


  if (error) {

    message.textContent =
      error.message;

    return;
  }


  titleInput.value = "";

  if (descriptionInput) {
    descriptionInput.value = "";
  }

  pointsInput.value = "";

  message.textContent =
    "Task created successfully.";


  await loadAdminTasks();

}


/* =========================
   REWARD MANAGEMENT
========================= */

async function loadAdminRedemptions() {

  const box =
    document.getElementById("adminRedemptions");

  if (!box) return;


  const { data, error } = await db
    .from("redemption_requests")
    .select(`
      id,
      user_id,
      points_requested,
      reward_type,
      status,
      created_at
    `)
    .eq("status", "pending")
    .order("created_at", {
      ascending: false
    });


  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load pending rewards.

        <small>
          ${adminEscape(error.message)}
        </small>
      </div>
    `;

    return;
  }


  if (!data || data.length === 0) {

    box.innerHTML = `
      <div class="empty-card">
        <strong>
          No pending rewards.
        </strong>
      </div>
    `;

    return;
  }


  box.innerHTML = data.map(request => `

    <div class="history-row">

      <div>

        <strong>
          ${request.points_requested} points
        </strong>

        <small>
          Request #${request.id}
        </small>

        <small>
          User: ${adminEscape(request.user_id)}
        </small>

      </div>


      <button
        class="gradient-button admin-approve"
        data-id="${request.id}"
        type="button">

        Approve

      </button>

    </div>

  `).join("");


  box
    .querySelectorAll(".admin-approve")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const requestId =
            Number(button.dataset.id);


          button.disabled = true;

          button.textContent =
            "Approving...";


          const { error } =
            await db.rpc(
              "process_redemption_request",
              {
                p_request_id: requestId
              }
            );


          if (error) {

            button.disabled = false;

            button.textContent =
              "Approve";

            alert(error.message);

            return;
          }


          alert(
            `Reward request #${requestId} approved.`
          );


          await loadAdminRedemptions();


          if (
            typeof refresh === "function"
          ) {
            await refresh();
          }

        }
      );

    });

}


/* =========================
   BUILD ADMIN PANEL
========================= */

async function loadAdminPanel() {

  const admin =
    await isCurrentUserAdmin();

  if (!admin) return;


  let panel =
    document.getElementById("adminPanel");


  if (!panel) {

    panel =
      document.createElement("section");

    panel.id =
      "adminPanel";

    panel.className =
      "panel";


    panel.innerHTML = `

      <div class="panel-heading">

        <h2>

          <span class="blue-icon">
            ⚙
          </span>

          Admin Panel

        </h2>

      </div>


      <div class="reward-box">

        <h3>
          Task Management
        </h3>


        <input
          id="adminTaskTitle"
          type="text"
          placeholder="Task title"
        >


        <textarea
          id="adminTaskDescription"
          rows="3"
          placeholder="Task description"
        ></textarea>


        <input
          id="adminTaskPoints"
          type="number"
          min="1"
          placeholder="Points"
        >


        <select
          id="adminTaskStatus">

          <option value="draft">
            Draft
          </option>

          <option value="active">
            Active
          </option>

          <option value="paused">
            Paused
          </option>

          <option value="completed">
            Completed
          </option>

        </select>


        <button
          id="adminCreateTask"
          class="gradient-button"
          type="button">

          Create Task

        </button>


        <p
          id="adminTaskMsg"
          class="status">
        </p>

      </div>


      <div id="adminTasks">

        <div class="loading-box">
          Loading tasks...
        </div>

      </div>


      <div
        class="panel-heading"
        style="margin-top:20px">

        <h2>

          <span class="blue-icon">
            🎁
          </span>

          Pending Rewards

        </h2>

      </div>


      <div id="adminRedemptions">

        <div class="loading-box">
          Loading pending rewards...
        </div>

      </div>

    `;


    const dashboard =
      document.getElementById(
        "dashboard"
      );


    if (dashboard) {

      dashboard.prepend(panel);

    }


    const createButton =
      document.getElementById(
        "adminCreateTask"
      );


    if (createButton) {

      createButton.addEventListener(
        "click",
        createAdminTask
      );

    }

  }


  await loadAdminTasks();

  await loadAdminRedemptions();

}


/* =========================
   START ADMIN
========================= */

window.addEventListener(
  "load",
  () => {

    setTimeout(
      loadAdminPanel,
      500
    );

  }
);


if (typeof db !== "undefined") {

  db.auth.onAuthStateChange(
    () => {

      setTimeout(
        loadAdminPanel,
        300
      );

    }
  );

}