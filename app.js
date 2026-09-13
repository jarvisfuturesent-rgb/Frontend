const { createClient } = supabase;

const db = createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const $ = (id) => document.getElementById(id);

function msg(el, text) {
  if (el) el.textContent = text;
}


// =========================
// PROFILE
// =========================

async function loadProfile(user) {
  const { data, error } = await db
    .from("profiles")
    .select("name,points,role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  if ($("points")) {
    $("points").textContent = data?.points ?? 0;
  }

  if ($("userEmail")) {
    $("userEmail").textContent = user.email || "-";
  }

  return data;
}


// =========================
// TASKS
// =========================

async function loadTasks() {
  const taskBox = $("tasks");

  if (!taskBox) {
    console.error("Tasks element not found.");
    return;
  }

  taskBox.textContent = "Loading tasks...";

  const { data, error } = await db
    .from("tasks")
    .select("id,title,description,points,status")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Task loading error:", error);
    taskBox.innerHTML = `
      <p>Unable to load tasks.</p>
      <small>${escapeHtml(error.message)}</small>
    `;
    return;
  }

  if (!data || data.length === 0) {
    taskBox.innerHTML = "<p>No active tasks yet.</p>";
    return;
  }

  taskBox.innerHTML = data.map(task => `
    <article class="task">
      <div>
        <h3>${escapeHtml(task.title)}</h3>
        <p>${escapeHtml(task.description || "")}</p>
      </div>

      <strong>${task.points} pts</strong>

      <button onclick="submitTask(${task.id})">
        Submit
      </button>
    </article>
  `).join("");
}


// =========================
// SUBMIT TASK
// =========================

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
      proof: proof || null
    });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Task submitted for review.");

  await loadTasks();
  await loadNotifications(user);
};


// =========================
// NOTIFICATIONS
// =========================

async function loadNotifications(user) {
  const box = $("notifications");

  if (!box) return;

  const { data, error } = await db
    .from("notifications")
    .select("title,message,read,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Notification error:", error);
    box.textContent = error.message;
    return;
  }

  box.innerHTML = data?.length
    ? data.map(n => `
        <div class="notice">
          <b>${escapeHtml(n.title)}</b><br>
          ${escapeHtml(n.message)}
        </div>
      `).join("")
    : "None";
}


// =========================
// SIGN UP
// =========================

if ($("signup")) {
  $("signup").onclick = async () => {
    const email = $("email").value.trim();
    const password = $("password").value;

    if (!email || !password) {
      msg($("authMsg"), "Enter an email and password.");
      return;
    }

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


// =========================
// LOGIN
// =========================

if ($("login")) {
  $("login").onclick = async () => {
    const email = $("email").value.trim();
    const password = $("password").value;

    if (!email || !password) {
      msg($("authMsg"), "Enter an email and password.");
      return;
    }

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


// =========================
// LOGOUT
// =========================

if ($("logout")) {
  $("logout").onclick = async () => {
    await db.auth.signOut();
  };
}


// =========================
// SECURE REDEMPTION
// =========================

if ($("redeem")) {
  $("redeem").onclick = async () => {
    const {
      data: { user }
    } = await db.auth.getUser();

    if (!user) {
      msg($("redeemMsg"), "Please sign in first.");
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

    /*
      IMPORTANT:

      Do NOT insert directly into redemption_requests.

      This protected RPC checks the user's actual
      point balance and prevents requests for more
      points than the user has.
    */

    const { error } = await db.rpc(
      "create_redemption_request",
      {
        p_points: amount,
        p_reward_type: "manual_reward",
        p_user_note: note || null
      }
    );

    if (error) {
      console.error("Redemption error:", error);

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
    await loadNotifications(user);
  };
}


// =========================
// REFRESH APP
// =========================

async function refresh() {
  const {
    data: { user },
    error: authError
  } = await db.auth.getUser();

  if (authError) {
    console.error("Auth error:", authError);
  }

  const authBox = $("auth");
  const dashboard = $("dashboard");

  if (authBox) {
    authBox.hidden = !!user;
  }

  if (dashboard) {
    dashboard.hidden = !user;
  }

  if (!user) return;


  // Profile is independent.
  try {
    await loadProfile(user);
  } catch (error) {
    console.error("Profile error:", error);

    if ($("points")) {
      $("points").textContent = "0";
    }
  }


  // Tasks ALWAYS get their own attempt.
  // A profile problem cannot stop tasks from loading.
  try {
    await loadTasks();
  } catch (error) {
    console.error("Tasks error:", error);

    if ($("tasks")) {
      $("tasks").innerHTML = `
        <p>Unable to load tasks.</p>
        <small>${escapeHtml(error.message)}</small>
      `;
    }
  }


  // Notifications are also independent.
  try {
    await loadNotifications(user);
  } catch (error) {
    console.error("Notifications error:", error);
  }
}


// =========================
// AUTH STATE
// =========================

db.auth.onAuthStateChange(() => {
  setTimeout(refresh, 0);
});


// =========================
// INITIAL LOAD
// =========================

refresh();


// =========================
// HTML ESCAPE
// =========================

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