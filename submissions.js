// PULSE — My Submissions

document.addEventListener("DOMContentLoaded", loadSubmissions);

async function loadSubmissions() {
    const container = document.getElementById("submissions");

    if (!container) return;

    container.innerHTML = "<p>Loading your submissions...</p>";

    const user = await requireLogin();

    if (!user) return;

    try {
        const { data: submissions, error } =
            await window.supabaseClient
                .from("task_submissions")
                .select(`
                    id,
                    task_id,
                    status,
                    reviewer_note,
                    submitted_at,
                    survey_answers,
                    tasks (
                        title,
                        points
                    )
                `)
                .eq("user_id", user.id)
                .order("submitted_at", {
                    ascending: false
                });

        if (error) {
            throw error;
        }

        if (!submissions || submissions.length === 0) {
            container.innerHTML = `
                <div class="panel">
                    <p>You have no submissions yet.</p>
                    <a href="tasks.html">
                        View Available Tasks
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = submissions.map(submission => `
            <div class="panel">

                <h3>
                    ${escapeHTML(
                        submission.tasks?.title ||
                        "Task Submission"
                    )}
                </h3>

                <p>
                    <strong>Status:</strong>
                    ${escapeHTML(
                        submission.status || "pending"
                    )}
                </p>

                <p>
                    <strong>Points:</strong>
                    ${escapeHTML(
                        submission.tasks?.points ?? 0
                    )}
                </p>

                <p>
                    <strong>Submitted:</strong>
                    ${formatDate(
                        submission.submitted_at
                    )}
                </p>

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
                    submission.survey_answers
                        ? `
                            <details>
                                <summary>
                                    View Answers
                                </summary>

                                ${renderAnswers(
                                    submission.survey_answers
                                )}
                            </details>
                        `
                        : ""
                }

            </div>
        `).join("");

    } catch (error) {
        console.error(
            "Submission loading error:",
            error
        );

        container.innerHTML = `
            <div class="panel">
                <h3>Unable to Load Submissions</h3>
                <p>
                    Please try again later.
                </p>
            </div>
        `;
    }
}

function renderAnswers(answers) {
    if (!answers) return "";

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
                    ${index + 1}.
                    ${escapeHTML(item?.question || "")}
                </strong>

                <p>
                    ${escapeHTML(item?.answer || "")}
                </p>
            </div>
        `).join("");
    }

    if (typeof answers === "object") {
        return Object.entries(answers).map(
            ([question, answer]) => `
                <div class="panel">
                    <strong>
                        ${escapeHTML(question)}
                    </strong>

                    <p>
                        ${escapeHTML(
                            typeof answer === "object"
                                ? JSON.stringify(answer)
                                : answer
                        )}
                    </p>
                </div>
            `
        ).join("");
    }

    return "";
}

function formatDate(value) {
    if (!value) return "Unknown";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return escapeHTML(
        date.toLocaleString()
    );
}

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}