from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


def write_if_changed(path: Path, original: str, updated: str) -> None:
    if updated != original:
        path.write_text(updated)
        print(f"updated {path}")
    else:
        print(f"unchanged {path}")


# Calendar API.
api_path = Path("app/api/events/route.ts")
api_original = api_path.read_text()
api = api_original

if "function lineupShirtColorValue" not in api:
    bool_block = '''function boolValue(value: any) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value || "").trim().toLowerCase() === "true"
  );
}
'''
    helpers = bool_block + '''
function firstLineupValue(sources: any[], keys: string[]) {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    for (const key of keys) {
      const matchingKey = Object.keys(source).find(
        (item) => item.toLowerCase() === key.toLowerCase()
      );
      if (!matchingKey) continue;

      const value = source[matchingKey];
      const normalized = text(value);
      if (normalized && !["null", "undefined"].includes(normalized.toLowerCase())) {
        return value;
      }
    }
  }

  return "";
}

function lineupSquadValue(member: any, event: any) {
  return firstLineupValue([member, event], [
    "SQUAD", "squad", "LINE", "line", "LINE_NUMBER", "line_number",
    "LINE_NUM", "line_num", "SQUAD_NUMBER", "squad_number",
  ]);
}

function lineupPositionValue(member: any, event: any) {
  return firstLineupValue([member, event], [
    "POS", "pos", "POSITION", "position", "LINE_POSITION", "line_position",
    "POSITION_IN_LINE", "position_in_line", "ROLE", "role",
  ]);
}

function lineupShirtColorValue(member: any, event: any) {
  return firstLineupValue([member, event], [
    "SHIRT_COLOR", "shirt_color", "JERSEY_COLOR", "jersey_color",
    "VEST_COLOR", "vest_color", "BIB_COLOR", "bib_color",
    "MANISHKA_COLOR", "manishka_color", "MAYKA_COLOR", "mayka_color",
    "SHIRT", "shirt", "JERSEY", "jersey", "COLOR", "color",
  ]);
}
'''
    api = replace_once(api, bool_block, helpers, "events helpers")

if "hm51_shirt_color:" not in api:
    old_fields = '''      hm51_squad: member?.SQUAD || "",
      hm51_pos: member?.POS || "",
'''
    api = replace_once(
        api,
        old_fields,
        '''      hm51_squad: lineupSquadValue(member, wrapper),
      hm51_pos: lineupPositionValue(member, wrapper),
      hm51_shirt_color: lineupShirtColorValue(member, wrapper),
''',
        "game lineup fields",
    )
    api = replace_once(
        api,
        old_fields,
        '''      hm51_squad: lineupSquadValue(member, training),
      hm51_pos: lineupPositionValue(member, training),
      hm51_shirt_color: lineupShirtColorValue(member, training),
''',
        "training lineup fields",
    )

write_if_changed(api_path, api_original, api)


# Calendar UI.
page_path = Path("app/calendar/page.tsx")
page_original = page_path.read_text()
page = page_original

