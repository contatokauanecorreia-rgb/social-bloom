// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

export default defineConfig((env) => {
  const viteEnv = loadEnv(env?.mode ?? "production", process.cwd(), "VITE_");
  return {
    nitro: true,
    envDefine: false,
    vite: {
      define: {
        "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(viteEnv.VITE_SUPABASE_URL),
        "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY),
      },
    },
  };
});
