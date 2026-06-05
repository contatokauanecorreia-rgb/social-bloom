// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Hardcode the correct Supabase project so it cannot be overridden by
// Cloudflare Workers runtime secrets (process.env.SUPABASE_URL) that pointed
// to the old shzmxkusrlwhpehawubi project.
const SUPABASE_URL = "https://bxjnbhumwozusupfwrxp.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4am5iaHVtd296dXN1cGZ3cnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Nzk1NzcsImV4cCI6MjA5NjI1NTU3N30.V-UKpR6zT0azKd8T9WgsJG0aQEtmv7ljWRiXca0v9uc";

export default defineConfig({
  nitro: true,
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(SUPABASE_KEY),
    },
  },
});
