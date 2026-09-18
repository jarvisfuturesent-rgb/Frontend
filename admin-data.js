// PULSE — Admin Data
// Businesses • Submissions • Rewards • Reports

document.addEventListener(
    "DOMContentLoaded",
    loadAdminData
);

async function loadAdminData() {
    const container =
        document.getElementById("adminDataContent");

    if (!container) return;

    container.innerHTML =
        "<p>Loading admin data...</p>";

    const admin = await getCurrentAdmin();

    if (!admin) {
        container.innerHTML = `
            <div class="panel">
                <h3>Admin Access Required</h3>
                <p>
                    You must be signed in
                    as an administrator.
                </p>
            </div>
        `;
        return;
    }

    try {
        const page =
            document.body.dataset.adminPage ||
            "all";

        if (page === "businesses") {
            await loadBusinesses(container);
        } else if (page === "submissions") {
            await loadSubmissions(container);
        } else if (page === "rewards") {
            await loadRewards(container);
        } else if (page === "reports") {
            await loadReports(container);
        } else {
            await loadAllData(container);
        }

    } catch (error) {
        console.error(
            "Admin data error:",
            error
        );

        container.innerHTML = `
            <div class="panel">
                <h3>
                    Unable to Load Admin Data
                </h3>
                <p>
                    ${escapeHTML(error.message)}
                </p>
            </div>
        `;
    }
}


// =========================
// BUSINESSES
// =========================

async function loadBusinesses(container) {
    const { data, error } =
        await window.supabaseClient
            .from("businesses")
            .select("*")
            .order("id", {
                ascending: false
            });

    if (error) throw error;

    let html = `
        <h2>Business Management</h2>
    `;

    if (!data || data.length === 0) {
        html += `
            <div class="panel">
                <p>No businesses found.</p>
            </div>
        `;
    } else {
        html += data.map(business => `
            <div class="panel">
                <h3>
                    ${escapeHTML(
                        business.name ||
                        business.business_name ||
                        "Business"
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        business.description || ""
                    )}
                </p>
            </div>
        `).join("");
    }

    container.innerHTML = html;
}


// =========================
// SUBMISSIONS
// =========================

async function loadSubmissions(container) {
    const { data, error } =
        await window.supabaseClient
            .from("task_submissions")
            .select(`
                *,
                tasks (
                    title,
                    points
                )
            `)
            .order("submitted_at", {
                ascending: false
            });

    if (error) throw error;

    let html = `
        <h2>Submission Review</h2>
    `;

    if (!data || data.length === 0) {
        html += `
            <div class="panel">
                <p>No submissions found.</p>
            </div>
        `;
    } else {
        html += data.map(renderSubmission).join("");
    }

    container.innerHTML = html;

    attachSubmissionEvents();
}


function renderSubmission(submission) {
    return `
        <div class="panel">

            <h3>
                Submission #${escapeHTML(
                    submission.id
                )}
            </h3>

            <p>
                <strong>Task:</strong>
                ${escapeHTML(
                    submission.tasks?.title ||
                    "Unknown Task"
                )}
            </p>

            <p>
                <strong>User ID:</strong>
                ${escapeHTML(
                    submission.user_id
                )}
            </p>

            <p>
                <strong>Points:</strong>
                ${escapeHTML(
                    submission.tasks?.points ?? 0
                )}
            </p>

            <p>
                <strong>Status:</strong>
                ${escapeHTML(
                    submission.status || ""
                )}
            </p>

            <p>
                <strong>Submitted:</strong>
                ${formatDate(
                    submission.submitted_at
                )}
            </p>

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

            ${
                submission.status === "pending"
                    ? `
                        <button
                            class="approve-submission"
                            data-id="${escapeHTML(
                                submission.id
                            )}"
                        >
                            Approve
                        </button>

                        <button
                            class="reject-submission"
                            data-id="${escapeHTML(
                                submission.id
                            )}"
                        >
                            Reject
                        </button>
                    `
                    : ""
            }

        </div>
    `;
}


// =========================
// APPROVE / REJECT
// =========================

function attachSubmissionEvents() {
    document
        .querySelectorAll(
            ".approve-submission"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => approveSubmission(
                    button.dataset.id
                )
            );
        });

    document
        .querySelectorAll(
            ".reject-submission"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => rejectSubmission(
                    button.dataset.id
                )
            );
        });
}


async function approveSubmission(id) {
    const note =
        prompt(
            "Reviewer note (optional):",
            ""
        );

    try {
        const { error } =
            await window.supabaseClient.rpc(
                "approve_task_submission",
                {
                    p_submission_id:
                        Number(id),

                    p_reviewer_note:
                        note || null
                }
            );

        if (error) throw error;

        location.reload();

    } catch (error) {
        console.error(
            "Approval error:",
            error
        );

        alert(
            "Approval failed: " +
            error.message
        );
    }
}


