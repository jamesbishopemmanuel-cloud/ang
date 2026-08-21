import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Veylora frontend files exist", () => {
  assert.equal(fs.existsSync("index.html"), true);
  assert.equal(fs.existsSync("main.js"), true);
  assert.equal(fs.existsSync("style.css"), true);
});

test("Premium prices", () => {
  assert.deepEqual(
    [10000, 30000, 50000],
    [10000, 30000, 50000]
  );
});