if "function getApprovedEventDetails" not in page:
    pattern = re.compile(
        r'function formatGameSquad\(value: any\) \{.*?\n\}\n\nfunction approvalText',
        re.S,
    )
    replacement = '''function formatLineupSquad(value: any) {
  const raw = String(value || "").trim();
  if (!raw || raw === "0" || raw.toLowerCase() === "null") return "";

  const normalized = raw.toUpperCase().replace(/[\\s_-]+/g, "");
  if (["GK", "GOALKEEPER", "GOALKEEPERS", "ВРАТАРИ"].includes(normalized)) {
    return "Вратари";
  }

  const match = normalized.match(/^(?:LINE|SQUAD|ЗВЕНО)?(\\d+)$/);
  return match ? `${match[1]} звено` : raw;
}

function formatLineupPosition(value: any) {
  const raw = String(value || "").trim();
  if (!raw || raw === "0" || raw.toLowerCase() === "null") return "";

  const normalized = raw.toLowerCase().replace(/[\\s_-]+/g, "");
  const map: Record<string, string> = {
    "лн": "Левый нападающий", "левыйнападающий": "Левый нападающий",
    "leftforward": "Левый нападающий", "lf": "Левый нападающий",
    "цн": "Центральный нападающий", "центр": "Центральный нападающий",
    "центральныйнападающий": "Центральный нападающий", "center": "Центральный нападающий",
    "centerforward": "Центральный нападающий", "centreforward": "Центральный нападающий",
    "cf": "Центральный нападающий",
    "пн": "Правый нападающий", "правыйнападающий": "Правый нападающий",
    "rightforward": "Правый нападающий", "rf": "Правый нападающий",
    "лз": "Левый защитник", "левыйзащитник": "Левый защитник",
    "leftdefender": "Левый защитник", "ld": "Левый защитник",
    "пз": "Правый защитник", "правыйзащитник": "Правый защитник",
    "rightdefender": "Правый защитник", "rd": "Правый защитник",
    "вр": "Вратарь", "вратарь": "Вратарь", "goalkeeper": "Вратарь",
    "goalie": "Вратарь", "maingoalkeeper": "Основной вратарь",
    "backupgoalkeeper": "Запасной вратарь", "centergoalkeeperleft": "Вратарь",
    "centergoalkeeperright": "Вратарь", "coachgoalkeeper": "Вратарь",
    "managergoalkeeper": "Вратарь",
    "нп": "Нападающий", "нападающий": "Нападающий", "forward": "Нападающий",
    "зщ": "Защитник", "защитник": "Защитник", "defender": "Защитник",
  };

  return map[normalized] || raw;
}

function formatShirtColor(value: any) {
  const raw = String(value || "").trim();
  if (!raw || raw === "0" || raw.toLowerCase() === "null") return "";

  const normalized = raw.toLowerCase().replace(/[\\s_-]+/g, "");
  const map: Record<string, string> = {
    "white": "Белая", "белая": "Белая", "белый": "Белая",
    "black": "Чёрная", "черная": "Чёрная", "чёрная": "Чёрная",
    "red": "Красная", "красная": "Красная",
    "blue": "Синяя", "синяя": "Синяя", "navy": "Тёмно-синяя",
    "darkblue": "Тёмно-синяя", "lightblue": "Голубая", "голубая": "Голубая",
    "yellow": "Жёлтая", "желтая": "Жёлтая", "жёлтая": "Жёлтая",
    "green": "Зелёная", "зеленая": "Зелёная", "зелёная": "Зелёная",
    "orange": "Оранжевая", "оранжевая": "Оранжевая",
    "gray": "Серая", "grey": "Серая", "серая": "Серая",
    "pink": "Розовая", "розовая": "Розовая",
    "purple": "Фиолетовая", "фиолетовая": "Фиолетовая",
  };

  return map[normalized] || `${raw.slice(0, 1).toUpperCase()}${raw.slice(1)}`;
}

function getApprovedEventDetails(event: EventItem) {
  if (approvalValue(event.hm51_confirmed) !== true) return null;

  return {
    squad: formatLineupSquad(event.hm51_squad),
    position: formatLineupPosition(event.hm51_pos),
    shirtColor: formatShirtColor(event.hm51_shirt_color),
  };
}

function approvalText'''
    page, count = pattern.subn(replacement, page, count=1)
    if count != 1:
        raise SystemExit(f"calendar detail functions: expected one block, found {count}")

page = page.replace(
    "const approvedDetails = getApprovedGameDetails(event);",
    "const approvedDetails = getApprovedEventDetails(event);",
)

if "approvedDetails.shirtColor" not in page:
    marker = '{approvedDetails.position || "Не указано"}'
    marker_index = page.find(marker)
    if marker_index < 0:
        raise SystemExit("calendar shirt color: position marker not found")
    paragraph_end = page.find("</p>", marker_index)
    card_end = page.find("</div>", paragraph_end)
    if paragraph_end < 0 or card_end < 0:
        raise SystemExit("calendar shirt color: card boundary not found")
    card_end += len("</div>")
    color_card = '''

                                              <div className="col-span-2 rounded-2xl bg-[#2d332f] p-3">
                                                <p className="text-xs font-bold text-[#20d1a8]">
                                                  Цвет майки
                                                </p>
                                                <p className="mt-1 text-base font-black text-white">
                                                  {approvedDetails.shirtColor || "Не указано"}
                                                </p>
                                              </div>'''
    page = page[:card_end] + color_card + page[card_end:]

write_if_changed(page_path, page_original, page)


# Push notification.
sw_path = Path("public/hm51-push-sw.js")
sw_original = sw_path.read_text()
sw = sw_original

