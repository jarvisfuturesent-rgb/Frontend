// PULSE — Login / Sign Up

const authContainer = document.getElementById("auth");

if (authContainer) {
    showAuthForm();
}

function showAuthForm() {
    authContainer.innerHTML = `
        <form id="auth-form">

            <label for="email">Email</label>
            <input
                type="email"
                id="email"
                required
                autocomplete="email"
            >

            <label for="password">Password</label>
            <input
                type="password"
                id="password"
                required
                minlength="6"
                autocomplete="current-password"
            >

            <button type="submit" id="login-button">
                Log In
            </button>

            <button type="button" id="signup-button">
                Create Account
            </button>

            <p id="auth-message"></p>

            <a href="reset-password.html">
                Forgot Password?
            </a>

        </form>
    `;

    document
        .getElementById("auth-form")
        .addEventListener("submit", loginUser);

    document
        .getElementById("signup-button")
        .addEventListener("click", createAccount);
}

async function loginUser(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("auth-message");

    message.textContent = "Logging in...";

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("Login error:", error);
        message.textContent = error.message;
        return;
    }

    message.textContent = "Login successful.";

    window.location.href = "dashboard.html";
}

async function createAccount() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("auth-message");

    if (!email || !password) {
        message.textContent = "Enter your email and password first.";
        return;
    }

    if (password.length < 6) {
        message.textContent = "Password must be at least 6 characters.";
        return;
    }

    message.textContent = "Creating account...";

    const { error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        console.error("Sign-up error:", error);
        message.textContent = error.message;
        return;
    }

    message.textContent =
        "Account created. Check your email to confirm your account.";
}