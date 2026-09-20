// PULSE — Admin Reports & Records
// Controls admin-reports.html only.

document.addEventListener(
  "DOMContentLoaded",
  initAdminReports
);


// ==============================
// INITIALIZE
// ==============================

async function initAdminReports() {

  try {

    if (!window.supabaseClient) {
      throw new Error(
        "Supabase client is not available."
      );
    }

    const user =
      await getCurrentUser();

    if (!user) {
      showAccessDenied();
      return;
    }

    const admin =
      await isAdmin(user.id);

    if (!admin) {
      showAccessDenied();
      return;
    }

    console.log(
      "PULSE: ADMIN REPORT ACCESS GRANTED"
    );

    await loadAdminReports(
      window.supabaseClient
    );

  } catch (error) {

    console.error(
      "PULSE Admin Reports Error:",
      error
    );

    showReportError(error);
  }
}


// ==============================
// LOAD REPORTS
// ==============================

async function loadAdminReports(
  supabase
) {

  await Promise.all([

    loadUserReport(supabase),

    loadTaskReport(supabase),

    loadSubmissionReport(supabase),

    loadBusinessReport(supabase),

    loadPendingReport(supabase),

    loadApprovedReport(supabase),

    loadSubmissionList(supabase),

    loadBusinessList(supabase),

    loadRewardList(supabase),

    loadActivityReport(supabase)

  ]);
}


// ==============================
// USERS
// ==============================

async function loadUserReport(
  supabase
) {

  const container =
    document.getElementById(
      "reportUsers"
    );

  if (!container) {
    return;
  }

  const {
    count,
    error
  } = await supabase
    .from("profiles")
    .select(
      "id",
      {
        count: "exact",
        head: true
      }
    );

  if (error) {
    throw error;
  }

  container.innerHTML = `
    <div class="panel">

      <h3>
        Total Users
      </h3>

      <p>
        ${Number(count || 0)}
      </p>

    </div>
  `;
}


// ==============================
// TASKS
// ==============================

async function loadTaskReport(
  supabase
) {

  const container =
    document.getElementById(
      "reportTasks"
    );

  if (!container) {
    return;
  }

  const {
    count,
    error
  } = await supabase
    .from("tasks")
    .select(
      "id",
      {
        count: "exact",
        head: true
      }
    );

  if (error) {
    throw error;
  }

  container.innerHTML = `
    <div class="panel">

      <h3>
        Total Tasks
      </h3>

      <p>
        ${Number(count || 0)}
      </p>

    </div>
  `;
}


// ==============================
// SUBMISSIONS
// ==============================

async function loadSubmissionReport(
  supabase
) {

  const container =
    document.getElementById(
      "reportSubmissions"
    );

  if (!container) {
    return;
  }

  const {
    count,
    error
  } = await supabase
    .from("task_submissions")
    .select(
      "id",
      {
        count: "exact",
        head: true
      }
    );

  if (error) {
    throw error;
  }

  container.innerHTML = `
    <div class="panel">

      <h3>
        Total Submissions
      </h3>

      <p>
        ${Number(count || 0)}
      </p>

    </div>
  `;
}


// ==============================
// BUSINESSES
// ==============================

async function loadBusinessReport(
  supabase
) {

  const container =
    document.getElementById(
      "reportBusinesses"
    );

  if (!container) {
    return;
  }

  const {
    count,
    error
  } = await supabase
    .from("businesses")
    .select(
      "id",
      {
        count: "exact",
        head: true
      }
    );

  if (error) {
    throw error;
  }

  container.innerHTML = `
    <div class="panel">

      <h3>
        Total Businesses
      </h3>

      <p>
        ${Number(count || 0)}
      </p>

    </div>
  `;
}


// ==============================
// PENDING
// ==============================

async function loadPendingReport(
  supabase
) {

  const container =
    document.getElementById(
      "reportPending"
    );

  if (!container) {
    return;
  }

  const {
    count,
    error
  } = await supabase
    .from("task_submissions")
    .select(
      "id",
      {
        count: "exact",
        head: true
      }
    )
    .eq(
      "status",
      "pending"
    );

  if (error) {
    throw error;
  }

  container.innerHTML = `
    <div class="panel">

      <h3>
        Pending Submissions
      </h3>

      <p>
        ${Number(count || 0)}
      </p>

    </div>
  `;
}


// ==============================
// APPROVED
// ==============================

async function loadApprovedReport(
  supabase
) {

  const container =
    document.getElementById(
      "reportApproved"
    );

  if (!container) {
    return;
  }

  const {
    count,
    error
  } = await supabase
    .from("task_submissions")
    .select(
      "id",
      {
        count: "exact",
        head: true
      }
    )
    .eq(
      "status",
      "approved"
    );

  if (error) {
    throw error;
  }

  container.innerHTML = `
    <div class="panel">

      <h3>
        Approved Submissions
      </h3>

      <p>
        ${Number(count || 0)}
      </p>

    </div>
  `;
}


