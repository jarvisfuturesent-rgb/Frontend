// PULSE — Shared App Functions

// ==============================
// SUPABASE CLIENT
// ==============================

if (!window.supabaseClient) {
  window.supabaseClient =
    window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
}


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

  console.log(
    "PULSE: Profile role:",
    profile?.role
  );

  return (
    String(profile?.role || "")
      .trim()
      .toLowerCase() === "admin"
  );
}


// ==============================
// FIND ADMINISTRATION FOLDER
// ==============================

function getAdminFolder() {
  const folders =
    document.querySelectorAll(
      ".menu-panel details"
    );

  for (const folder of folders) {
    const summary =
      folder.querySelector(":scope > summary");

    if (!summary) {
      continue;
    }

    const text =
      summary.textContent
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    if (text === "administration") {
      return folder;
    }
  }

  return null;
}


// ==============================
// HIDE ENTIRE ADMINISTRATION FOLDER
// ==============================

function hideAdminMenu() {
  const folder =
    getAdminFolder();

  if (!folder) {
    return;
  }

  folder.hidden = true;
  folder.removeAttribute("open");
}


// ==============================
// SHOW ENTIRE ADMINISTRATION FOLDER
// ==============================

function showAdminMenu() {
  const folder =
    getAdminFolder();

  if (!folder) {
    return;
  }

  folder.hidden = false;
}


// ==============================
// VERIFY ADMIN AND SET MENU
// ==============================

async function updateAdminMenu() {
  // Hide the entire folder immediately.
  hideAdminMenu();

  const user =
    await getCurrentUser();

  if (!user) {
    console.log(
      "PULSE: No logged-in user. Administration hidden."
    );
    return;
  }

  const admin =
    await isAdmin(user.id);

  if (admin) {
    showAdminMenu();

    console.log(
      "PULSE: Admin verified. Administration shown."
    );
  } else {
    hideAdminMenu();

    console.log(
      "PULSE: Regular user. Administration hidden."
    );
  }
}


// ==============================
// START ADMIN VERIFICATION
// ==============================

function startAdminMenuCheck() {
  // Hide Administration immediately.
  hideAdminMenu();

  // Then verify the logged-in user's role.
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