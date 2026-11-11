import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiProvider } from "../src/lib/data-source/api-provider";
import config from "../next.config";

test("same-origin and HTTP API addresses produce the expected health URL", async () => {
  const original = globalThis.fetch;
  try {
    for (const [base, expected] of [
      ["/", "/api/health"],
      [" /\r\n", "/api/health"],
      ["https://backend.example/api/", "https://backend.example/api/health"],
    ]) {
      globalThis.fetch = async (url) => {
        assert.equal(String(url), expected);
        return Response.json({ status: "ok", database: "ok" });
      };
      assert.equal((await createApiProvider(base).health!()).status, "ok");
    }
  } finally { globalThis.fetch = original; }
});

test("invalid API addresses are rejected without making a request", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Must not fetch"); };
  try {
    for (const base of [undefined, "", "backend.example", "//backend.example", "ftp://backend.example"])
      await assert.rejects(createApiProvider(base).health!(), /NEXT_PUBLIC_API_URL/);
  } finally { globalThis.fetch = original; }
});

test("rewrites proxy API paths only to the configured backend", async () => {
  const original = process.env.BACKEND_API_URL;
  try {
    process.env.BACKEND_API_URL = " https://backend.example/api/ ";
    assert.deepEqual(await config.rewrites!(), [
      { source: "/api/:path*", destination: "https://backend.example/api/:path*" },
    ]);
    delete process.env.BACKEND_API_URL;
    assert.deepEqual(await config.rewrites!(), []);
  } finally {
    if (original === undefined) delete process.env.BACKEND_API_URL;
    else process.env.BACKEND_API_URL = original;
  }
});
