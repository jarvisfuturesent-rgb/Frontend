// PULSE — Admin Submission Review
// Controls admin-submissions.html only.

document.addEventListener("DOMContentLoaded", loadAdminSubmissions);

async function loadAdminSubmissions() {
    const container =
        document.getElementById("adminSubmissions");

    if (!container) {
        console.error("adminSubmissions element not found.");
        return;
    }

    container.innerHTML =
        "<p>Loading submissions...</p>";

    try {
        // Make sure Supabase is available.
        if (!window.supabaseClient) {
            throw new Error(
                "Supabase client is not available."
            );
        }

        // Make sure a user is logged in.
        const {
            data: { user },
            error: userError
        } = await window.supabaseClient.auth.getUser();

        if (userError) {
            throw userError;
        }

        if (!user) {
            container.innerHTML = `
                <p>Access denied.</p>
                <a href="auth.html">
                    Login
                </a>
            `;
            return;
        }

        // Use the existing secure admin check.
        const {
            data: admin,
            error: adminError
        } = await window.supabaseClient
            .rpc("is_admin");

        if (adminError) {
            throw adminError;
        }

        if (admin !== true) {
            container.innerHTML = `
                <p>Access denied.</p>
                <a href="dashboard.html">
                    Return to Dashboard
                </a>
            `;
            return;
        }

        // Load submissions.
        const {
            data: submissions,
            error: submissionError
        } = await window.supabaseClient
            .from("task_submissions")
            .select(`
                id,
                user_id,
                task_id,
                survey_answers,
                status,
                reviewer_note,
                submitted_at,
                reviewed_at
            `)
            .order("submitted_at", {
                ascending: false
            });

        if (submissionError) {
            throw submissionError;
        }

        if (!submissions || submissions.length === 0) {
            container.innerHTML =
                "<p>No submissions found.</p>";
            return;
        }

        // Get task information separately.
        const taskIds = [
            ...new Set(
                submissions
                    .map(item => item.task_id)
                    .filter(
                        id =>
                            id !== null &&
                            id !== undefined
                    )
            )
        ];

        const tasksById = {};

        if (taskIds.length > 0) {
            const {
                data: tasks,
                error: taskError
            } = await window.supabaseClient
                .from("tasks")
                .select("id, title, points")
                .in("id", taskIds);

            if (taskError) {
                throw taskError;
            }

            (tasks || []).forEach(task => {
                tasksById[String(task.id)] = task;
            });
        }

        // Render submissions.
        container.innerHTML = submissions
            .map(submission => {
                const task =
                    tasksById[
                        String(submission.task_id)
                    ];

                return renderSubmission(
                    submission,
                    task
                );
            })
            .join("");

        // Connect buttons.
        container
            .querySelectorAll(
                "[data-submission-action]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    handleSubmissionAction
                );
            });

    } catch (error) {
        console.error(
            "Admin submission loading error:",
            error
        );

        container.innerHTML = `
            <div class="panel">
                <h3>Unable to Load Submissions</h3>
                <p>
                    There was a problem loading the
                    submission records.
                </p>
                <p>
                    Please refresh the page and try again.
                </p>
            </div>
        `;
    }
}


async function handleSubmissionAction(event) {
    const button = event.currentTarget;

    const submissionId =
        button.getAttribute(
            "data-submission-id"
        );

    const action =
        button.getAttribute(
            "data-submission-action"
        );

    if (!submissionId) {
        return;
    }

    if (action === "approve") {
        await approveSubmission(submissionId);
    }

    if (action === "reject") {
        await rejectSubmission(submissionId);
    }
}


