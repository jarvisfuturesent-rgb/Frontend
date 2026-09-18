// PULSE — Password Reset
// Controls reset-password.html only.

document.addEventListener(
    "DOMContentLoaded",
    showResetForm
);


function showResetForm() {

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

        if (!window.supabaseClient) {
            throw new Error(
                "Supabase client is not available."
            );
        }

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

        message.textContent =
            error.message ||
            "Unable to send the reset link. Please try again.";
    }
}