if "function formatConfirmationShirtColor" not in sw:
    pattern = re.compile(
        r'function confirmationNotificationBody\(payload\) \{.*?\n\}\n\nfunction eventNotificationBody',
        re.S,
    )
    replacement = '''function confirmationSources(payload) {
  const data = getData(payload);
  const sources = [data, payload];
  const nestedKeys = [
    "MEMBER", "member", "GAME_MEMBER", "game_member",
    "TRAINING_MEMBER", "training_member", "LINEUP", "lineup",
    "ASSIGNMENT", "assignment",
  ];

  for (const source of [data, payload]) {
    if (!source || typeof source !== "object") continue;
    for (const key of nestedKeys) {
      const value = source[key];
      if (value && typeof value === "object") {
        sources.push(value);
      } else if (typeof value === "string" && value.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === "object") sources.push(parsed);
        } catch {}
      }
    }
  }

  return sources;
}

function getConfirmationField(payload, keys) {
  for (const source of confirmationSources(payload)) {
    const value = getPrimitiveValue(source, keys);
    if (value !== "") return value;
  }
  return "";
}

function formatConfirmationSquad(value) {
  const raw = decodeSafe(value).trim();
  if (!raw || raw === "0" || raw.toLowerCase() === "null") return "";
  const normalized = raw.toUpperCase().replace(/[\\s_-]+/g, "");
  if (["GK", "GOALKEEPER", "GOALKEEPERS", "ВРАТАРИ"].includes(normalized)) return "Вратари";
  const match = normalized.match(/^(?:LINE|SQUAD|ЗВЕНО)?(\\d+)$/);
  return match ? `${match[1]} звено` : raw;
}

function formatConfirmationPosition(value) {
  const raw = decodeSafe(value).trim();
  if (!raw || raw === "0" || raw.toLowerCase() === "null") return "";
  const normalized = raw.toLowerCase().replace(/[\\s_-]+/g, "");
  const map = {
    "лн": "Левый нападающий", "левыйнападающий": "Левый нападающий",
    "leftforward": "Левый нападающий", "lf": "Левый нападающий",
    "цн": "Центральный нападающий", "центр": "Центральный нападающий",
    "центральныйнападающий": "Центральный нападающий", "center": "Центральный нападающий",
    "centerforward": "Центральный нападающий", "centreforward": "Центральный нападающий",
    "cf": "Центральный нападающий",
    "пн": "Правый нападающий", "правыйнападающий": "Правый нападающий",
    "rightforward": "Правый нападающий", "rf": "Правый нападающий",
    "лз": "Левый защитник", "левыйзащитник": "Левый защитник",
    "leftdefender": "Левый защитник", "ld": "Левый защитник",
    "пз": "Правый защитник", "правыйзащитник": "Правый защитник",
    "rightdefender": "Правый защитник", "rd": "Правый защитник",
    "вр": "Вратарь", "вратарь": "Вратарь", "goalkeeper": "Вратарь",
    "goalie": "Вратарь", "maingoalkeeper": "Основной вратарь",
    "backupgoalkeeper": "Запасной вратарь", "centergoalkeeperleft": "Вратарь",
    "centergoalkeeperright": "Вратарь", "coachgoalkeeper": "Вратарь",
    "managergoalkeeper": "Вратарь",
    "нп": "Нападающий", "нападающий": "Нападающий", "forward": "Нападающий",
    "зщ": "Защитник", "защитник": "Защитник", "defender": "Защитник",
  };
  return map[normalized] || raw;
}

function formatConfirmationShirtColor(value) {
  const raw = decodeSafe(value).trim();
  if (!raw || raw === "0" || raw.toLowerCase() === "null") return "";
  const normalized = raw.toLowerCase().replace(/[\\s_-]+/g, "");
  const map = {
    "white": "Белая", "белая": "Белая", "белый": "Белая",
    "black": "Чёрная", "черная": "Чёрная", "чёрная": "Чёрная",
    "red": "Красная", "красная": "Красная",
    "blue": "Синяя", "синяя": "Синяя", "navy": "Тёмно-синяя",
    "darkblue": "Тёмно-синяя", "lightblue": "Голубая", "голубая": "Голубая",
    "yellow": "Жёлтая", "желтая": "Жёлтая", "жёлтая": "Жёлтая",
    "green": "Зелёная", "зеленая": "Зелёная", "зелёная": "Зелёная",
    "orange": "Оранжевая", "оранжевая": "Оранжевая",
    "gray": "Серая", "grey": "Серая", "серая": "Серая",
    "pink": "Розовая", "розовая": "Розовая",
    "purple": "Фиолетовая", "фиолетовая": "Фиолетовая",
  };
  return map[normalized] || `${raw.slice(0, 1).toUpperCase()}${raw.slice(1)}`;
}

function confirmationNotificationBody(payload) {
  const data = getData(payload);
  const eventName = getEventName(payload);
  if (!["GAMER CONFIRMATION", "GAME CONFIRMATION", "TRAINING CONFIRMATION"].includes(eventName)) {
    return "";
  }

  const gameId = getPrimitiveValue(data, ["game_id", "GAME_ID"]);
  const trainingId = getPrimitiveValue(data, ["training_id", "TRAINING_ID", "tabid", "TABID"]);
  const isTraining = eventName === "TRAINING CONFIRMATION" || (!!trainingId && !gameId);
  const eventLabel = isTraining ? "тренировку" : "игру";
  const confirmed = confirmationValue(getPrimitiveValue(data, ["confirmed", "CONFIRMED"]));

  if (confirmed === true) {
    const lines = [`Вы утверждены на ${eventLabel}`];

    if (isTraining) {
      const squad = formatConfirmationSquad(getConfirmationField(payload, [
        "SQUAD", "squad", "LINE", "line", "LINE_NUMBER", "line_number",
        "LINE_NUM", "line_num", "SQUAD_NUMBER", "squad_number",
      ]));
      const position = formatConfirmationPosition(getConfirmationField(payload, [
        "POS", "pos", "POSITION", "position", "LINE_POSITION", "line_position",
        "POSITION_IN_LINE", "position_in_line", "ROLE", "role",
      ]));
      const shirtColor = formatConfirmationShirtColor(getConfirmationField(payload, [
        "SHIRT_COLOR", "shirt_color", "JERSEY_COLOR", "jersey_color",
        "VEST_COLOR", "vest_color", "BIB_COLOR", "bib_color",
        "MANISHKA_COLOR", "manishka_color", "MAYKA_COLOR", "mayka_color",
        "SHIRT", "shirt", "JERSEY", "jersey", "COLOR", "color",
      ]));

      if (squad) lines.push(`Звено: ${squad}`);
      if (position) lines.push(`Позиция: ${position}`);
      if (shirtColor) lines.push(`Цвет майки: ${shirtColor}`);
    }

    return lines.join("\\n");
  }

  if (confirmed === false) return `Вы не утверждены на ${eventLabel}`;
  return isTraining
    ? "Изменён статус участия в тренировке"
    : "Изменён статус участия в игре";
}

function eventNotificationBody'''
    sw, count = pattern.subn(replacement, sw, count=1)
    if count != 1:
        raise SystemExit(f"push confirmation block: expected one block, found {count}")

