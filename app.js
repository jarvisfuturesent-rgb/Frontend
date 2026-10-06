// PULSE — shared authentication and navigation.
// config.js is the only Supabase client initializer.
async function getCurrentUser() {
  try {
    if (!window.supabaseClient) return null;
    const { data, error } = await window.supabaseClient.auth.getUser();
    return error ? null : data?.user || null;
  } catch {
    return null;
  }
}

async function isAdmin(userId) {
  if (!userId || !window.supabaseClient) return false;
  try {
    const { data, error } = await window.supabaseClient
      .from("profiles").select("role").eq("id", userId).maybeSingle();
    return !error && data?.role === "admin";
  } catch {
    return false;
  }
}

async function requireLogin() {
  const user = await getCurrentUser();
  if (!user) {
    hideProtectedContent();
    window.location.replace("auth.html");
  }
  return user;
}

let signingOut = false;
async function signOut() {
  if (signingOut) return false;
  signingOut = true;
  hideProtectedContent();
  try {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) {
      await refreshAccess();
      return false;
    }
    window.location.replace("auth.html");
    return true;
  } catch {
    await refreshAccess();
    return false;
  } finally {
    signingOut = false;
  }
}

function hideProtectedContent() {
  document.querySelectorAll("[data-admin-only], [data-protected-content]")
    .forEach(element => { element.hidden = true; });
}

let accessGeneration = 0;
let displayedUserId = null;
async function refreshAccess() {
  const generation = ++accessGeneration;
  hideProtectedContent();
  document.body.dataset.accessReady = "false";
  const user = await getCurrentUser();
  const admin = user ? await isAdmin(user.id) : false;
  if (generation !== accessGeneration) return;
  const protectedPage = document.body.hasAttribute("data-auth-page");
  const adminPage = document.body.hasAttribute("data-admin-page");
  if ((!user && protectedPage) || (adminPage && !admin)) {
    document.body.dataset.accessReady = "true";
    document.body.dataset.accessResult = user ? "denied" : "anonymous";
    const status = document.getElementById("accessStatus");
    if (status) {
      status.hidden = false;
      status.textContent = user ? "Access denied. Administrator access is required." : "Please log in to continue.";
    }
    if (!user && protectedPage) window.location.replace("auth.html");
    return;
  }
  // Avoid showing data from a previous account after cross-tab auth changes.
  if (protectedPage && displayedUserId && displayedUserId !== user?.id) {
    window.location.reload();
    return;
  }
  displayedUserId = user?.id || null;
  document.querySelectorAll("[data-admin-only]").forEach(element => {
    element.hidden = !admin;
  });
  document.querySelectorAll("[data-protected-content]").forEach(element => {
    element.hidden = false;
  });
  const status = document.getElementById("accessStatus");
  if (status) status.hidden = true;
  document.body.dataset.accessReady = "true";
  document.body.dataset.accessResult = "allowed";
}

document.addEventListener("DOMContentLoaded", () => { void refreshAccess(); });
window.addEventListener("pageshow", () => { void refreshAccess(); });
window.addEventListener("focus", () => { void refreshAccess(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshAccess();
});
if (window.supabaseClient) {
  window.supabaseClient.auth.onAuthStateChange(event => {
    if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") {
      hideProtectedContent();
      // Keep SDK calls outside its synchronous auth callback.
      setTimeout(() => { void refreshAccess(); }, 0);
    }
  });
}
