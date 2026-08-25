import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const viteServerSource = readFileSync(resolve(process.cwd(), "server/_core/vite.ts"), "utf8");
const storageProxySource = readFileSync(resolve(process.cwd(), "server/_core/storageProxy.ts"), "utf8");

describe("Express 5 SPA fallback routing", () => {
  it("uses a root-inclusive named wildcard for both development and production fallbacks", () => {
    expect(viteServerSource).toContain('app.use("/{*splat}", async (req, res, next) => {');
    expect(viteServerSource).toContain('app.use("/{*splat}", (_req, res) => {');
    expect(viteServerSource).not.toContain('app.use("*",');
  });

  it("uses a named wildcard and preserves nested storage keys", () => {
    expect(storageProxySource).toContain('app.get("/manus-storage/{*key}", async (req, res) => {');
    expect(storageProxySource).toContain('Array.isArray(requestedKey) ? requestedKey.join("/") : requestedKey');
    expect(storageProxySource).not.toContain('app.get("/manus-storage/*",');
  });
});