if "const confirmationBody = confirmationNotificationBody(payload);" not in sw:
    pattern = re.compile(
        r'  let body =\n\s+getMessageBody\(payload\) \|\|\n\s+confirmationNotificationBody\(payload\) \|\|\n\s+eventNotificationBody\(payload\) \|\|\n\s+"Новое уведомление";',
    )
    replacement = '''  const confirmationBody = confirmationNotificationBody(payload);
  let body =
    confirmationBody ||
    getMessageBody(payload) ||
    eventNotificationBody(payload) ||
    "Новое уведомление";'''
    sw, count = pattern.subn(replacement, sw, count=1)
    if count != 1:
        raise SystemExit(f"confirmation body priority: expected one block, found {count}")

write_if_changed(sw_path, sw_original, sw)


# Push notification test.
test_path = Path("tests/pushNotificationText.test.mjs")
tests_original = test_path.read_text()
tests = tests_original

test_title = "builds a training approval with line, position and shirt color"
if test_title not in tests:
    anchor = 'test("builds a rejection notification for a training", () => {\n'
    new_test = '''test("builds a training approval with line, position and shirt color", () => {
  const notification = makeNotification({
    data: {
      event: "TRAINING CONFIRMATION",
      GAMER_ID: "42",
      training_id: "701",
      confirmed: true,
      body: "Вы утверждены на тренировку",
      LINE_NUMBER: "2",
      POSITION_IN_LINE: "left_forward",
      JERSEY_COLOR: "white",
    },
  });

  assert.equal(notification.title, "ХМ 5.1");
  assert.equal(
    notification.body,
    [
      "Вы утверждены на тренировку",
      "Звено: 2 звено",
      "Позиция: Левый нападающий",
      "Цвет майки: Белая",
    ].join("\\n")
  );
});

''' + anchor
    tests = replace_once(tests, anchor, new_test, "training confirmation test")

write_if_changed(test_path, tests_original, tests)
