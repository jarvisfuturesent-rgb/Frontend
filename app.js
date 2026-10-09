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

  }
);

// Hide administration navigation by default. Only reveal it after a verified
// signed-in account has an administrator role. This is a UI measure;
// Supabase RLS and privileged functions remain the security boundary.
document.addEventListener("DOMContentLoaded", async () => {
  const adminLinks = [...document.querySelectorAll('a[href^="admin"]')];
  if (!adminLinks.length) return;
  const groups = [...new Set(adminLinks.map(link => link.closest("details")).filter(Boolean))];
  const hidden = [...new Set([...groups, ...adminLinks])];
  hidden.forEach(el => { el.hidden = true; el.style.display = "none"; });
  try {
    const user = await getCurrentUser();
    if (!user || !(await isAdmin(user.id))) return;
    document.body.classList.add("pulse-admin");
    hidden.forEach(el => { el.hidden = false; el.style.removeProperty("display"); });
  } catch (error) {
    console.error("PULSE: Admin navigation remains hidden.", error);
  }
});
