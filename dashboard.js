// PULSE — Dashboard
// Controls dashboard.html only.

document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();

  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  const markReadBtn =
    document.getElementById("markNotificationsRead");

  if (markReadBtn) {
    markReadBtn.addEventListener(
      "click",
      markNotificationsRead
    );
  }

  const redeemBtn =
    document.getElementById("redeem");

  if (redeemBtn) {
    redeemBtn.addEventListener(
      "click",
      handleRewardRequest
    );
  }
});


async function loadDashboard() {
  const balance =
    document.getElementById("balance");

  const totalEarned =
    document.getElementById("totalEarned");

  const pendingWithdrawal =
    document.getElementById("pendingWithdrawal");

  const availableBalance =
    document.getElementById("availableBalance");

  const profileName =
    document.getElementById("profileName");

  const profile =
    document.getElementById("profile");

  const tasks =
    document.getElementById("tasks");

  const submissions =
    document.getElementById("submissions");

  const activity =
    document.getElementById("activity");

  const redemptions =
    document.getElementById("redemptions");

  const notifications =
    document.getElementById("notifications");


  try {
    const user = await requireLogin();

    if (!user) {
      return;
    }

    if (!window.supabaseClient) {
      throw new Error(
        "Supabase client is not available."
      );
    }


    const [
      profileResult,
      submissionsResult,
      tasksResult,
      ledgerResult,
      rewardsResult,
      notificationsResult
    ] = await Promise.all([

      window.supabaseClient
        .from("profiles")
        .select("name, points")
        .eq("id", user.id)
        .maybeSingle(),

      window.supabaseClient
        .from("task_submissions")
        .select(`
          id,
          task_id,
          status,
          reviewer_note,
          submitted_at
        `)
        .eq("user_id", user.id)
        .order("submitted_at", {
          ascending: false
        }),

      window.supabaseClient
        .from("tasks")
        .select(`
          id,
          title,
          description,
          points,
          status
        `)
        .eq("status", "active")
        .order("created_at", {
          ascending: false
        }),

      window.supabaseClient
        .from("points_ledger")
        .select(`
          id,
          user_id,
          submission_id,
          amount,
          reason,
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false
        }),

      window.supabaseClient
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
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false
        }),

      window.supabaseClient
        .from("notifications")
        .select(`
          id,
          user_id,
          title,
          message,
          type,
          read,
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false
        })
    ]);


    if (profileResult.error) {
      throw profileResult.error;
    }

    if (submissionsResult.error) {
      throw submissionsResult.error;
    }

    if (tasksResult.error) {
      throw tasksResult.error;
    }

    if (ledgerResult.error) {
      throw ledgerResult.error;
    }

    if (rewardsResult.error) {
      throw rewardsResult.error;
    }

    if (notificationsResult.error) {
      throw notificationsResult.error;
    }


    const userProfile =
      profileResult.data;

    const userSubmissions =
      submissionsResult.data || [];

    const userTasks =
      tasksResult.data || [];

    const ledger =
      ledgerResult.data || [];

    const rewards =
      rewardsResult.data || [];

    const userNotifications =
      notificationsResult.data || [];


    // PROFILE

    const name =
      userProfile?.name ||
      user.email ||
      "PULSE User";

    const points =
      Number(userProfile?.points) || 0;


    if (profileName) {
      profileName.textContent = name;
    }


    if (profile) {
      profile.innerHTML = `
        <p>
          <strong>Email:</strong>
          ${escapeHTML(user.email || "")}
        </p>

        <p>
          <strong>Points:</strong>
          ${points.toLocaleString()}
        </p>
      `;
    }


    // POINTS

    let totalEarnedValue = 0;

    ledger.forEach(entry => {
      const amount =
        Number(entry.amount);

      if (
        Number.isFinite(amount) &&
        amount > 0
      ) {
        totalEarnedValue += amount;
      }
    });


    let pendingPoints = 0;

    rewards.forEach(request => {
      const amount =
        Number(request.points_requested);

      if (
        request.status === "pending" &&
        Number.isFinite(amount) &&
        amount > 0
      ) {
        pendingPoints += amount;
      }
    });


    if (balance) {
      balance.textContent =
        points.toLocaleString();
    }

    if (totalEarned) {
      totalEarned.textContent =
        totalEarnedValue.toLocaleString();
    }

    if (pendingWithdrawal) {
      pendingWithdrawal.textContent =
        pendingPoints.toLocaleString();
    }

    if (availableBalance) {
      availableBalance.textContent =
        points.toLocaleString();
    }


    // TASKS

    if (tasks) {

      if (userTasks.length === 0) {

        tasks.innerHTML =
          "<p>No active tasks available.</p>";

      } else {

        tasks.innerHTML =
          userTasks.map(task => `
            <div class="panel">

              <h3>
                ${escapeHTML(task.title)}
              </h3>

              <p>
                ${escapeHTML(
                  task.description || ""
                )}
              </p>

              <p>
                <strong>Points:</strong>
                ${Number(task.points) || 0}
              </p>

              <a href="tasks.html">
                Open Tasks
              </a>

            </div>
          `).join("");
      }
    }


    // SUBMISSIONS

    if (submissions) {

      if (userSubmissions.length === 0) {

        submissions.innerHTML =
          "<p>No submissions yet.</p>";

      } else {

        submissions.innerHTML =
          userSubmissions.map(item => `
            <div class="panel">

              <p>
                <strong>Status:</strong>
                ${escapeHTML(
                  item.status || "unknown"
                )}
              </p>

              <p>
                <strong>Submitted:</strong>
                ${formatDate(
                  item.submitted_at
                )}
              </p>

              ${
                item.reviewer_note
                  ? `
                    <p>
                      <strong>Reviewer Note:</strong>
                      ${escapeHTML(
                        item.reviewer_note
                      )}
                    </p>
                  `
                  : ""
              }

            </div>
          `).join("");
      }
    }


    // POINTS ACTIVITY

    if (activity) {

      if (ledger.length === 0) {

        activity.innerHTML =
          "<p>No points activity yet.</p>";

      } else {

        activity.innerHTML =
          ledger.map(entry => `
            <div class="panel">

              <p>
                <strong>Amount:</strong>
                ${Number(entry.amount) || 0}
              </p>

              ${
                entry.reason
                  ? `
                    <p>
                      <strong>Reason:</strong>
                      ${escapeHTML(
                        entry.reason
                      )}
                    </p>
                  `
                  : ""
              }

              <p>
                <strong>Date:</strong>
                ${formatDate(
                  entry.created_at
                )}
              </p>

            </div>
          `).join("");
      }
    }


    // REWARD REQUESTS

    if (redemptions) {

      if (rewards.length === 0) {

        redemptions.innerHTML =
          "<p>No reward requests yet.</p>";

      } else {

        redemptions.innerHTML =
          rewards.map(request => `
            <div class="panel">

              <p>
                <strong>Points:</strong>
                ${
                  Number(
                    request.points_requested
                  ) || 0
                }
              </p>

              <p>
                <strong>Reward:</strong>
                ${escapeHTML(
                  request.reward_type || ""
                )}
              </p>

              <p>
                <strong>Status:</strong>
                ${escapeHTML(
                  request.status || ""
                )}
              </p>

              ${
                request.user_note
                  ? `
                    <p>
                      <strong>Note:</strong>
                      ${escapeHTML(
                        request.user_note
                      )}
                    </p>
                  `
                  : ""
              }

              ${
                request.admin_note
                  ? `
                    <p>
                      <strong>Admin Note:</strong>
                      ${escapeHTML(
                        request.admin_note
                      )}
                    </p>
                  `
                  : ""
              }

              <p>
                <strong>Date:</strong>
                ${formatDate(
                  request.created_at
                )}
              </p>

            </div>
          `).join("");
      }
    }


    // NOTIFICATIONS

    if (notifications) {

      if (userNotifications.length === 0) {

        notifications.innerHTML =
          "<p>No notifications.</p>";

      } else {

        notifications.innerHTML =
          userNotifications.map(item => `
            <div class="panel">

              <h3>
                ${escapeHTML(
                  item.title || "Notification"
                )}
              </h3>

              <p>
                ${escapeHTML(
                  item.message || ""
                )}
              </p>

              <small>
                ${formatDate(
                  item.created_at
                )}
              </small>

            </div>
          `).join("");
      }
    }


  } catch (error) {

    console.error(
      "Dashboard loading error:",
      error
    );

    showDashboardError(
      "Unable to load your dashboard. Please try again."
    );
  }
}


