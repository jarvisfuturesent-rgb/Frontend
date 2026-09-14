/* =========================
   PULSE ADMIN REWARDS
========================= */

async function loadAdminPanel() {
  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") return;

  let panel = document.getElementById("adminPanel");

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "adminPanel";
    panel.className = "panel";

    panel.innerHTML = `
      <div class="panel-heading">
        <h2>
          <span class="blue-icon">⚙</span>
          Admin Rewards
        </h2>
      </div>

      <div id="adminRedemptions">
        <div class="loading-box">
          Loading pending rewards...
        </div>
      </div>
    `;

    document.getElementById("dashboard")?.prepend(panel);
  }

  const box = document.getElementById("adminRedemptions");

  const { data, error } = await db
    .from("redemption_requests")
    .select(
      "id,user_id,points_requested,reward_type,status,created_at"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    box.innerHTML = `
      <div class="empty-card">
        Unable to load pending rewards.
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
    return;
  }

  if (!data?.length) {
    box.innerHTML = `
      <div class="empty-card">
        <strong>No pending rewards.</strong>
      </div>
    `;
    return;
  }

  box.innerHTML = data.map(request => `
    <div class="history-row">

      <div>
        <strong>
          ${request.points_requested} points
        </strong>

        <small>
          Request #${request.id}
        </small>

        <small>
          User: ${escapeHtml(request.user_id)}
        </small>
      </div>

      <button
        class="gradient-button admin-approve"
        data-id="${request.id}"
      >
        Approve
      </button>

    </div>
  `).join("");

  box.querySelectorAll(".admin-approve").forEach(button => {

    button.onclick = async () => {

      const requestId = Number(button.dataset.id);

      button.disabled = true;
      button.textContent = "Approving...";

      const { error } = await db.rpc(
        "process_redemption_request",
        {
          p_request_id: requestId
        }
      );

      if (error) {

        button.disabled = false;
        button.textContent = "Approve";

        alert(error.message);
        return;
      }

      alert(
        `Reward request #${requestId} approved.`
      );

      await loadAdminPanel();

      if (typeof refresh === "function") {
        await refresh();
      }
    };
  });
}


/* =========================
   START ADMIN PANEL
========================= */

window.addEventListener("load", () => {
  setTimeout(loadAdminPanel, 500);
});

db.auth.onAuthStateChange(() => {
  setTimeout(loadAdminPanel, 300);
});