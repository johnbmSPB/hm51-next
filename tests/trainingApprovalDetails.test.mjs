import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  formatTrainingPosition,
  formatTrainingShirtColor,
} from "../app/lib/trainingApprovalDetails.ts";

test("maps training position codes to hockey abbreviations", () => {
  const positions = [
    [1, "ЛЗ"],
    [2, "ЛН"],
    [3, "Ц"],
    [4, "ПН"],
    [5, "ПЗ"],
  ];

  for (const [code, label] of positions) {
    assert.equal(formatTrainingPosition(code), label);
    assert.equal(formatTrainingPosition(String(code)), label);
  }
});

test("maps every training shirt color code including zero", () => {
  const colors = [
    [0, "жёлтая"],
    [1, "красная"],
    [2, "синяя"],
    [3, "зелёная"],
    [4, "белая"],
    [5, "чёрная"],
  ];

  for (const [code, label] of colors) {
    assert.equal(formatTrainingShirtColor(code), label);
    assert.equal(formatTrainingShirtColor(String(code)), label);
  }
});

test("uses the code mappings only for training confirmations", () => {
  const calendarSource = readFileSync(
    new URL("../app/calendar/page.tsx", import.meta.url),
    "utf8"
  );

  assert.match(calendarSource, /event\.hm51_type === "training"/);
  assert.match(calendarSource, /formatTrainingPosition\(event\.hm51_pos\)/);
  assert.match(
    calendarSource,
    /formatTrainingShirtColor\(event\.hm51_shirt_color\)/
  );
});
