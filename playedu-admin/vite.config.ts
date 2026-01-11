import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import gzipPlugin from "rollup-plugin-gzip";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3003,
    allowedHosts: true,
    proxy: {
      "/backend": {
        target: "http://localhost:9898",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [gzipPlugin()],
    },
  },
});
