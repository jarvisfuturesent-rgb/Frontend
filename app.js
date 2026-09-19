// PULSE — Shared App Functions

window.supabaseClient =
  window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );


// ==============================
// GET CURRENT USER
// ==============================

async function getCurrentUser() {
  const { data, error } =
    await window.supabaseClient.auth.getUser();

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

  const { data: profile, error } =
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

  return (
    String(profile?.role || "")
      .trim()
      .toLowerCase() === "admin"
  );
}


// ==============================
// GET ADMINISTRATION FOLDER
// ==============================

function getAdminFolder() {
  return document.getElementById(
    "adminMenuFolder"
  );
}


// ==============================
// HIDE ADMINISTRATION FOLDER
// ==============================

function hideAdminMenu() {
  const adminFolder =
    getAdminFolder();

  if (!adminFolder) {
    return;
  }

  adminFolder.hidden = true;
  adminFolder.removeAttribute("open");
}


// ==============================
// SHOW ADMINISTRATION FOLDER
// ==============================

function showAdminMenu() {
  const adminFolder =
    getAdminFolder();

  if (!adminFolder) {
    return;
  }

  adminFolder.hidden = false;
}


// ==============================
// UPDATE ADMINISTRATION MENU
// ==============================

async function updateAdminMenu() {
  // Hide the entire folder first.
  hideAdminMenu();

  const user =
    await getCurrentUser();

  if (!user) {
    return;
  }

  const admin =
    await isAdmin(user.id);

  if (admin) {
    showAdminMenu();
    console.log(
      "PULSE: Administration folder shown."
    );
  } else {
    hideAdminMenu();
    console.log(
      "PULSE: Administration folder hidden."
    );
  }
}


// ==============================
// AUTH SESSION CHECK
// ==============================

function startAdminMenuCheck() {
  updateAdminMenu();

  window.supabaseClient.auth.onAuthStateChange(
    (event) => {
      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED"
      ) {
        setTimeout(() => {
          updateAdminMenu();
        }, 0);
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
  const { error } =
    await window.supabaseClient.auth.signOut();

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