// PULSE — Earnings & Balance
// Controls earnings.html only.

document.addEventListener("DOMContentLoaded", loadEarnings);

async function loadEarnings() {
    const balance = document.getElementById("balance");
    const totalEarned = document.getElementById("totalEarned");
    const pendingWithdrawal =
        document.getElementById("pendingWithdrawal");
    const availableBalance =
        document.getElementById("availableBalance");

    if (
        !balance ||
        !totalEarned ||
        !pendingWithdrawal ||
        !availableBalance
    ) {
        console.error("Earnings page elements are missing.");
        return;
    }

    const user = await requireLogin();

    if (!user) return;

    try {
        // Get current points balance
        const { data: profile, error: profileError } =
            await window.supabaseClient
                .from("profiles")
                .select("points")
                .eq("id", user.id)
                .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        const points = Number(profile?.points ?? 0);

        // Get pending withdrawal requests
        const { data: requests, error: requestError } =
            await window.supabaseClient
                .from("redemption_requests")
                .select("points_requested")
                .eq("user_id", user.id)
                .eq("status", "pending");

        if (requestError) {
            throw requestError;
        }

        // Add all pending requests together.
        const pendingPLS = (requests || []).reduce(
            (total, request) =>
                total + Number(request.points_requested || 0),
            0
        );

        // Calculate lifetime earned points from the immutable ledger, not the current balance.
        const { data: ledger, error: ledgerError } = await window.supabaseClient
            .from("points_ledger")
            .select("amount")
            .eq("user_id", user.id)
            .gt("amount", 0);

        if (ledgerError) throw ledgerError;

        const lifetimeEarned = (ledger || []).reduce(
            (total, entry) => total + Number(entry.amount || 0), 0
        );
        const spendablePoints = Math.max(0, points - pendingPLS);

        // Display balance
        balance.textContent = `${points} Points`;

        totalEarned.textContent =
            `Total Earned: ${lifetimeEarned} Points`;

        // Display actual pending withdrawal
        pendingWithdrawal.textContent =
            `Pending Withdrawal: ${pendingPLS} PLS`;

        availableBalance.textContent =
            `Available Balance: ${spendablePoints} Points`;

    } catch (error) {
        console.error("Earnings loading error:", error);

        balance.textContent = "Unable to load balance.";

        totalEarned.textContent =
            "Total Earned: Unable to load";

        pendingWithdrawal.textContent =
            "Pending Withdrawal: Unable to load";

        availableBalance.textContent =
            "Available Balance: Unable to load";
    }
}