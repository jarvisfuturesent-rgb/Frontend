// PULSE — Admin Business Management
// Controls admin-businesses.html only.

document.addEventListener("DOMContentLoaded", () => {
  loadAdminBusinesses();
});

async function getCurrentAdmin() {
  if (!window.supabaseClient) {
    throw new Error("Supabase client is not available.");
  }

  const {
    data: { user },
    error: userError
  } = await window.supabaseClient.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } =
    await window.supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (profileError) {
    throw profileError;
  }

  if (!profile || profile.role !== "admin") {
    return null;
  }

  return user;
}

async function loadAdminBusinesses() {
  const container = document.getElementById("adminBusinesses");

  if (!container) {
    console.error("adminBusinesses element not found.");
    return;
  }

  container.innerHTML = "<p>Loading businesses...</p>";

  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      container.innerHTML = `
        <p>Access denied.</p>
        <a href="dashboard.html">Return to Dashboard</a>
      `;
      return;
    }

    const { data: businesses, error } =
      await window.supabaseClient
        .from("businesses")
        .select(`
          id,
          name,
          description,
          website,
          status,
          created_at
        `)
        .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!businesses || businesses.length === 0) {
      container.innerHTML = "<p>No businesses found.</p>";
      return;
    }

    container.innerHTML = businesses
      .map(renderBusiness)
      .join("");

  } catch (error) {
    console.error("Admin business loading error:", error);

    container.innerHTML = `
      <p>Unable to load businesses.</p>
      <p>Please try again.</p>
    `;
  }
}

function renderBusiness(business) {
  const website = normalizeWebsite(business.website);

  return `
    <div class="business-card">

      <h3>${escapeHTML(business.name)}</h3>

      <p>
        ${escapeHTML(business.description || "")}
      </p>

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

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}