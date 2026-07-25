import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { formatTimeWithoutSeconds } from "../app/lib/timeDisplay.ts";

test("removes seconds from event time", () => {
  assert.equal(formatTimeWithoutSeconds("20:15:00"), "20:15");
});

test("removes seconds from training duration", () => {
  assert.equal(formatTimeWithoutSeconds("01:30:00"), "01:30");
});

test("adds leading zero to a single-digit hour", () => {
  assert.equal(formatTimeWithoutSeconds("9:05:00"), "09:05");
});

test("supports dot-separated server time", () => {
  assert.equal(formatTimeWithoutSeconds("20.15.00"), "20:15");
});

test("does not change a value without seconds", () => {
  assert.equal(formatTimeWithoutSeconds("20:15"), "20:15");
  assert.equal(formatTimeWithoutSeconds("01:30"), "01:30");
});

test("does not damage an unknown duration format", () => {
  assert.equal(formatTimeWithoutSeconds("90 минут"), "90 минут");
});

test("events route formats game time, training time and duration", () => {
  const routeSource = readFileSync(
    new URL("../app/api/events/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(
    routeSource,
    /hm51_time:\s*formatTimeWithoutSeconds\(game\.GAME_TIME\)/
  );

  assert.match(
    routeSource,
    /hm51_time:\s*formatTimeWithoutSeconds\(training\.TRAINING_TIME\)/
  );

  assert.match(
    routeSource,
    /hm51_duration:\s*formatTimeWithoutSeconds\(training\.DURATION\)/
  );
});
