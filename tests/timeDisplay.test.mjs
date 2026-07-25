import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { formatHourMinute } from "../app/lib/timeDisplay.ts";

test("removes seconds from event clock time", () => {
  assert.equal(formatHourMinute("20:15:00"), "20:15");
  assert.equal(formatHourMinute("7:05:42"), "07:05");
});

test("removes seconds from training duration", () => {
  assert.equal(formatHourMinute("01:30:00"), "01:30");
  assert.equal(formatHourMinute("2.15.00"), "02:15");
});

test("keeps an existing hour-minute value stable", () => {
  assert.equal(formatHourMinute("20:15"), "20:15");
  assert.equal(formatHourMinute("09.45"), "09:45");
});

test("preserves unknown values instead of corrupting them", () => {
  assert.equal(formatHourMinute("90 минут"), "90 минут");
  assert.equal(formatHourMinute(""), "");
  assert.equal(formatHourMinute(null), "");
});

test("events API formats game time, training time and duration", () => {
  const source = readFileSync(
    new URL("../app/api/events/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /hm51_time:\s*formatHourMinute\(game\.GAME_TIME\)/);
  assert.match(source, /hm51_time:\s*formatHourMinute\(training\.TRAINING_TIME\)/);
  assert.match(source, /hm51_duration:\s*formatHourMinute\(training\.DURATION\)/);
});
