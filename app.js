/* =========================
   PULSE APP
========================= */

const { createClient } = supabase;

const db = createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);


/* =========================
   PRODUCTION URLS
========================= */

const AUTH_REDIRECT_URL =
  "https://jarvisfuturesent-rgb.github.io/Frontend/";

const HOMEPAGE_URL =
  "https://jarvisfuturesent-rgb.github.io/pages/";


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
   ADMIN ROUTE
========================= */

function isAdminRoute() {
  return (
    window.location.hash.toLowerCase() ===
    "#admin"
  );
}


/* =========================
   GET CURRENT USER ROLE
========================= */

async function getCurrentUserRole() {

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) {
    return {
      user: null,
      role: null
    };
  }

  const {
    data: profile,
    error
  } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {

    console.error(
      "PULSE role check failed:",
      error
    );

    return {
      user,
      role: null
    };
  }

  return {
    user,
    role: profile?.role || "user"
  };
}


/* =========================
   AUTH DISPLAY
========================= */

async function updateAuthState() {

  const {
    user,
    role
  } = await getCurrentUserRole();

  const auth =
    $("auth");

  const dashboard =
    $("dashboard");

  const adminDashboard =
    $("adminDashboard");

  const resetPanel =
    $("resetPasswordPanel");


  /* =========================
     NOT LOGGED IN
  ========================= */

  if (!user) {

    if (auth) {
      auth.hidden = false;
    }

    if (dashboard) {
      dashboard.hidden = true;
    }

    if (adminDashboard) {
      adminDashboard.hidden = true;
    }

    if (resetPanel) {
      resetPanel.hidden = true;
    }

    return "logged-out";
  }


  /* =========================
     ADMIN ROUTE
  ========================= */

  if (isAdminRoute()) {

    if (role === "admin") {

      if (auth) {
        auth.hidden = true;
      }

      if (dashboard) {
        dashboard.hidden = true;
      }

      if (adminDashboard) {
        adminDashboard.hidden = false;
      }

      return "admin";
    }


    /* =========================
       NOT ADMIN
    ========================= */

    if (adminDashboard) {
      adminDashboard.hidden = true;
    }

    if (dashboard) {
      dashboard.hidden = false;
    }

    if (auth) {
      auth.hidden = true;
    }

    window.history.replaceState(
      null,
      "",
      AUTH_REDIRECT_URL
    );

    return "user";
  }


  /* =========================
     NORMAL USER ROUTE
  ========================= */

  if (auth) {
    auth.hidden = true;
  }

  if (dashboard) {
    dashboard.hidden = false;
  }

  if (adminDashboard) {
    adminDashboard.hidden = true;
  }

  return "user";
}


/* =========================
   PROFILE + BALANCE
========================= */

async function loadProfile() {

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const {
    data,
    error
  } = await db
    .from("profiles")
    .select("points,name,role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {

    console.error(
      "PULSE profile error:",
      error
    );

    return;
  }

  const balance =
    Number(data?.points ?? 0);

  if ($("balance")) {
    $("balance").textContent =
      balance;
  }

  if ($("profileName")) {
    $("profileName").textContent =
      data?.name ||
      user.email?.split("@")[0] ||
      "User";
  }

  await loadEarningsSummary();
}


/* =========================
   EARNINGS SUMMARY
========================= */

