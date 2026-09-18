// PULSE — Testing Surveys
// Controls surveys.html only.

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
    ["Did the rewards section load properly?", "yesno"],
    ["Could you see your available points correctly?", "yesno"],
    ["Could you see the available reward options?", "yesno"],
    ["Could you select a reward option successfully?", "yesno"],
    ["Could you submit a reward request successfully?", "yesno"],
    ["Did the app confirm that your reward request was submitted?", "yesno"],
    ["Did your reward request appear under your submissions or requests?", "yesno"],
    ["Did the request show the correct points amount and status?", "yesno"],
    ["Did you receive a notification about the reward request?", "yesno"],
    ["Overall, how smooth was the reward request experience?", "rating"],
    ["Final feedback: What happened, and what should we improve?", "text"]
  ],

  "PULSE Survey 4": [
    ["Did your points balance display correctly?", "yesno"],
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
    ["Did requesting a reward work correctly?", "yesno"],
    ["Were notifications clear and useful?", "yesno"],
    ["Did anything break, freeze, or behave unexpectedly?", "yesno"],
    ["Overall, how would you rate the app?", "rating"],
    ["Final feedback: What did you like most, what went wrong, and what should we improve?", "text"]
  ]

};


// =========================
// START
// =========================

document.addEventListener(
  "DOMContentLoaded",
  loadSurvey
);


// =========================
// LOAD SURVEY
// =========================

async function loadSurvey() {

  const container =
    document.getElementById("surveys");

  if (!container) {
    console.error(
      "surveys element not found."
    );
    return;
  }

  container.innerHTML =
    "<p>Loading survey...</p>";

  const user =
    await requireLogin();

  if (!user) return;


  const params =
    new URLSearchParams(
      window.location.search
    );

  const taskId =
    Number(params.get("task"));


  if (!taskId) {

    container.innerHTML = `
      <div class="panel">
        <h3>No Survey Selected</h3>
        <p>
          Please return to the task list
          and select a survey.
        </p>
        <a href="tasks.html">
          Back to Tasks
        </a>
      </div>
    `;

    return;
  }


  try {

    const { data: task, error } =
      await window.supabaseClient
        .from("tasks")
        .select(`
          id,
          title,
          description,
          points,
          status
        `)
        .eq("id", taskId)
        .eq("status", "active")
        .single();


    if (error) {
      throw error;
    }


    if (!task) {

      container.innerHTML = `
        <div class="panel">
          <h3>Survey Unavailable</h3>
          <p>
            This survey is no longer available.
          </p>
        </div>
      `;

      return;
    }


    const surveyName =
      findSurvey(task.title);


    if (!surveyName) {

      container.innerHTML = `
        <div class="panel">
          <h3>Survey Not Found</h3>
          <p>
            This task does not have a
            matching survey.
          </p>
          <a href="tasks.html">
            Back to Tasks
          </a>
        </div>
      `;

      return;
    }


    renderSurvey(
      task,
      surveyName,
      user
    );

  } catch (error) {

    console.error(
      "Survey loading error:",
      error
    );

    container.innerHTML = `
      <div class="panel">
        <h3>Unable to Load Survey</h3>
        <p>
          ${escapeHTML(
            error.message ||
            "Please try again later."
          )}
        </p>
      </div>
    `;
  }
}


// =========================
// FIND SURVEY
// =========================

function findSurvey(title) {

  const cleanTitle =
    String(title || "")
      .trim();

  return Object.keys(SURVEYS)
    .find(key =>
      cleanTitle.startsWith(key)
    );
}


// =========================
// RENDER SURVEY
// =========================

