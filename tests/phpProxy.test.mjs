import assert from "node:assert/strict";
import test from "node:test";

import { parsePhpJsonText } from "../app/lib/phpProxy.ts";

test("php proxy parses clean JSON", () => {
  assert.deepEqual(parsePhpJsonText('{"result":true}'), { result: true });
});

test("php proxy can recover JSON after legacy PHP warning", () => {
  const text = 'Warning: legacy notice in /srv/set_topic.php on line 10\n{"result":true,"topic":"team_7"}';
  assert.deepEqual(parsePhpJsonText(text, true), {
    result: true,
    topic: "team_7",
  });
});

test("php proxy remains strict unless recovery is explicitly enabled", () => {
  const text = 'Warning: legacy notice\n{"result":true}';
  assert.equal(parsePhpJsonText(text), null);
});

test("php proxy does not treat arbitrary text as JSON", () => {
  assert.equal(parsePhpJsonText("PHP fatal error", true), null);
});
