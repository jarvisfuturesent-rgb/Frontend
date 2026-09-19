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
// UPDATE ADMIN MENU
// ==============================

async function updateAdminMenu() {

    const adminFolder =
        getAdminFolder();

    if (!adminFolder) {

        console.log(
            "PULSE: No Administration menu on this page."
        );

        return;
    }


    // Hide while checking account
    adminFolder.style.display =
        "none";


    const user =
        await getCurrentUser();

    if (!user) {

        console.log(
            "PULSE: No logged-in user."
        );

        return;
    }


    console.log(
        "PULSE: Logged-in user:",
        user.id
    );


    const admin =
        await isAdmin(user.id);


    if (admin) {

        adminFolder.style.display =
            "";

        console.log(
            "PULSE: Admin account confirmed. Administration shown."
        );

    } else {

        console.log(
            "PULSE: Regular account. Administration hidden."
        );
    }
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

        updateAdminMenu();

    }
);