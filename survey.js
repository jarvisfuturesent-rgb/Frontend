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
      ["Did the last task work properly?", "yesno"],
      ["Did submitting the task work properly?", "yesno"],
      ["Did the submission status update correctly?", "yesno"],
      ["Did the notification appear correctly?", "yesno"],
      ["Did the notification message make sense?", "yesno"],
      ["Did the task approval process work properly?", "yesno"],
      ["Did the dashboard show the updated task status correctly?", "yesno"],
      ["Did anything appear broken, delayed, or confusing?", "yesno"],
      ["Overall, how smooth was the task/notification experience?", "rating"],
      ["Final feedback: What happened during this task, and what should we improve?", "text"]
    ],

    "PULSE Survey 3": [
      ["Did the reward section load properly?", "yesno"],
      ["Could you enter the number of points you wanted to redeem?", "yesno"],
      ["Could you select the reward type?", "yesno"],
      ["Could you submit the reward request successfully?", "yesno"],
      ["Did the app confirm that your request was submitted?", "yesno"],
      ["Did your reward request appear under My Rewards?", "yesno"],
      ["Did the request show the correct points and status?", "yesno"],
      ["Did you receive a notification about the reward request?", "yesno"],
      ["Was anything confusing, broken, or delayed?", "yesno"],
      ["Overall, how smooth was the reward request experience?", "rating"],
      ["Final feedback: What happened, and what should we improve?", "text"]
    ],

    "PULSE Survey 4": [
      ["Did your points balance display correctly?", "yesno"],
      ["Did the points activity/history load correctly?", "yesno"],
      ["Did the points amount look correct?", "yesno"],
      ["Did the balance update when it was supposed to?", "yesno"],
      ["Did the app avoid adding points before the reward was approved?", "yesno"],
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
      ["Did requesting rewards work correctly?", "yesno"],
      ["Were notifications clear and useful?", "yesno"],
      ["Did anything break, freeze, or behave unexpectedly?", "yesno"],
      ["Overall, how would you rate the app?", "rating"],
      ["Final feedback: What did you like most, what went wrong, and what should we improve?", "text"]
    ]

  };


  function escapeHtml(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function findSurvey(title) {

    return Object.keys(SURVEYS).find(
      key => title.startsWith(key)
    );

  }


  function renderQuestion(question, index) {

    const text = escapeHtml(question[0]);

    if (question[1] === "yesno") {

      return `
        <label class="survey-question">
          ${index + 1}. ${text}
        </label>

        <select
          name="q${index}"
          required
          class="survey-input"
        >
          <option value="">Choose...</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      `;

    }


    if (question[1] === "rating") {

      return `
        <label class="survey-question">
          ${index + 1}. ${text}
        </label>

        <select
          name="q${index}"
          required
          class="survey-input"
        >
          <option value="">Choose a rating...</option>
          <option value="1">1 - Very poor</option>
          <option value="2">2 - Poor</option>
          <option value="3">3 - Okay</option>
          <option value="4">4 - Good</option>
          <option value="5">5 - Excellent</option>
        </select>
      `;

    }


    return `
      <label class="survey-question">
        ${index + 1}. ${text}
      </label>

      <textarea
        name="q${index}"
        required
        rows="3"
        class="survey-input"
        placeholder="Your feedback"
      ></textarea>
    `;

  }


  function openSurvey(taskId, title, points) {

    const surveyName = findSurvey(title);

    if (!surveyName) return;

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
          Complete all questions.
          Reward: +${Number(points) || 0} points
          after admin approval.
        </p>


        <form id="pulseSurveyForm">

          ${questions
            .map(renderQuestion)
            .join("")}


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


    document
      .getElementById("closePulseSurvey")
      .onclick = () => {

        modal.remove();

      };


    document
      .getElementById("pulseSurveyForm")
      .onsubmit = async function (event) {

        event.preventDefault();


        const form = event.currentTarget;


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


        const {
          data: { user }
        } = await db.auth.getUser();


        if (!user) {

          alert(
            "Please sign in before taking a survey."
          );

          return;

        }


        const button =
          form.querySelector(
            'button[type="submit"]'
          );


        button.disabled = true;

        button.textContent =
          "Submitting...";


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


        if (error) {

          button.disabled = false;

          button.textContent =
            "Submit Survey";


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


        modal.remove();


        alert(
          "Survey submitted. Your submission is now pending review."
        );


        if (
          typeof refresh === "function"
        ) {

          await refresh();

        }

      };

  }


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


        const surveyName =
          findSurvey(title);


        if (!surveyName) return;


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
          pointsText
            .replace(/[^0-9]/g, "") || "25";


        button.textContent =
          "Take Survey";


        button.onclick = () => {

          openSurvey(
            taskId,
            title,
            points
          );

        };


        card.dataset.surveyEnhanced =
          "1";

      });

  }


  window.addEventListener(
    "load",
    () => {

      enhanceTasks();


      const box =
        document.getElementById("tasks");


      if (!box) return;


      const observer =
        new MutationObserver(
          enhanceTasks
        );


      observer.observe(
        box,
        {
          childList: true,
          subtree: true
        }
      );

    }
  );

})();