"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type LegendRowProps = {
  marker: ReactNode;
  title: string;
  description?: string;
};

function LegendRow({ marker, title, description }: LegendRowProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-[#121715] px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
        {marker}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-black text-white">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs font-semibold leading-5 text-white/45">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function SmallDot({ type }: { type: "game" | "training" | "past" }) {
  const color =
    type === "game"
      ? "bg-[#20d1a8]"
      : type === "training"
        ? "bg-[#ff0a8a]"
        : "bg-[#7b837f]";

  return <span className={`h-2 w-2 rounded-full ${color}`} />;
}

function BigDot({
  type,
}: {
  type:
    | "coming"
    | "notcoming"
    | "approved"
    | "rejected"
    | "pending"
    | "past"
    | "past-ring";
}) {
  if (type === "approved") {
    return (
      <span className="h-3.5 w-3.5 rounded-full bg-[#20d1a8] ring-2 ring-[#20d1a8] ring-offset-2 ring-offset-[#121715]" />
    );
  }

  if (type === "rejected") {
    return (
      <span className="h-3.5 w-3.5 rounded-full bg-[#20d1a8] ring-2 ring-[#ff0a8a] ring-offset-2 ring-offset-[#121715]" />
    );
  }

  if (type === "past-ring") {
    return (
      <span className="h-3.5 w-3.5 rounded-full bg-[#7b837f] ring-2 ring-[#7b837f] ring-offset-2 ring-offset-[#121715]" />
    );
  }

  const color =
    type === "notcoming"
      ? "bg-[#ff0a8a]"
      : type === "past"
        ? "bg-[#7b837f]"
        : "bg-[#20d1a8]";

  return <span className={`h-3.5 w-3.5 rounded-full ${color}`} />;
}

function applySummaryLayout() {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("main div.flex.flex-wrap")
  );

  candidates.forEach((container) => {
    const spans = Array.from(container.querySelectorAll<HTMLElement>(":scope > span"));
    const labels = spans.map((span) => span.textContent?.trim() || "");

    const isSummary =
      labels.some((label) => label.startsWith("Придут")) &&
      labels.some((label) => label.startsWith("Отказ")) &&
      labels.some((label) => label.startsWith("Думают"));

    if (!isSummary) return;

    container.dataset.eventSummary = "true";

    spans.forEach((span) => {
      const label = span.textContent?.trim() || "";

      delete span.dataset.summaryOrder;

      if (label.startsWith("Придут")) span.dataset.summaryOrder = "1";
      else if (label.startsWith("Гости")) span.dataset.summaryOrder = "2";
      else if (label.startsWith("Отказ")) span.dataset.summaryOrder = "3";
      else if (label.startsWith("Думают")) span.dataset.summaryOrder = "4";
    });
  });
}

function findCalendarLegendHost() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("main section"));

  for (const section of sections) {
    const calendarGrid = section.querySelector(".grid.grid-cols-7");
    if (!calendarGrid) continue;

    const header = section.querySelector<HTMLElement>(":scope > div.flex.items-center.justify-between");
    if (!header) continue;

    const center = Array.from(header.children).find((child) =>
      child.classList.contains("text-center")
    );

    if (center instanceof HTMLElement) {
      return center;
    }
  }

  return null;
}

export default function CalendarLayout({ children }: { children: ReactNode }) {
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [legendHost, setLegendHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const refresh = () => {
      applySummaryLayout();
      setLegendHost((current) => current || findCalendarLegendHost());
    };

    refresh();

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {children}

      <style>{`
        [data-event-summary="true"] {
          flex-wrap: nowrap !important;
          column-gap: 0.5rem !important;
          row-gap: 0 !important;
          white-space: nowrap !important;
          font-size: 11px !important;
        }

        [data-event-summary="true"] > [data-summary-order="1"] { order: 1; }
        [data-event-summary="true"] > [data-summary-order="2"] { order: 2; }
        [data-event-summary="true"] > [data-summary-order="3"] { order: 3; }
        [data-event-summary="true"] > [data-summary-order="4"] { order: 4; }
      `}</style>

      {legendHost &&
        createPortal(
          <button
            type="button"
            onClick={() => setIsLegendOpen(true)}
            aria-label="Как читать календарь"
            className="mt-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-white/15 bg-[#121715] px-2 text-xs font-black text-[#20d1a8] transition active:scale-95"
          >
            i
          </button>,
          legendHost
        )}

      {isLegendOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/75 px-4 pb-4 pt-20"
          role="dialog"
          aria-modal="true"
          aria-label="Как читать календарь"
          onClick={() => setIsLegendOpen(false)}
        >
          <div
            className="max-h-[82dvh] w-full max-w-md overflow-y-auto rounded-[32px] bg-[#2d332f] p-5 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#20d1a8]">
                  Подсказка
                </p>
                <h2 className="mt-1 text-2xl font-black">Как читать календарь</h2>
              </div>

              <button
                type="button"
                onClick={() => setIsLegendOpen(false)}
                aria-label="Закрыть"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#121715] text-xl font-black text-white/70"
              >
                ×
              </button>
            </div>

            <section className="mt-5">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-white/40">
                Событие
              </p>
              <div className="space-y-2">
                <LegendRow marker={<SmallDot type="game" />} title="Игра" />
                <LegendRow marker={<SmallDot type="training" />} title="Тренировка" />
              </div>
            </section>

            <section className="mt-5">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-white/40">
                Ваш ответ
              </p>
              <div className="space-y-2">
                <LegendRow marker={<BigDot type="coming" />} title="Приду" />
                <LegendRow marker={<BigDot type="notcoming" />} title="Не приду" />
              </div>
            </section>

            <section className="mt-5">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-white/40">
                Решение по составу
              </p>
              <div className="space-y-2">
                <LegendRow
                  marker={<BigDot type="approved" />}
                  title="Утвердили"
                  description="Большая зелёная точка с зелёной обводкой"
                />
                <LegendRow
                  marker={<BigDot type="rejected" />}
                  title="Не утвердили"
                  description="Большая зелёная точка с красной обводкой"
                />
                <LegendRow
                  marker={<BigDot type="pending" />}
                  title="Решение ещё не принято"
                  description="Большая зелёная точка без обводки"
                />
              </div>
            </section>

            <section className="mt-5">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-white/40">
                Прошедшие события
              </p>
              <div className="space-y-2">
                <LegendRow
                  marker={<SmallDot type="past" />}
                  title="Прошедшая игра или тренировка"
                  description="Маленький индикатор становится серым"
                />
                <LegendRow
                  marker={<BigDot type="past" />}
                  title="Ваш прошлый ответ"
                  description="Большой индикатор становится серым"
                />
                <LegendRow
                  marker={<BigDot type="past-ring" />}
                  title="Прошедшее событие с итоговым решением"
                  description="И точка, и обводка становятся серыми"
                />
              </div>
            </section>

            <button
              type="button"
              onClick={() => setIsLegendOpen(false)}
              className="mt-6 h-14 w-full rounded-[28px] bg-[#20d1a8] text-base font-black text-[#121715] transition active:scale-[0.98]"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  );
}
