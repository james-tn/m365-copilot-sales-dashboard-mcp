// Build the widget into a single self-contained HTML file and write it to the
// Python package (server/sales_mcp/web/widget.html), which the MCP server then
// serves as the `ui://sales-dashboard/app.html` resource.
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "server", "sales_mcp", "web");

// Sandboxed iframes (M365 Copilot, ChatGPT) load the widget from a null origin,
// so a `crossorigin` attribute on the inlined module script triggers a CORS
// failure. Strip it.
function stripCrossorigin() {
  return {
    name: "strip-crossorigin",
    enforce: "post",
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(=("|')[^"']*\2)?/g, "");
    },
  };
}

await build({
  root: path.join(__dirname, "src"),
  plugins: [react(), viteSingleFile(), stripCrossorigin()],
  build: {
    outDir: OUT_DIR,
    emptyOutDir: false,
    target: "esnext",
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000_000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  logLevel: "warn",
});

const built = path.join(OUT_DIR, "index.html");
const dest = path.join(OUT_DIR, "widget.html");
if (!fs.existsSync(built)) {
  console.error("Build did not produce index.html in", OUT_DIR);
  process.exit(1);
}
fs.renameSync(built, dest);
const kb = (fs.statSync(dest).size / 1024).toFixed(0);
console.log(`Wrote ${dest} (${kb} KB)`);
