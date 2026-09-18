// PULSE — Dashboard

document.addEventListener("DOMContentLoaded", loadDashboard);

async function loadDashboard() {
    const container =
        document.getElementById("dashboardContent");

    if (!container) return;

    container.innerHTML =
        "<p>Loading dashboard...</p>";

    const user = await requireLogin();

    if (!user) return;

    try {
        const { data: profile, error: profileError } =
            await window.supabaseClient
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        const { count, error: submissionError } =
            await window.supabaseClient
                .from("task_submissions")
                .select("*", {
                    count: "exact",
                    head: true
                })
                .eq("user_id", user.id);

        if (submissionError) {
            throw submissionError;
        }

        const name =
            profile?.name ||
            user.email ||
            "PULSE User";

        const points =
            profile?.points ??
            profile?.balance ??
            0;

        container.innerHTML = `
            <h2>Welcome, ${escapeHTML(name)}</h2>

            <div class="panel">
                <h3>Points</h3>
                <p>${escapeHTML(points)}</p>
            </div>

            <div class="panel">
                <h3>Submissions</h3>
                <p>${count ?? 0}</p>
            </div>

            <p>
                <a href="tasks.html">
                    View Available Tasks
                </a>
            </p>

            <p>
                <a href="surveys.html">
                    View Surveys
                </a>
            </p>

            <p>
                <a href="submissions.html">
                    View My Submissions
                </a>
            </p>
        `;

    } catch (error) {
        console.error(
            "Dashboard loading error:",
            error
        );

        container.innerHTML = `
            <div class="panel">
                <h3>Dashboard Error</h3>
                <p>
                    Unable to load your dashboard.
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