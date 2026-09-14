/* =========================
   PULSE APP
========================= */

const { createClient } = supabase;

const db = createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);


/* =========================
   HELPERS
========================= */

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function msg(element, text) {
  if (element) {
    element.textContent = text;
  }
}


/* =========================
   AUTH DISPLAY
========================= */

async function updateAuthState() {

  const {
    data: { user }
  } = await db.auth.getUser();

  if (user) {

    if ($("auth")) {
      $("auth").hidden = true;
    }

    if ($("dashboard")) {
      $("dashboard").hidden = false;
    }

  } else {

    if ($("auth")) {
      $("auth").hidden = false;
    }

    if ($("dashboard")) {
      $("dashboard").hidden = true;
    }
  }
}


/* =========================
   PROFILE
========================= */

async function loadProfile() {

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const { data, error } = await db
    .from("profiles")
    .select("points,name,role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  const balance = $("balance") || $("points");

  if (balance) {
    balance.textContent = data?.points ?? 0;
  }
}


/* =========================
   TASKS
========================= */

async function loadTasks() {

  const box = $("tasks");

  if (!box) return;

  const { data, error } = await db
    .from("tasks")
    .select("id,title,description,points,status")
    .eq("status", "active")
    .order("created_at", {
      ascending: false
    });

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load tasks.
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;

    return;
  }

  if (!data?.length) {

    box.innerHTML = `
      <div class="empty-card">
        <strong>No tasks available.</strong>
        <small>Check back later.</small>
      </div>
    `;

    return;
  }

  box.innerHTML = data.map(task => `

    <div class="task-card">

      <div class="task-icon">
        ⚡
      </div>

      <div class="task-info">

        <strong>
          ${escapeHtml(task.title)}
        </strong>

        <small>
          ${escapeHtml(task.description || "")}
        </small>

        <span class="task-points">
          +${task.points} pts
        </span>

      </div>

      <button
        class="gradient-button task-submit"
        data-id="${task.id}"
        type="button"
      >
        Submit
      </button>

    </div>

  `).join("");

  box.querySelectorAll(".task-submit")
    .forEach(button => {

      button.onclick = () => {

        submitTask(
          Number(button.dataset.id)
        );

      };

    });
}


/* =========================
   SUBMIT TASK
========================= */

window.submitTask = async function(taskId) {

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const proof = prompt(
    "Enter your proof or note for this task:"
  );

  if (proof === null) return;

  const { error } = await db
    .from("task_submissions")
    .insert({
      task_id: taskId,
      user_id: user.id,
      proof: proof.trim() || null
    });

  if (error) {

    alert(error.message);

    return;
  }

  alert(
    "Task submitted. Your submission is now pending review."
  );

  await refresh();
};


/* =========================
   SUBMISSIONS
========================= */

async function loadSubmissions() {

  const box = $("submissions");

  if (!box) return;

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const { data, error } = await db
    .from("task_submissions")
    .select(`
      id,
      task_id,
      proof,
      status,
      submitted_at,
      reviewed_at,
      tasks (
        title,
        points
      )
    `)
    .eq("user_id", user.id)
    .order("submitted_at", {
      ascending: false
    });

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load submissions.
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;

    return;
  }

  if (!data?.length) {

    box.innerHTML = `
      <div class="empty-card">
        No submissions yet.
      </div>
    `;

    return;
  }

  box.innerHTML = data.map(item => `

    <div class="history-row">

      <div>

        <strong>
          ${escapeHtml(
            item.tasks?.title || "Task"
          )}
        </strong>

        <small>
          ${item.tasks?.points ?? 0} points
        </small>

        <small>
          ${escapeHtml(item.status)}
        </small>

      </div>

      <span class="status-pill">
        ${escapeHtml(item.status)}
      </span>

    </div>

  `).join("");
}


/* =========================
   POINTS ACTIVITY
========================= */

async function loadActivity() {

  const box = $("activity");

  if (!box) return;

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const { data, error } = await db
    .from("points_ledger")
    .select(`
      id,
      amount,
      reason,
      created_at,
      submission_id
    `)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load activity.
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;

    return;
  }

  if (!data?.length) {

    box.innerHTML = `
      <div class="empty-card">
        No points activity yet.
      </div>
    `;

    return;
  }

  box.innerHTML = data.map(item => `

    <div class="history-row">

      <div>

        <strong>
          ${escapeHtml(item.reason)}
        </strong>

        <small>
          ${new Date(
            item.created_at
          ).toLocaleString()}
        </small>

      </div>

      <strong>
        ${item.amount > 0 ? "+" : ""}
        ${item.amount}
      </strong>

    </div>

  `).join("");
}


