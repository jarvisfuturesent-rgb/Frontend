/* =========================
   PULSE ADMIN PANEL
   Tasks + Submissions + Businesses + Rewards + Categories + Task Requirements
========================= */

function adminEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================
   ADMIN CHECK
========================= */

async function isCurrentUserAdmin() {
  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return false;

  const { data: profile, error } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Admin check failed:", error);
    return false;
  }

  return profile?.role === "admin";
}

/* =========================
   TASK MANAGEMENT
========================= */

async function loadAdminTasks() {
  const box = document.getElementById("adminTasks");
  if (!box) return;

  const { data: tasks, error } = await db
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
    .order("id", { ascending: false });

  if (error) {
    box.innerHTML = `
      <div class="empty-card">
        Unable to load tasks.
        <small>${adminEscape(error.message)}</small>
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

  box.innerHTML = tasks.map(task => `
    <div class="history-row">

      <div style="min-width:0">

        <strong>
          ${adminEscape(task.title)}
        </strong>

        <small>
          ${task.points} points
        </small>

        <small>
          Status: ${adminEscape(task.status)}
        </small>

        <small>
          Task ID: ${task.id}
        </small>

      </div>

      <div style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      ">

        <button
          class="outline-button admin-task-edit"
          data-id="${task.id}"
          type="button">
          Edit
        </button>

        ${
          task.status !== "active"
            ? `
              <button
                class="gradient-button admin-task-status"
                data-id="${task.id}"
                data-status="active"
                type="button">
                Activate
              </button>
            `
            : ""
        }

        ${
          task.status === "active"
            ? `
              <button
                class="outline-button admin-task-status"
                data-id="${task.id}"
                data-status="paused"
                type="button">
                Pause
              </button>
            `
            : ""
        }

        ${
          task.status !== "completed"
            ? `
              <button
                class="outline-button admin-task-status"
                data-id="${task.id}"
                data-status="completed"
                type="button">
                Complete
              </button>
            `
            : ""
        }

      </div>

    </div>
  `).join("");

  box.querySelectorAll(
    ".admin-task-status"
  ).forEach(button => {

    button.addEventListener("click", async () => {

      const taskId =
        Number(button.dataset.id);

      const newStatus =
        button.dataset.status;

      button.disabled = true;

      const { error } = await db
        .from("tasks")
        .update({
          status: newStatus
        })
        .eq("id", taskId);

      if (error) {
        alert(error.message);
        button.disabled = false;
        return;
      }

      await loadAdminTasks();

      if (typeof refresh === "function") {
        await refresh();
      }

    });

  });

  box.querySelectorAll(
    ".admin-task-edit"
  ).forEach(button => {

    button.addEventListener("click", async () => {

      const taskId =
        Number(button.dataset.id);

      const task =
        tasks.find(
          item => Number(item.id) === taskId
        );

      if (!task) return;

      const title = prompt(
        "Task title:",
        task.title || ""
      );

      if (title === null) return;

      const description = prompt(
        "Task description:",
        task.description || ""
      );

      if (description === null) return;

      const pointsText = prompt(
        "Task points:",
        task.points
      );

      if (pointsText === null) return;

      const points =
        Number(pointsText);

      if (!title.trim()) {
        alert("Task title cannot be empty.");
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

      const { error } = await db
        .from("tasks")
        .update({
          title: title.trim(),
          description: description.trim(),
          points
        })
        .eq("id", taskId);

      if (error) {
        alert(error.message);
        return;
      }

      await loadAdminTasks();

    });

  });

}

/* =========================
   CREATE TASK
========================= */

async function createAdminTask() {

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

  if (
    !titleInput ||
    !pointsInput ||
    !message
  ) {
    return;
  }

  const title =
    titleInput.value.trim();

  const description =
    descriptionInput?.value.trim() || "";

  const points =
    Number(pointsInput.value);

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

  const { error } = await db
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

  await loadAdminTasks();
}

/* =========================
   SUBMISSION MANAGEMENT
========================= */

async function loadAdminSubmissions() {

  const box =
    document.getElementById(
      "adminSubmissions"
    );

  if (!box) return;

  const {
    data: submissions,
    error
  } = await db
    .from("task_submissions")
    .select(`
      id,
      task_id,
      user_id,
      proof,
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
      "status",
      "pending"
    )
    .order(
      "submitted_at",
      {
        ascending: false
      }
    );

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load submissions.
        <small>
          ${adminEscape(error.message)}
        </small>
      </div>
    `;

    return;
  }

  if (!submissions?.length) {

    box.innerHTML = `
      <div class="empty-card">
        No pending submissions.
      </div>
    `;

    return;
  }

  box.innerHTML =
    submissions.map(submission => {

      const taskTitle =
        submission.tasks?.title ||
        `Task #${submission.task_id}`;

      const taskPoints =
        submission.tasks?.points ?? 0;

      return `

        <div class="history-row">

          <div style="min-width:0">

            <strong>
              ${adminEscape(taskTitle)}
            </strong>

            <small>
              User:
              ${adminEscape(
                submission.user_id
              )}
            </small>

            <small>
              ${taskPoints} task points
            </small>

            <small>
              Submission #${submission.id}
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
                      Proof:
                    </strong>

                    <div>
                      ${adminEscape(
                        submission.proof
                      )}
                    </div>

                  </div>
                `
                : `
                  <small>
                    No proof provided.
                  </small>
                `
            }

          </div>

          <div style="
            display:flex;
            flex-direction:column;
            gap:8px;
            min-width:120px;
          ">

            <button
              class="gradient-button
                admin-submission-approve"
              data-id="${submission.id}"
              type="button">
              Approve
            </button>

            <button
              class="outline-button
                admin-submission-reject"
              data-id="${submission.id}"
              type="button">
              Reject
            </button>

          </div>

        </div>

      `;

    }).join("");

  box.querySelectorAll(
    ".admin-submission-approve"
  ).forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const submissionId =
          Number(button.dataset.id);

        const note =
          prompt(
            "Admin note (optional):",
            "Submission approved."
          );

        if (note === null) return;

        button.disabled = true;
        button.textContent =
          "Approving...";

        const { error } =
          await db
            .from("task_submissions")
            .update({
              status: "approved",
              reviewer_note:
                note.trim(),
              reviewed_at:
                new Date().toISOString()
            })
            .eq(
              "id",
              submissionId
            )
            .eq(
              "status",
              "pending"
            );

        if (error) {

          alert(error.message);

          button.disabled = false;
          button.textContent =
            "Approve";

          return;
        }

        await loadAdminSubmissions();

      }
    );

  });

  box.querySelectorAll(
    ".admin-submission-reject"
  ).forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const submissionId =
          Number(button.dataset.id);

        const note =
          prompt(
            "Reason for rejection:",
            ""
          );

        if (note === null) return;

        if (!note.trim()) {

          alert(
            "Please enter a rejection reason."
          );

          return;
        }

        button.disabled = true;
        button.textContent =
          "Rejecting...";

        const { error } =
          await db
            .from("task_submissions")
            .update({
              status: "rejected",
              reviewer_note:
                note.trim(),
              reviewed_at:
                new Date().toISOString()
            })
            .eq(
              "id",
              submissionId
            )
            .eq(
              "status",
              "pending"
            );

        if (error) {

          alert(error.message);

          button.disabled = false;
          button.textContent =
            "Reject";

          return;
        }

        await loadAdminSubmissions();

      }
    );

  });

}

/* =========================
   BUSINESS MANAGEMENT
========================= */

async function loadAdminBusinesses() {

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
    .select(`
      id,
      name,
      description,
      website,
      status,
      created_at
    `)
    .order(
      "id",
      {
        ascending: false
      }
    );

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load businesses.
        <small>
          ${adminEscape(error.message)}
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
    businesses.map(business => `

      <div class="history-row">

        <div style="min-width:0">

          <strong>
            ${adminEscape(
              business.name
            )}
          </strong>

          <small>
            Status:
            ${adminEscape(
              business.status
            )}
          </small>

          ${
            business.description
              ? `
                <small>
                  ${adminEscape(
                    business.description
                  )}
                </small>
              `
              : ""
          }

          ${
            business.website
              ? `
                <small>
                  ${adminEscape(
                    business.website
                  )}
                </small>
              `
              : ""
          }

          <small>
            Business ID:
            ${business.id}
          </small>

        </div>

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        ">

          <button
            class="outline-button
              admin-business-edit"
            data-id="${business.id}"
            type="button">
            Edit
          </button>

          ${
            business.status === "pending"
              ? `
                <button
                  class="gradient-button
                    admin-business-status"
                  data-id="${business.id}"
                  data-status="approved"
                  type="button">
                  Approve
                </button>

                <button
                  class="outline-button
                    admin-business-status"
                  data-id="${business.id}"
                  data-status="rejected"
                  type="button">
                  Reject
                </button>
              `
              : ""
          }

          ${
            business.status === "approved"
              ? `
                <button
                  class="outline-button
                    admin-business-status"
                  data-id="${business.id}"
                  data-status="inactive"
                  type="button">
                  Deactivate
                </button>
              `
              : ""
          }

          ${
            business.status === "inactive"
              ? `
                <button
                  class="gradient-button
                    admin-business-status"
                  data-id="${business.id}"
                  data-status="approved"
                  type="button">
                  Activate
                </button>
              `
              : ""
          }

        </div>

      </div>

    `).join("");

  box.querySelectorAll(
    ".admin-business-status"
  ).forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const businessId =
          Number(button.dataset.id);

        const newStatus =
          button.dataset.status;

        button.disabled = true;

        const { error } =
          await db
            .from("businesses")
            .update({
              status: newStatus
            })
            .eq(
              "id",
              businessId
            );

        if (error) {

          alert(error.message);

          button.disabled = false;

          return;
        }

        await loadAdminBusinesses();

      }
    );

  });

  box.querySelectorAll(
    ".admin-business-edit"
  ).forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const businessId =
          Number(button.dataset.id);

        const business =
          businesses.find(
            item =>
              Number(item.id) ===
              businessId
          );

        if (!business) return;

        const name =
          prompt(
            "Business name:",
            business.name || ""
          );

        if (name === null) return;

        const description =
          prompt(
            "Business description:",
            business.description || ""
          );

        if (description === null) return;

        const website =
          prompt(
            "Business website:",
            business.website || ""
          );

        if (website === null) return;

        if (!name.trim()) {

          alert(
            "Business name cannot be empty."
          );

          return;
        }

        const { error } =
          await db
            .from("businesses")
            .update({
              name: name.trim(),
              description:
                description.trim(),
              website:
                website.trim()
            })
            .eq(
              "id",
              businessId
            );

        if (error) {

          alert(error.message);

          return;
        }

        await loadAdminBusinesses();

      }
    );

  });

}

/* =========================
   REWARD MANAGEMENT
========================= */

async function loadAdminRedemptions() {

  const box =
    document.getElementById(
      "adminRedemptions"
    );

  if (!box) return;

  const {
    data: rewards,
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
    .eq(
      "status",
      "pending"
    )
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load rewards.
        <small>
          ${adminEscape(error.message)}
        </small>
      </div>
    `;

    return;
  }

  if (!rewards?.length) {

    box.innerHTML = `
      <div class="empty-card">
        No pending reward requests.
      </div>
    `;

    return;
  }

  box.innerHTML =
    rewards.map(reward => `

      <div class="history-row">

        <div style="min-width:0">

          <strong>
            ${adminEscape(
              reward.reward_type
            )}
          </strong>

          <small>
            User:
            ${adminEscape(
              reward.user_id
            )}
          </small>

          <small>
            Points:
            ${reward.points_requested}
          </small>

          <small>
            Request #${reward.id}
          </small>

          ${
            reward.user_note
              ? `
                <small>
                  Note:
                  ${adminEscape(
                    reward.user_note
                  )}
                </small>
              `
              : ""
          }

        </div>

        <div style="
          display:flex;
          flex-direction:column;
          gap:8px;
          min-width:120px;
        ">

          <button
            class="gradient-button
              admin-reward-approve"
            data-id="${reward.id}"
            type="button">
            Give Reward
          </button>

          <button
            class="outline-button
              admin-reward-reject"
            data-id="${reward.id}"
            type="button">
            Reject
          </button>

        </div>

      </div>

    `).join("");

  box.querySelectorAll(
    ".admin-reward-approve"
  ).forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const requestId =
          Number(button.dataset.id);

        const note =
          prompt(
            "Admin note (optional):",
            "Reward approved."
          );

        if (note === null) return;

        button.disabled = true;
        button.textContent =
          "Giving Reward...";

        const {
          error
        } = await db.rpc(
          "process_redemption_request",
          {
            p_request_id:
              requestId
          }
        );

        if (error) {

          alert(error.message);

          button.disabled = false;
          button.textContent =
            "Give Reward";

          return;
        }

        await db
          .from("redemption_requests")
          .update({
            admin_note:
              note.trim()
          })
          .eq(
            "id",
            requestId
          );

        await loadAdminRedemptions();

        if (
          typeof refresh ===
          "function"
        ) {
          await refresh();
        }

      }
    );

  });

  box.querySelectorAll(
    ".admin-reward-reject"
  ).forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const requestId =
          Number(button.dataset.id);

        const note =
          prompt(
            "Reason for rejection:",
            ""
          );

        if (note === null) return;

        if (!note.trim()) {

          alert(
            "Please enter a rejection reason."
          );

          return;
        }

        button.disabled = true;
        button.textContent =
          "Rejecting...";

        const {
          error
        } = await db
          .from("redemption_requests")
          .update({
            status: "rejected",
            admin_note:
              note.trim(),
            reviewed_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            requestId
          )
          .eq(
            "status",
            "pending"
          );

        if (error) {

          alert(error.message);

          button.disabled = false;
          button.textContent =
            "Reject";

          return;
        }

        await loadAdminRedemptions();

      }
    );

  });

}

