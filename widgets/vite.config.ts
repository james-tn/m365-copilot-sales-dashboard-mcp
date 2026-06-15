import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Used only for `npm run dev` (visual development with dev mock data).
// The production single-file build is produced by build.mjs.
export default defineConfig({
  root: "src",
  plugins: [react()],
  server: { port: 5174 },
});
