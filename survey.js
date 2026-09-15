/* =========================
   PULSE TESTING SURVEYS
========================= */

(function () {

const SURVEYS = {
  "PULSE Survey 1": [
    ["Did creating your account go smoothly?", "yesno"],
    ["Did your first login work correctly?", "yesno"],
    ["Did the dashboard load smoothly after logging in?", "yesno"],
    ["Did all dashboard sections load properly?", "yesno"],
    ["Did logging out work correctly?", "yesno"],
    ["Did logging back in work correctly?", "yesno"],
    ["Did Forgot Password work correctly?", "yesno"],
    ["Did the password reset process work correctly?", "yesno"],
    ["After resetting your password, could you log in with the new password?", "yesno"],
    ["Overall, how smooth was the account/login experience?", "rating"],
    ["Final feedback: What went wrong, what was confusing, or what worked especially well?", "text"]
  ],

  "PULSE Survey 2": [
    ["Did the task load correctly?", "yesno"],
    ["Was the task easy to understand?", "yesno"],
    ["Did submitting the task work properly?", "yesno"],
    ["Did the submission show as pending?", "yesno"],
    ["Did the notification appear correctly?", "yesno"],
    ["Did the notification message make sense?", "yesno"],
    ["Did the task approval process work properly?", "yesno"],
    ["Did the dashboard show the updated task status correctly?", "yesno"],
    ["Did anything appear broken, delayed, or confusing?", "yesno"],
    ["Overall, how smooth was the task experience?", "rating"],
    ["Final feedback: What happened during this task, and what should we improve?", "text"]
  ],

  "PULSE Survey 3": [
    ["Did the reward section load properly?", "yesno"],
    ["Could you enter the number of PLS you wanted to withdraw?", "yesno"],
    ["Could you select the reward type?", "yesno"],
    ["Could you submit the withdrawal request successfully?", "yesno"],
    ["Did the app confirm that your withdrawal request was submitted?", "yesno"],
    ["Did your withdrawal request appear under My Withdrawals?", "yesno"],
    ["Did the request show the correct PLS amount and status?", "yesno"],
    ["Did you receive a notification about the withdrawal request?", "yesno"],
    ["Was anything confusing, broken, or delayed?", "yesno"],
    ["Overall, how smooth was the withdrawal request experience?", "rating"],
    ["Final feedback: What happened, and what should we improve?", "text"]
  ],

  "PULSE Survey 4": [
    ["Did your PLS balance display correctly?", "yesno"],
    ["Did the points activity/history load correctly?", "yesno"],
    ["Did the points amount look correct?", "yesno"],
    ["Did the balance update when it was supposed to?", "yesno"],
    ["Did the app avoid adding points before the task reward was approved?", "yesno"],
    ["Did the reward approval add the correct points?", "yesno"],
    ["Did the points activity show the correct transaction?", "yesno"],
    ["Did the dashboard refresh and show the updated balance?", "yesno"],
    ["Was anything confusing, incorrect, or delayed?", "yesno"],
    ["Overall, how smooth was the points/balance experience?", "rating"],
    ["Final feedback: What happened and what should we improve?", "text"]
  ],

  "PULSE Survey 5": [
    ["Did the app work correctly overall?", "yesno"],
    ["Was creating an account easy?", "yesno"],
    ["Was logging in easy?", "yesno"],
    ["Were the tasks easy to understand and complete?", "yesno"],
    ["Did submitting tasks work correctly?", "yesno"],
    ["Did your points and balance behave correctly?", "yesno"],
    ["Did requesting a PLS withdrawal work correctly?", "yesno"],
    ["Were notifications clear and useful?", "yesno"],
    ["Did anything break, freeze, or behave unexpectedly?", "yesno"],
    ["Overall, how would you rate the app?", "rating"],
    ["Final feedback: What did you like most, what went wrong, and what should we improve?", "text"]
  ]
};


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================
   FIND SURVEY
========================= */

function findSurvey(title) {
  const cleanTitle = String(title || "").trim();

  return Object.keys(SURVEYS).find(key =>
    cleanTitle.startsWith(key)
  );
}


/* =========================
   RENDER QUESTION
========================= */

function renderQuestion(question, index) {
  const questionText = escapeHtml(question[0]);
  const number = index + 1;

  if (question[1] === "yesno") {
    return `
      <div class="survey-question-block">
        <div class="survey-question-text">
          ${number}. ${questionText}
        </div>

        <select
          name="q${index}"
          class="survey-input"
          required
        >
          <option value="">Choose...</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>
    `;
  }

  if (question[1] === "rating") {
    return `
      <div class="survey-question-block">
        <div class="survey-question-text">
          ${number}. ${questionText}
        </div>

        <select
          name="q${index}"
          class="survey-input"
          required
        >
          <option value="">Choose a rating...</option>
          <option value="1">1 - Very poor</option>
          <option value="2">2 - Poor</option>
          <option value="3">3 - Okay</option>
          <option value="4">4 - Good</option>
          <option value="5">5 - Excellent</option>
        </select>
      </div>
    `;
  }

  return `
    <div class="survey-question-block">
      <div class="survey-question-text">
        ${number}. ${questionText}
      </div>

      <textarea
        name="q${index}"
        class="survey-input"
        rows="4"
        required
        placeholder="Your feedback"
      ></textarea>
    </div>
  `;
}


/* =========================
   OPEN SURVEY
========================= */

async function openSurvey(taskId, title, points) {

  const surveyName = findSurvey(title);

  if (!surveyName) {
    alert("This survey could not be found.");
    return;
  }

  let modal =
    document.getElementById("pulseSurveyModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "pulseSurveyModal";
    document.body.appendChild(modal);
  }

  const questions = SURVEYS[surveyName];

  modal.innerHTML = `
    <div class="survey-modal-box">

      <h2>
        ${escapeHtml(title)}
      </h2>

      <p class="survey-intro">
        Please answer every question below.
        <br><br>
        Reward:
        <strong>
          +${Number(points) || 25} points
        </strong>
        after admin approval.
      </p>

      <form id="pulseSurveyForm">

        <div class="survey-questions">
          ${questions
            .map(renderQuestion)
            .join("")}
        </div>

        <div class="survey-actions">

          <button
            type="submit"
            class="gradient-button"
          >
            Submit Survey
          </button>

          <button
            type="button"
            id="closePulseSurvey"
            class="outline-button"
          >
            Cancel
          </button>

        </div>

        <p
          id="pulseSurveyMsg"
          class="status"
        ></p>

      </form>

    </div>
  `;

  modal.hidden = false;


  /* CLOSE */

  document
    .getElementById("closePulseSurvey")
    ?.addEventListener("click", () => {
      modal.remove();
    });


  /* SUBMIT */

  const form =
    document.getElementById("pulseSurveyForm");

  if (!form) return;

  form.onsubmit = async function (event) {

    event.preventDefault();

    const answers = {};

    for (let i = 0; i < questions.length; i++) {

      const field =
        form.querySelector(`[name="q${i}"]`);

      const value =
        field?.value?.trim();

      if (!value) {

        const message =
          document.getElementById(
            "pulseSurveyMsg"
          );

        if (message) {
          message.textContent =
            `Please answer question ${i + 1}.`;
        }

        field?.focus();

        return;
      }

      answers[i + 1] = value;
    }


    /* AUTH */

    const {
      data: { user }
    } = await db.auth.getUser();

    if (!user) {
      alert(
        "Please sign in before taking a survey."
      );

      return;
    }


    /* DISABLE BUTTON */

    const button =
      form.querySelector(
        'button[type="submit"]'
      );

    if (button) {
      button.disabled = true;
      button.textContent = "Submitting...";
    }


    /* SUBMIT TO SUPABASE */

    const { error } =
      await db
        .from("task_submissions")
        .insert({
          task_id: Number(taskId),
          user_id: user.id,
          proof: JSON.stringify({
            survey: title,
            answers: answers
          })
        });


    /* ERROR */

    if (error) {

      console.error(
        "PULSE survey submission error:",
        error
      );

      if (button) {
        button.disabled = false;
        button.textContent =
          "Submit Survey";
      }

      const message =
        document.getElementById(
          "pulseSurveyMsg"
        );

      if (message) {
        message.textContent =
          error.message;
      }

      return;
    }


    /* SUCCESS */

    modal.remove();

    alert(
      "Survey submitted. Your submission is now pending review."
    );

    if (typeof refresh === "function") {
      await refresh();
    }
  };
}


/* =========================
   ENHANCE SURVEY TASKS
========================= */

function enhanceTasks() {

  const box =
    document.getElementById("tasks");

  if (!box) return;

  box
    .querySelectorAll(".task-card")
    .forEach(card => {

      if (
        card.dataset.surveyEnhanced === "1"
      ) {
        return;
      }

      const title =
        card
          .querySelector(
            ".task-info strong"
          )
          ?.textContent
          ?.trim() || "";

      if (!findSurvey(title)) {
        return;
      }

      const button =
        card.querySelector(
          ".task-submit"
        );

      if (!button) return;

      const taskId =
        button.dataset.id;

      const pointsText =
        card
          .querySelector(
            ".task-points"
          )
          ?.textContent || "";

      const points =
        pointsText.replace(
          /[^0-9]/g,
          ""
        ) || "25";

      button.textContent =
        "Take Survey";

      button.onclick =
        () =>
          openSurvey(
            taskId,
            title,
            points
          );

      card.dataset.surveyEnhanced =
        "1";
    });
}


/* =========================
   SURVEY STYLES
========================= */

function addSurveyStyles() {

  if (
    document.getElementById(
      "pulseSurveyStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "pulseSurveyStyles";

  style.textContent = `

    #pulseSurveyModal {
      position: fixed;
      inset: 0;
      z-index: 99999;
      overflow-y: auto;
      box-sizing: border-box;
      padding: 20px;
      background: rgba(3, 6, 20, 0.94);
    }

    .survey-modal-box {
      width: 100%;
      max-width: 680px;
      box-sizing: border-box;
      margin: 20px auto;
      padding: 22px;
      border-radius: 18px;
      border: 1px solid rgba(80, 170, 255, 0.60);
      background: rgba(9, 15, 36, 0.98);
      color: #ffffff;
    }

    .survey-modal-box h2 {
      margin: 0 0 10px;
      line-height: 1.3;
    }

    .survey-intro {
      margin: 0 0 22px;
      line-height: 1.5;
    }

    .survey-question-block {
      margin-bottom: 18px;
      padding: 15px;
      box-sizing: border-box;
      border-radius: 12px;
      border: 1px solid rgba(100, 150, 255, 0.28);
      background: rgba(18, 27, 58, 0.72);
    }

    .survey-question-text {
      display: block;
      margin-bottom: 11px;
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.5;
    }

    .survey-input {
      display: block;
      width: 100%;
      min-height: 46px;
      box-sizing: border-box;
      padding: 10px 12px;
      border-radius: 9px;
      border: 1px solid rgba(100, 180, 255, 0.48);
      background: rgba(4, 9, 25, 0.98);
      color: #ffffff;
      font-size: 16px;
    }

    textarea.survey-input {
      min-height: 100px;
      resize: vertical;
    }

    .survey-input option {
      color: #000000;
      background: #ffffff;
    }

    .survey-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 22px;
    }

    .survey-actions button {
      min-height: 46px;
    }

    @media (max-width: 520px) {

      #pulseSurveyModal {
        padding: 10px;
      }

      .survey-modal-box {
        margin: 5px auto;
        padding: 16px;
        border-radius: 14px;
      }

      .survey-question-block {
        padding: 13px;
      }

      .survey-question-text {
        font-size: 15px;
      }
    }

  `;

  document.head.appendChild(style);
}


/* =========================
   MARK NOTIFICATIONS READ
========================= */

function wireNotificationReadButton() {

  const button =
    document.getElementById(
      "markNotificationsRead"
    );

  if (!button) return;

  if (
    button.dataset.readWired === "1"
  ) {
    return;
  }

  button.dataset.readWired = "1";

  button.addEventListener(
    "click",
    async () => {

      const {
        data: { user }
      } = await db.auth.getUser();

      if (!user) {
        alert(
          "Please sign in first."
        );

        return;
      }

      button.disabled = true;

      const { error } =
        await db
          .from("notifications")
          .update({
            read: true
          })
          .eq("user_id", user.id)
          .eq("read", false);

      button.disabled = false;

      if (error) {

        console.error(
          "PULSE notification update error:",
          error
        );

        alert(error.message);

        return;
      }

      if (
        typeof loadNotifications ===
        "function"
      ) {
        await loadNotifications();
      }

    }
  );
}


/* =========================
   START SURVEY SYSTEM
========================= */

function startSurveySystem() {

  addSurveyStyles();

  enhanceTasks();

  wireNotificationReadButton();

  const box =
    document.getElementById("tasks");

  if (
    box &&
    box.dataset.surveyObserver !== "1"
  ) {

    const observer =
      new MutationObserver(() => {

        enhanceTasks();

        wireNotificationReadButton();

      });

    observer.observe(
      box,
      {
        childList: true,
        subtree: true
      }
    );

    box.dataset.surveyObserver =
      "1";
  }
}


/* =========================
   START
========================= */

window.addEventListener(
  "load",
  startSurveySystem
);

})();