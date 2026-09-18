// PULSE — Earnings & Balance

document.addEventListener("DOMContentLoaded", loadEarnings);

async function loadEarnings() {
    const container =
        document.getElementById("earningsContent");

    if (!container) return;

    container.innerHTML =
        "<p>Loading points and balance...</p>";

    const user = await requireLogin();

    if (!user) return;

    try {
        const { data: profile, error } =
            await window.supabaseClient
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();

        if (error) {
            throw error;
        }

        const points =
            profile?.points ??
            profile?.balance ??
            0;

        container.innerHTML = `
            <div class="panel">
                <h2>Your Points</h2>

                <p>
                    <strong>
                        ${escapeHTML(points)}
                    </strong>
                </p>

                <p>
                    Points are earned by completing
                    eligible PULSE tasks and surveys.
                </p>
            </div>

            <div class="panel">
                <h3>Account</h3>

                <p>
                    ${escapeHTML(
                        user.email || ""
                    )}
                </p>
            </div>
        `;

    } catch (error) {
        console.error(
            "Earnings loading error:",
            error
        );

        container.innerHTML = `
            <div class="panel">
                <h3>Unable to Load Balance</h3>
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