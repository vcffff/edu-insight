import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSourceStore,
  SOURCE_STORAGE_KEY,
} from "../src/lib/data-source/source-store";
test("a saved mock preference cannot block switching when storage writes fail", () => {
  const store = createSourceStore(() => ({
    getItem: () => "mock",
    setItem: () => {
      throw new Error("Quota exceeded");
    },
  }));
  let changes = 0;
  const unsubscribe = store.subscribe(() => changes++);
  store.setSource("api");
  assert.equal(store.getSnapshot(), "api");
  store.setSource("mock");
  assert.equal(store.getSnapshot(), "mock");
  assert.ok(changes >= 3);
  unsubscribe();
});
test("entirely blocked storage still supports rapid bidirectional switching", () => {
  const store = createSourceStore(() => {
    throw new Error("Storage denied");
  });
  store.subscribe(() => {});
  for (const mode of ["api", "mock", "api", "mock"] as const) {
    store.setSource(mode);
    assert.equal(store.getSnapshot(), mode);
  }
});
test("saved preferences restore once and subsequent writes persist", () => {
  const storage = new Map([[SOURCE_STORAGE_KEY, "api"]]);
  const store = createSourceStore(() => ({
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
  }));
  assert.equal(store.getSnapshot(), "api");
  store.subscribe(() => {});
  assert.equal(store.getSnapshot(), "api");
  store.setSource("mock");
  assert.equal(storage.get(SOURCE_STORAGE_KEY), "mock");
});
test("storage events synchronize other tabs and clearing resets to backend", () => {
  const store = createSourceStore(() => ({
    getItem: () => null,
    setItem: () => {},
  }));
  store.subscribe(() => {});
  store.sync("api");
  assert.equal(store.getSnapshot(), "api");
  store.sync(null);
  assert.equal(store.getSnapshot(), "api");
});
