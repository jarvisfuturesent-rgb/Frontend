// PULSE — Admin Reward Requests
// Controls admin-rewards.html only.

document.addEventListener("DOMContentLoaded", () => {
  loadAdminRewards();
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

async function loadAdminRewards() {
  const container = document.getElementById("adminRewards");

  if (!container) {
    console.error("adminRewards element not found.");
    return;
  }

  container.innerHTML = "<p>Loading reward requests...</p>";

  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      container.innerHTML = `
        <p>Access denied.</p>
        <a href="dashboard.html">Return to Dashboard</a>
      `;
      return;
    }

    const { data: rewards, error } =
      await window.supabaseClient
        .from("redemption_requests")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!rewards || rewards.length === 0) {
      container.innerHTML = "<p>No reward requests found.</p>";
      return;
    }

    container.innerHTML = rewards
      .map(renderReward)
      .join("");

    document
      .querySelectorAll("[data-reward-action]")
      .forEach(button => {
        button.addEventListener("click", () => {
          const requestId =
            button.getAttribute("data-request-id");

          const action =
            button.getAttribute("data-reward-action");

          if (action === "approve") {
            processReward(requestId, "approve");
          }

          if (action === "reject") {
            processReward(requestId, "reject");
          }
        });
      });

  } catch (error) {
    console.error("Admin reward loading error:", error);

    container.innerHTML = `
      <p>Unable to load reward requests.</p>
      <p>Please try again.</p>
    `;
  }
}

function renderReward(reward) {
  const status = reward.status || "pending";

  const rewardType =
    reward.reward_type ||
    reward.reward ||
    reward.type ||
    "Not specified";

  const points =
    reward.points_requested ??
    reward.points ??
    reward.amount ??
    0;

  const userId =
    reward.user_id ||
    "Unknown";

  const actionButtons =
    status === "pending"
      ? `
        <button
          type="button"
          data-reward-action="approve"
          data-request-id="${reward.id}"
        >
          Approve
        </button>

        <button
          type="button"
          data-reward-action="reject"
          data-request-id="${reward.id}"
        >
          Reject
        </button>
      `
      : "";

  return `
    <div class="reward-card">

      <h3>Reward Request #${reward.id}</h3>

      <p>
        <strong>User ID:</strong>
        ${escapeHTML(userId)}
      </p>

      <p>
        <strong>Points Requested:</strong>
        ${escapeHTML(points)}
      </p>

      <p>
        <strong>Reward Type:</strong>
        ${escapeHTML(rewardType)}
      </p>

      <p>
        <strong>Status:</strong>
        ${escapeHTML(status)}
      </p>

      <p>
        <strong>Created:</strong>
        ${formatDate(reward.created_at)}
      </p>

      ${
        reward.updated_at
          ? `
            <p>
              <strong>Updated:</strong>
              ${formatDate(reward.updated_at)}
            </p>
          `
          : ""
      }

      ${
        reward.rejection_reason
          ? `
            <p>
              <strong>Rejection Reason:</strong>
              ${escapeHTML(reward.rejection_reason)}
            </p>
          `
          : ""
      }

      <div class="reward-actions">
        ${actionButtons}
      </div>

    </div>
  `;
}

async function processReward(requestId, action) {
  if (!requestId) {
    return;
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    alert("Access denied.");
    return;
  }

  if (action === "approve") {
    const confirmed =
      confirm("Approve this reward request?");

    if (!confirmed) {
      return;
    }
  }

  let rejectionReason = null;

  if (action === "reject") {
    rejectionReason = prompt(
      "Enter a reason for rejecting this reward request:"
    );

    if (rejectionReason === null) {
      return;
    }

    rejectionReason = rejectionReason.trim();

    if (!rejectionReason) {
      alert("A rejection reason is required.");
      return;
    }
  }

  try {
    let result;

    if (action === "approve") {
      result =
        await window.supabaseClient.rpc(
          "process_redemption_request",
          {
            request_id: Number(requestId),
            action: "approve"
          }
        );
    } else {
      result =
        await window.supabaseClient.rpc(
          "process_redemption_request",
          {
            request_id: Number(requestId),
            action: "reject",
            rejection_reason: rejectionReason
          }
        );
    }

    if (result.error) {
      throw result.error;
    }

    await loadAdminRewards();

  } catch (error) {
    console.error(
      "Reward request processing error:",
      error
    );

    alert(
      "Unable to process this reward request. Please try again."
    );
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