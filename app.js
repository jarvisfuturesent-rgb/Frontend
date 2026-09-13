const { createClient } = supabase;

const db = createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const $ = (id) => document.getElementById(id);

function msg(el, text) {
  if (el) el.textContent = text;
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );
}


/* =========================
   PROFILE
========================= */

async function loadProfile(user) {

  const { data, error } = await db
    .from("profiles")
    .select("name,points,role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  $("points").textContent = data?.points ?? 0;

  return data;
}


/* =========================
   TASKS
========================= */

async function loadTasks() {

  const box = $("tasks");

  box.innerHTML = `
    <div class="loading">
      Loading tasks...
    </div>
  `;

  const { data, error } = await db
    .from("tasks")
    .select("id,title,description,points,status")
    .eq("status", "active")
    .order("created_at", { ascending: false });

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
        <strong>No active tasks yet.</strong>
        <small>New opportunities will appear here.</small>
      </div>
    `;

    return;
  }

  box.innerHTML = data.map(task => `

    <article class="task">

      <div class="task-main">

        <div class="task-title-row">

          <h3>${escapeHtml(task.title)}</h3>

          <span class="points-badge">
            +${task.points} pts
          </span>

        </div>

        <p>
          ${escapeHtml(task.description || "Complete this task to earn points.")}
        </p>

      </div>

      <button
        class="task-button"
        onclick="submitTask(${task.id})"
      >
        Submit Task
      </button>

    </article>

  `).join("");
}


/* =========================
   SUBMIT TASK
========================= */

window.submitTask = async (taskId) => {

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) {
    alert("Please sign in first.");
    return;
  }

  const proof = prompt(
    "Enter proof or a short note for this task:"
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

  alert("Task submitted for review.");

  await loadTasks();
  await loadSubmissions(user);
  await loadNotifications(user);
};


/* =========================
   SUBMISSIONS
========================= */

async function loadSubmissions(user) {

  const box = $("submissions");

  const { data, error } = await db
    .from("task_submissions")
    .select(`
      id,
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
    .order("submitted_at", { ascending: false })
    .limit(10);

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load submissions.
      </div>
    `;

    console.error(error);
    return;
  }

  if (!data?.length) {

    box.innerHTML = `
      <div class="empty-card">
        <strong>No submissions yet.</strong>
        <small>Complete a task and your submission will appear here.</small>
      </div>
    `;

    return;
  }

  box.innerHTML = data.map(item => {

    const status = item.status || "pending";

    return `
      <div class="history-row">

        <div>
          <strong>
            ${escapeHtml(item.tasks?.title || "Task")}
          </strong>

          <small>
            ${item.tasks?.points ?? 0} points
          </small>
        </div>

        <span class="status-pill ${status}">
          ${status}
        </span>

      </div>
    `;

  }).join("");
}


/* =========================
   POINT ACTIVITY
========================= */

async function loadActivity(user) {

  const box = $("activity");

  const { data, error } = await db
    .from("points_ledger")
    .select("amount,reason,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load activity.
      </div>
    `;

    console.error(error);
    return;
  }

  if (!data?.length) {

    box.innerHTML = `
      <div class="empty-card">
        <strong>No point activity yet.</strong>
      </div>
    `;

    return;
  }

  box.innerHTML = data.map(item => {

    const positive = Number(item.amount) > 0;

    return `
      <div class="history-row">

        <div>
          <strong>
            ${escapeHtml(item.reason || "Points")}
          </strong>

          <small>
            ${new Date(item.created_at).toLocaleString()}
          </small>
        </div>

        <strong class="${positive ? "amount-positive" : "amount-negative"}">
          ${positive ? "+" : ""}${item.amount}
        </strong>

      </div>
    `;

  }).join("");
}


/* =========================
   REDEMPTIONS
========================= */

