import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/Currency-Converter/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: "terser",
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "./src/scss/base/_variables.scss";`,
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
