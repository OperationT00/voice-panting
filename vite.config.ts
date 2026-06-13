import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mockPlanApiPlugin } from "./server/mockPlanApiPlugin";

export default defineConfig({
  plugins: [react(), mockPlanApiPlugin()]
});