// -----------------------------
// REWARD REQUEST
// -----------------------------

async function handleRewardRequest() {

  const button =
    document.getElementById("redeem");

  const amountInput =
    document.getElementById("redeemAmount");

  const rewardTypeInput =
    document.getElementById("rewardType");

  const noteInput =
    document.getElementById("redeemNote");

  const message =
    document.getElementById("redeemMsg");


  if (!amountInput ||
      !rewardTypeInput ||
      !message) {
    return;
  }


  const points =
    Number(amountInput.value);

  const rewardType =
    rewardTypeInput.value;

  const note =
    noteInput
      ? noteInput.value.trim()
      : "";


  if (!Number.isInteger(points) || points <= 0) {

    message.textContent =
      "Enter a valid number of points.";

    return;
  }


  if (!rewardType) {

    message.textContent =
      "Select a reward type.";

    return;
  }


  try {

    const user =
      await requireLogin();

    if (!user) {
      return;
    }


    if (!window.supabaseClient) {
      throw new Error(
        "Supabase client is not available."
      );
    }


    if (button) {
      button.disabled = true;
      button.textContent =
        "Submitting...";
    }

    message.textContent =
      "Submitting reward request...";


    const { data, error } =
      await window.supabaseClient.rpc(
        "create_redemption_request",
        {
          p_points: points,
          p_reward_type: rewardType,
          p_user_note: note || null
        }
      );


    if (error) {
      throw error;
    }


    console.log(
      "PULSE reward request created:",
      data
    );


    message.textContent =
      "Reward request submitted successfully.";


    amountInput.value = "";
    rewardTypeInput.value = "";

    if (noteInput) {
      noteInput.value = "";
    }


    await loadDashboard();


  } catch (error) {

    console.error(
      "Reward request error:",
      error
    );


    message.textContent =
      "Unable to submit reward request: " +
      (error.message || "Unknown error");

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent =
        "Request Reward";
    }
  }
}