async function rejectSubmission(id) {
    const note =
        prompt(
            "Reason for rejection:",
            ""
        );

    try {
        const { error } =
            await window.supabaseClient
                .from("task_submissions")
                .update({
                    status: "rejected",
                    reviewer_note:
                        note || null,
                    reviewed_at:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    Number(id)
                );

        if (error) throw error;

        location.reload();

    } catch (error) {
        console.error(
            "Rejection error:",
            error
        );

        alert(
            "Rejection failed: " +
            error.message
        );
    }
}


// =========================
// REWARDS
// =========================

async function loadRewards(container) {
    const { data, error } =
        await window.supabaseClient
            .from("redemption_requests")
            .select("*")
            .order("created_at", {
                ascending: false
            });

    if (error) throw error;

    let html = `
        <h2>Reward Requests</h2>
    `;

    if (!data || data.length === 0) {
        html += `
            <div class="panel">
                <p>No reward requests found.</p>
            </div>
        `;
    } else {
        html += data.map(request => `
            <div class="panel">

                <h3>
                    Request #${escapeHTML(
                        request.id
                    )}
                </h3>

                <p>
                    <strong>User:</strong>
                    ${escapeHTML(
                        request.user_id
                    )}
                </p>

                <p>
                    <strong>Points:</strong>
                    ${escapeHTML(
                        request.points_requested
                    )}
                </p>

                <p>
                    <strong>Reward Type:</strong>
                    ${escapeHTML(
                        request.reward_type
                    )}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${escapeHTML(
                        request.status
                    )}
                </p>

                <p>
                    <strong>Created:</strong>
                    ${formatDate(
                        request.created_at
                    )}
                </p>

            </div>
        `).join("");
    }

    container.innerHTML = html;
}


// =========================
// REPORTS / RECORDS
// =========================

async function loadReports(container) {
    const { data: submissions, error } =
        await window.supabaseClient
            .from("task_submissions")
            .select("id, status, submitted_at");

    if (error) throw error;

    const total =
        submissions?.length || 0;

    const pending =
        submissions?.filter(
            item => item.status === "pending"
        ).length || 0;

    const approved =
        submissions?.filter(
            item => item.status === "approved"
        ).length || 0;

    const rejected =
        submissions?.filter(
            item => item.status === "rejected"
        ).length || 0;

    container.innerHTML = `
        <h2>Reports & Records</h2>

        <div class="panel">
            <h3>Total Submissions</h3>
            <p>${total}</p>
        </div>

        <div class="panel">
            <h3>Pending</h3>
            <p>${pending}</p>
        </div>

        <div class="panel">
            <h3>Approved</h3>
            <p>${approved}</p>
        </div>

        <div class="panel">
            <h3>Rejected</h3>
            <p>${rejected}</p>
        </div>
    `;
}


// =========================
// ALL DATA
// =========================

async function loadAllData(container) {
    container.innerHTML = `
        <h2>Admin Data</h2>
        <p>
            Select Businesses, Submissions,
            Rewards, or Reports.
        </p>
    `;
}


// =========================
// ADMIN CHECK
// =========================

async function getCurrentAdmin() {
    const user =
        await getCurrentUser();

    if (!user) return null;

    const { data: profile, error } =
        await window.supabaseClient
            .from("profiles")
            .select("id, name, role")
            .eq("id", user.id)
            .maybeSingle();

    if (error) {
        console.error(
            "Admin check error:",
            error
        );

        return null;
    }

    if (
        !profile ||
        profile.role !== "admin"
    ) {
        return null;
    }

    return {
        user,
        profile
    };
}


// =========================
// ANSWERS
// =========================

function renderAnswers(answers) {
    if (!answers) return "";

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

    if (Array.isArray(answers)) {
        return answers.map(
            (item, index) => `
                <div class="panel">
                    <strong>
                        ${index + 1}.
                        ${escapeHTML(
                            item.question || ""
                        )}
                    </strong>

                    <p>
                        ${escapeHTML(
                            item.answer || ""
                        )}
                    </p>
                </div>
            `
        ).join("");
    }

    if (typeof answers === "object") {
        return Object.entries(answers)
            .map(([key, value]) => `
                <div class="panel">
                    <strong>
                        ${escapeHTML(key)}
                    </strong>

                    <p>
                        ${escapeHTML(
                            typeof value === "object"
                                ? JSON.stringify(value)
                                : value
                        )}
                    </p>
                </div>
            `)
            .join("");
    }

    return "";
}


// =========================
// HELPERS
// =========================

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return escapeHTML(
        date.toLocaleString()
    );
}


function escapeHTML(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}