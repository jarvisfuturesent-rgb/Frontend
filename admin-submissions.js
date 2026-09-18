// PULSE — Admin Submission Review
// Controls admin-submissions.html only.

document.addEventListener("DOMContentLoaded", () => {
  loadAdminSubmissions();
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

async function loadAdminSubmissions() {
  const container = document.getElementById("adminSubmissions");

  if (!container) {
    console.error("adminSubmissions element not found.");
    return;
  }

  container.innerHTML = "<p>Loading submissions...</p>";

  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      container.innerHTML = `
        <p>Access denied.</p>
        <a href="dashboard.html">Return to Dashboard</a>
      `;
      return;
    }

    const { data: submissions, error } =
      await window.supabaseClient
        .from("task_submissions")
        .select(`
          id,
          user_id,
          task_id,
          survey_answers,
          status,
          reviewer_note,
          rejection_reason,
          reviewed_at,
          created_at
        `)
        .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!submissions || submissions.length === 0) {
      container.innerHTML = "<p>No submissions found.</p>";
      return;
    }

    const taskIds = [
      ...new Set(
        submissions
          .map(submission => submission.task_id)
          .filter(id => id !== null)
      )
    ];

    let tasksById = {};

    if (taskIds.length > 0) {
      const { data: tasks, error: tasksError } =
        await window.supabaseClient
          .from("tasks")
          .select("id, title, points")
          .in("id", taskIds);

      if (tasksError) {
        throw tasksError;
      }

      (tasks || []).forEach(task => {
        tasksById[task.id] = task;
      });
    }

    container.innerHTML = submissions
      .map(submission =>
        renderSubmission(
          submission,
          tasksById[submission.task_id]
        )
      )
      .join("");

    document
      .querySelectorAll("[data-submission-action]")
      .forEach(button => {
        button.addEventListener("click", () => {
          const submissionId =
            button.getAttribute("data-submission-id");

          const action =
            button.getAttribute("data-submission-action");

          if (action === "approve") {
            approveSubmission(submissionId);
          }

          if (action === "reject") {
            rejectSubmission(submissionId);
          }
        });
      });

  } catch (error) {
    console.error("Admin submission loading error:", error);

    container.innerHTML = `
      <p>Unable to load submissions.</p>
      <p>Please try again.</p>
    `;
  }
}

function renderSubmission(submission, task) {
  const status = submission.status || "pending";

  const taskTitle = task
    ? task.title
    : `Task #${submission.task_id ?? "Unknown"}`;

  const taskPoints = task
    ? Number(task.points)
    : 0;

  const answers = renderAnswers(submission.survey_answers);

  const reviewInfo =
    submission.reviewed_at
      ? `
        <p>
          <strong>Reviewed:</strong>
          ${formatDate(submission.reviewed_at)}
        </p>
      `
      : "";

  const reviewerNote =
    submission.reviewer_note
      ? `
        <p>
          <strong>Reviewer Note:</strong>
          ${escapeHTML(submission.reviewer_note)}
        </p>
      `
      : "";

  const rejectionReason =
    submission.rejection_reason
      ? `
        <p>
          <strong>Rejection Reason:</strong>
          ${escapeHTML(submission.rejection_reason)}
        </p>
      `
      : "";

  const actionButtons =
    status === "pending"
      ? `
        <button
          type="button"
          data-submission-action="approve"
          data-submission-id="${submission.id}"
        >
          Approve
        </button>

        <button
          type="button"
          data-submission-action="reject"
          data-submission-id="${submission.id}"
        >
          Reject
        </button>
      `
      : "";

  return `
    <div class="submission-card">

      <h3>${escapeHTML(taskTitle)}</h3>

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
        ${taskPoints}
      </p>

      <p>
        <strong>Status:</strong>
        ${escapeHTML(status)}
      </p>

      <p>
        <strong>Submitted:</strong>
        ${formatDate(submission.created_at)}
      </p>

      <div class="submission-answers">
        <strong>Survey Answers:</strong>
        ${answers}
      </div>

      ${reviewInfo}
      ${reviewerNote}
      ${rejectionReason}

      <div class="submission-actions">
        ${actionButtons}
      </div>

    </div>
  `;
}

function renderAnswers(answers) {
  if (!answers) {
    return "<p>No survey answers recorded.</p>";
  }

  if (typeof answers === "object") {
    const entries = Object.entries(answers);

    if (entries.length === 0) {
      return "<p>No survey answers recorded.</p>";
    }

    return `
      <ul>
        ${entries
          .map(([question, answer]) => `
            <li>
              <strong>${escapeHTML(question)}:</strong>
              ${escapeHTML(
                typeof answer === "object"
                  ? JSON.stringify(answer)
                  : answer
              )}
            </li>
          `)
          .join("")}
      </ul>
    `;
  }

  return `<p>${escapeHTML(answers)}</p>`;
}

async function approveSubmission(submissionId) {
  if (!submissionId) {
    return;
  }

  if (!confirm("Approve this submission?")) {
    return;
  }

  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      alert("Access denied.");
      return;
    }

    const { data, error } =
      await window.supabaseClient
        .rpc("approve_task_submission", {
          submission_id: Number(submissionId)
        });

    if (error) {
      throw error;
    }

    console.log("Submission approved:", data);

    await loadAdminSubmissions();

  } catch (error) {
    console.error("Approve submission error:", error);

    alert(
      "Unable to approve this submission. Please check the database approval function."
    );
  }
}

async function rejectSubmission(submissionId) {
  if (!submissionId) {
    return;
  }

  const reason = prompt(
    "Enter a reason for rejecting this submission:"
  );

  if (reason === null) {
    return;
  }

  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    alert("A rejection reason is required.");
    return;
  }

  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      alert("Access denied.");
      return;
    }

    const { data, error } =
      await window.supabaseClient
        .rpc("reject_task_submission", {
          submission_id: Number(submissionId),
          rejection_reason: trimmedReason
        });

    if (error) {
      throw error;
    }

    console.log("Submission rejected:", data);

    await loadAdminSubmissions();

  } catch (error) {
    console.error("Reject submission error:", error);

    alert(
      "Unable to reject this submission. Please check the database rejection function."
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