/* =========================
   CATEGORY MANAGEMENT
========================= */

async function loadAdminCategories() {

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
      description,
      created_at
    `)
    .order(
      "id",
      {
        ascending: false
      }
    );

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load categories.
        <small>
          ${adminEscape(error.message)}
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
            ${adminEscape(
              category.name
            )}
          </strong>

          ${
            category.description
              ? `
                <small>
                  ${adminEscape(
                    category.description
                  )}
                </small>
              `
              : ""
          }

          <small>
            Category ID:
            ${category.id}
          </small>

        </div>

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        ">

          <button
            class="outline-button
              admin-category-edit"
            data-id="${category.id}"
            type="button">
            Edit
          </button>

          <button
            class="outline-button
              admin-category-delete"
            data-id="${category.id}"
            type="button">
            Delete
          </button>

        </div>

      </div>

    `).join("");

  box.querySelectorAll(
    ".admin-category-edit"
  ).forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const categoryId =
          Number(button.dataset.id);

        const category =
          categories.find(
            item =>
              Number(item.id) ===
              categoryId
          );

        if (!category) return;

        const name =
          prompt(
            "Category name:",
            category.name || ""
          );

        if (name === null) return;

        const description =
          prompt(
            "Category description:",
            category.description || ""
          );

        if (description === null) return;

        if (!name.trim()) {

          alert(
            "Category name cannot be empty."
          );

          return;
        }

        const {
          error
        } = await db
          .from("task_categories")
          .update({
            name:
              name.trim(),
            description:
              description.trim()
          })
          .eq(
            "id",
            categoryId
          );

        if (error) {

          alert(error.message);

          return;
        }

        await loadAdminCategories();

      }
    );

  });

  box.querySelectorAll(
    ".admin-category-delete"
  ).forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const categoryId =
          Number(button.dataset.id);

        const {
          data: tasksUsingCategory,
          error:
            taskCheckError
        } = await db
          .from("tasks")
          .select("id")
          .eq(
            "category_id",
            categoryId
          )
          .limit(1);

        if (taskCheckError) {

          alert(
            taskCheckError.message
          );

          return;
        }

        if (
          tasksUsingCategory?.length
        ) {

          alert(
            "This category is being used by a task and cannot be deleted."
          );

          return;
        }

        if (
          !confirm(
            "Delete this category?"
          )
        ) {
          return;
        }

        const {
          error
        } = await db
          .from("task_categories")
          .delete()
          .eq(
            "id",
            categoryId
          );

        if (error) {

          alert(error.message);

          return;
        }

        await loadAdminCategories();

      }
    );

  });

}

