// PULSE — Password Reset
// Controls reset-password.html only.

document.addEventListener(
    "DOMContentLoaded",
    initPasswordReset
);


async function initPasswordReset() {

    const resetContainer =
        document.getElementById(
            "resetPassword"
        );

    if (!resetContainer) {
        console.error(
            "resetPassword element not found."
        );
        return;
    }

    if (!window.supabaseClient) {
        resetContainer.innerHTML =
            "<p>Supabase client is not available.</p>";
        return;
    }

    try {

        const {
            data: {
                session
            }
        } =
            await window.supabaseClient.auth
                .getSession();

        if (session) {
            showNewPasswordForm();
            return;
        }

        showEmailForm();

    } catch (error) {

        console.error(
            "Password reset initialization error:",
            error
        );

        resetContainer.innerHTML = `
            <p>
                Unable to load password reset.
                Please try again.
            </p>
        `;
    }
}


function showEmailForm() {

    const resetContainer =
        document.getElementById(
            "resetPassword"
        );

    if (!resetContainer) return;

    resetContainer.innerHTML = `

        <form id="reset-form">

            <label for="reset-email">
                Email
            </label>

            <input
                type="email"
                id="reset-email"
                required
                autocomplete="email"
            >

            <button type="submit">
                Send Reset Link
            </button>

            <p id="reset-message"></p>

            <a href="auth.html">
                Back to Login
            </a>

        </form>

    `;

    const form =
        document.getElementById(
            "reset-form"
        );

    if (form) {
        form.addEventListener(
            "submit",
            sendResetEmail
        );
    }
}


function showNewPasswordForm() {

    const resetContainer =
        document.getElementById(
            "resetPassword"
        );

    if (!resetContainer) return;

    resetContainer.innerHTML = `

        <form id="new-password-form">

            <label for="new-password">
                New Password
            </label>

            <input
                type="password"
                id="new-password"
                required
                minlength="6"
                autocomplete="new-password"
            >

            <label for="confirm-password">
                Confirm New Password
            </label>

            <input
                type="password"
                id="confirm-password"
                required
                minlength="6"
                autocomplete="new-password"
            >

            <button type="submit">
                Update Password
            </button>

            <p id="new-password-message"></p>

        </form>

    `;

    const form =
        document.getElementById(
            "new-password-form"
        );

    if (form) {
        form.addEventListener(
            "submit",
            updatePassword
        );
    }
}


async function sendResetEmail(event) {

    event.preventDefault();

    const emailInput =
        document.getElementById(
            "reset-email"
        );

    const message =
        document.getElementById(
            "reset-message"
        );

    if (!emailInput || !message) {
        console.error(
            "Password reset form elements are missing."
        );
        return;
    }

    const email =
        emailInput.value.trim();

    if (!email) {
        message.textContent =
            "Enter your email address.";
        return;
    }

    message.textContent =
        "Sending reset link...";

    try {

        const redirectTo =
            window.location.origin +
            window.location.pathname;

        const { error } =
            await window.supabaseClient.auth
                .resetPasswordForEmail(
                    email,
                    {
                        redirectTo
                    }
                );

        if (error) {
            throw error;
        }

        message.textContent =
            "Password reset link sent. Check your email.";

    } catch (error) {

        console.error(
            "Password reset error:",
            error
        );

        // TEMPORARY ERROR DETECTOR
        message.textContent =
            error.message ||
            "Unable to send the reset link. Please try again.";
    }
}


async function updatePassword(event) {

    event.preventDefault();

    const passwordInput =
        document.getElementById(
            "new-password"
        );

    const confirmInput =
        document.getElementById(
            "confirm-password"
        );

    const message =
        document.getElementById(
            "new-password-message"
        );

    if (
        !passwordInput ||
        !confirmInput ||
        !message
    ) {
        console.error(
            "New password form elements are missing."
        );
        return;
    }

    const password =
        passwordInput.value;

    const confirmPassword =
        confirmInput.value;

    if (password.length < 6) {
        message.textContent =
            "Password must be at least 6 characters.";
        return;
    }

    if (password !== confirmPassword) {
        message.textContent =
            "Passwords do not match.";
        return;
    }

    message.textContent =
        "Updating password...";

    try {

        const { error } =
            await window.supabaseClient.auth
                .updateUser({
                    password
                });

        if (error) {
            throw error;
        }

        message.textContent =
            "Password updated successfully.";

        passwordInput.value = "";
        confirmInput.value = "";

        setTimeout(() => {
            window.location.href =
                "auth.html";
        }, 1200);

    } catch (error) {

        console.error(
            "Password update error:",
            error
        );

        message.textContent =
            "Unable to update password. Please try again.";
    }
}