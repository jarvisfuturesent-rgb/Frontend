// PULSE — Password Reset

const resetContainer =
    document.getElementById("reset-password");

if (resetContainer) {
    showResetForm();
}

function showResetForm() {
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

    document
        .getElementById("reset-form")
        .addEventListener(
            "submit",
            sendResetEmail
        );
}

async function sendResetEmail(event) {
    event.preventDefault();

    const email =
        document
            .getElementById("reset-email")
            .value
            .trim();

    const message =
        document.getElementById(
            "reset-message"
        );

    if (!email) {
        message.textContent =
            "Enter your email address.";
        return;
    }

    message.textContent =
        "Sending reset link...";

    const { error } =
        await window.supabaseClient.auth
            .resetPasswordForEmail(
                email,
                {
                    redirectTo:
                        window.location.origin +
                        "/Frontend/reset-password.html"
                }
            );

    if (error) {
        console.error(
            "Password reset error:",
            error
        );

        message.textContent =
            error.message;

        return;
    }

    message.textContent =
        "Password reset link sent. Check your email.";
}