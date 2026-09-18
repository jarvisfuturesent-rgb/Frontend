// PULSE — Login / Sign Up
// Controls auth.html only.

document.addEventListener(
    "DOMContentLoaded",
    showAuthForm
);


function showAuthForm() {

    const authContainer =
        document.getElementById("auth");

    if (!authContainer) {
        console.error(
            "auth element not found."
        );
        return;
    }

    authContainer.innerHTML = `

        <form id="auth-form">

            <label for="email">
                Email
            </label>

            <input
                type="email"
                id="email"
                required
                autocomplete="email"
            >

            <label for="password">
                Password
            </label>

            <input
                type="password"
                id="password"
                required
                minlength="6"
                autocomplete="current-password"
            >

            <button
                type="submit"
                id="login-button"
            >
                Log In
            </button>

            <button
                type="button"
                id="signup-button"
            >
                Create Account
            </button>

            <p id="auth-message"></p>

            <a href="reset-password.html">
                Forgot Password?
            </a>

        </form>

    `;

    const form =
        document.getElementById(
            "auth-form"
        );

    const signupButton =
        document.getElementById(
            "signup-button"
        );

    if (form) {
        form.addEventListener(
            "submit",
            loginUser
        );
    }

    if (signupButton) {
        signupButton.addEventListener(
            "click",
            createAccount
        );
    }
}


async function loginUser(event) {

    event.preventDefault();

    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");

    const message =
        document.getElementById(
            "auth-message"
        );

    if (
        !emailInput ||
        !passwordInput ||
        !message
    ) {
        console.error(
            "Login form elements are missing."
        );
        return;
    }

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    message.textContent =
        "Logging in...";

    try {

        if (!window.supabaseClient) {
            throw new Error(
                "Supabase client is not available."
            );
        }

        const { error } =
            await window.supabaseClient.auth
                .signInWithPassword({
                    email,
                    password
                });

        if (error) {
            throw error;
        }

        message.textContent =
            "Login successful.";

        window.location.href =
            "dashboard.html";

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        message.textContent =
            error.message ||
            "Unable to log in. Please try again.";
    }
}


async function createAccount() {

    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");

    const message =
        document.getElementById(
            "auth-message"
        );

    if (
        !emailInput ||
        !passwordInput ||
        !message
    ) {
        console.error(
            "Sign-up form elements are missing."
        );
        return;
    }

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    if (!email || !password) {

        message.textContent =
            "Enter your email and password first.";

        return;
    }

    if (password.length < 6) {

        message.textContent =
            "Password must be at least 6 characters.";

        return;
    }

    message.textContent =
        "Creating account...";

    try {

        if (!window.supabaseClient) {
            throw new Error(
                "Supabase client is not available."
            );
        }

        const { data, error } =
            await window.supabaseClient.auth
                .signUp({
                    email,
                    password
                });

        if (error) {
            throw error;
        }

        if (data?.session) {

            message.textContent =
                "Account created successfully.";

            window.location.href =
                "dashboard.html";

            return;
        }

        message.textContent =
            "Account created. Check your email to confirm your account.";

    } catch (error) {

        console.error(
            "Sign-up error:",
            error
        );

        message.textContent =
            error.message ||
            "Unable to create your account. Please try again.";
    }
}