const { createClient } = supabase;
const db = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const msg = (el, text) => el.textContent = text;

async function loadProfile(user) {
  const { data, error } = await db.from("profiles").select("name,points,role").eq("id", user.id).maybeSingle();
  if (error) throw error;
  $("points").textContent = data?.points ?? 0;
  $("userEmail").textContent = user.email || "-";
}

async function loadTasks() {
  const { data, error } = await db.from("tasks")
    .select("id,title,description,points,status")
    .eq("status","active")
    .order("created_at",{ascending:false});
  if (error) { $("tasks").textContent = error.message; return; }
  $("tasks").innerHTML = data?.length ? data.map(t => `
    <article class="task">
      <div><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.description || "")}</p></div>
      <strong>${t.points} pts</strong>
      <button onclick="submitTask(${t.id})">Submit</button>
    </article>`).join("") : "<p>No active tasks yet.</p>";
}

async function loadNotifications(user) {
  const { data, error } = await db.from("notifications")
    .select("title,message,read,created_at")
    .eq("user_id",user.id)
    .order("created_at",{ascending:false})
    .limit(10);
  if (error) { $("notifications").textContent = error.message; return; }
  $("notifications").innerHTML = data?.length ? data.map(n =>
    `<div class="notice"><b>${escapeHtml(n.title)}</b><br>${escapeHtml(n.message)}</div>`
  ).join("") : "None";
}

window.submitTask = async (taskId) => {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  const proof = prompt("Enter proof or a short note for this task:");
  if (proof === null) return;
  const { error } = await db.from("task_submissions").insert({
    task_id: taskId, user_id: user.id, proof: proof || null
  });
  alert(error ? error.message : "Task submitted for review.");
};

$("signup").onclick = async () => {
  const { error } = await db.auth.signUp({email:$("email").value.trim(), password:$("password").value});
  msg($("authMsg"), error ? error.message : "Account created. Check your email if confirmation is enabled.");
};

$("login").onclick = async () => {
  const { error } = await db.auth.signInWithPassword({email:$("email").value.trim(), password:$("password").value});
  msg($("authMsg"), error ? error.message : "Signed in.");
};

$("logout").onclick = () => db.auth.signOut();

$("redeem").onclick = async () => {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  const amount = Number($("redeemAmount").value);
  if (!Number.isInteger(amount) || amount <= 0) {
    msg($("redeemMsg"), "Enter a valid point amount.");
    return;
  }
  const { error } = await db.from("redemption_requests").insert({
    user_id:user.id,
    points_requested:amount,
    reward_type:"manual_reward",
    user_note:$("redeemNote").value.trim() || null
  });
  msg($("redeemMsg"), error ? error.message : "Redemption request submitted.");
};

async function refresh() {
  const { data: { user } } = await db.auth.getUser();
  $("auth").hidden = !!user;
  $("dashboard").hidden = !user;
  if (!user) return;
  try {
    await loadProfile(user);
    await loadTasks();
    await loadNotifications(user);
  } catch (e) {
    console.error(e);
  }
}

db.auth.onAuthStateChange(() => setTimeout(refresh, 0));
refresh();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
