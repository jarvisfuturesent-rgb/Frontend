(() => {
  "use strict";

  // =========================================
  // SUPABASE CONNECTION
  // =========================================

  let db = null;

  function getDb() {
    if (window.db) return window.db;

    if (window.supabaseClient) {
      return window.supabaseClient;
    }

    if (
      window.supabase &&
      window.SUPABASE_URL &&
      window.SUPABASE_ANON_KEY
    ) {
      return window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
      );
    }

    return null;
  }

  db = getDb();


  // =========================================
  // HELPERS
  // =========================================

  function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return escapeHTML(value);
    }

    return date.toLocaleString();
  }

  function getAdminContent() {
    return document.getElementById("adminContent");
  }


  // =========================================
  // ADMIN CHECK
  // =========================================

  async function getCurrentAdmin() {
    if (!db) return null;

    const {
      data: { user },
      error: userError
    } = await db.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data: profile, error } = await db
      .from("profiles")
      .select("id, name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile check failed:", error);
      return null;
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
      const content = getAdminContent();

      if (content) {
        content.innerHTML = `
          <div class="panel">
            <h3>Admin Access Required</h3>
            <p>You must be signed in with an administrator account.</p>
            <p>
              <a href="dashboard.html">Return to Dashboard</a>
            </p>
          </div>
        `;
      }

      return null;
    }

    return admin;
  }


  // =========================================
  // TASKS
  // =========================================

  async function loadTasks() {
    const { data, error } = await db
      .from("tasks")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      return `<p>Unable to load tasks.</p>`;
    }

    let html = `
      <h3>Task Management</h3>

      <form id="createTaskForm">
        <label>Task Title</label>
        <input id="taskTitle" required>

        <label>Task Description</label>
        <textarea id="taskDescription"></textarea>

        <label>Points</label>
        <input id="taskPoints" type="number" min="0" value="25" required>

        <button type="submit">Create Task</button>
      </form>

      <div id="taskMessage"></div>

      <h4>Tasks</h4>
    `;

    if (!data || data.length === 0) {
      html += "<p>No tasks found.</p>";
      return html;
    }

    html += data.map(task => `
      <div class="panel">
        <strong>${escapeHTML(task.title)}</strong>

        <p>${escapeHTML(task.description || "")}</p>

        <p>
          Points: ${escapeHTML(task.points)}
          <br>
          Status: ${escapeHTML(task.status)}
        </p>

        <button
          class="taskStatusButton"
          data-id="${task.id}"
          data-status="${
            task.status === "active" ? "paused" : "active"
          }"
        >
          ${
            task.status === "active"
              ? "Pause"
              : "Activate"
          }
        </button>
      </div>
    `).join("");

    return html;
  }


  // =========================================
  // CATEGORIES
  // =========================================

  async function loadCategories() {
    const { data, error } = await db
      .from("task_categories")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      return `
        <h3>Category Management</h3>
        <p>Unable to load categories.</p>
      `;
    }

    let html = `
      <h3>Category Management</h3>

      <form id="createCategoryForm">

        <label>Category Name</label>
        <input id="categoryName" required>

        <label>Description</label>
        <textarea id="categoryDescription"></textarea>

        <button type="submit">Create Category</button>

      </form>

      <div id="categoryMessage"></div>
    `;

    if (!data || data.length === 0) {
      html += "<p>No categories found.</p>";
      return html;
    }

    html += data.map(category => `
      <div class="panel">
        <strong>${escapeHTML(category.name)}</strong>
        <p>${escapeHTML(category.description || "")}</p>
      </div>
    `).join("");

    return html;
  }


  // =========================================
  // BUSINESSES
  // =========================================

  async function loadBusinesses() {
    const { data, error } = await db
      .from("businesses")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      return `
        <h3>Businesses</h3>
        <p>Unable to load businesses.</p>
      `;
    }

    let html = `
      <h3>Businesses</h3>
    `;

    if (!data || data.length === 0) {
      html += "<p>No businesses found.</p>";
      return html;
    }

    html += data.map(business => `
      <div class="panel">
        <strong>
          ${escapeHTML(
            business.name ||
            business.business_name ||
            "Business"
          )}
        </strong>

        <p>
          ${escapeHTML(
            business.description || ""
          )}
        </p>
      </div>
    `).join("");

    return html;
  }


  // =========================================
  // SURVEY ANSWERS
  // =========================================

  function renderSurveyAnswers(answers) {
    if (!answers) {
      return "<p>No survey answers recorded.</p>";
    }

    if (typeof answers === "string") {
      try {
        answers = JSON.parse(answers);
      } catch {
        return `<p>${escapeHTML(answers)}</p>`;
      }
    }

    if (Array.isArray(answers)) {
      return answers.map((item, index) => `
        <div class="panel">
          <strong>
            ${index + 1}. ${escapeHTML(item.question || "")}
          </strong>

          <p>
            ${escapeHTML(item.answer || "")}
          </p>
        </div>
      `).join("");
    }

    if (typeof answers === "object") {
      return Object.entries(answers).map(
        ([key, value]) => `
          <div class="panel">
            <strong>${escapeHTML(key)}</strong>
            <p>${escapeHTML(
              typeof value === "object"
                ? JSON.stringify(value)
                : value
            )}</p>
          </div>
        `
      ).join("");
    }

    return "<p>No survey answers recorded.</p>";
  }


  // =========================================
  // SUBMISSIONS
  // =========================================

  async function loadSubmissions() {
    const { data, error } = await db
      .from("task_submissions")
      .select(`
        *,
        tasks (
          title,
          points
        )
      `)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error(error);

      return `
        <h3>Submissions</h3>
        <p>Unable to load submissions.</p>
      `;
    }

    let html = `
      <h3>Survey / Task Submissions</h3>
    `;

    if (!data || data.length === 0) {
      html += "<p>No submissions found.</p>";
      return html;
    }

    html += data.map(submission => `
      <div class="panel">

        <h4>
          Submission #${escapeHTML(submission.id)}
        </h4>

        <p>
          <strong>Task:</strong>
          ${escapeHTML(
            submission.tasks?.title || "Unknown Task"
          )}
        </p>

        <p>
          <strong>User ID:</strong>
          ${escapeHTML(submission.user_id)}
        </p>

        <p>
          <strong>Status:</strong>
          ${escapeHTML(submission.status)}
        </p>

        <p>
          <strong>Submitted:</strong>
          ${formatDate(submission.submitted_at)}
        </p>

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

        <details>
          <summary>View Survey Answers</summary>

          ${renderSurveyAnswers(
            submission.survey_answers
          )}
        </details>

        ${
          submission.status === "pending"
            ? `
              <button
                class="approveSubmission"
                data-id="${submission.id}"
              >
                Approve
              </button>

              <button
                class="rejectSubmission"
                data-id="${submission.id}"
              >
                Reject
              </button>
            `
            : ""
        }

      </div>
    `).join("");

    return html;
  }


  // =========================================
  // REDEMPTIONS
  // =========================================

  async function loadRedemptions() {
    const { data, error } = await db
      .from("redemption_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return `
        <h3>Reward Requests</h3>
        <p>Unable to load reward requests.</p>
      `;
    }

    let html = `
      <h3>Reward Requests</h3>
    `;

    if (!data || data.length === 0) {
      html += "<p>No reward requests found.</p>";
      return html;
    }

    html += data.map(request => `
      <div class="panel">

        <h4>
          Request #${escapeHTML(request.id)}
        </h4>

        <p>
          User:
          ${escapeHTML(request.user_id)}
        </p>

        <p>
          Points:
          ${escapeHTML(request.points_requested)}
        </p>

        <p>
          Reward Type:
          ${escapeHTML(request.reward_type)}
        </p>

        <p>
          Status:
          ${escapeHTML(request.status)}
        </p>

        <p>
          Created:
          ${formatDate(request.created_at)}
        </p>

      </div>
    `).join("");

    return html;
  }


  // =========================================
  // ADMIN PAGE
  // =========================================

  async function loadAdminPage() {
    const content = getAdminContent();

    if (!content) return;

    content.innerHTML = `
      <p>Checking administrator access...</p>
    `;

    if (!db) {
      content.innerHTML = `
        <div class="panel">
          <h3>Supabase Configuration Error</h3>
          <p>
            Supabase could not be initialized.
          </p>
        </div>
      `;

      return;
    }

    const admin = await requireAdmin();

    if (!admin) return;

    content.innerHTML = `
      <p>Loading admin dashboard...</p>
    `;

    try {
      const [
        tasksHTML,
        categoriesHTML,
        businessesHTML,
        submissionsHTML,
        redemptionsHTML
      ] = await Promise.all([
        loadTasks(),
        loadCategories(),
        loadBusinesses(),
        loadSubmissions(),
        loadRedemptions()
      ]);

      content.innerHTML = `

        <section class="panel">
          ${tasksHTML}
        </section>

        <section class="panel">
          ${categoriesHTML}
        </section>

        <section class="panel">
          ${businessesHTML}
        </section>

        <section class="panel">
          ${submissionsHTML}
        </section>

        <section class="panel">
          ${redemptionsHTML}
        </section>

      `;

      attachAdminEvents();

    } catch (error) {
      console.error("Admin dashboard error:", error);

      content.innerHTML = `
        <div class="panel">
          <h3>Admin Dashboard Error</h3>
          <p>
            Something went wrong while loading the dashboard.
          </p>
        </div>
      `;
    }
  }


  // =========================================
  // ADMIN ACTIONS
  // =========================================

  function attachAdminEvents() {

    const createTaskForm =
      document.getElementById("createTaskForm");

    if (createTaskForm) {
      createTaskForm.addEventListener(
        "submit",
        async event => {

          event.preventDefault();

          const title =
            document.getElementById("taskTitle").value.trim();

          const description =
            document
              .getElementById("taskDescription")
              .value
              .trim();

          const points =
            Number(
              document
                .getElementById("taskPoints")
                .value
            );

          const message =
            document.getElementById("taskMessage");

          if (!title) {
            message.textContent =
              "Enter a task title.";

            return;
          }

          const { error } = await db
            .from("tasks")
            .insert({
              title,
              description,
              points,
              status: "active"
            });

          if (error) {
            console.error(error);

            message.textContent =
              "Unable to create task.";

            return;
          }

          message.textContent =
            "Task created successfully.";

          await loadAdminPage();
        }
      );
    }


    const createCategoryForm =
      document.getElementById(
        "createCategoryForm"
      );

    if (createCategoryForm) {
      createCategoryForm.addEventListener(
        "submit",
        async event => {

          event.preventDefault();

          const name =
            document
              .getElementById("categoryName")
              .value
              .trim();

          const description =
            document
              .getElementById("categoryDescription")
              .value
              .trim();

          const message =
            document.getElementById(
              "categoryMessage"
            );

          if (!name) {
            message.textContent =
              "Enter a category name.";

            return;
          }

          const { error } = await db
            .from("task_categories")
            .insert({
              name,
              description
            });

          if (error) {
            console.error(error);

            message.textContent =
              "Unable to create category.";

            return;
          }

          message.textContent =
            "Category created successfully.";

          await loadAdminPage();
        }
      );
    }


    document
      .querySelectorAll(".taskStatusButton")
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              Number(button.dataset.id);

            const status =
              button.dataset.status;

            const { error } = await db
              .from("tasks")
              .update({ status })
              .eq("id", id);

            if (error) {
              console.error(error);
              alert("Unable to update task.");
              return;
            }

            await loadAdminPage();
          }
        );
      });


    document
      .querySelectorAll(".approveSubmission")
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              Number(button.dataset.id);

            const note =
              prompt(
                "Reviewer note (optional):",
                ""
              );

            const { error } = await db.rpc(
              "approve_task_submission",
              {
                p_submission_id: id,
                p_reviewer_note: note || null
              }
            );

            if (error) {
              console.error(error);

              alert(
                "Approval failed. " +
                error.message
              );

              return;
            }

            await loadAdminPage();
          }
        );
      });


    document
      .querySelectorAll(".rejectSubmission")
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              Number(button.dataset.id);

            const note =
              prompt(
                "Reason for rejection:",
                ""
              );

            const { error } = await db
              .from("task_submissions")
              .update({
                status: "rejected",
                reviewer_note: note || null,
                reviewed_at: new Date().toISOString()
              })
              .eq("id", id);

            if (error) {
              console.error(error);

              alert(
                "Rejection failed. " +
                error.message
              );

              return;
            }

            await loadAdminPage();
          }
        );
      });
  }


  // =========================================
  // START
  // =========================================

  document.addEventListener(
    "DOMContentLoaded",
    loadAdminPage
  );

  window.PULSEAdmin = {
    load: loadAdminPage
  };

})();