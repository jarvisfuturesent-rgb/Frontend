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
  const container =
    document.getElementById("adminRewards");

  if (!container) {
    console.error("adminRewards element not found.");
    return;
  }

  container.innerHTML =
    "<p>Loading reward requests...</p>";

  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      container.innerHTML = `
        <p>Access denied.</p>
        <a href="dashboard.html">
          Return to Dashboard
        </a>
      `;
      return;
    }

    const { data: rewards, error } =
      await window.supabaseClient
        .from("redemption_requests")
        .select(`
          id,
          user_id,
          points_requested,
          reward_type,
          status,
          user_note,
          admin_note,
          created_at,
          reviewed_at,
          paid_at
        `)
        .order("created_at", {
          ascending: false
        });

    if (error) {
      throw error;
    }

    if (!rewards || rewards.length === 0) {
      container.innerHTML =
        "<p>No reward requests found.</p>";
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
            button.getAttribute(
              "data-request-id"
            );

          const action =
            button.getAttribute(
              "data-reward-action"
            );

          if (action === "approve") {
            approveReward(requestId);
          }

          if (action === "reject") {
            rejectReward(requestId);
          }
        });
      });

  } catch (error) {
    console.error(
      "Admin reward loading error:",
      error
    );

    container.innerHTML = `
      <p>Unable to load reward requests.</p>
      <p>Please try again.</p>
    `;
  }
}

function renderReward(reward) {
  const status =
    reward.status || "pending";

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

      <h3>
        Reward Request #${reward.id}
      </h3>

      <p>
        <strong>User ID:</strong>
        ${escapeHTML(reward.user_id)}
      </p>

      <p>
        <strong>Points Requested:</strong>
        ${escapeHTML(
          reward.points_requested
        )}
      </p>

      <p>
        <strong>Reward Type:</strong>
        ${escapeHTML(
          reward.reward_type
        )}
      </p>

      <p>
        <strong>Status:</strong>
        ${escapeHTML(status)}
      </p>

      <p>
        <strong>Created:</strong>
        ${formatDate(
          reward.created_at
        )}
      </p>

      ${
        reward.user_note
          ? `
            <p>
              <strong>User Note:</strong>
              ${escapeHTML(
                reward.user_note
              )}
            </p>
          `
          : ""
      }

      ${
        reward.admin_note
          ? `
            <p>
              <strong>Admin Note:</strong>
              ${escapeHTML(
                reward.admin_note
              )}
            </p>
          `
          : ""
      }

      ${
        reward.reviewed_at
          ? `
            <p>
              <strong>Reviewed:</strong>
              ${formatDate(
                reward.reviewed_at
              )}
            </p>
          `
          : ""
      }

      ${
        reward.paid_at
          ? `
            <p>
              <strong>Paid:</strong>
              ${formatDate(
                reward.paid_at
              )}
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

async function approveReward(requestId) {
  if (!requestId) {
    return;
  }

  if (
    !confirm(
      "Approve this reward request?"
    )
  ) {
    return;
  }

  try {
    const admin =
      await getCurrentAdmin();

    if (!admin) {
      alert("Access denied.");
      return;
    }

    const { error } =
      await window.supabaseClient.rpc(
        "process_redemption_request",
        {
          p_request_id:
            Number(requestId)
        }
      );

    if (error) {
      throw error;
    }

    alert(
      "Reward request approved."
    );

    await loadAdminRewards();

  } catch (error) {
    console.error(
      "Reward approval error:",
      error
    );

    alert(
      "Unable to approve this reward request."
    );
  }
}

async function rejectReward(requestId) {
  if (!requestId) {
    return;
  }

  const reason = prompt(
    "Enter a reason for rejecting this reward request:"
  );

  if (reason === null) {
    return;
  }

  const trimmedReason =
    reason.trim();

  if (!trimmedReason) {
    alert(
      "A rejection reason is required."
    );
    return;
  }

  try {
    const admin =
      await getCurrentAdmin();

    if (!admin) {
      alert("Access denied.");
      return;
    }

    const { error } =
      await window.supabaseClient
        .from("redemption_requests")
        .update({
          status: "rejected",
          admin_note: trimmedReason,
          reviewed_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          Number(requestId)
        )
        .eq(
          "status",
          "pending"
        );

    if (error) {
      throw error;
    }

    alert(
      "Reward request rejected."
    );

    await loadAdminRewards();

  } catch (error) {
    console.error(
      "Reward rejection error:",
      error
    );

    alert(
      "Unable to reject this reward request."
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