function renderSubmission(submission, task) {
    const status =
        submission.status || "pending";

    const taskTitle = task
        ? task.title
        : `Task #${submission.task_id ?? "Unknown"}`;

    const taskPoints = task
        ? Number(task.points)
        : 0;

    const answers =
        renderAnswers(
            submission.survey_answers
        );

    const reviewed =
        submission.reviewed_at
            ? `
                <p>
                    <strong>Reviewed:</strong>
                    ${formatDate(
                        submission.reviewed_at
                    )}
                </p>
            `
            : "";

    const reviewerNote =
        submission.reviewer_note
            ? `
                <p>
                    <strong>Reviewer Note:</strong>
                    ${escapeHTML(
                        submission.reviewer_note
                    )}
                </p>
            `
            : "";

    const buttons =
        status === "pending"
            ? `
                <div class="submission-actions">

                    <button
                        type="button"
                        data-submission-action="approve"
                        data-submission-id="${submission.id}"
                    >
                        Approve & Award Points
                    </button>

                    <button
                        type="button"
                        data-submission-action="reject"
                        data-submission-id="${submission.id}"
                    >
                        Reject
                    </button>

                </div>
            `
            : "";

    return `
        <div class="submission-card">

            <h3>
                ${escapeHTML(taskTitle)}
            </h3>

            <p>
                <strong>Submission ID:</strong>
                ${escapeHTML(submission.id)}
            </p>

            <p>
                <strong>User ID:</strong>
                ${escapeHTML(submission.user_id)}
            </p>

            <p>
                <strong>Points:</strong>
                ${escapeHTML(taskPoints)}
            </p>

            <p>
                <strong>Status:</strong>
                ${escapeHTML(status)}
            </p>

            <p>
                <strong>Submitted:</strong>
                ${formatDate(
                    submission.submitted_at
                )}
            </p>

            <div class="submission-answers">
                <strong>Survey Answers:</strong>
                ${answers}
            </div>

            ${reviewed}
            ${reviewerNote}
            ${buttons}

        </div>
    `;
}


function renderAnswers(answers) {
    if (!answers) {
        return `
            <p>
                No survey answers recorded.
            </p>
        `;
    }

    if (typeof answers === "string") {
        try {
            answers = JSON.parse(answers);
        } catch {
            return `
                <p>
                    ${escapeHTML(answers)}
                </p>
            `;
        }
    }

    if (
        typeof answers === "object" &&
        answers !== null
    ) {
        const entries =
            Object.entries(answers);

        if (entries.length === 0) {
            return `
                <p>
                    No survey answers recorded.
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
                                    typeof answer ===
                                    "object"
                                        ? JSON.stringify(
                                              answer
                                          )
                                        : answer
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
            ${escapeHTML(answers)}
        </p>
    `;
}


async function approveSubmission(submissionId) {
    if (!submissionId) {
        return;
    }

    const confirmed =
        confirm(
            "Approve this submission and award its points?"
        );

    if (!confirmed) {
        return;
    }

    try {
        const {
            data: admin,
            error: adminError
        } = await window.supabaseClient
            .rpc("is_admin");

        if (adminError) {
            throw adminError;
        }

        if (admin !== true) {
            alert("Access denied.");
            return;
        }

        const { error } =
            await window.supabaseClient
                .rpc(
                    "add_points_for_approved_submission",
                    {
                        p_submission_id:
                            Number(submissionId)
                    }
                );

        if (error) {
            throw error;
        }

        alert(
            "Submission approved and points awarded."
        );

        await loadAdminSubmissions();

    } catch (error) {
        console.error(
            "Approve submission error:",
            error
        );

        alert(
            "Unable to approve this submission or award points."
        );
    }
}


async function rejectSubmission(submissionId) {
    if (!submissionId) {
        return;
    }

    const reason =
        prompt(
            "Enter a reason for rejecting this submission:"
        );

    if (reason === null) {
        return;
    }

    const trimmedReason =
        reason.trim();

    if (!trimmedReason) {
        alert(
            "A rejection reason is required."
        );
        return;
    }

    try {
        const {
            data: admin,
            error: adminError
        } = await window.supabaseClient
            .rpc("is_admin");

        if (adminError) {
            throw adminError;
        }

        if (admin !== true) {
            alert("Access denied.");
            return;
        }

        const { error } =
            await window.supabaseClient
                .from("task_submissions")
                .update({
                    status: "rejected",
                    reviewer_note:
                        trimmedReason,
                    reviewed_at:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    Number(submissionId)
                )
                .eq(
                    "status",
                    "pending"
                );

        if (error) {
            throw error;
        }

        alert(
            "Submission rejected."
        );

        await loadAdminSubmissions();

    } catch (error) {
        console.error(
            "Reject submission error:",
            error
        );

        alert(
            "Unable to reject this submission."
        );
    }
}


function formatDate(value) {
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


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}