/* =========================
   REDEMPTIONS
========================= */

async function loadRedemptions() {

  const box = $("redemptions");

  if (!box) return;

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const { data, error } = await db
    .from("redemption_requests")
    .select(`
      id,
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
    });

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load rewards.
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;

    return;
  }

  if (!data?.length) {

    box.innerHTML = `
      <div class="empty-card">
        No rewards requested yet.
      </div>
    `;

    return;
  }

  box.innerHTML = data.map(item => `

    <div class="history-row">

      <div>

        <strong>
          ${item.points_requested} points
        </strong>

        <small>
          Request #${item.id}
        </small>

        <small>
          ${escapeHtml(
            item.reward_type || "manual_reward"
          )}
        </small>

      </div>

      <span class="status-pill">
        ${escapeHtml(item.status)}
      </span>

    </div>

  `).join("");
}


/* =========================
   NOTIFICATIONS
========================= */

async function loadNotifications() {

  const box = $("notifications");

  if (!box) return;

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const { data, error } = await db
    .from("notifications")
    .select(`
      id,
      title,
      message,
      type,
      read,
      created_at
    `)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load notifications.
      </div>
    `;

    return;
  }

  const unread =
    (data || []).filter(
      item => !item.read
    ).length;

  if ($("notificationCount")) {

    $("notificationCount").textContent =
      unread;

    $("notificationCount").hidden =
      unread === 0;
  }

  if (!data?.length) {

    box.innerHTML = `
      <div class="empty-card">
        No notifications.
      </div>
    `;

    return;
  }

  box.innerHTML = data.map(item => `

    <div class="notification-row">

      <div>

        <strong>
          ${escapeHtml(item.title)}
        </strong>

        <small>
          ${escapeHtml(item.message)}
        </small>

      </div>

      ${
        item.read
          ? ""
          : `<span class="unread-dot"></span>`
      }

    </div>

  `).join("");
}


/* =========================
   MARK NOTIFICATIONS READ
========================= */

function setupNotificationButton() {

  const button = $("markNotificationsRead");

  if (!button) return;

  button.onclick = async () => {

    const {
      data: { user }
    } = await db.auth.getUser();

    if (!user) return;

    const { error } = await db
      .from("notifications")
      .update({
        read: true
      })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {

      alert(error.message);

      return;
    }

    await loadNotifications();
  };
}


/* =========================
   SIGN UP
========================= */

function setupSignup() {

  const button = $("signup");

  if (!button) return;

  button.onclick = async () => {

    const email =
      $("email").value.trim();

    const password =
      $("password").value;

    if (!email || !password) {

      msg(
        $("authMsg"),
        "Enter an email and password."
      );

      return;
    }

    msg(
      $("authMsg"),
      "Creating account..."
    );

    const { error } =
      await db.auth.signUp({
        email,
        password
      });

    msg(
      $("authMsg"),
      error
        ? error.message
        : "Account created. Check your email if confirmation is enabled."
    );
  };
}


/* =========================
   LOGIN
========================= */

function setupLogin() {

  const button = $("login");

  if (!button) return;

  button.onclick = async () => {

    const email =
      $("email").value.trim();

    const password =
      $("password").value;

    if (!email || !password) {

      msg(
        $("authMsg"),
        "Enter an email and password."
      );

      return;
    }

    msg(
      $("authMsg"),
      "Signing in..."
    );

    const { error } =
      await db.auth.signInWithPassword({
        email,
        password
      });

    msg(
      $("authMsg"),
      error
        ? error.message
        : "Signed in."
    );

    if (!error) {
      await refresh();
    }
  };
}


/* =========================
   SIGN OUT
========================= */

function setupSignOut() {

  const button = $("logout");

  if (!button) {
    console.warn(
      "PULSE: Sign Out button #logout was not found."
    );
    return;
  }

  button.onclick = async () => {

    button.disabled = true;

    try {

      const { error } =
        await db.auth.signOut();

      if (error) {

        console.error(error);

        alert(
          "Unable to sign out: " +
          error.message
        );

        button.disabled = false;

        return;
      }

      await updateAuthState();

    } catch (error) {

      console.error(error);

      alert(
        "Unable to sign out."
      );

      button.disabled = false;
    }
  };
}


