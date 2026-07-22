import { readFileSync, writeFileSync } from "node:fs";

const pagePath = "app/calendar/page.tsx";
const layoutPath = "app/calendar/layout.tsx";
let text = readFileSync(pagePath, "utf8");
let changed = false;

function replaceOnce(oldValue, newValue, label) {
  const count = text.split(oldValue).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected one anchor, found ${count}`);
  }
  text = text.replace(oldValue, newValue);
  changed = true;
}

if (!text.includes('import { useAppData } from "../lib/AppDataProvider";')) {
  replaceOnce(
    'import { getScopedItem } from "../lib/accountStorage";\n',
    'import { getScopedItem } from "../lib/accountStorage";\nimport { useAppData } from "../lib/AppDataProvider";\n',
    "AppDataProvider import"
  );
}

if (!text.includes("const { profileRevision, eventsRevision } = useAppData();")) {
  replaceOnce(
    'export default function CalendarPage() {\n  const [token, setToken] = useState("");\n',
    'export default function CalendarPage() {\n  const { profileRevision, eventsRevision } = useAppData();\n  const handledProfileRevision = useRef(profileRevision);\n  const handledEventsRevision = useRef(eventsRevision);\n  const [token, setToken] = useState("");\n',
    "CalendarPage hook"
  );
}

if (!text.includes("handledEventsRevision.current === eventsRevision")) {
  const eventsEffect = `  useEffect(() => {\n    if (!token || profileLoading) return;\n\n    if (teams.length === 0) {\n      setEvents([]);\n      setLoading(false);\n      return;\n    }\n\n    void loadEvents(token);\n  }, [\n    token,\n    profileLoading,\n    teams,\n    range.date1,\n    range.date2,\n  ]);\n`;

  const revisionEffects = `${eventsEffect}\n  useEffect(() => {\n    if (!token || handledProfileRevision.current === profileRevision) return;\n\n    handledProfileRevision.current = profileRevision;\n    void loadProfile(token, true);\n  }, [profileRevision, token]);\n\n  useEffect(() => {\n    if (\n      !token ||\n      profileLoading ||\n      handledEventsRevision.current === eventsRevision\n    ) {\n      return;\n    }\n\n    handledEventsRevision.current = eventsRevision;\n\n    if (teams.length === 0) {\n      setEvents([]);\n      return;\n    }\n\n    void loadEvents(token, true);\n  }, [\n    eventsRevision,\n    token,\n    profileLoading,\n    teams,\n    range.date1,\n    range.date2,\n  ]);\n`;

  replaceOnce(eventsEffect, revisionEffects, "revision effects");
}

if (!text.includes("async function loadProfile(currentToken: string, silent = false)")) {
  replaceOnce(
    '  async function loadProfile(currentToken: string) {\n    try {\n      setProfileLoading(true);\n      setProfileError("");\n',
    '  async function loadProfile(currentToken: string, silent = false) {\n    try {\n      if (!silent) {\n        setProfileLoading(true);\n        setProfileError("");\n      }\n',
    "loadProfile start"
  );

  replaceOnce(
    '    } finally {\n      setProfileLoading(false);\n    }\n  }\n\n  async function loadPhoto',
    '    } finally {\n      if (!silent) setProfileLoading(false);\n    }\n  }\n\n  async function loadPhoto',
    "loadProfile finish"
  );
}

if (!text.includes("async function loadEvents(currentToken: string, silent = false)")) {
  replaceOnce(
    '  async function loadEvents(currentToken: string) {\n    try {\n      setLoading(true);\n      setError("");\n      setMessage("");\n',
    '  async function loadEvents(currentToken: string, silent = false) {\n    try {\n      if (!silent) {\n        setLoading(true);\n        setError("");\n        setMessage("");\n      }\n',
    "loadEvents start"
  );

  replaceOnce(
    '    } catch (err) {\n      setError(err instanceof Error ? err.message : "Ошибка календаря");\n    } finally {\n      setLoading(false);\n    }\n  }\n\n  async function loadEventPlayers',
    '    } catch (err) {\n      if (!silent) {\n        setError(err instanceof Error ? err.message : "Ошибка календаря");\n      }\n    } finally {\n      if (!silent) setLoading(false);\n    }\n  }\n\n  async function loadEventPlayers',
    "loadEvents finish"
  );
}

if (changed) writeFileSync(pagePath, text);

const directLayout = `import type { ReactNode } from "react";\n\nexport default function CalendarLayout({ children }: { children: ReactNode }) {\n  return children;\n}\n`;
if (readFileSync(layoutPath, "utf8") !== directLayout) {
  writeFileSync(layoutPath, directLayout);
  changed = true;
}

console.log(changed ? "Direct calendar migration applied." : "Direct calendar migration already applied.");
