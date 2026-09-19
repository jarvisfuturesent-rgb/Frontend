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


// Check whether the current user is an admin
async function isAdmin(userId) {
    if (!userId) {
        return false;
    }

    const { data: profile, error } =
        await window.supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .maybeSingle();

    if (error) {
        console.error(
            "Error checking admin role:",
            error
        );

        return false;
    }

    return profile?.role === "admin";
}


// Hide Administration immediately.
// It will only be shown after admin status is confirmed.
function hideAdminMenuImmediately() {
    const adminLink =
        document.querySelector(
            'a[href="admin.html"]'
        );

    if (!adminLink) {
        return null;
    }

    const adminFolder =
        adminLink.closest("details");

    if (!adminFolder) {
        return null;
    }

    adminFolder.hidden = true;

    return adminFolder;
}


// Show Administration only after admin status is confirmed
async function updateAdminMenu() {
    const adminFolder = hideAdminMenuImmediately();

    if (!adminFolder) {
        return;
    }

    const user = await getCurrentUser();

    if (!user) {
        return;
    }

    const admin = await isAdmin(user.id);

    if (admin) {
        adminFolder.hidden = false;
    }
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


// Run shared page checks after the page loads
document.addEventListener(
    "DOMContentLoaded",
    () => {
        updateAdminMenu();
    }
);