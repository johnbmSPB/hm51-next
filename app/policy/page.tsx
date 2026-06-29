import fs from "node:fs";
import path from "node:path";
import AcceptPolicyButton from "./AcceptPolicyButton";

function getPolicyText() {
  const filePath = path.join(process.cwd(), "app/policy/policy.txt");

  try {
    const text = fs.readFileSync(filePath, "utf8").trim();

    if (!text) {
      return "Текст политики не загружен. Нужно заново вставить текст в app/policy/policy.txt";
    }

    return text;
  } catch {
    return "Файл app/policy/policy.txt не найден.";
  }
}

export default function PolicyPage() {
  const policyText = getPolicyText();

  return (
    <main className="min-h-dvh bg-[#07110c] px-5 py-6 text-white">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-black leading-tight">
            Политика в отношении обработки персональных данных
          </h1>

          <p className="mt-2 text-sm font-bold text-white/45">
            Приложение «XM5.1»
          </p>
        </header>

        <section className="rounded-3xl bg-[#2b322d] p-5">
          <div className="whitespace-pre-line text-sm leading-7 text-white/85">
            {policyText}
          </div>
        </section>

        <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-[#07110c] via-[#07110c] to-transparent pb-4 pt-8">
          <AcceptPolicyButton />
        </div>
      </div>
    </main>
  );
}
