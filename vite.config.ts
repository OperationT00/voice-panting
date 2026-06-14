import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { mockPlanApiPlugin } from "./server/mockPlanApiPlugin";

export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, ".", ["LLM_", "OPENAI_", "IMAGE_", "DASHSCOPE_"]);

  return {
    plugins: [react(), mockPlanApiPlugin(serverEnv)]
  };
});
