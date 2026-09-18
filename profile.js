// PULSE — Profile & Account
// Controls profile.html only.

document.addEventListener(
    "DOMContentLoaded",
    loadProfile
);


async function loadProfile() {

    const container =
        document.getElementById("profile");

    if (!container) {
        console.error(
            "profile element not found."
        );
        return;
    }

    container.innerHTML =
        "<p>Loading profile...</p>";

    const user = await requireLogin();

    if (!user) return;

    try {

        const { data: profile, error } =
            await window.supabaseClient
                .from("profiles")
                .select(
                    "id, name, points, role, created_at"
                )
                .eq("id", user.id)
                .maybeSingle();

        if (error) {
            throw error;
        }

        const name =
            profile?.name || "";

        const points =
            Number(profile?.points ?? 0);

        container.innerHTML = `

            <form id="profileForm">

                <label for="profileName">
                    Name
                </label>

                <input
                    type="text"
                    id="profileName"
                    value="${escapeHTML(name)}"
                    maxlength="100"
                    autocomplete="name"
                >

                <label for="profileEmail">
                    Email
                </label>

                <input
                    type="email"
                    id="profileEmail"
                    value="${escapeHTML(
                        user.email || ""
                    )}"
                    disabled
                >

                <p>
                    <strong>Points:</strong>
                    ${points}
                </p>

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

        const form =
            document.getElementById(
                "profileForm"
            );

        const signOutButton =
            document.getElementById(
                "signOutButton"
            );

        if (form) {
            form.addEventListener(
                "submit",
                saveProfile
            );
        }

        if (signOutButton) {
            signOutButton.addEventListener(
                "click",
                signOut
            );
        }

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

    const nameInput =
        document.getElementById(
            "profileName"
        );

    const message =
        document.getElementById(
            "profileMessage"
        );

    if (!nameInput || !message) {
        console.error(
            "Profile form elements are missing."
        );
        return;
    }

    const name =
        nameInput.value.trim();

    if (name.length > 100) {
        message.textContent =
            "Name must be 100 characters or less.";
        return;
    }

    message.textContent =
        "Saving...";

    const user =
        await getCurrentUser();

    if (!user) return;

    try {

        const { error } =
            await window.supabaseClient
                .from("profiles")
                .update({
                    name: name
                })
                .eq("id", user.id);

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
            "Unable to save profile. Please try again.";
    }
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