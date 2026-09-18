// PULSE — Available Tasks

document.addEventListener("DOMContentLoaded", loadTasks);

async function loadTasks() {
    const container =
        document.getElementById("tasksContent");

    if (!container) return;

    container.innerHTML =
        "<p>Loading available tasks...</p>";

    const user = await requireLogin();

    if (!user) return;

    try {
        const { data: tasks, error } =
            await window.supabaseClient
                .from("tasks")
                .select("*")
                .eq("status", "active")
                .order("id", {
                    ascending: false
                });

        if (error) {
            throw error;
        }

        if (!tasks || tasks.length === 0) {
            container.innerHTML =
                "<p>No tasks are currently available.</p>";
            return;
        }

        container.innerHTML = tasks.map(task => `
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
                    <strong>
                        Points:
                    </strong>
                    ${escapeHTML(task.points)}
                </p>

                <a href="surveys.html?task=${encodeURIComponent(task.id)}">
                    Start Task
                </a>
            </div>
        `).join("");

    } catch (error) {
        console.error(
            "Task loading error:",
            error
        );

        container.innerHTML = `
            <div class="panel">
                <h3>Unable to Load Tasks</h3>
                <p>
                    Please try again later.
                </p>
            </div>
        `;
    }
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