// -----------------------------
// SIGN OUT
// -----------------------------

async function handleLogout() {

  const button =
    document.getElementById("logoutBtn");


  if (button) {
    button.disabled = true;
    button.textContent =
      "Signing Out...";
  }


  try {

    const success =
      await signOut();

    if (!success) {
      throw new Error(
        "Sign out failed."
      );
    }

  } catch (error) {

    console.error(
      "Dashboard sign-out error:",
      error
    );

    if (button) {
      button.disabled = false;
      button.textContent =
        "Sign Out";
    }

    alert(
      "Unable to sign out. Please try again."
    );
  }
}


// -----------------------------
// MARK NOTIFICATIONS READ
// -----------------------------

async function markNotificationsRead() {

  const button =
    document.getElementById(
      "markNotificationsRead"
    );


  try {

    const user =
      await requireLogin();

    if (!user) {
      return;
    }


    if (!window.supabaseClient) {
      throw new Error(
        "Supabase client is not available."
      );
    }


    if (button) {
      button.disabled = true;
      button.textContent =
        "Updating...";
    }


    const { error } =
      await window.supabaseClient
        .from("notifications")
        .update({
          read: true
        })
        .eq("user_id", user.id)
        .eq("read", false);


    if (error) {
      throw error;
    }


    if (button) {
      button.textContent =
        "Marked Read";
    }


    await loadDashboard();


  } catch (error) {

    console.error(
      "Mark notifications read error:",
      error
    );


    if (button) {
      button.disabled = false;
      button.textContent =
        "Mark Read";
    }


    alert(
      "Unable to update notifications."
    );
  }
}


// -----------------------------
// DASHBOARD ERROR
// -----------------------------

function showDashboardError(message) {

  const ids = [
    "balance",
    "totalEarned",
    "pendingWithdrawal",
    "availableBalance"
  ];


  ids.forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = "—";
    }
  });


  const profile =
    document.getElementById("profile");


  if (profile) {
    profile.innerHTML =
      `<p>${escapeHTML(message)}</p>`;
  }
}


// -----------------------------
// DATE
// -----------------------------

function formatDate(value) {

  if (!value) {
    return "Unknown";
  }


  const date =
    new Date(value);


  if (Number.isNaN(
    date.getTime()
  )) {
    return "Unknown";
  }


  return date.toLocaleString();
}


// -----------------------------
// HTML SAFETY
// -----------------------------

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}