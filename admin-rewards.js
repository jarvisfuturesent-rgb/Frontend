// PULSE — Admin Reward Requests
// Controls admin-rewards.html only.

document.addEventListener(
  "DOMContentLoaded",
  initAdminRewards
);


// ==============================
// INITIALIZE
// ==============================

async function initAdminRewards() {

  const container =
    document.getElementById(
      "adminRewards"
    );

  if (!container) {
    console.error(
      "PULSE: #adminRewards was not found."
    );
    return;
  }

  container.innerHTML =
    "<p>Loading reward requests...</p>";

  try {

    if (!window.supabaseClient) {
      throw new Error(
        "Supabase client is not available."
      );
    }

    const user =
      await getCurrentUser();

    if (!user) {
      showAccessDenied(
        container,
        "Please log in first."
      );
      return;
    }

    const admin =
      await isAdmin(user.id);

    if (!admin) {
      showAccessDenied(
        container,
        "Admin access required."
      );
      return;
    }

    console.log(
      "PULSE: ADMIN REWARD ACCESS GRANTED"
    );

    await loadRewards(
      window.supabaseClient,
      container
    );

  } catch (error) {

    console.error(
      "PULSE Admin Reward Error:",
      error
    );

    container.innerHTML = `
      <div class="panel">

        <h3>
          Unable to Load Reward Requests
        </h3>

        <p>
          There was a problem loading the
          reward request records.
        </p>

        <p>
          Please refresh the page and try again.
        </p>

      </div>
    `;
  }
}


// ==============================
// LOAD REWARDS
// ==============================

async function loadRewards(
  supabase,
  container
) {

  const {
    data: rewards,
    error
  } = await supabase
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
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {
    throw error;
  }

  if (
    !rewards ||
    rewards.length === 0
  ) {

    container.innerHTML = `
      <div class="panel">

        <h3>
          Reward Requests
        </h3>

        <p>
          No reward requests found.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML =
    rewards
      .map(renderReward)
      .join("");

  connectRewardButtons(
    container
  );
}


// ==============================
// RENDER REWARD
// ==============================

function renderReward(
  reward
) {

  const status =
    String(
      reward.status ||
      "pending"
    )
      .trim()
      .toLowerCase();


  const actionButtons =
    status === "pending"
      ? `
        <div class="reward-actions">

          <button
            type="button"
            data-reward-action="approve"
            data-request-id="${escapeHTML(
              reward.id
            )}"
          >
            Approve
          </button>

          <button
            type="button"
            data-reward-action="reject"
            data-request-id="${escapeHTML(
              reward.id
            )}"
          >
            Reject
          </button>

        </div>
      `
      : "";


  return `

    <div class="reward-card">

      <h3>
        Reward Request #${escapeHTML(
          reward.id
        )}
      </h3>


      <p>
        <strong>User ID:</strong>
        ${escapeHTML(
          reward.user_id
        )}
      </p>


      <p>
        <strong>
          Points Requested:
        </strong>

        ${escapeHTML(
          reward.points_requested
        )}
      </p>


      <p>
        <strong>
          Reward Type:
        </strong>

        ${escapeHTML(
          reward.reward_type
        )}
      </p>


      <p>
        <strong>
          Status:
        </strong>

        ${escapeHTML(
          status
        )}
      </p>


      <p>
        <strong>
          Created:
        </strong>

        ${formatDate(
          reward.created_at
        )}
      </p>


      ${
        reward.user_note
          ? `
            <p>
              <strong>
                User Note:
              </strong>

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
              <strong>
                Admin Note:
              </strong>

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
              <strong>
                Reviewed:
              </strong>

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
              <strong>
                Paid:
              </strong>

              ${formatDate(
                reward.paid_at
              )}
            </p>
          `
          : ""
      }


      ${actionButtons}

    </div>

  `;
}


// ==============================
// CONNECT BUTTONS
// ==============================

function connectRewardButtons(
  container
) {

  container
    .querySelectorAll(
      "[data-reward-action]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        handleRewardAction
      );

    });
}


// ==============================
// HANDLE ACTION
// ==============================

async function handleRewardAction(
  event
) {

  const button =
    event.currentTarget;

  const requestId =
    button.getAttribute(
      "data-request-id"
    );

  const action =
    button.getAttribute(
      "data-reward-action"
    );

  if (!requestId) {
    return;
  }

  button.disabled = true;

  try {

    if (
      action === "approve"
    ) {
      await approveReward(
        requestId
      );
    }

    if (
      action === "reject"
    ) {
      await rejectReward(
        requestId
      );
    }

  } finally {

    button.disabled = false;

  }
}


// ==============================
// APPROVE
// ==============================

async function approveReward(
  requestId
) {

  if (!requestId) {
    return;
  }

  const confirmed =
    window.confirm(
      "Approve this reward request?"
    );

  if (!confirmed) {
    return;
  }

  try {

    const user =
      await getCurrentUser();

    if (!user) {
      alert(
        "Please log in first."
      );
      return;
    }

    const admin =
      await isAdmin(user.id);

    if (!admin) {
      alert(
        "Access denied."
      );
      return;
    }


    const {
      error
    } = await window.supabaseClient
      .rpc(
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


    await refreshRewards();

  } catch (error) {

    console.error(
      "PULSE reward approval error:",
      error
    );

    alert(
      "Unable to approve this reward request."
    );
  }
}


// ==============================
// REJECT
// ==============================

async function rejectReward(
  requestId
) {

  if (!requestId) {
    return;
  }

  const reason =
    window.prompt(
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

    const user =
      await getCurrentUser();

    if (!user) {
      alert(
        "Please log in first."
      );
      return;
    }

    const admin =
      await isAdmin(user.id);

    if (!admin) {
      alert(
        "Access denied."
      );
      return;
    }


    const {
      error
    } = await window.supabaseClient
      .from(
        "redemption_requests"
      )
      .update({
        status: "rejected",
        admin_note:
          trimmedReason,
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


    await refreshRewards();

  } catch (error) {

    console.error(
      "PULSE reward rejection error:",
      error
    );

    alert(
      "Unable to reject this reward request."
    );
  }
}


// ==============================
// REFRESH
// ==============================

async function refreshRewards() {

  const container =
    document.getElementById(
      "adminRewards"
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    "<p>Refreshing reward requests...</p>";

  try {

    await loadRewards(
      window.supabaseClient,
      container
    );

  } catch (error) {

    console.error(
      "PULSE reward refresh error:",
      error
    );

    container.innerHTML = `
      <div class="panel">

        <h3>
          Unable to Refresh Reward Requests
        </h3>

        <p>
          Please refresh the page and try again.
        </p>

      </div>
    `;
  }
}


// ==============================
// ACCESS DENIED
// ==============================

function showAccessDenied(
  container,
  message
) {

  container.innerHTML = `

    <div class="panel">

      <h3>
        Access Denied
      </h3>

      <p>
        ${escapeHTML(
          message
        )}
      </p>

      <p>
        <a href="dashboard.html">
          Return to Dashboard
        </a>
      </p>

    </div>

  `;
}


// ==============================
// DATE
// ==============================

function formatDate(
  value
) {

  if (!value) {
    return "Unknown";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleString();
}


// ==============================
// HTML ESCAPING
// ==============================

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}