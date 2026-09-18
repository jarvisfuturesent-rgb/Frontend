// PULSE — Notifications
// Controls notifications.html only.

document.addEventListener(
    "DOMContentLoaded",
    loadNotifications
);

async function loadNotifications() {
    const container =
        document.getElementById("notifications");

    if (!container) {
        console.error(
            "notifications element not found."
        );
        return;
    }

    container.innerHTML =
        "<p>Loading notifications...</p>";

    const user = await requireLogin();

    if (!user) return;

    try {
        const { data, error } =
            await window.supabaseClient
                .from("notifications")
                .select(
                    "id, title, message, type, read, created_at"
                )
                .eq("user_id", user.id)
                .order("created_at", {
                    ascending: false
                });

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="panel">
                    <p>
                        You have no notifications.
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(
            notification => `
                <div class="panel">

                    <h3>
                        ${escapeHTML(
                            notification.title ||
                            "PULSE Notification"
                        )}
                    </h3>

                    <p>
                        ${escapeHTML(
                            notification.message || ""
                        )}
                    </p>

                    <p>
                        <small>
                            ${formatDate(
                                notification.created_at
                            )}
                        </small>
                    </p>

                    ${
                        notification.read === false
                            ? `
                                <button
                                    class="mark-read"
                                    data-id="${escapeHTML(
                                        notification.id
                                    )}"
                                >
                                    Mark as Read
                                </button>
                            `
                            : `
                                <p>
                                    <small>
                                        Read
                                    </small>
                                </p>
                            `
                    }

                </div>
            `
        ).join("");

        document
            .querySelectorAll(".mark-read")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => markAsRead(
                        button.dataset.id
                    )
                );
            });

    } catch (error) {
        console.error(
            "Notification loading error:",
            error
        );

        container.innerHTML = `
            <div class="panel">
                <h3>
                    Unable to Load Notifications
                </h3>

                <p>
                    Please try again later.
                </p>
            </div>
        `;
    }
}


async function markAsRead(id) {
    try {
        const user = await requireLogin();

        if (!user) return;

        const { error } =
            await window.supabaseClient
                .from("notifications")
                .update({
                    read: true
                })
                .eq("id", id)
                .eq("user_id", user.id);

        if (error) {
            throw error;
        }

        await loadNotifications();

    } catch (error) {
        console.error(
            "Mark notification read error:",
            error
        );

        alert(
            "Unable to mark notification as read."
        );
    }
}


function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return escapeHTML(
        date.toLocaleString()
    );
}


function escapeHTML(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}