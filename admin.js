/* =========================================================
   PULSE ADMIN DASHBOARD
   Separate admin.html page
   ========================================================= */

(function () {
  "use strict";

  /* =========================================================
     HELPERS
     ========================================================= */

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "Not recorded";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not recorded";
    }

    return date.toLocaleString();
  }

  function getDb() {
    if (window.db) return window.db;

    if (window.supabaseClient) {
      return window.supabaseClient;
    }

    if (
      window.supabase &&
      window.PULSE_SUPABASE_URL &&
      window.PULSE_SUPABASE_KEY
    ) {
      return window.supabase.createClient(
        window.PULSE_SUPABASE_URL,
        window.PULSE_SUPABASE_KEY
      );
    }

    return null;
  }

  const db = getDb();


  /* =========================================================
     ADMIN AUTHORIZATION
     ========================================================= */

  async function getCurrentAdmin() {
    if (!db) {
      throw new Error("Supabase connection is not available.");
    }

    const {
      data: { user },
      error: userError
    } = await db.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return null;
    }

    const {
      data: profile,
      error: profileError
    } = await db
      .from("profiles")
      .select("id, name, role, points")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile || profile.role !== "admin") {
      return null;
    }

    return {
      user,
      profile
    };
  }


  async function requireAdmin() {
    const admin = await getCurrentAdmin();

    if (!admin) {
      window.location.href = "index.html";
      return null;
    }

    return admin;
  }


  /* =========================================================
     MAIN ADMIN PAGE
     ========================================================= */

  async function loadAdminPage() {

    const content =
      document.getElementById("adminContent");

    if (!content) return;

    content.innerHTML = `
      <div class="empty-card">
        Checking administrator access...
      </div>
    `;

    try {

      const admin = await requireAdmin();

      if (!admin) return;

      content.innerHTML = `
        <div class="panel">

          <h3>
            Welcome,
            ${escapeHTML(
              admin.profile.name ||
              admin.user.email ||
              "Administrator"
            )}
          </h3>

          <p>
            Administrator account verified.
          </p>

        </div>

        <div id="adminTools"></div>
      `;

      const tools =
        document.getElementById("adminTools");

      tools.innerHTML = buildAdminToolsHTML();

      bindAdminControls();

      await Promise.all([
        loadTasks(),
        loadCategories(),
        loadBusinesses(),
        loadSubmissions(),
        loadRedemptions()
      ]);

    } catch (error) {

      console.error(
        "Admin dashboard error:",
        error
      );

      content.innerHTML = `
        <div class="empty-card">
          Unable to load the admin dashboard.
          <small>
            ${escapeHTML(error.message)}
          </small>
        </div>
      `;
    }
  }


  /* =========================================================
     ADMIN UI
     ========================================================= */

  function buildAdminToolsHTML() {

    return `

      <!-- TASK MANAGEMENT -->

      <section class="panel">

        <h3>Task Management</h3>

        <input
          id="adminTaskTitle"
          type="text"
          placeholder="Task title"
        >

        <textarea
          id="adminTaskDescription"
          placeholder="Task description"
        ></textarea>

        <input
          id="adminTaskPoints"
          type="number"
          min="1"
          step="1"
          placeholder="Points"
        >

        <select id="adminTaskStatus">
          <option value="draft">
            Draft
          </option>

          <option value="active">
            Active
          </option>

          <option value="paused">
            Paused
          </option>
        </select>

        <button
          id="adminCreateTask"
          class="gradient-button"
          type="button"
        >
          Create Task
        </button>

        <p id="adminTaskMsg"></p>

        <div id="adminTasks">
          Loading tasks...
        </div>

      </section>


      <!-- CATEGORIES -->

      <section class="panel">

        <h3>Category Management</h3>

        <input
          id="adminCategoryName"
          type="text"
          placeholder="Category name"
        >

        <input
          id="adminCategoryDescription"
          type="text"
          placeholder="Category description"
        >

        <button
          id="adminCreateCategory"
          class="gradient-button"
          type="button"
        >
          Create Category
        </button>

        <p id="adminCategoryMsg"></p>

        <div id="adminCategories">
          Loading categories...
        </div>

      </section>


      <!-- BUSINESSES -->

      <section class="panel">

        <h3>Business Management</h3>

        <div id="adminBusinesses">
          Loading businesses...
        </div>

      </section>


      <!-- SUBMISSIONS -->

      <section class="panel">

        <h3>Task Submissions</h3>

        <select id="adminSubmissionStatus">

          <option value="all">
            All
          </option>

          <option value="pending">
            Pending
          </option>

          <option value="approved">
            Approved
          </option>

          <option value="rejected">
            Rejected
          </option>

        </select>

        <button
          id="adminRefreshSubmissions"
          class="outline-button"
          type="button"
        >
          Refresh Submissions
        </button>

        <div id="adminSubmissions">
          Loading submissions...
        </div>

      </section>


      <!-- REDEMPTIONS -->

      <section class="panel">

        <h3>Reward Requests</h3>

        <div id="adminRedemptions">
          Loading reward requests...
        </div>

      </section>

    `;
  }


  /* =========================================================
     EVENT BINDINGS
     ========================================================= */

  function bindAdminControls() {

    document
      .getElementById("adminCreateTask")
      ?.addEventListener(
        "click",
        createTask
      );

    document
      .getElementById("adminCreateCategory")
      ?.addEventListener(
        "click",
        createCategory
      );

    document
      .getElementById("adminSubmissionStatus")
      ?.addEventListener(
        "change",
        loadSubmissions
      );

    document
      .getElementById("adminRefreshSubmissions")
      ?.addEventListener(
        "click",
        loadSubmissions
      );
  }


  /* =========================================================
     TASKS
     ========================================================= */

  async function loadTasks() {

    const box =
      document.getElementById("adminTasks");

    if (!box) return;

    const {
      data: tasks,
      error
    } = await db
      .from("tasks")
      .select(`
        id,
        title,
        description,
        points,
        status,
        business_id,
        category_id,
        created_at
      `)
      .order("id", {
        ascending: false
      });

    if (error) {
      box.innerHTML = `
        <div class="empty-card">
          Unable to load tasks.
          <small>
            ${escapeHTML(error.message)}
          </small>
        </div>
      `;
      return;
    }

    if (!tasks?.length) {
      box.innerHTML = `
        <div class="empty-card">
          No tasks found.
        </div>
      `;
      return;
    }

    box.innerHTML =
      tasks.map(task => `

        <div class="history-row">

          <div style="min-width:0">

            <strong>
              ${escapeHTML(task.title)}
            </strong>

            <small>
              ${escapeHTML(
                task.description || ""
              )}
            </small>

            <small>
              ${task.points} points
            </small>

            <small>
              Status:
              ${escapeHTML(task.status)}
            </small>

            <small>
              Task ID:
              ${task.id}
            </small>

          </div>

          <div style="
            display:flex;
            gap:8px;
            flex-wrap:wrap;
          ">

            ${
              task.status !== "active"
                ? `
                  <button
                    class="gradient-button
                      admin-task-status"
                    data-id="${task.id}"
                    data-status="active"
                    type="button"
                  >
                    Activate
                  </button>
                `
                : `
                  <button
                    class="outline-button
                      admin-task-status"
                    data-id="${task.id}"
                    data-status="paused"
                    type="button"
                  >
                    Pause
                  </button>
                `
            }

            ${
              task.status !== "completed"
                ? `
                  <button
                    class="outline-button
                      admin-task-status"
                    data-id="${task.id}"
                    data-status="completed"
                    type="button"
                  >
                    Complete
                  </button>
                `
                : ""
            }

            <button
              class="outline-button
                admin-task-edit"
              data-id="${task.id}"
              type="button"
            >
              Edit
            </button>

          </div>

        </div>

      `).join("");


    box
      .querySelectorAll(".admin-task-status")
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              Number(button.dataset.id);

            const status =
              button.dataset.status;

            button.disabled = true;

            const { error } =
              await db
                .from("tasks")
                .update({ status })
                .eq("id", id);

            if (error) {
              alert(error.message);
              button.disabled = false;
              return;
            }

            await loadTasks();
          }
        );
      });


    box
      .querySelectorAll(".admin-task-edit")
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              Number(button.dataset.id);

            const task =
              tasks.find(
                item =>
                  Number(item.id) === id
              );

            if (!task) return;

            const title =
              prompt(
                "Task title:",
                task.title || ""
              );

            if (title === null) return;

            const description =
              prompt(
                "Task description:",
                task.description || ""
              );

            if (description === null) return;

            const pointsText =
              prompt(
                "Task points:",
                task.points
              );

            if (pointsText === null) return;

            const points =
              Number(pointsText);

            if (!title.trim()) {
              alert(
                "Task title cannot be empty."
              );
              return;
            }

            if (
              !Number.isInteger(points) ||
              points <= 0
            ) {
              alert(
                "Points must be a whole number greater than 0."
              );
              return;
            }

            const { error } =
              await db
                .from("tasks")
                .update({
                  title: title.trim(),
                  description:
                    description.trim(),
                  points
                })
                .eq("id", id);

            if (error) {
              alert(error.message);
              return;
            }

            await loadTasks();
          }
        );
      });
  }


  async function createTask() {

    const titleInput =
      document.getElementById(
        "adminTaskTitle"
      );

    const descriptionInput =
      document.getElementById(
        "adminTaskDescription"
      );

    const pointsInput =
      document.getElementById(
        "adminTaskPoints"
      );

    const statusInput =
      document.getElementById(
        "adminTaskStatus"
      );

    const message =
      document.getElementById(
        "adminTaskMsg"
      );

    const title =
      titleInput?.value.trim();

    const description =
      descriptionInput?.value.trim() || "";

    const points =
      Number(pointsInput?.value);

    const status =
      statusInput?.value || "draft";

    if (!title) {
      message.textContent =
        "Enter a task title.";
      return;
    }

    if (
      !Number.isInteger(points) ||
      points <= 0
    ) {
      message.textContent =
        "Points must be a whole number greater than 0.";
      return;
    }

    const { error } =
      await db
        .from("tasks")
        .insert({
          title,
          description,
          points,
          status
        });

    if (error) {
      message.textContent =
        error.message;
      return;
    }

    titleInput.value = "";

    if (descriptionInput) {
      descriptionInput.value = "";
    }

    pointsInput.value = "";

    message.textContent =
      "Task created successfully.";

    await loadTasks();
  }


  /* =========================================================
     CATEGORIES
     ========================================================= */

  async function loadCategories() {

    const box =
      document.getElementById(
        "adminCategories"
      );

    if (!box) return;

    const {
      data: categories,
      error
    } = await db
      .from("task_categories")
      .select(`
        id,
        name,
        description
      `)
      .order("id", {
        ascending: false
      });

    if (error) {

      box.innerHTML = `
        <div class="empty-card">
          Unable to load categories.
          <small>
            ${escapeHTML(error.message)}
          </small>
        </div>
      `;

      return;
    }

    if (!categories?.length) {

      box.innerHTML = `
        <div class="empty-card">
          No categories found.
        </div>
      `;

      return;
    }

    box.innerHTML =
      categories.map(category => `

        <div class="history-row">

          <div style="min-width:0">

            <strong>
              ${escapeHTML(category.name)}
            </strong>

            <small>
              ${escapeHTML(
                category.description || ""
              )}
            </small>

            <small>
              Category ID:
              ${category.id}
            </small>

          </div>

        </div>

      `).join("");
  }


  async function createCategory() {

    const nameInput =
      document.getElementById(
        "adminCategoryName"
      );

    const descriptionInput =
      document.getElementById(
        "adminCategoryDescription"
      );

    const message =
      document.getElementById(
        "adminCategoryMsg"
      );

    const name =
      nameInput?.value.trim();

    const description =
      descriptionInput?.value.trim() || "";

    if (!name) {

      message.textContent =
        "Enter a category name.";

      return;
    }

    const { error } =
      await db
        .from("task_categories")
        .insert({
          name,
          description
        });

    if (error) {

      message.textContent =
        error.message;

      return;
    }

    nameInput.value = "";

    if (descriptionInput) {
      descriptionInput.value = "";
    }

    message.textContent =
      "Category created successfully.";

    await loadCategories();
  }


  /* =========================================================
     BUSINESSES
     ========================================================= */

  async function loadBusinesses() {

    const box =
      document.getElementById(
        "adminBusinesses"
      );

    if (!box) return;

    const {
      data: businesses,
      error
    } = await db
      .from("businesses")
      .select("*")
      .order("id", {
        ascending: false
      });

    if (error) {

      box.innerHTML = `
        <div class="empty-card">
          Unable to load businesses.
          <small>
            ${escapeHTML(error.message)}
          </small>
        </div>
      `;

      return;
    }

    if (!businesses?.length) {

      box.innerHTML = `
        <div class="empty-card">
          No businesses found.
        </div>
      `;

      return;
    }

    box.innerHTML =
      businesses.map(business => {

        const name =
          business.name ||
          business.business_name ||
          `Business #${business.id}`;

        return `

          <div class="history-row">

            <div style="min-width:0">

              <strong>
                ${escapeHTML(name)}
              </strong>

              <small>
                Business ID:
                ${business.id}
              </small>

            </div>

          </div>

        `;
      }).join("");
  }


  /* =========================================================
     SUBMISSIONS
     ========================================================= */

  async function loadSubmissions() {

    const box =
      document.getElementById(
        "adminSubmissions"
      );

    if (!box) return;

    const filter =
      document.getElementById(
        "adminSubmissionStatus"
      )?.value || "all";

    let query =
      db
        .from("task_submissions")
        .select(`
          id,
          task_id,
          user_id,
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
        .order("submitted_at", {
          ascending: false
        });

    if (filter !== "all") {
      query =
        query.eq(
          "status",
          filter
        );
    }

    const {
      data: submissions,
      error
    } = await query;

    if (error) {

      box.innerHTML = `
        <div class="empty-card">
          Unable to load submissions.
          <small>
            ${escapeHTML(error.message)}
          </small>
        </div>
      `;

      return;
    }

    if (!submissions?.length) {

      box.innerHTML = `
        <div class="empty-card">
          No submissions found.
        </div>
      `;

      return;
    }


    box.innerHTML =
      submissions.map(submission => {

        const task =
          submission.tasks || {};

        const taskTitle =
          task.title ||
          `Task #${submission.task_id}`;

        const points =
          task.points ?? 0;

        let answers =
          submission.survey_answers;

        if (
          typeof answers === "string"
        ) {
          try {
            answers =
              JSON.parse(answers);
          } catch {
            answers = null;
          }
        }

        let answersHTML = "";

        if (
          answers &&
          typeof answers === "object"
        ) {

          const entries =
            Array.isArray(answers)
              ? answers.map(
                  (item, index) => [
                    index + 1,
                    item
                  ]
                )
              : Object.entries(answers);

          answersHTML =
            entries.map(
              ([number, item]) => {

                const question =
                  item &&
                  typeof item === "object" &&
                  item.question
                    ? item.question
                    : `Question ${number}`;

                const answer =
                  item &&
                  typeof item === "object" &&
                  Object.prototype.hasOwnProperty.call(
                    item,
                    "answer"
                  )
                    ? item.answer
                    : item;

                const answerText =
                  typeof answer === "string"
                    ? answer
                    : JSON.stringify(answer);

                return `

                  <div style="
                    margin-top:8px;
                    padding:10px;
                    border:1px solid
                      rgba(0,200,255,.20);
                    border-radius:10px;
                  ">

                    <strong>
                      ${escapeHTML(question)}
                    </strong>

                    <div style="
                      margin-top:4px;
                      word-break:break-word;
                    ">
                      ${escapeHTML(answerText)}
                    </div>

                  </div>

                `;
              }
            ).join("");
        }


        return `

          <div class="history-row">

            <div style="min-width:0">

              <strong>
                ${escapeHTML(taskTitle)}
              </strong>

              <small>
                Submission #${submission.id}
              </small>

              <small>
                User ID:
                ${escapeHTML(
                  submission.user_id
                )}
              </small>

              <small>
                Reward:
                ${points} points
              </small>

              <small>
                Status:
                ${escapeHTML(
                  submission.status
                )}
              </small>

              <small>
                Submitted:
                ${escapeHTML(
                  formatDate(
                    submission.submitted_at
                  )
                )}
              </small>

              <small>
                Reviewed:
                ${escapeHTML(
                  formatDate(
                    submission.reviewed_at
                  )
                )}
              </small>

              ${
                submission.proof
                  ? `
                    <div style="
                      margin-top:8px;
                      padding:10px;
                      border:1px solid
                        rgba(0,200,255,.25);
                      border-radius:10px;
                      word-break:break-word;
                    ">

                      <strong>
                        Proof
                      </strong>

                      <div>
                        ${escapeHTML(
                          submission.proof
                        )}
                      </div>

                    </div>
                  `
                  : ""
              }

              ${
                answersHTML
                  ? `
                    <div style="
                      margin-top:10px;
                      padding:10px;
                      border:1px solid
                        rgba(0,200,255,.25);
                      border-radius:10px;
                    ">

                      <strong>
                        Survey Answers
                      </strong>

                      ${answersHTML}

                    </div>
                  `
                  : ""
              }

              ${
                submission.reviewer_note
                  ? `
                    <div style="
                      margin-top:8px;
                      padding:10px;
                      border:1px solid
                        rgba(0,200,255,.25);
                      border-radius:10px;
                    ">

                      <strong>
                        Reviewer Note
                      </strong>

                      <div>
                        ${escapeHTML(
                          submission.reviewer_note
                        )}
                      </div>

                    </div>
                  `
                  : ""
              }

            </div>

            ${
              submission.status === "pending"
                ? `
                  <div style="
                    display:flex;
                    flex-direction:column;
                    gap:8px;
                  ">

                    <button
                      class="gradient-button
                        admin-approve"
                      data-id="${submission.id}"
                      type="button"
                    >
                      Approve
                    </button>

                    <button
                      class="outline-button
                        admin-reject"
                      data-id="${submission.id}"
                      type="button"
                    >
                      Reject
                    </button>

                  </div>
                `
                : ""
            }

          </div>

        `;

      }).join("");


    box
      .querySelectorAll(".admin-approve")
      .forEach(button => {

        button.addEventListener(
          "click",
          () =>
            reviewSubmission(
              Number(button.dataset.id),
              "approved"
            )
        );
      });


    box
      .querySelectorAll(".admin-reject")
      .forEach(button => {

        button.addEventListener(
          "click",
          () =>
            reviewSubmission(
              Number(button.dataset.id),
              "rejected"
            )
        );
      });
  }


  async function reviewSubmission(
    submissionId,
    status
  ) {

    const note =
      prompt(
        status === "approved"
          ? "Admin note (optional):"
          : "Reason for rejection:"
      );

    if (note === null) return;

    const {
      error
    } = await db
      .from("task_submissions")
      .update({
        status,
        reviewer_note:
          note.trim(),
        reviewed_at:
          new Date().toISOString()
      })
      .eq("id", submissionId)
      .eq("status", "pending");

    if (error) {

      alert(error.message);

      return;
    }

    await loadSubmissions();
  }


  /* =========================================================
     REWARD / REDEMPTION REQUESTS
     ========================================================= */

  async function loadRedemptions() {

    const box =
      document.getElementById(
        "adminRedemptions"
      );

    if (!box) return;

    const {
      data: requests,
      error
    } = await db
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
      .order("created_at", {
        ascending: false
      });

    if (error) {

      box.innerHTML = `
        <div class="empty-card">
          Unable to load reward requests.
          <small>
            ${escapeHTML(error.message)}
          </small>
        </div>
      `;

      return;
    }

    if (!requests?.length) {

      box.innerHTML = `
        <div class="empty-card">
          No reward requests found.
        </div>
      `;

      return;
    }


    box.innerHTML =
      requests.map(request => `

        <div class="history-row">

          <div style="min-width:0">

            <strong>
              Reward Request #${request.id}
            </strong>

            <small>
              User:
              ${escapeHTML(
                request.user_id
              )}
            </small>

            <small>
              Points:
              ${request.points_requested}
            </small>

            <small>
              Reward type:
              ${escapeHTML(
                request.reward_type
              )}
            </small>

            <small>
              Status:
              ${escapeHTML(
                request.status
              )}
            </small>

            <small>
              Created:
              ${escapeHTML(
                formatDate(
                  request.created_at
                )
              )}
            </small>

          </div>

        </div>

      `).join("");
  }


  /* =========================================================
     START
     ========================================================= */

  if (!db) {

    const content =
      document.getElementById(
        "adminContent"
      );

    if (content) {

      content.innerHTML = `
        <div class="empty-card">
          Supabase configuration could not be loaded.
        </div>
      `;
    }

    return;
  }


  document.addEventListener(
    "DOMContentLoaded",
    loadAdminPage
  );

})();