async function createAdminCategory() {

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

  if (
    !nameInput ||
    !message
  ) {
    return;
  }

  const name =
    nameInput.value.trim();

  const description =
    descriptionInput?.value.trim() || "";

  if (!name) {

    message.textContent =
      "Enter a category name.";

    return;
  }

  const {
    error
  } = await db
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

  await loadAdminCategories();

}

/* =========================
   TASK REQUIREMENTS MANAGEMENT
========================= */

async function loadAdminRequirementTasks() {

  const select =
    document.getElementById(
      "adminRequirementTask"
    );

  if (!select) return;

  const {
    data: tasks,
    error
  } = await db
    .from("tasks")
    .select(
      "id, title"
    )
    .order(
      "id",
      {
        ascending: false
      }
    );

  if (error) {

    console.error(
      "Unable to load requirement tasks:",
      error
    );

    select.innerHTML = `
      <option value="">
        Unable to load tasks
      </option>
    `;

    return;
  }

  select.innerHTML =
    `<option value="">Select a task</option>` +
    (tasks || [])
      .map(task => `
        <option value="${task.id}">
          ${adminEscape(task.title)}
        </option>
      `)
      .join("");

}

async function loadAdminRequirements(taskId) {

  const box =
    document.getElementById(
      "adminRequirements"
    );

  if (!box) return;

  if (!taskId) {

    box.innerHTML = `
      <div class="empty-card">
        Select a task to manage its requirements.
      </div>
    `;

    return;
  }

  const {
    data: requirements,
    error
  } = await db
    .from("task_requirements")
    .select(
      "id, task_id, requirement, sort_order, created_at"
    )
    .eq(
      "task_id",
      Number(taskId)
    )
    .order(
      "sort_order",
      {
        ascending: true
      }
    )
    .order(
      "id",
      {
        ascending: true
      }
    );

  if (error) {

    box.innerHTML = `
      <div class="empty-card">
        Unable to load requirements.
        <small>
          ${adminEscape(error.message)}
        </small>
      </div>
    `;

    return;
  }

  if (!requirements?.length) {

    box.innerHTML = `
      <div class="empty-card">
        No requirements for this task.
      </div>
    `;

    return;
  }

  box.innerHTML =
    requirements.map(item => `

      <div class="history-row">

        <div style="min-width:0">

          <strong>
            ${adminEscape(
              item.requirement
            )}
          </strong>

          <small>
            Order:
            ${item.sort_order}
          </small>

          <small>
            Requirement ID:
            ${item.id}
          </small>

        </div>

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        ">

          <button
            class="outline-button
              admin-requirement-edit"
            data-id="${item.id}"
            type="button">
            Edit
          </button>

          <button
            class="outline-button
              admin-requirement-delete"
            data-id="${item.id}"
            type="button">
            Delete
          </button>

        </div>

      </div>

    `).join("");

  box.querySelectorAll(
    ".admin-requirement-edit"
  ).forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const requirementId =
          Number(button.dataset.id);

        const item =
          requirements.find(
            requirement =>
              Number(requirement.id) ===
              requirementId
          );

        if (!item) return;

        const requirement =
          prompt(
            "Requirement:",
            item.requirement || ""
          );

        if (
          requirement === null
        ) {
          return;
        }

        const orderText =
          prompt(
            "Order number (0 or greater):",
            item.sort_order ?? 0
          );

        if (
          orderText === null
        ) {
          return;
        }

        const sortOrder =
          Number(orderText);

        if (
          !requirement.trim()
        ) {

          alert(
            "Requirement cannot be empty."
          );

          return;
        }

        if (
          !Number.isInteger(
            sortOrder
          ) ||
          sortOrder < 0
        ) {

          alert(
            "Order must be a whole number of 0 or greater."
          );

          return;
        }

        const {
          error
        } = await db
          .from("task_requirements")
          .update({
            requirement:
              requirement.trim(),
            sort_order:
              sortOrder
          })
          .eq(
            "id",
            requirementId
          );

        if (error) {

          alert(error.message);

          return;
        }

        await loadAdminRequirements(
          taskId
        );

      }
    );

  });

  box.querySelectorAll(
    ".admin-requirement-delete"
  ).forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const requirementId =
          Number(button.dataset.id);

        if (
          !confirm(
            "Delete this requirement?"
          )
        ) {
          return;
        }

        const {
          error
        } = await db
          .from("task_requirements")
          .delete()
          .eq(
            "id",
            requirementId
          );

        if (error) {

          alert(error.message);

          return;
        }

        await loadAdminRequirements(
          taskId
        );

      }
    );

  });

}

