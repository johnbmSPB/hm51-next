import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";

export const metadata: Metadata = {
  title: "Политика в отношении обработки персональных данных",
  description: "Политика ООО «КОДБЕРРИ» в отношении обработки персональных данных пользователей XM 5.1.",
  alternates: { canonical: "/privacy-policy" },
};

const policyText = readFileSync(
  path.join(process.cwd(), "public", "privacy-policy.txt"),
  "utf8",
);

const lines = policyText.split(/\r?\n/);

function isHeading(line: string) {
  return /^\d+\.\s+[А-ЯЁ]/.test(line.trim());
}

export default function PrivacyPolicyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#07110c", color: "#f4f8f7", padding: "32px 18px 72px" }}>
      <article style={{ width: "min(960px, 100%)", margin: "0 auto" }}>
        <a href="/" style={{ display: "inline-flex", marginBottom: 28, color: "#20e4c7", textDecoration: "none", fontWeight: 700 }}>
          ← Вернуться на сайт XM 5.1
        </a>

        <header style={{ padding: "34px 30px", border: "1px solid rgba(32,228,199,.24)", borderRadius: 24, background: "linear-gradient(145deg,rgba(16,38,33,.96),rgba(7,17,12,.96))" }}>
          <p style={{ margin: "0 0 12px", color: "#20e4c7", fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>
            XM 5.1 · Официальный документ
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(34px,6vw,58px)", lineHeight: 1.05, letterSpacing: "-.04em" }}>
            Политика в отношении обработки персональных данных
          </h1>
        </header>

        <section style={{ marginTop: 24, padding: "28px 30px", border: "1px solid rgba(255,255,255,.08)", borderRadius: 22, background: "rgba(13,26,24,.82)" }}>
          {lines.map((line, index) => {
            const trimmed = line.trim();

            if (!trimmed) {
              return <div key={`space-${index}`} style={{ height: 14 }} />;
            }

            if (index === 0) {
              return null;
            }

            if (isHeading(trimmed)) {
              return (
                <h2 key={`${trimmed}-${index}`} style={{ margin: "34px 0 14px", fontSize: 23, lineHeight: 1.3, color: "#ffffff" }}>
                  {trimmed}
                </h2>
              );
            }

            const isListItem = trimmed.startsWith("—") || trimmed.startsWith("•");

            return (
              <p
                key={`${index}-${trimmed.slice(0, 24)}`}
                style={{
                  margin: isListItem ? "8px 0 8px 18px" : "11px 0 0",
                  color: "#b8c6c2",
                  lineHeight: 1.78,
                  fontSize: 15,
                  whiteSpace: "pre-wrap",
                }}
              >
                {trimmed}
              </p>
            );
          })}
        </section>

        <footer style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,.1)", color: "#8fa09b", textAlign: "center" }}>
          © ООО «КОДБЕРРИ», 2026
        </footer>
      </article>
    </main>
  );
}
