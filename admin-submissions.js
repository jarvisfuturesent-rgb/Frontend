// PULSE — Admin Business Management
// Controls admin-businesses.html only.

document.addEventListener("DOMContentLoaded", initAdminBusinesses);

async function initAdminBusinesses() {
  const container = document.getElementById("adminBusinesses");

  if (!container) {
    console.error("PULSE: #adminBusinesses was not found.");
    return;
  }

  container.innerHTML = "<p>Loading businesses...</p>";

  try {
    const supabase = getSupabaseClient();

    const user = await getLoggedInUser(supabase);

    if (!user) {
      showAccessDenied(container, "Please log in first.");
      return;
    }

    const isAdmin = await checkAdmin(supabase, user.id);

    if (!isAdmin) {
      showAccessDenied(container, "Admin access required.");
      return;
    }

    await loadBusinesses(supabase, container);

  } catch (error) {
    console.error("PULSE Admin Business Error:", error);

    container.innerHTML = `
      <div class="panel">
        <h3>Unable to Load Businesses</h3>
        <p>There was a problem loading the business records.</p>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}


// ==============================
// SUPABASE
// ==============================

function getSupabaseClient() {
  if (!window.supabaseClient) {
    throw new Error(
      "Supabase client is not available. Check config.js."
    );
  }

  return window.supabaseClient;
}


// ==============================
// AUTHENTICATION
// ==============================

async function getLoggedInUser(supabase) {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user || null;
}


// ==============================
// ADMIN CHECK
// ==============================

async function checkAdmin(supabase, userId) {
  const {
    data: profile,
    error
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return profile?.role === "admin";
}


// ==============================
// LOAD BUSINESSES
// ==============================

async function loadBusinesses(supabase, container) {
  const {
    data: businesses,
    error
  } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      description,
      website,
      status,
      created_at
    `)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  if (!businesses || businesses.length === 0) {
    container.innerHTML = `
      <div class="panel">
        <h3>Business Records</h3>
        <p>No businesses found.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = businesses
    .map(renderBusiness)
    .join("");
}


// ==============================
// RENDER BUSINESS
// ==============================

function renderBusiness(business) {
  const website = normalizeWebsite(business.website);

  return `
    <div class="business-card">

      <h3>
        ${escapeHTML(business.name)}
      </h3>

      ${
        business.description
          ? `
            <p>
              ${escapeHTML(business.description)}
            </p>
          `
          : ""
      }

      <p>
        <strong>Status:</strong>
        ${escapeHTML(business.status || "pending")}
      </p>

      ${
        website
          ? `
            <p>
              <a
                href="${escapeHTML(website)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Website
              </a>
            </p>
          `
          : ""
      }

      <p>
        <strong>Created:</strong>
        ${formatDate(business.created_at)}
      </p>

    </div>
  `;
}


// ==============================
// WEBSITE VALIDATION
// ==============================

function normalizeWebsite(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(
      /^https?:\/\//i.test(raw)
        ? raw
        : `https://${raw}`
    );

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return "";
    }

    return url.href;

  } catch {
    return "";
  }
}


// ==============================
// DATE FORMAT
// ==============================

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}


// ==============================
// ACCESS DENIED
// ==============================

function showAccessDenied(container, message) {
  container.innerHTML = `
    <div class="panel">
      <h3>Access Denied</h3>
      <p>${escapeHTML(message)}</p>
      <p>
        <a href="dashboard.html">
          Return to Dashboard
        </a>
      </p>
    </div>
  `;
}


// ==============================
// HTML SAFETY
// ==============================

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}