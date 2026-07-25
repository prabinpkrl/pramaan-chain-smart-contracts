import assert from "node:assert/strict";
import test from "node:test";
import {
  getConfirmedHead,
  normalizeBlockRange,
} from "../src/utils/blocks.js";

test("getConfirmedHead uses number arithmetic", () => {
  assert.equal(getConfirmedHead(100, 2), 98);
  assert.equal(getConfirmedHead(1, 2), 0);
});

test("normalizeBlockRange clamps requested end to confirmed head", () => {
  assert.deepEqual(
    normalizeBlockRange({
      requestedFrom: 90,
      requestedTo: 110,
      startBlock: 80,
      confirmedHead: 100,
      maxRange: 20,
    }),
    { from: 90, to: 100, empty: false },
  );
});

test("normalizeBlockRange rejects oversized ranges", () => {
  assert.throws(
    () => normalizeBlockRange({
      requestedFrom: 80,
      requestedTo: 100,
      startBlock: 80,
      confirmedHead: 100,
      maxRange: 10,
    }),
    (error) => error.status === 400 && error.code === "BLOCK_RANGE_TOO_LARGE",
  );
});

test("normalizeBlockRange rejects blocks before deployment", () => {
  assert.throws(
    () => normalizeBlockRange({
      requestedFrom: 79,
      requestedTo: 80,
      startBlock: 80,
      confirmedHead: 100,
      maxRange: 10,
    }),
    (error) => error.status === 400 && error.code === "INVALID_BLOCK_RANGE",
  );
});