async function createAdminRequirement() {

  const taskSelect =
    document.getElementById(
      "adminRequirementTask"
    );

  const requirementInput =
    document.getElementById(
      "adminRequirementText"
    );

  const orderInput =
    document.getElementById(
      "adminRequirementOrder"
    );

  const message =
    document.getElementById(
      "adminRequirementMsg"
    );

  if (
    !taskSelect ||
    !requirementInput ||
    !orderInput
  ) {
    return;
  }

  const taskId =
    Number(taskSelect.value);

  const requirement =
    requirementInput.value.trim();

  const sortOrder =
    Number(orderInput.value);

  if (
    !taskSelect.value ||
    !Number.isInteger(taskId) ||
    taskId <= 0
  ) {

    if (message) {
      message.textContent =
        "Select a task first.";
    }

    return;
  }

  if (!requirement) {

    if (message) {
      message.textContent =
        "Enter a requirement.";
    }

    return;
  }

  if (
    !Number.isInteger(sortOrder) ||
    sortOrder < 0
  ) {

    if (message) {
      message.textContent =
        "Order must be a whole number of 0 or greater.";
    }

    return;
  }

  const {
    error
  } = await db
    .from("task_requirements")
    .insert({
      task_id: taskId,
      requirement,
      sort_order: sortOrder
    });

  if (error) {

    if (message) {
      message.textContent =
        error.message;
    }

    return;
  }

  requirementInput.value = "";
  orderInput.value = "0";

  if (message) {
    message.textContent =
      "Requirement created.";
  }

  await loadAdminRequirements(
    taskId
  );

}

