function cleanTrainingApprovalValue(value: unknown) {
  return String(value ?? "").trim();
}

const TRAINING_POSITION_LABELS: Record<string, string> = {
  "1": "ЛЗ",
  "2": "ЛН",
  "3": "Ц",
  "4": "ПН",
  "5": "ПЗ",
  "лз": "ЛЗ",
  "лн": "ЛН",
  "ц": "Ц",
  "пн": "ПН",
  "пз": "ПЗ",
};

const TRAINING_SHIRT_COLOR_LABELS: Record<string, string> = {
  "0": "жёлтая",
  "1": "красная",
  "2": "синяя",
  "3": "зелёная",
  "4": "белая",
  "5": "чёрная",
  "жёлтая": "жёлтая",
  "желтая": "жёлтая",
  "красная": "красная",
  "синяя": "синяя",
  "зелёная": "зелёная",
  "зеленая": "зелёная",
  "белая": "белая",
  "чёрная": "чёрная",
  "черная": "чёрная",
};

export function formatTrainingPosition(value: unknown) {
  const raw = cleanTrainingApprovalValue(value);
  const normalized = raw.toLowerCase().replace(/\s+/g, "");

  if (!raw || ["0", "null", "undefined"].includes(normalized)) {
    return "";
  }

  return TRAINING_POSITION_LABELS[normalized] || raw;
}

export function formatTrainingShirtColor(value: unknown) {
  const raw = cleanTrainingApprovalValue(value);
  const normalized = raw.toLowerCase().replace(/\s+/g, "");

  if (!raw || ["null", "undefined"].includes(normalized)) {
    return "";
  }

  return TRAINING_SHIRT_COLOR_LABELS[normalized] || raw;
}
