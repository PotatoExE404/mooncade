import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const vercel = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8")) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
const securityHeaders = Object.fromEntries(vercel.headers[0].headers.filter((h) => h.key !== "Strict-Transport-Security").map((h) => [h.key, h.value.replace(" upgrade-insecure-requests", "")]));

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: { host: true },
  preview: { host: true, headers: securityHeaders },
  build: { target: "es2022", assetsInlineLimit: 0 },
});
