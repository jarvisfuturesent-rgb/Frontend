// PULSE — Shared App Functions

console.log("PULSE APP.JS IS RUNNING");


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
    "PULSE: PROFILE ROLE:",
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

  console.log(
    "PULSE MENU FOLDERS FOUND:",
    folders.length
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
        .trim();

    console.log(
      "PULSE FOLDER:",
      text
    );

    if (
      text.toLowerCase() ===
      "administration"
    ) {
      console.log(
        "PULSE: ADMINISTRATION FOLDER FOUND"
      );

      return folder;
    }
  }

  console.log(
    "PULSE: ADMINISTRATION FOLDER NOT FOUND"
  );

  return null;
}


// ==============================
// HIDE ADMINISTRATION
// ==============================

function hideAdminMenu() {
  const folder =
    getAdminFolder();

  if (!folder) {
    return;
  }

  folder.hidden = true;
  folder.style.display = "none";
  folder.removeAttribute("open");

  console.log(
    "PULSE: ADMINISTRATION HIDDEN"
  );
}


// ==============================
// SHOW ADMINISTRATION
// ==============================

function showAdminMenu() {
  const folder =
    getAdminFolder();

  if (!folder) {
    return;
  }

  folder.hidden = false;
  folder.style.display = "";

  console.log(
    "PULSE: ADMINISTRATION SHOWN"
  );
}


// ==============================
// VERIFY USER AND SET MENU
// ==============================

async function updateAdminMenu() {

  // Hide it immediately.
  hideAdminMenu();

  const user =
    await getCurrentUser();

  if (!user) {
    console.log(
      "PULSE: NO LOGGED-IN USER"
    );

    return;
  }

  console.log(
    "PULSE: USER:",
    user.id
  );

  const admin =
    await isAdmin(user.id);

  if (admin) {

    console.log(
      "PULSE: ADMIN VERIFIED"
    );

    showAdminMenu();

  } else {

    console.log(
      "PULSE: REGULAR USER"
    );

    hideAdminMenu();
  }
}


// ==============================
// START ADMIN CHECK
// ==============================

function startAdminMenuCheck() {

  console.log(
    "PULSE: STARTING ADMIN MENU CHECK"
  );

  // Check immediately.
  updateAdminMenu();

  // Watch authentication changes.
  window.supabaseClient.auth.onAuthStateChange(
    (event) => {

      console.log(
        "PULSE AUTH EVENT:",
        event
      );

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

    console.log(
      "PULSE: DOM READY"
    );

    startAdminMenuCheck();

  }
);