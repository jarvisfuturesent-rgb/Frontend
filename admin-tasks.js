// PULSE — Admin Task Management

document.addEventListener(
    "DOMContentLoaded",
    loadAdminTasks
);

async function loadAdminTasks() {
    const container =
        document.getElementById(
            "adminTasksContent"
        );

    if (!container) return;

    container.innerHTML =
        "<p>Loading task management...</p>";

    const admin =
        await getCurrentAdmin();

    if (!admin) {
        container.innerHTML = `
            <div class="panel">
                <h3>Admin Access Required</h3>
                <p>
                    You must be signed in
                    as an administrator.
                </p>
            </div>
        `;
        return;
    }

    try {
        const { data: tasks, error } =
            await window.supabaseClient
                .from("tasks")
                .select("*")
                .order("id", {
                    ascending: false
                });

        if (error) {
            throw error;
        }

        container.innerHTML = `
            <h2>Task Management</h2>

            <form id="createTaskForm">

                <label for="taskTitle">
                    Task Title
                </label>

                <input
                    type="text"
                    id="taskTitle"
                    required
                >

                <label for="taskDescription">
                    Task Description
                </label>

                <textarea
                    id="taskDescription"
                ></textarea>

                <label for="taskPoints">
                    Points
                </label>

                <input
                    type="number"
                    id="taskPoints"
                    min="0"
                    value="25"
                    required
                >

                <button type="submit">
                    Create Task
                </button>

                <p id="taskMessage"></p>

            </form>

            <hr>

            <h3>Existing Tasks</h3>

            <div id="taskList">
                ${
                    !tasks || tasks.length === 0
                        ? "<p>No tasks found.</p>"
                        : tasks.map(renderTask).join("")
                }
            </div>
        `;

        document
            .getElementById("createTaskForm")
            .addEventListener(
                "submit",
                createTask
            );

        document
            .querySelectorAll(".task-status")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => toggleTaskStatus(
                        button.dataset.id,
                        button.dataset.status
                    )
                );
            });

    } catch (error) {
        console.error(
            "Admin task loading error:",
            error
        );

        container.innerHTML = `
            <div class="panel">
                <h3>
                    Unable to Load Tasks
                </h3>

                <p>
                    ${escapeHTML(error.message)}
                </p>
            </div>
        `;
    }
}


function renderTask(task) {
    const active =
        task.status === "active";

    return `
        <div class="panel">

            <h3>
                ${escapeHTML(task.title)}
            </h3>

            <p>
                ${escapeHTML(
                    task.description || ""
                )}
            </p>

            <p>
                <strong>Points:</strong>
                ${escapeHTML(task.points)}
            </p>

            <p>
                <strong>Status:</strong>
                ${escapeHTML(
                    task.status || ""
                )}
            </p>

            <button
                class="task-status"
                data-id="${escapeHTML(task.id)}"
                data-status="${
                    active ? "paused" : "active"
                }"
            >
                ${
                    active
                        ? "Pause Task"
                        : "Activate Task"
                }
            </button>

        </div>
    `;
}


async function createTask(event) {
    event.preventDefault();

    const title =
        document
            .getElementById("taskTitle")
            .value
            .trim();

    const description =
        document
            .getElementById("taskDescription")
            .value
            .trim();

    const points =
        Number(
            document
                .getElementById("taskPoints")
                .value
        );

    const message =
        document.getElementById(
            "taskMessage"
        );

    if (!title) {
        message.textContent =
            "Enter a task title.";
        return;
    }

    if (!Number.isFinite(points) || points < 0) {
        message.textContent =
            "Enter valid points.";
        return;
    }

    message.textContent =
        "Creating task...";

    try {
        const { error } =
            await window.supabaseClient
                .from("tasks")
                .insert({
                    title: title,
                    description: description,
                    points: points,
                    status: "active"
                });

        if (error) {
            throw error;
        }

        message.textContent =
            "Task created successfully.";

        await loadAdminTasks();

    } catch (error) {
        console.error(
            "Create task error:",
            error
        );

        message.textContent =
            error.message;
    }
}


async function toggleTaskStatus(
    id,
    status
) {
    try {
        const { error } =
            await window.supabaseClient
                .from("tasks")
                .update({
                    status: status
                })
                .eq("id", id);

        if (error) {
            throw error;
        }

        await loadAdminTasks();

    } catch (error) {
        console.error(
            "Task status error:",
            error
        );

        alert(
            "Unable to update task: " +
            error.message
        );
    }
}


async function getCurrentAdmin() {
    const user =
        await getCurrentUser();

    if (!user) return null;

    const { data: profile, error } =
        await window.supabaseClient
            .from("profiles")
            .select("id, name, role")
            .eq("id", user.id)
            .maybeSingle();

    if (error) {
        console.error(
            "Admin profile check error:",
            error
        );

        return null;
    }

    if (
        !profile ||
        profile.role !== "admin"
    ) {
        return null;
    }

    return {
        user,
        profile
    };
}


function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}