async function loadEarningsSummary() {

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const {
    data: rewards,
    error: rewardError
  } = await db
    .from("points_ledger")
    .select("amount,reason")
    .eq("user_id", user.id)
    .eq("reason", "Task reward");

  if (rewardError) {

    console.error(
      "PULSE earnings error:",
      rewardError
    );

    return;
  }

  const totalEarned =
    (rewards || []).reduce(
      (total, row) =>
        total +
        Number(row.amount || 0),
      0
    );

  const {
    data: pendingRequests,
    error: pendingError
  } = await db
    .from("redemption_requests")
    .select("points_requested")
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (pendingError) {

    console.error(
      "PULSE pending withdrawal error:",
      pendingError
    );

    return;
  }

  const pendingWithdrawal =
    (pendingRequests || []).reduce(
      (total, row) =>
        total +
        Number(
          row.points_requested || 0
        ),
      0
    );

  const {
    data: profile,
    error: profileError
  } = await db
    .from("profiles")
    .select("points")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {

    console.error(
      "PULSE balance summary error:",
      profileError
    );

    return;
  }

  const balance =
    Number(profile?.points ?? 0);

  const available =
    Math.max(
      0,
      balance - pendingWithdrawal
    );

  if ($("totalEarned")) {
    $("totalEarned").textContent =
      totalEarned + " PLS";
  }

  if ($("pendingWithdrawal")) {
    $("pendingWithdrawal").textContent =
      pendingWithdrawal + " PLS";
  }

  if ($("availableBalance")) {
    $("availableBalance").textContent =
      available + " PLS";
  }

  if ($("withdrawAvailable")) {
    $("withdrawAvailable").textContent =
      available + " PLS";
  }
}


/* =========================
   TASKS
========================= */

