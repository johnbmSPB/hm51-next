import { readFileSync, writeFileSync } from "node:fs";

const pagePath = "app/home/page.tsx";
const layoutPath = "app/home/layout.tsx";
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
    'import SmartContactValue from "../components/SmartContactValue";\n',
    'import SmartContactValue from "../components/SmartContactValue";\nimport { useAppData } from "../lib/AppDataProvider";\n',
    "AppDataProvider import"
  );
}

if (!text.includes("const { profileRevision } = useAppData();")) {
  replaceOnce(
    'export default function ProfilePage() {\n  const [token, setToken] = useState("");\n',
    'export default function ProfilePage() {\n  const { profileRevision } = useAppData();\n  const handledProfileRevision = useRef(profileRevision);\n  const [token, setToken] = useState("");\n',
    "ProfilePage hook"
  );
}

if (!text.includes("handledProfileRevision.current === profileRevision")) {
  const initialEffect = `  useEffect(() => {\n    const savedToken = localStorage.getItem("hm51_token") || "";\n\n    if (!savedToken) {\n      window.location.href = "/login";\n      return;\n    }\n\n    setToken(savedToken);\n    loadProfile(savedToken);\n  }, []);\n`;

  const revisionEffect = `${initialEffect}\n  useEffect(() => {\n    if (!token || handledProfileRevision.current === profileRevision) return;\n\n    handledProfileRevision.current = profileRevision;\n    void loadProfile(token, true);\n  }, [profileRevision, token]);\n`;

  replaceOnce(initialEffect, revisionEffect, "profile revision effect");
}

if (!text.includes("async function loadProfile(currentToken: string, silent = false)")) {
  replaceOnce(
    '  async function loadProfile(currentToken: string) {\n    try {\n      setLoading(true);\n      setMessage("");\n',
    '  async function loadProfile(currentToken: string, silent = false) {\n    try {\n      if (!silent) {\n        setLoading(true);\n        setMessage("");\n      }\n',
    "loadProfile start"
  );

  replaceOnce(
    '      setTeamSections(sections);\n      setSelectedTeamIndex(0);\n    } catch (error) {\n      setMessage(error instanceof Error ? error.message : "Ошибка загрузки профиля");\n    } finally {\n      setLoading(false);\n    }\n  }\n',
    '      setTeamSections(sections);\n      setSelectedTeamIndex((current) =>\n        sections.length === 0 ? 0 : Math.min(current, sections.length - 1)\n      );\n    } catch (error) {\n      if (!silent) {\n        setMessage(error instanceof Error ? error.message : "Ошибка загрузки профиля");\n      }\n    } finally {\n      if (!silent) setLoading(false);\n    }\n  }\n',
    "loadProfile finish"
  );
}

if (changed) writeFileSync(pagePath, text);

const directLayout = `import type { ReactNode } from "react";\n\nexport default function HomeLayout({ children }: { children: ReactNode }) {\n  return children;\n}\n`;
if (readFileSync(layoutPath, "utf8") !== directLayout) {
  writeFileSync(layoutPath, directLayout);
  changed = true;
}

console.log(changed ? "Direct home migration applied." : "Direct home migration already applied.");