async function loadRedemptions(user) {

  const box = $("redemptions");

  const { data, error } = await db
    .from("redemption_requests")
    .select("id,points_requested,reward_type,status,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load rewards.
      </div>
    `;

    console.error(error);
    return;
  }

  if (!data?.length) {

    box.innerHTML = `
      <div class="empty-card">
        <strong>No reward requests yet.</strong>
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
          ${new Date(item.created_at).toLocaleString()}
        </small>
      </div>

      <span class="status-pill ${item.status}">
        ${escapeHtml(item.status)}
      </span>

    </div>

  `).join("");
}


/* =========================
   NOTIFICATIONS
========================= */

async function loadNotifications(user) {

  const box = $("notifications");

  const { data, error } = await db
    .from("notifications")
    .select("id,title,message,read,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {

    box.textContent = "Unable to load notifications.";

    console.error(error);
    return;
  }

  const unread = data?.filter(n => !n.read).length || 0;

  $("notificationCount").textContent = unread;

  $("notificationCount").hidden = unread === 0;

  if (!data?.length) {
    box.innerHTML = `
      <div class="empty-card">
        <strong>You're all caught up.</strong>
        <small>No notifications yet.</small>
      </div>
    `;
    return;
  }

  box.innerHTML = data.map(n => `

    <div class="notice ${n.read ? "read" : "unread"}">

      <div>

        <b>${escapeHtml(n.title)}</b>

        <p>
          ${escapeHtml(n.message)}
        </p>

        <small>
          ${new Date(n.created_at).toLocaleString()}
        </small>

      </div>

    </div>

  `).join("");
}


/* =========================
   MARK NOTIFICATIONS READ
========================= */

if ($("markNotificationsRead")) {

  $("markNotificationsRead").onclick = async () => {

    const {
      data: { user }
    } = await db.auth.getUser();

    if (!user) return;

    const { error } = await db
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      console.error(error);
      return;
    }

    await loadNotifications(user);
  };
}


/* =========================
   SIGN UP
========================= */

if ($("signup")) {

  $("signup").onclick = async () => {

    const email = $("email").value.trim();
    const password = $("password").value;

    if (!email || !password) {

      msg(
        $("authMsg"),
        "Enter an email and password."
      );

      return;
    }

    msg($("authMsg"), "Creating account...");

    const { error } = await db.auth.signUp({
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

if ($("login")) {

  $("login").onclick = async () => {

    const email = $("email").value.trim();
    const password = $("password").value;

    if (!email || !password) {

      msg(
        $("authMsg"),
        "Enter an email and password."
      );

      return;
    }

    msg($("authMsg"), "Signing in...");

    const { error } = await db.auth.signInWithPassword({
      email,
      password
    });

    msg(
      $("authMsg"),
      error ? error.message : "Signed in."
    );
  };
}


/* =========================
   LOGOUT
========================= */

if ($("logout")) {

  $("logout").onclick = async () => {
    await db.auth.signOut();
  };
}


/* =========================
   REDEMPTION
========================= */

if ($("redeem")) {

  $("redeem").onclick = async () => {

    const {
      data: { user }
    } = await db.auth.getUser();

    if (!user) {

      msg(
        $("redeemMsg"),
        "Please sign in first."
      );

      return;
    }

    const amount = Number(
      $("redeemAmount").value
    );

    const note = $("redeemNote").value.trim();

    if (!Number.isInteger(amount) || amount <= 0) {

      msg(
        $("redeemMsg"),
        "Enter a valid point amount."
      );

      return;
    }

    msg(
      $("redeemMsg"),
      "Checking your points..."
    );

    const { error } = await db.rpc(
      "create_redemption_request",
      {
        p_points: amount,
        p_reward_type: "manual_reward",
        p_user_note: note || null
      }
    );

    if (error) {

      console.error(error);

      msg(
        $("redeemMsg"),
        error.message
      );

      return;
    }

    msg(
      $("redeemMsg"),
      "Reward request submitted for review."
    );

    $("redeemAmount").value = "";
    $("redeemNote").value = "";

    await loadProfile(user);
    await loadRedemptions(user);
    await loadActivity(user);
    await loadNotifications(user);
  };
}


/* =========================
   REFRESH
========================= */

async function refresh() {

  const {
    data: { user },
    error
  } = await db.auth.getUser();

  if (error) {
    console.error(error);
  }

  $("auth").hidden = !!user;
  $("dashboard").hidden = !user;

  if (!user) return;

  try {
    await loadProfile(user);
  } catch (e) {
    console.error("Profile:", e);
  }

  try {
    await loadTasks();
  } catch (e) {
    console.error("Tasks:", e);
  }

  try {
    await loadSubmissions(user);
  } catch (e) {
    console.error("Submissions:", e);
  }

  try {
    await loadActivity(user);
  } catch (e) {
    console.error("Activity:", e);
  }

  try {
    await loadRedemptions(user);
  } catch (e) {
    console.error("Redemptions:", e);
  }

  try {
    await loadNotifications(user);
  } catch (e) {
    console.error("Notifications:", e);
  }
}


/* =========================
   AUTH STATE
========================= */

db.auth.onAuthStateChange(() => {
  setTimeout(refresh, 0);
});


/* =========================
   START
========================= */

refresh();