import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  esbuild: {
    jsxFactory: "h",
    jsxFragment: "hf",
    jsxInject: `import { h, hf } from "@reatom/jsx";`,
  },
  plugins: [
    mode === "analyze" &&
      visualizer({
        filename: "dist/bundle-analysis.html",
        gzipSize: true,
        brotliSize: true,
      }),
  ],
}));
