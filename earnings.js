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
        console.error(
            "Earnings page elements are missing."
        );
        return;
    }

    const user = await requireLogin();

    if (!user) return;

    try {
        const { data: profile, error } =
            await window.supabaseClient
                .from("profiles")
                .select("points")
                .eq("id", user.id)
                .maybeSingle();

        if (error) {
            throw error;
        }

        const points = Number(profile?.points ?? 0);

        balance.textContent = `${points} Points`;
        totalEarned.textContent =
            `Total Earned: ${points} Points`;

        pendingWithdrawal.textContent =
            "Pending Withdrawal: 0 Points";

        availableBalance.textContent =
            `Available Balance: ${points} Points`;

    } catch (error) {
        console.error(
            "Earnings loading error:",
            error
        );

        balance.textContent =
            "Unable to load balance.";

        totalEarned.textContent =
            "Total Earned: Unable to load";

        pendingWithdrawal.textContent =
            "Pending Withdrawal: Unable to load";

        availableBalance.textContent =
            "Available Balance: Unable to load";
    }
}