/* =========================
   ADMIN PANEL
========================= */

async function loadAdminPanel() {

  const admin =
    await isCurrentUserAdmin();

  if (!admin) {
    return;
  }

  let panel =
    document.getElementById(
      "adminPanel"
    );

  if (!panel) {

    panel =
      document.createElement(
        "section"
      );

    panel.id =
      "adminPanel";

    panel.className =
      "panel";

    panel.innerHTML = `

      <div class="panel-heading">

        <h2>
          ⚙ Admin Panel
        </h2>

      </div>


      <!-- TASK MANAGEMENT -->

      <div class="reward-box">

        <h3>
          📋 Task Management
        </h3>

        <input
          id="adminTaskTitle"
          type="text"
          placeholder="Task title"
        >

        <textarea
          id="adminTaskDescription"
          rows="3"
          placeholder="Task description"
        ></textarea>

        <input
          id="adminTaskPoints"
          type="number"
          min="1"
          step="1"
          placeholder="Points"
        >

        <select
          id="adminTaskStatus">

          <option value="draft">
            Draft
          </option>

          <option value="active">
            Active
          </option>

          <option value="paused">
            Paused
          </option>

          <option value="completed">
            Completed
          </option>

        </select>

        <button
          id="adminCreateTask"
          class="gradient-button"
          type="button">

          Create Task

        </button>

        <p
          id="adminTaskMsg"
          class="status">
        </p>

      </div>

      <div id="adminTasks">

        <div class="loading-box">
          Loading tasks...
        </div>

      </div>


      <!-- CATEGORY MANAGEMENT -->

      <div
        class="panel-heading"
        style="margin-top:24px">

        <h2>
          📂 Category Management
        </h2>

      </div>

      <div class="reward-box">

        <input
          id="adminCategoryName"
          type="text"
          placeholder="Category name"
        >

        <textarea
          id="adminCategoryDescription"
          rows="2"
          placeholder="Category description"
        ></textarea>

        <button
          id="adminCreateCategory"
          class="gradient-button"
          type="button">

          Create Category

        </button>

        <p
          id="adminCategoryMsg"
          class="status">
        </p>

      </div>

      <div id="adminCategories">

        <div class="loading-box">
          Loading categories...
        </div>

      </div>


      <!-- TASK REQUIREMENTS -->

      <div
        class="panel-heading"
        style="margin-top:24px">

        <h2>
          📝 Task Requirements
        </h2>

      </div>

      <div class="reward-box">

        <select
          id="adminRequirementTask">

          <option value="">
            Loading tasks...
          </option>

        </select>

        <input
          id="adminRequirementText"
          type="text"
          placeholder="Requirement"
        >

        <input
          id="adminRequirementOrder"
          type="number"
          min="0"
          step="1"
          value="0"
          placeholder="Order"
        >

        <button
          id="adminCreateRequirement"
          class="gradient-button"
          type="button">

          Add Requirement

        </button>

        <p
          id="adminRequirementMsg"
          class="status">
        </p>

      </div>

      <div id="adminRequirements">

        <div class="empty-card">
          Select a task to manage its requirements.
        </div>

      </div>


      <!-- SUBMISSION MANAGEMENT -->

      <div
        class="panel-heading"
        style="margin-top:24px">

        <h2>
          📋 Task Submissions
        </h2>

      </div>

      <div id="adminSubmissions">

        <div class="loading-box">
          Loading submissions...
        </div>

      </div>


      <!-- BUSINESS MANAGEMENT -->

      <div
        class="panel-heading"
        style="margin-top:24px">

        <h2>
          🏢 Business Management
        </h2>

      </div>

      <div id="adminBusinesses">

        <div class="loading-box">
          Loading businesses...
        </div>

      </div>


      <!-- REWARD MANAGEMENT -->

      <div
        class="panel-heading"
        style="margin-top:24px">

        <h2>
          🎁 Pending Rewards
        </h2>

      </div>

      <div id="adminRedemptions">

        <div class="loading-box">
          Loading pending rewards...
        </div>

      </div>

    `;

    const dashboard =
      document.getElementById(
        "dashboard"
      );

    if (dashboard) {
      dashboard.prepend(panel);
    }

    const createButton =
      document.getElementById(
        "adminCreateTask"
      );

    if (createButton) {

      createButton.addEventListener(
        "click",
        createAdminTask
      );

    }

    const createCategoryButton =
      document.getElementById(
        "adminCreateCategory"
      );

    if (createCategoryButton) {

      createCategoryButton.addEventListener(
        "click",
        createAdminCategory
      );

    }

    const requirementTaskSelect =
      document.getElementById(
        "adminRequirementTask"
      );

    if (requirementTaskSelect) {

      requirementTaskSelect.addEventListener(
        "change",
        () =>
          loadAdminRequirements(
            requirementTaskSelect.value
          )
      );

    }

    const createRequirementButton =
      document.getElementById(
        "adminCreateRequirement"
      );

    if (createRequirementButton) {

      createRequirementButton.addEventListener(
        "click",
        createAdminRequirement
      );

    }

  }

  await loadAdminTasks();

  await loadAdminCategories();

  await loadAdminSubmissions();

  await loadAdminBusinesses();

  await loadAdminRedemptions();

  await loadAdminRequirementTasks();

}

/* =========================
   START ADMIN
========================= */

window.addEventListener(
  "load",
  () => {

    setTimeout(
      loadAdminPanel,
      500
    );

  }
);

if (
  typeof db !== "undefined"
) {

  db.auth.onAuthStateChange(
    () => {

      setTimeout(
        loadAdminPanel,
        300
      );

    }
  );

}