// PULSE — Admin Dashboard
// Controls admin.html only.

document.addEventListener("DOMContentLoaded", () => {
  loadAdminDashboard();
});

async function loadAdminDashboard() {
  const container = document.getElementById("adminContent");

  if (!container) {
    console.error("adminContent element not found.");
    return;
  }

  container.innerHTML = "Loading admin dashboard...";

  try {
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
      container.innerHTML = `
        <p>You must be logged in to access the Admin Dashboard.</p>
        <a href="auth.html">Login</a>
      `;
      return;
    }

    const { data: profile, error: profileError } =
      await window.supabaseClient
        .from("profiles")
        .select("name, role")
        .eq("id", user.id)
        .single();

    if (profileError) {
      throw profileError;
    }

    if (!profile || profile.role !== "admin") {
      container.innerHTML = `
        <p>Access denied.</p>
        <p>This page is available to administrators only.</p>
        <a href="dashboard.html">Return to Dashboard</a>
      `;
      return;
    }

    const [
      tasksResult,
      submissionsResult,
      businessesResult,
      rewardsResult
    ] = await Promise.all([
      window.supabaseClient
        .from("tasks")
        .select("id", { count: "exact", head: true }),

      window.supabaseClient
        .from("task_submissions")
        .select("id", { count: "exact", head: true }),

      window.supabaseClient
        .from("businesses")
        .select("id", { count: "exact", head: true }),

      window.supabaseClient
        .from("redemption_requests")
        .select("id", { count: "exact", head: true })
    ]);

    if (tasksResult.error) throw tasksResult.error;
    if (submissionsResult.error) throw submissionsResult.error;
    if (businessesResult.error) throw businessesResult.error;
    if (rewardsResult.error) throw rewardsResult.error;

    container.innerHTML = `
      <div class="admin-summary">

        <div class="panel">
          <h3>Tasks</h3>
          <p>${tasksResult.count ?? 0}</p>
          <a href="admin-tasks.html">Manage Tasks</a>
        </div>

        <div class="panel">
          <h3>Submissions</h3>
          <p>${submissionsResult.count ?? 0}</p>
          <a href="admin-submissions.html">Review Submissions</a>
        </div>

        <div class="panel">
          <h3>Businesses</h3>
          <p>${businessesResult.count ?? 0}</p>
          <a href="admin-businesses.html">Manage Businesses</a>
        </div>

        <div class="panel">
          <h3>Reward Requests</h3>
          <p>${rewardsResult.count ?? 0}</p>
          <a href="admin-rewards.html">Review Rewards</a>
        </div>

        <div class="panel">
          <h3>Reports & Records</h3>
          <p>View system records and reports.</p>
          <a href="admin-reports.html">Open Reports</a>
        </div>

      </div>
    `;

  } catch (error) {
    console.error("Admin dashboard error:", error);

    container.innerHTML = `
      <p>Unable to load the Admin Dashboard.</p>
      <p>Please try again.</p>
    `;
  }
}