// ==============================
// SUBMISSION RECORDS
// ==============================

async function loadSubmissionList(
  supabase
) {

  const container =
    document.getElementById(
      "reportSubmissionsList"
    );

  if (!container) {
    return;
  }

  const {
    data,
    error
  } = await supabase
    .from("task_submissions")
    .select(`
      id,
      user_id,
      task_id,
      proof,
      status,
      reviewer_note,
      submitted_at,
      reviewed_at,
      survey_answers
    `)
    .order(
      "submitted_at",
      {
        ascending: false
      }
    );

  if (error) {
    throw error;
  }

  if (
    !data ||
    data.length === 0
  ) {

    container.innerHTML = `
      <div class="panel">

        <h3>
          Submission Records
        </h3>

        <p>
          No submission records found.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML = `
    <h3>
      Submission Records
    </h3>

    ${data
      .map(renderSubmission)
      .join("")}
  `;
}


// ==============================
// RENDER SUBMISSION
// ==============================

function renderSubmission(
  submission
) {

  return `

    <div class="panel">

      <p>
        <strong>
          Submission ID:
        </strong>

        ${escapeHTML(
          submission.id
        )}
      </p>


      <p>
        <strong>
          User ID:
        </strong>

        ${escapeHTML(
          submission.user_id
        )}
      </p>


      <p>
        <strong>
          Task ID:
        </strong>

        ${escapeHTML(
          submission.task_id
        )}
      </p>


      <p>
        <strong>
          Status:
        </strong>

        ${escapeHTML(
          submission.status ||
          "unknown"
        )}
      </p>


      <p>
        <strong>
          Submitted:
        </strong>

        ${formatDate(
          submission.submitted_at
        )}
      </p>


      ${
        submission.reviewed_at
          ? `
            <p>

              <strong>
                Reviewed:
              </strong>

              ${formatDate(
                submission.reviewed_at
              )}

            </p>
          `
          : ""
      }


      ${
        submission.reviewer_note
          ? `
            <p>

              <strong>
                Reviewer Note:
              </strong>

              ${escapeHTML(
                submission.reviewer_note
              )}

            </p>
          `
          : ""
      }


      ${
        submission.proof
          ? `
            <p>

              <strong>
                Proof:
              </strong>

              ${escapeHTML(
                submission.proof
              )}

            </p>
          `
          : ""
      }


      ${
        submission.survey_answers
          ? `
            <details>

              <summary>
                View Survey Answers
              </summary>

              ${renderAnswers(
                submission.survey_answers
              )}

            </details>
          `
          : ""
      }

    </div>

  `;
}


// ==============================
// SURVEY ANSWERS
// ==============================

function renderAnswers(
  answers
) {

  if (
    answers === null ||
    answers === undefined ||
    answers === ""
  ) {

    return `
      <p>
        No answers recorded.
      </p>
    `;
  }


  if (
    typeof answers ===
    "string"
  ) {

    try {

      answers =
        JSON.parse(answers);

    } catch {

      return `
        <p>
          ${escapeHTML(
            answers
          )}
        </p>
      `;
    }
  }


  if (
    Array.isArray(answers)
  ) {

    if (
      answers.length === 0
    ) {

      return `
        <p>
          No answers recorded.
        </p>
      `;
    }


    return `
      <ul>

        ${answers
          .map(
            (item, index) => `
              <li>

                <strong>
                  ${index + 1}.
                </strong>

                ${escapeHTML(
                  formatAnswer(item)
                )}

              </li>
            `
          )
          .join("")}

      </ul>
    `;
  }


  if (
    typeof answers ===
      "object" &&
    answers !== null
  ) {

    const entries =
      Object.entries(
        answers
      );


    if (
      entries.length === 0
    ) {

      return `
        <p>
          No answers recorded.
        </p>
      `;
    }


    return `
      <ul>

        ${entries
          .map(
            ([question, answer]) => `
              <li>

                <strong>
                  ${escapeHTML(
                    question
                  )}:
                </strong>

                ${escapeHTML(
                  formatAnswer(answer)
                )}

              </li>
            `
          )
          .join("")}

      </ul>
    `;
  }


  return `
    <p>
      ${escapeHTML(
        answers
      )}
    </p>
  `;
}


// ==============================
// FORMAT ANSWER
// ==============================

function formatAnswer(
  answer
) {

  if (
    typeof answer ===
      "object" &&
    answer !== null
  ) {

    try {

      return JSON.stringify(
        answer
      );

    } catch {

      return String(answer);
    }
  }

  return String(
    answer ?? ""
  );
}


// ==============================
// BUSINESS RECORDS
// ==============================

async function loadBusinessList(
  supabase
) {

  const container =
    document.getElementById(
      "reportBusinessesList"
    );

  if (!container) {
    return;
  }

  const {
    data,
    error
  } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      description,
      website,
      status,
      created_at
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
    !data ||
    data.length === 0
  ) {

    container.innerHTML = `
      <div class="panel">

        <h3>
          Business Records
        </h3>

        <p>
          No business records found.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML = `
    <h3>
      Business Records
    </h3>

    ${data
      .map(renderBusiness)
      .join("")}
  `;
}


// ==============================
// RENDER BUSINESS
// ==============================

function renderBusiness(
  business
) {

  return `

    <div class="panel">

      <h4>
        ${escapeHTML(
          business.name
        )}
      </h4>


      ${
        business.description
          ? `
            <p>
              ${escapeHTML(
                business.description
              )}
            </p>
          `
          : ""
      }


      <p>
        <strong>
          Status:
        </strong>

        ${escapeHTML(
          business.status ||
          "unknown"
        )}
      </p>


      ${
        business.website
          ? `
            <p>

              <strong>
                Website:
              </strong>

              ${escapeHTML(
                business.website
              )}

            </p>
          `
          : ""
      }


      <p>
        <strong>
          Created:
        </strong>

        ${formatDate(
          business.created_at
        )}
      </p>

    </div>

  `;
}


// ==============================
// REWARD RECORDS
// ==============================

async function loadRewardList(
  supabase
) {

  const container =
    document.getElementById(
      "reportRewardsList"
    );

  if (!container) {
    return;
  }

  const {
    data,
    error
  } = await supabase
    .from(
      "redemption_requests"
    )
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
    !data ||
    data.length === 0
  ) {

    container.innerHTML = `
      <div class="panel">

        <h3>
          Reward Request Records
        </h3>

        <p>
          No reward requests found.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML = `
    <h3>
      Reward Request Records
    </h3>

    ${data
      .map(renderReward)
      .join("")}
  `;
}


// ==============================
// RENDER REWARD
// ==============================

function renderReward(
  reward
) {

  return `

    <div class="panel">

      <p>
        <strong>
          Request ID:
        </strong>

        ${escapeHTML(
          reward.id
        )}
      </p>


      <p>
        <strong>
          User ID:
        </strong>

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
          reward.status ||
          "unknown"
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

    </div>

  `;
}


// ==============================
// ACTIVITY
// ==============================

async function loadActivityReport(
  supabase
) {

  const container =
    document.getElementById(
      "reportActivityList"
    );

  if (!container) {
    return;
  }

  const {
    data,
    error
  } = await supabase
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
    !data ||
    data.length === 0
  ) {

    container.innerHTML = `
      <div class="panel">

        <h3>
          Activity Records
        </h3>

        <p>
          No activity records found.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML = `
    <h3>
      Activity Records
    </h3>

    ${data
      .map(renderActivity)
      .join("")}
  `;
}


// ==============================
// RENDER ACTIVITY
// ==============================

function renderActivity(
  activity
) {

  return `

    <div class="panel">

      <p>

        <strong>
          Activity:
        </strong>

        ${escapeHTML(
          activity.title ||
          activity.message ||
          "Notification"
        )}

      </p>


      ${
        activity.message &&
        activity.title
          ? `
            <p>
              ${escapeHTML(
                activity.message
              )}
            </p>
          `
          : ""
      }


      <p>

        <strong>
          Date:
        </strong>

        ${formatDate(
          activity.created_at
        )}

      </p>

    </div>

  `;
}


// ==============================
// ACCESS DENIED
// ==============================

function showAccessDenied() {

  const first =
    document.getElementById(
      "reportUsers"
    );

  if (!first) {
    return;
  }

  first.innerHTML = `

    <div class="panel">

      <h3>
        Admin Access Required
      </h3>

      <p>
        You must be signed in as an administrator.
      </p>

      <p>
        <a href="auth.html">
          Login
        </a>
      </p>

    </div>

  `;
}


// ==============================
// ERROR
// ==============================

function showReportError(
  error
) {

  console.error(
    "PULSE Report Error Details:",
    error
  );

  const first =
    document.getElementById(
      "reportUsers"
    );

  if (!first) {
    return;
  }

  first.innerHTML = `

    <div class="panel">

      <h3>
        Unable to Load Reports
      </h3>

      <p>
        There was a problem loading the
        reports and records.
      </p>

      <p>
        Please refresh the page and try again.
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