function renderSurvey(
  task,
  surveyName,
  user
) {

  const container =
    document.getElementById(
      "surveys"
    );

  const questions =
    SURVEYS[surveyName];


  container.innerHTML = `

    <div class="panel survey-page">

      <h2>
        ${escapeHTML(task.title)}
      </h2>

      <p>
        ${escapeHTML(
          task.description || ""
        )}
      </p>

      <p>
        <strong>
          Points:
        </strong>
        ${escapeHTML(task.points)}
      </p>

      <p>
        Complete the survey below.
        Your submission will be reviewed
        before points are awarded.
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

          <a
            href="tasks.html"
            class="outline-button"
          >
            Cancel
          </a>

        </div>

        <p
          id="pulseSurveyMsg"
          class="status"
        ></p>

      </form>

    </div>

  `;


  addSurveyStyles();


  const form =
    document.getElementById(
      "pulseSurveyForm"
    );


  if (!form) return;


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const message =
        document.getElementById(
          "pulseSurveyMsg"
        );


      const button =
        form.querySelector(
          'button[type="submit"]'
        );


      /* =========================
         COLLECT ANSWERS
      ========================= */

      const answers = {};


      for (
        let i = 0;
        i < questions.length;
        i++
      ) {

        const field =
          form.querySelector(
            `[name="q${i}"]`
          );


        const value =
          field?.value?.trim();


        if (!value) {

          if (message) {

            message.textContent =
              `Please answer question ${i + 1}.`;

          }

          field?.focus();

          return;
        }


        answers[i + 1] = {

          question:
            questions[i][0],

          type:
            questions[i][1],

          answer:
            value

        };

      }


      /* =========================
         DISABLE BUTTON
      ========================= */

      if (button) {

        button.disabled = true;

        button.textContent =
          "Submitting...";

      }


      try {

        /* =========================
           CHECK DUPLICATE
        ========================= */

        const {
          data: existing,
          error: existingError
        } =
          await window.supabaseClient
            .from("task_submissions")
            .select("id")
            .eq(
              "task_id",
              task.id
            )
            .eq(
              "user_id",
              user.id
            )
            .in(
              "status",
              [
                "pending",
                "approved"
              ]
            )
            .limit(1);


        if (existingError) {
          throw existingError;
        }


        if (
          existing &&
          existing.length > 0
        ) {

          if (message) {

            message.textContent =
              "You already have an active submission for this task.";

          }

          if (button) {

            button.disabled = false;

            button.textContent =
              "Submit Survey";

          }

          return;
        }


        /* =========================
           INSERT
        ========================= */

        const { error } =
          await window.supabaseClient
            .from("task_submissions")
            .insert({

              task_id:
                task.id,

              user_id:
                user.id,

              proof:
                `Survey: ${task.title}`,

              survey_answers:
                answers,

              status:
                "pending"

            });


        if (error) {
          throw error;
        }


        /* =========================
           SUCCESS
        ========================= */

        if (message) {

          message.textContent =
            "Survey submitted successfully. Your submission is now pending review.";

        }


        if (button) {

          button.disabled = true;

          button.textContent =
            "Submitted";

        }


        setTimeout(() => {

          window.location.href =
            "submissions.html";

        }, 1200);


      } catch (error) {

        console.error(
          "Survey submission error:",
          error
        );


        if (button) {

          button.disabled = false;

          button.textContent =
            "Submit Survey";

        }


        if (message) {

          message.textContent =
            error.message ||
            "Unable to submit survey.";

        }

      }

    }
  );

}


// =========================
// QUESTION
// =========================

function renderQuestion(
  question,
  index
) {

  const text =
    escapeHTML(question[0]);


  if (question[1] === "yesno") {

    return `
      <div class="survey-question-block">

        <label
          class="survey-question-text"
          for="q${index}"
        >
          ${index + 1}. ${text}
        </label>

        <select
          id="q${index}"
          name="q${index}"
          class="survey-input"
          required
        >

          <option value="">
            Choose...
          </option>

          <option value="Yes">
            Yes
          </option>

          <option value="No">
            No
          </option>

        </select>

      </div>
    `;
  }


  if (question[1] === "rating") {

    return `
      <div class="survey-question-block">

        <label
          class="survey-question-text"
          for="q${index}"
        >
          ${index + 1}. ${text}
        </label>

        <select
          id="q${index}"
          name="q${index}"
          class="survey-input"
          required
        >

          <option value="">
            Choose a rating...
          </option>

          <option value="1">
            1 - Very poor
          </option>

          <option value="2">
            2 - Poor
          </option>

          <option value="3">
            3 - Okay
          </option>

          <option value="4">
            4 - Good
          </option>

          <option value="5">
            5 - Excellent
          </option>

        </select>

      </div>
    `;
  }


  return `
    <div class="survey-question-block">

      <label
        class="survey-question-text"
        for="q${index}"
      >
        ${index + 1}. ${text}
      </label>

      <textarea
        id="q${index}"
        name="q${index}"
        class="survey-input"
        rows="4"
        required
        placeholder="Your feedback"
      ></textarea>

    </div>
  `;
}


// =========================
// STYLES
// =========================

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

    .survey-page {
      width: 100%;
      box-sizing: border-box;
    }

    .survey-question-block {
      margin-bottom: 18px;
      padding: 15px;
      box-sizing: border-box;
      border-radius: 12px;
      border: 1px solid rgba(
        100,
        150,
        255,
        0.28
      );
      background: rgba(
        18,
        27,
        58,
        0.72
      );
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
      border: 1px solid rgba(
        100,
        180,
        255,
        0.48
      );
      background: rgba(
        4,
        9,
        25,
        0.98
      );
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

    .survey-actions button,
    .survey-actions a {
      min-height: 46px;
      box-sizing: border-box;
    }

    @media (max-width: 520px) {

      .survey-question-block {
        padding: 13px;
      }

      .survey-question-text {
        font-size: 15px;
      }

      .survey-actions {
        flex-direction: column;
      }

      .survey-actions button,
      .survey-actions a {
        width: 100%;
        text-align: center;
      }

    }

  `;


  document.head.appendChild(style);
}


// =========================
// ESCAPE HTML
// =========================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}