/* =========================
   FORGOT PASSWORD
========================= */

function setupForgotPassword() {

  const button = $("forgotPassword");

  if (!button) return;

  button.onclick =
    async () => {

      const email =
        $("email").value.trim();

      if (!email) {

        msg(
          $("authMsg"),
          "Enter your email first."
        );

        return;
      }

      msg(
        $("authMsg"),
        "Sending password reset link..."
      );

      const { error } =
        await db.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              window.location.origin +
              window.location.pathname
          }
        );

      msg(
        $("authMsg"),
        error
          ? error.message
          : "Password reset link sent. Check your email."
      );
    };
}


/* =========================
   PASSWORD RECOVERY SCREEN
========================= */

function showPasswordReset() {

  if ($("auth")) {
    $("auth").hidden = true;
  }

  if ($("dashboard")) {
    $("dashboard").hidden = true;
  }

  if ($("resetPasswordPanel")) {
    $("resetPasswordPanel").hidden = false;
  }
}


/* =========================
   UPDATE PASSWORD
========================= */

function setupPasswordReset() {

  const button = $("resetPassword");

  if (!button) return;

  button.onclick =
    async () => {

      const newPassword =
        $("newPassword").value;

      const confirmPassword =
        $("confirmPassword").value;

      if (!newPassword || !confirmPassword) {

        msg(
          $("resetMsg"),
          "Enter and confirm your new password."
        );

        return;
      }

      if (newPassword.length < 6) {

        msg(
          $("resetMsg"),
          "Password must be at least 6 characters."
        );

        return;
      }

      if (newPassword !== confirmPassword) {

        msg(
          $("resetMsg"),
          "Passwords do not match."
        );

        return;
      }

      msg(
        $("resetMsg"),
        "Updating password..."
      );

      const { error } =
        await db.auth.updateUser({
          password: newPassword
        });

      if (error) {

        msg(
          $("resetMsg"),
          error.message
        );

        return;
      }

      msg(
        $("resetMsg"),
        "Password updated successfully."
      );

      $("newPassword").value = "";
      $("confirmPassword").value = "";

      setTimeout(async () => {

        if ($("resetPasswordPanel")) {
          $("resetPasswordPanel").hidden = true;
        }

        await refresh();

      }, 1200);
    };
}


/* =========================
   REDEEM
========================= */

function setupRedeem() {

  const button = $("redeem");

  if (!button) return;

  button.onclick = async () => {

    const amount =
      Number($("redeemAmount").value);

    const note =
      $("redeemNote").value.trim();

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {

      msg(
        $("redeemMsg"),
        "Enter a valid point amount."
      );

      return;
    }

    msg(
      $("redeemMsg"),
      "Submitting reward request..."
    );

    const { error } =
      await db.rpc(
        "create_redemption_request",
        {
          p_points: amount,
          p_reward_type:
            "manual_reward",
          p_user_note:
            note || null
        }
      );

    if (error) {

      msg(
        $("redeemMsg"),
        error.message
      );

      return;
    }

    $("redeemAmount").value = "";
    $("redeemNote").value = "";

    msg(
      $("redeemMsg"),
      "Reward request submitted."
    );

    await loadRedemptions();
    await loadNotifications();
  };
}


/* =========================
   REFRESH
========================= */

async function refresh() {

  const {
    data: { user }
  } = await db.auth.getUser();

  await updateAuthState();

  if (!user) return;

  await Promise.all([
    loadProfile(),
    loadTasks(),
    loadSubmissions(),
    loadActivity(),
    loadRedemptions(),
    loadNotifications()
  ]);
}


/* =========================
   SETUP FRONTEND EVENTS
========================= */

function setupAppEvents() {

  setupSignup();
  setupLogin();
  setupSignOut();
  setupForgotPassword();
  setupPasswordReset();
  setupRedeem();
  setupNotificationButton();
}


/* =========================
   AUTH STATE
========================= */

db.auth.onAuthStateChange(
  async (event, session) => {

    if (
      event === "PASSWORD_RECOVERY"
    ) {

      showPasswordReset();

      return;
    }

    await updateAuthState();

    if (session) {
      await refresh();
    }
  }
);


/* =========================
   START
========================= */

window.addEventListener(
  "load",
  async () => {

    setupAppEvents();

    await refresh();

  }
);