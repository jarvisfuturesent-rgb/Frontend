// PULSE — Shared App Functions

// Create the Supabase client and make it available to all PULSE JS files
window.supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
);


// Get the currently logged-in user
async function getCurrentUser() {
    const { data, error } =
        await window.supabaseClient.auth.getUser();

    if (error) {
        console.error(
            "Error getting current user:",
            error
        );

        return null;
    }

    return data.user;
}


// Check if someone is logged in
async function requireLogin() {
    const user = await getCurrentUser();

    if (!user) {
        window.location.href = "auth.html";
        return null;
    }

    return user;
}


// Sign out
async function signOut() {
    const { error } =
        await window.supabaseClient.auth.signOut();

    if (error) {
        console.error(
            "Sign out error:",
            error
        );

        return false;
    }

    window.location.href = "auth.html";

    return true;
}