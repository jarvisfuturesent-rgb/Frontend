// PULSE — Admin Submission Review
// Controls admin-submissions.html only.

document.addEventListener("DOMContentLoaded", loadAdminSubmissions);

async function loadAdminSubmissions() {
  const container = document.getElementById("adminSubmissions");

  if (!container) {
    console.error("PULSE: #adminSubmissions was not found.");
    return;
  }

  container.innerHTML = "<p>Loading submissions...</p>";

  try {
    const supabase = getSupabaseClient();

    const user = await getLoggedInUser(supabase);

    if (!user) {
      showMessage(container, "Access Denied", "Please log in first.");
      return;
    }

    const isAdmin = await checkAdmin(supabase, user.id);

    if (!isAdmin) {
      showMessage(container, "Access Denied", "Admin access required.");
      return;
    }

    await loadSubmissions(supabase, container);

  } catch (error) {
    console.error("PULSE Submission Review Error:", error);

    container.innerHTML = `
      <div class="panel">
        <h3>Unable to Load Submissions</h3>
        <p>There was a problem loading the submission records.</p>
        <p>${escapeHTML(error.message || "Unknown error")}</p>
        <button onclick="location.reload()">Refresh</button>
      </div>
    `;
  }
}


function getSupabaseClient() {
  if (!window.supabaseClient) {
    throw new Error(
      "Supabase client is not available. Check config.js."
    );
  }

  return window.supabaseClient;
}


async function getLoggedInUser(supabase) {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user || null;
}


async function checkAdmin(supabase, userId) {
  const {
    data: profile,
    error
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return profile?.role === "admin";
}


async function loadSubmissions(supabase, container) {

  const [
    { data: submissions, error: submissionError },
    { data: tasks, error: taskError }
  ] = await Promise.all([

    supabase
      .from("task_submissions")
      .select(`
        id,
        user_id,
        task_id,
        survey_answers,
        status,
        reviewer_note,
        submitted_at,
        reviewed_at
      `)
      .order("submitted_at", {
        ascending: false
      }),

    supabase
      .from("tasks")
      .select(`
        id,
        title,
        points
      `)
  ]);

  if (submissionError) {
    throw submissionError;
  }

  if (taskError) {
    throw taskError;
  }

  const taskMap = {};

  (tasks || []).forEach(task => {
    taskMap[task.id] = task;
  });

  if (!submissions || submissions.length === 0) {
    container.innerHTML = `
      <div class="panel">
        <h3>Submission Records</h3>
        <p>No submissions found.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="panel">
      <h3>Submission Records</h3>
      <p>${submissions.length} submission(s) found.</p>
    </div>

    ${submissions
      .map(submission =>
        renderSubmission(
          submission,
          taskMap[submission.task_id]
        )
      )
      .join("")}
  `;
}


function renderSubmission(submission, task) {

  const status = String(
    submission.status || "pending"
  ).toLowerCase();

  const taskTitle =
    task?.title ||
    `Task #${submission.task_id}`;

  const points =
    task?.points ?? 0;

  return `
    <div class="panel submission-card">

      <h3>
        ${escapeHTML(taskTitle)}
      </h3>

      <p>
        <strong>Submission ID:</strong>
        ${submission.id}
      </p>

      <p>
        <strong>User ID:</strong>
        ${escapeHTML(submission.user_id)}
      </p>

      <p>
        <strong>Points:</strong>
        ${points}
      </p>

      <p>
        <strong>Status:</strong>
        ${escapeHTML(status)}
      </p>

      <p>
        <strong>Submitted:</strong>
        ${formatDate(submission.submitted_at)}
      </p>

      ${
        submission.reviewed_at
          ? `
            <p>
              <strong>Reviewed:</strong>
              ${formatDate(submission.reviewed_at)}
            </p>
          `
          : ""
      }

      ${
        submission.reviewer_note
          ? `
            <p>
              <strong>Reviewer Note:</strong>
              ${escapeHTML(submission.reviewer_note)}
            </p>
          `
          : ""
      }

      <div class="submission-answers">
        <h4>Survey Answers</h4>
        ${renderAnswers(submission.survey_answers)}
      </div>

      ${
        status === "pending"
          ? `
            <div class="submission-actions">

              <button
                type="button"
                onclick="approveSubmission(${submission.id})"
              >
                Approve
              </button>

              <button
                type="button"
                onclick="rejectSubmission(${submission.id})"
              >
                Reject
              </button>

            </div>
          `
          : ""
      }

    </div>
  `;
}


function renderAnswers(answers) {

  if (!answers) {
    return "<p>No answers recorded.</p>";
  }

  let parsed = answers;

  if (typeof answers === "string") {
    try {
      parsed = JSON.parse(answers);
    } catch {
      return `
        <pre>${escapeHTML(answers)}</pre>
      `;
    }
  }

  if (
    typeof parsed !== "object" ||
    parsed === null
  ) {
    return `
      <p>${escapeHTML(String(parsed))}</p>
    `;
  }

  const entries = Object.entries(parsed);

  if (entries.length === 0) {
    return "<p>No answers recorded.</p>";
  }

  return `
    <div class="answers-list">
      ${entries
        .map(([question, answer]) => `
          <div class="answer-item">

            <p>
              <strong>
                ${escapeHTML(question)}
              </strong>
            </p>

            <p>
              ${escapeHTML(formatAnswer(answer))}
            </p>

          </div>
        `)
        .join("")}
    </div>
  `;
}


function formatAnswer(value) {

  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}


async function approveSubmission(submissionId) {

  if (!confirm(
    "Approve this submission and award its points?"
  )) {
    return;
  }

  try {

    const supabase = getSupabaseClient();

    const {
      error
    } = await supabase.rpc(
      "add_points_for_approved_submission",
      {
        p_submission_id: Number(submissionId)
      }
    );

    if (error) {
      throw error;
    }

    alert("Submission approved and points processed.");

    location.reload();

  } catch (error) {

    console.error(
      "PULSE Approve Submission Error:",
      error
    );

    alert(
      "Unable to approve submission: " +
      (error.message || "Unknown error")
    );
  }
}


async function rejectSubmission(submissionId) {

  const note = prompt(
    "Enter a reason for rejecting this submission:"
  );

  if (note === null) {
    return;
  }

  try {

    const supabase = getSupabaseClient();

    const {
      error
    } = await supabase
      .from("task_submissions")
      .update({
        status: "rejected",
        reviewer_note: note.trim(),
        reviewed_at: new Date().toISOString()
      })
      .eq("id", Number(submissionId));

    if (error) {
      throw error;
    }

    alert("Submission rejected.");

    location.reload();

  } catch (error) {

    console.error(
      "PULSE Reject Submission Error:",
      error
    );

    alert(
      "Unable to reject submission: " +
      (error.message || "Unknown error")
    );
  }
}


function showMessage(container, title, message) {

  container.innerHTML = `
    <div class="panel">
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(message)}</p>
      <p>
        <a href="dashboard.html">
          Return to Dashboard
        </a>
      </p>
    </div>
  `;
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