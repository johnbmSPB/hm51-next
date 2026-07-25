import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  makeAttendanceErrorPayload,
  makeAttendanceSuccessPayload,
} from "../app/lib/attendanceResponse.ts";

const FORBIDDEN_FIELDS = ["token", "params", "server", "raw", "debug"];

function assertNoSensitiveFields(payload) {
  const serialized = JSON.stringify(payload).toLowerCase();

  for (const field of FORBIDDEN_FIELDS) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(payload, field),
      false,
      `attendance response must not expose ${field}`
    );
    assert.equal(
      serialized.includes(`\"${field}\"`),
      false,
      `serialized attendance response must not expose ${field}`
    );
  }
}

test("attendance success response exposes only result and agree", () => {
  const payload = makeAttendanceSuccessPayload("true");

  assert.deepEqual(payload, {
    result: true,
    agree: "true",
  });
  assert.deepEqual(Object.keys(payload).sort(), ["agree", "result"]);
  assertNoSensitiveFields(payload);
});

test("attendance error response exposes only result and a safe error", () => {
  const payload = makeAttendanceErrorPayload("Сервер не сохранил статус");

  assert.deepEqual(payload, {
    result: false,
    error: "Сервер не сохранил статус",
  });
  assert.deepEqual(Object.keys(payload).sort(), ["error", "result"]);
  assertNoSensitiveFields(payload);
});

test("attendance error response falls back to a controlled message", () => {
  assert.deepEqual(makeAttendanceErrorPayload(""), {
    result: false,
    error: "Ошибка отправки участия",
  });
});

test("attendance route contains no diagnostic response properties", () => {
  const routeSource = readFileSync(
    new URL("../app/api/attendance/route.ts", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(routeSource, /\bserver\s*:/);
  assert.doesNotMatch(routeSource, /\braw\s*:/);
  assert.doesNotMatch(routeSource, /\bdebug\s*:/);
  assert.doesNotMatch(routeSource, /\n\s+(?:params|upstreamParams)\s*,\s*\n/);
  assert.match(routeSource, /makeAttendanceSuccessPayload\(agree\)/);
  assert.match(routeSource, /Cache-Control\": \"no-store\"/);
});
