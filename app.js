// PULSE — Shared App Functions


// ==============================
// SUPABASE CLIENT
// ==============================

window.supabaseClient =
    window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
    );


// ==============================
// GET CURRENT USER
// ==============================

async function getCurrentUser() {

    const {
        data,
        error
    } =
        await window.supabaseClient.auth
            .getUser();

    if (error) {

        console.error(
            "PULSE: Unable to get current user:",
            error
        );

        return null;
    }

    return data.user || null;
}


// ==============================
// CHECK ADMIN ROLE
// ==============================

async function isAdmin(userId) {

    if (!userId) {
        return false;
    }

    const {
        data: profile,
        error
    } =
        await window.supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .maybeSingle();

    if (error) {

        console.error(
            "PULSE: Unable to check admin role:",
            error
        );

        return false;
    }

    console.log(
        "PULSE: Profile:",
        profile
    );

    return (
        String(profile?.role || "")
            .trim()
            .toLowerCase() === "admin"
    );
}


// ==============================
// FIND ADMINISTRATION MENU
// ==============================

function getAdminFolder() {

    const folders =
        document.querySelectorAll(
            "details"
        );

    for (const folder of folders) {

        const summary =
            folder.querySelector(
                "summary"
            );

        if (!summary) {
            continue;
        }

        const text =
            summary.textContent
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();

        if (
            text.includes(
                "administration"
            )
        ) {

            return folder;
        }
    }

    return null;
}


// ==============================
// HIDE ADMIN MENU
// ==============================

function hideAdminMenu() {

    const adminFolder =
        getAdminFolder();

    if (!adminFolder) {
        return;
    }

    adminFolder.style.display =
        "none";

    adminFolder.removeAttribute(
        "open"
    );
}


// ==============================
// SHOW ADMIN MENU
// ==============================

function showAdminMenu() {

    const adminFolder =
        getAdminFolder();

    if (!adminFolder) {
        return;
    }

    // Remove any HTML hidden attribute.
    adminFolder.removeAttribute(
        "hidden"
    );

    // Show the folder.
    adminFolder.style.display =
        "";

    console.log(
        "PULSE: Administration menu shown."
    );
}


// ==============================
// UPDATE ADMIN MENU
// ==============================

async function updateAdminMenu() {

    // Always start hidden.
    hideAdminMenu();


    // Get the already-authenticated user.
    const user =
        await getCurrentUser();

    if (!user) {

        console.log(
            "PULSE: No logged-in user. Administration hidden."
        );

        return;
    }


    console.log(
        "PULSE: Logged-in user:",
        user.id
    );


    // Check the user's profile role.
    const admin =
        await isAdmin(user.id);


    if (admin) {

        showAdminMenu();

        console.log(
            "PULSE: Admin account confirmed."
        );

    } else {

        hideAdminMenu();

        console.log(
            "PULSE: Regular account. Administration hidden."
        );
    }
}


// ==============================
// WAIT FOR SUPABASE SESSION
// ==============================

function startAdminMenuCheck() {

    // Check the current session immediately.
    updateAdminMenu();


    // Also listen for the initial/current
    // Supabase authentication session.
    window.supabaseClient.auth.onAuthStateChange(
        (event, session) => {

            console.log(
                "PULSE: Auth event:",
                event
            );

            if (
                event === "INITIAL_SESSION" ||
                event === "SIGNED_IN" ||
                event === "SIGNED_OUT" ||
                event === "TOKEN_REFRESHED"
            ) {

                setTimeout(
                    () => {
                        updateAdminMenu();
                    },
                    0
                );
            }
        }
    );
}


// ==============================
// REQUIRE LOGIN
// ==============================

async function requireLogin() {

    const user =
        await getCurrentUser();

    if (!user) {

        window.location.href =
            "auth.html";

        return null;
    }

    return user;
}


// ==============================
// SIGN OUT
// ==============================

async function signOut() {

    const {
        error
    } =
        await window.supabaseClient.auth
            .signOut();

    if (error) {

        console.error(
            "PULSE: Sign out error:",
            error
        );

        return false;
    }

    window.location.href =
        "auth.html";

    return true;
}


// ==============================
// PAGE LOAD
// ==============================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        startAdminMenuCheck();

    }
);