async function loadTasks() {

  const box =
    $("tasks");

  if (!box) return;

  const {
    data,
    error
  } = await db
    .from("tasks")
    .select(`
      id,
      title,
      description,
      points,
      status,
      task_requirements (
        id,
        requirement,
        sort_order
      )
    `)
    .eq("status", "active")
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {

    console.error(
      "PULSE tasks error:",
      error
    );

    box.innerHTML = `
      <div class="empty-card">
        Unable to load tasks.
        <small>
          ${escapeHtml(error.message)}
        </small>
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

  box.innerHTML =
    data.map(task => {

      const requirements =
        Array.isArray(
          task.task_requirements
        )
          ? [
              ...task.task_requirements
            ].sort(
              (a, b) =>
                (a.sort_order ?? 0) -
                (b.sort_order ?? 0)
            )
          : [];

      const requirementsHtml =
        requirements.length
          ? `
            <div class="task-requirements">

              <strong>
                Requirements:
              </strong>

              <ul>

                ${requirements
                  .map(
                    requirement => `
                      <li>
                        ${escapeHtml(
                          requirement.requirement
                        )}
                      </li>
                    `
                  )
                  .join("")}

              </ul>

            </div>
          `
          : "";

      return `
        <div class="task-card">

          <div class="task-icon">
            ⚡
          </div>

          <div class="task-info">

            <strong>
              ${escapeHtml(
                task.title
              )}
            </strong>

            <small>
              ${escapeHtml(
                task.description || ""
              )}
            </small>

            ${requirementsHtml}

            <span class="task-points">
              +${escapeHtml(
                task.points
              )} pts
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
      `;
    })
    .join("");

  box
    .querySelectorAll(
      ".task-submit"
    )
    .forEach(button => {

      button.onclick = () =>
        submitTask(
          Number(
            button.dataset.id
          )
        );

    });
}


/* =========================
   SUBMIT TASK
========================= */

window.submitTask =
  async function(taskId) {

    const {
      data: { user }
    } = await db.auth.getUser();

    if (!user) {

      alert(
        "Please log in first."
      );

      return;
    }

    if (!Number.isInteger(taskId)) {

      alert(
        "Invalid task."
      );

      return;
    }

    const proof =
      prompt(
        "Enter your proof or note for this task:"
      );

    if (proof === null) {
      return;
    }

    const {
      error
    } = await db
      .from("task_submissions")
      .insert({
        task_id: taskId,
        user_id: user.id,
        proof:
          proof.trim() || null
      });

    if (error) {

      console.error(
        "PULSE submission error:",
        error
      );

      alert(
        error.message
      );

      return;
    }

    alert(
      "Task submitted. Your submission is now pending review."
    );

    await refresh();
  };


/* =========================
   SUBMISSIONS
   OUTER FOLDER + INNER FILES
========================= */

async function loadSubmissions() {

  const box =
    $("submissions");

  if (!box) return;

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const {
    data,
    error
  } = await db
    .from("task_submissions")
    .select(`
      id,
      task_id,
      proof,
      survey_answers,
      status,
      reviewer_note,
      submitted_at,
      reviewed_at,
      tasks (
        title,
        points
      )
    `)
    .eq(
      "user_id",
      user.id
    )
    .order(
      "submitted_at",
      {
        ascending: false
      }
    );

  if (error) {

    console.error(
      "PULSE submissions error:",
      error
    );

    box.innerHTML = `
      <div class="empty-card">

        Unable to load submissions.

        <small>
          ${escapeHtml(
            error.message
          )}
        </small>

      </div>
    `;

    return;
  }

  if (!data?.length) {

    box.innerHTML =
      `<div class="empty-card">
        No submissions yet.
      </div>`;

    return;
  }


  box.innerHTML =
    data.map(item => {

      let answers =
        item.survey_answers;

      if (
        typeof answers === "string"
      ) {

        try {

          answers =
            JSON.parse(
              answers
            );

        } catch {

          answers = null;

        }
      }


      let answersHtml = "";


      if (
        answers &&
        typeof answers === "object"
      ) {

        const entries =
          Array.isArray(answers)

            ? answers.map(
                (answer, index) => [
                  index + 1,
                  answer
                ]
              )

            : Object.entries(
                answers
              );


        answersHtml =
          entries
            .map(
              ([number, answerItem]) => {

                const question =
                  answerItem &&
                  typeof answerItem === "object" &&
                  answerItem.question

                    ? answerItem.question

                    : `Question ${number}`;


                const answer =
                  answerItem &&
                  typeof answerItem === "object" &&
                  "answer" in answerItem

                    ? answerItem.answer

                    : answerItem;


                const answerText =
                  answer === null ||
                  answer === undefined

                    ? ""

                    : typeof answer ===
                      "string"

                      ? answer

                      : JSON.stringify(
                          answer
                        );


                return `
                  <div style="
                    margin-top:8px;
                    padding:10px;
                    border:1px solid
                      rgba(0,200,255,.20);
                    border-radius:10px;
                  ">

                    <strong>
                      ${escapeHtml(
                        question
                      )}
                    </strong>

                    <div style="
                      margin-top:4px;
                      word-break:break-word;
                    ">
                      ${escapeHtml(
                        answerText
                      )}
                    </div>

                  </div>
                `;
              }
            )
            .join("");
      }


      const status =
        String(
          item.status || ""
        ).toLowerCase();


      const statusLabel =
        status === "approved"

          ? "Approved"

          : status === "rejected"

            ? "Rejected"

            : "Pending";


      const submitted =
        item.submitted_at

          ? new Date(
              item.submitted_at
            ).toLocaleString()

          : "";


      const reviewed =
        item.reviewed_at

          ? new Date(
              item.reviewed_at
            ).toLocaleString()

          : "";


      const reviewerNote =
        item.reviewer_note

          ? `
            <p>
              <strong>
                Reviewer Note:
              </strong>

              ${escapeHtml(
                item.reviewer_note
              )}
            </p>
          `

          : "";


      const proof =
        item.proof

          ? `
            <div style="
              margin-top:12px;
            ">

              <strong>
                Proof
              </strong>

              <pre style="
                white-space:pre-wrap;
                word-break:break-word;
                margin-top:6px;
                padding:10px;
                border-radius:10px;
                background:rgba(0,0,0,.25);
                overflow:auto;
              ">${escapeHtml(
                item.proof
              )}</pre>

            </div>
          `

          : "";


      return `
        <details
          class="submission-dropdown"
          style="
            margin-bottom:10px;
            padding:12px;
            border:1px solid
              rgba(0,200,255,.22);
            border-radius:12px;
            background:rgba(0,20,40,.30);
          "
        >

          <summary
            style="
              cursor:pointer;
              font-weight:700;
              list-style:none;
            "
          >

            ▶

            ${escapeHtml(
              item.tasks?.title ||
              "Unknown Task"
            )}

            <span style="
              margin-left:6px;
              opacity:.85;
            ">
              ${escapeHtml(
                item.tasks?.points ?? 0
              )} pts
            </span>

            <span style="
              margin-left:6px;
              opacity:.85;
            ">
              • ${escapeHtml(
                statusLabel
              )}
            </span>

          </summary>


          <div style="
            margin-top:12px;
            padding-top:10px;
            border-top:1px solid
              rgba(0,200,255,.15);
          ">

            <p>
              <strong>
                Submission #${escapeHtml(
                  item.id
                )}
              </strong>
            </p>


            <p>
              <strong>
                Submitted:
              </strong>

              ${escapeHtml(
                submitted
              )}
            </p>


            ${
              reviewed
                ? `
                  <p>
                    <strong>
                      Reviewed:
                    </strong>

                    ${escapeHtml(
                      reviewed
                    )}
                  </p>
                `
                : ""
            }


            ${reviewerNote}


            ${proof}


            ${
              answersHtml
                ? `
                  <details
                    style="
                      margin-top:12px;
                    "
                  >

                    <summary
                      style="
                        cursor:pointer;
                        font-weight:700;
                      "
                    >
                      📝 Saved Answers
                    </summary>

                    <div>
                      ${answersHtml}
                    </div>

                  </details>
                `
                : ""
            }


            <div style="
              margin-top:12px;
              font-weight:700;
            ">

              Status:
              ${escapeHtml(
                statusLabel
              )}

            </div>

          </div>

        </details>
      `;

    })
    .join("");
}


/* =========================
   POINTS ACTIVITY
========================= */

async function loadActivity() {

  const box =
    $("activity");

  if (!box) return;

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const {
    data,
    error
  } = await db
    .from("points_ledger")
    .select(`
      id,
      amount,
      reason,
      created_at,
      submission_id
    `)
    .eq(
      "user_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {

    console.error(
      "PULSE activity error:",
      error
    );

    box.innerHTML = `
      <div class="empty-card">

        Unable to load activity.

        <small>
          ${escapeHtml(
            error.message
          )}
        </small>

      </div>
    `;

    return;
  }

  if (!data?.length) {

    box.innerHTML =
      `<div class="empty-card">
        No points activity yet.
      </div>`;

    return;
  }

  box.innerHTML =
    data.map(item => `
      <div class="history-row">

        <div>

          <strong>
            ${escapeHtml(
              item.reason
            )}
          </strong>

          <small>
            ${new Date(
              item.created_at
            ).toLocaleString()}
          </small>

        </div>

        <strong>
          ${
            item.amount > 0
              ? "+"
              : ""
          }

          ${item.amount}

        </strong>

      </div>
    `)
    .join("");
}


/* =========================
   REDEMPTIONS
========================= */

async function loadRedemptions() {

  const box =
    $("redemptions");

  if (!box) return;

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const {
    data,
    error
  } = await db
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
    .eq(
      "user_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {

    console.error(
      "PULSE redemption error:",
      error
    );

    box.innerHTML = `
      <div class="empty-card">

        Unable to load rewards.

        <small>
          ${escapeHtml(
            error.message
          )}
        </small>

      </div>
    `;

    return;
  }

  if (!data?.length) {

    box.innerHTML =
      `<div class="empty-card">
        No withdrawals requested yet.
      </div>`;

    return;
  }

  box.innerHTML =
    data.map(item => `
      <div class="history-row">

        <div>

          <strong>
            ${item.points_requested} PLS
          </strong>

          <small>
            Request #${item.id}
          </small>

          <small>
            ${escapeHtml(
              item.reward_type ||
              "manual_reward"
            )}
          </small>

          ${
            item.created_at
              ? `
                <small>
                  Requested:
                  ${new Date(
                    item.created_at
                  ).toLocaleString()}
                </small>
              `
              : ""
          }

          ${
            item.reviewed_at
              ? `
                <small>
                  Reviewed:
                  ${new Date(
                    item.reviewed_at
                  ).toLocaleString()}
                </small>
              `
              : ""
          }

          ${
            item.admin_note
              ? `
                <small>
                  Admin note:
                  ${escapeHtml(
                    item.admin_note
                  )}
                </small>
              `
              : ""
          }

        </div>

        <span class="status-pill">
          ${escapeHtml(
            item.status
          )}
        </span>

      </div>
    `)
    .join("");
}


/* =========================
   NOTIFICATIONS
========================= */

async function loadNotifications() {

  const box =
    $("notifications");

  if (!box) return;

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const {
    data,
    error
  } = await db
    .from("notifications")
    .select(`
      id,
      title,
      message,
      type,
      read,
      created_at
    `)
    .eq(
      "user_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {

    console.error(
      "PULSE notifications error:",
      error
    );

    box.innerHTML = `
      <div class="empty-card">

        Unable to load notifications.

        <small>
          ${escapeHtml(
            error.message
          )}
        </small>

      </div>
    `;

    return;
  }

  const unreadCount =
    (data || []).filter(
      item => !item.read
    ).length;

  if ($("notificationCount")) {
    $("notificationCount").textContent =
      unreadCount;
  }

  if (!data?.length) {

    box.innerHTML =
      `<div class="empty-card">
        No notifications yet.
      </div>`;

    return;
  }

  box.innerHTML =
    data.map(item => `
      <div class="history-row ${
        item.read
          ? ""
          : "unread"
      }">

        <div>

          <strong>
            ${escapeHtml(
              item.title
            )}
          </strong>

          <small>
            ${escapeHtml(
              item.message
            )}
          </small>

          <small>
            ${new Date(
              item.created_at
            ).toLocaleString()}
          </small>

        </div>

      </div>
    `)
    .join("");
}


/* =========================
   MARK NOTIFICATIONS READ
========================= */

async function markNotificationsRead() {

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return;

  const {
    error
  } = await db
    .from("notifications")
    .update({
      read: true
    })
    .eq(
      "user_id",
      user.id
    )
    .eq(
      "read",
      false
    );

  if (error) {

    console.error(
      "PULSE notification update error:",
      error
    );

    alert(
      error.message
    );

    return;
  }

  await loadNotifications();
}


/* =========================
   WITHDRAWAL REQUEST
========================= */

function setupRedeem() {

  const button =
    $("redeem");

  if (!button) return;

  button.onclick =
    async () => {

      const amount =
        Number(
          $("redeemAmount")?.value
        );

      const rewardType =
        $("rewardType")?.value ||
        "manual_reward";

      const userNote =
        $("redeemNote")?.value?.trim() ||
        null;

      const output =
        $("redeemMsg");

      msg(
        output,
        ""
      );

      if (
        !Number.isInteger(amount) ||
        amount <= 0
      ) {

        msg(
          output,
          "Enter a valid whole-number PLS amount."
        );

        return;
      }

      const {
        data: { user }
      } = await db.auth.getUser();

      if (!user) {

        msg(
          output,
          "Please sign in first."
        );

        return;
      }

      button.disabled = true;

      msg(
        output,
        "Submitting withdrawal request..."
      );

      const {
        error
      } = await db.rpc(
        "create_redemption_request",
        {
          p_points: amount,
          p_reward_type:
            rewardType,
          p_user_note:
            userNote
        }
      );

      button.disabled = false;

      if (error) {

        console.error(
          "PULSE withdrawal request error:",
          error
        );

        msg(
          output,
          error.message
        );

        return;
      }

      msg(
        output,
        "Withdrawal request submitted for admin approval."
      );

      if ($("redeemAmount")) {
        $("redeemAmount").value = "";
      }

      if ($("redeemNote")) {
        $("redeemNote").value = "";
      }

      await refresh();
    };
}


/* =========================
   AUTH ACTIONS
========================= */

function setupAuth() {

  const signup =
    $("signup");

  const login =
    $("login");

  const forgot =
    $("forgotPassword");

  const reset =
    $("resetPassword");


  /* =========================
     SIGN UP
  ========================= */

  if (signup) {

    signup.onclick =
      async () => {

        const email =
          $("email")?.value?.trim();

        const password =
          $("password")?.value ||
          "";

        if (
          !email ||
          !password
        ) {

          msg(
            $("authMsg"),
            "Enter an email and password."
          );

          return;
        }

        const {
          error
        } =
          await db.auth.signUp({
            email,
            password,

            options: {
              emailRedirectTo:
                AUTH_REDIRECT_URL
            }
          });

        if (error) {

          msg(
            $("authMsg"),
            error.message
          );

          return;
        }

        msg(
          $("authMsg"),
          "Account created. Check your email to confirm your account."
        );
      };
  }


  /* =========================
     LOGIN
  ========================= */

  if (login) {

    login.onclick =
      async () => {

        const email =
          $("email")?.value?.trim();

        const password =
          $("password")?.value ||
          "";

        if (
          !email ||
          !password
        ) {

          msg(
            $("authMsg"),
            "Enter an email and password."
          );

          return;
        }

        const {
          error
        } =
          await db.auth.signInWithPassword({
            email,
            password
          });

        if (error) {

          msg(
            $("authMsg"),
            error.message
          );

          return;
        }

        msg(
          $("authMsg"),
          "Signed in."
        );

        await refresh();
      };
  }


  /* =========================
     FORGOT PASSWORD
  ========================= */

  if (forgot) {

    forgot.onclick =
      async () => {

        const email =
          $("email")?.value?.trim();

        if (!email) {

          msg(
            $("authMsg"),
            "Enter your email address first."
          );

          return;
        }

        const {
          error
        } =
          await db.auth.resetPasswordForEmail(
            email,
            {
              redirectTo:
                AUTH_REDIRECT_URL
            }
          );

        if (error) {

          msg(
            $("authMsg"),
            error.message
          );

          return;
        }

        msg(
          $("authMsg"),
          "Password reset email sent."
        );
      };
  }


  /* =========================
     RESET PASSWORD
  ========================= */

  if (reset) {

    reset.onclick =
      async () => {

        const password =
          $("newPassword")?.value ||
          "";

        const confirm =
          $("confirmPassword")?.value ||
          "";

        if (
          !password ||
          !confirm
        ) {

          msg(
            $("resetMsg"),
            "Enter and confirm your new password."
          );

          return;
        }

        if (
          password !==
          confirm
        ) {

          msg(
            $("resetMsg"),
            "Passwords do not match."
          );

          return;
        }

        const {
          error
        } =
          await db.auth.updateUser({
            password
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

        if (
          $("resetPasswordPanel")
        ) {

          $("resetPasswordPanel").hidden =
            true;

        }
      };
  }
}


/* =========================
   SIGN OUT
========================= */

function setupLogout() {

  const button =
    $("logout");

  if (!button) return;

  button.onclick =
    async () => {

      const {
        error
      } =
        await db.auth.signOut();

      if (error) {

        alert(
          error.message
        );

        return;
      }

      window.location.href =
        HOMEPAGE_URL;
    };
}


/* =========================
   REFRESH
========================= */

async function refresh() {

  const view =
    await updateAuthState();

  const {
    data: { user }
  } =
    await db.auth.getUser();

  if (!user) {
    return;
  }


  /* =========================
     ADMIN VIEW
  ========================= */

  if (
    view === "admin"
  ) {

    if (
      window.PULSEAdmin &&
      typeof window.PULSEAdmin.load ===
        "function"
    ) {

      await window.PULSEAdmin.load();

    }

    return;
  }


  /* =========================
     USER VIEW
  ========================= */

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
   HASH / VIEW CHANGES
========================= */

window.addEventListener(
  "hashchange",
  async () => {

    await refresh();

  }
);


/* =========================
   EXPOSE APP FUNCTIONS
========================= */

window.PULSEApp = {
  refresh,
  updateAuthState,
  isAdminRoute
};


/* =========================
   STARTUP
========================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    setupAuth();
    setupLogout();
    setupRedeem();

    const {
      data: { session }
    } =
      await db.auth.getSession();

    if (session) {

      await refresh();

    } else {

      await updateAuthState();

    }

    db.auth.onAuthStateChange(
      async () => {

        setTimeout(
          async () => {

            await refresh();

          },
          100
        );

      }
    );

  }
);