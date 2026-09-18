// PULSE — Profile & Account

document.addEventListener(
    "DOMContentLoaded",
    loadProfile
);

async function loadProfile() {
    const container =
        document.getElementById(
            "profileContent"
        );

    if (!container) return;

    container.innerHTML =
        "<p>Loading profile...</p>";

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

        const name =
            profile?.name || "";

        container.innerHTML = `
            <form id="profileForm">

                <label for="profileName">
                    Name
                </label>

                <input
                    type="text"
                    id="profileName"
                    value="${escapeHTML(name)}"
                    autocomplete="name"
                >

                <label>
                    Email
                </label>

                <input
                    type="email"
                    value="${escapeHTML(
                        user.email || ""
                    )}"
                    disabled
                >

                <button type="submit">
                    Save Profile
                </button>

                <p id="profileMessage"></p>

            </form>

            <hr>

            <button
                type="button"
                id="signOutButton"
            >
                Sign Out
            </button>
        `;

        document
            .getElementById("profileForm")
            .addEventListener(
                "submit",
                saveProfile
            );

        document
            .getElementById("signOutButton")
            .addEventListener(
                "click",
                signOut
            );

    } catch (error) {
        console.error(
            "Profile loading error:",
            error
        );

        container.innerHTML = `
            <div class="panel">
                <h3>
                    Unable to Load Profile
                </h3>

                <p>
                    Please try again later.
                </p>
            </div>
        `;
    }
}


async function saveProfile(event) {
    event.preventDefault();

    const name =
        document
            .getElementById("profileName")
            .value
            .trim();

    const message =
        document.getElementById(
            "profileMessage"
        );

    message.textContent =
        "Saving...";

    const user =
        await getCurrentUser();

    if (!user) return;

    try {
        const { error } =
            await window.supabaseClient
                .from("profiles")
                .upsert({
                    id: user.id,
                    name: name
                });

        if (error) {
            throw error;
        }

        message.textContent =
            "Profile saved successfully.";

    } catch (error) {
        console.error(
            "Profile save error:",
            error
        );

        message.textContent =
            error.message;
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