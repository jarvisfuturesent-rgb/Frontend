// PULSE — Supabase configuration
// Safe for GitHub Pages.
// NEVER put a Supabase service_role key in this file.

window.SUPABASE_URL =
  "https://egeftdnvgcqjjavrpohd.supabase.co";

window.SUPABASE_ANON_KEY =
  "sb_publishable_bhnKTWbI3aS0yFABUMWaOg_nkEBlTgv";

// Create the shared Supabase client used by the PULSE pages.
(function () {
  if (window.supabaseClient) {
    return;
  }

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    console.error(
      "PULSE: Supabase JavaScript library was not loaded before config.js."
    );
    return;
  }

  window.supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  console.log("PULSE: Supabase client initialized.");
})();