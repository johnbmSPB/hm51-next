"use client";

import { useEffect, type ReactNode } from "react";

function findSelectedDaySection() {
  const headings = Array.from(document.querySelectorAll<HTMLElement>("main p")).filter(
    (item) => item.textContent?.trim() === "Выбранный день"
  );

  for (const heading of headings) {
    const section = heading.closest("section");
    if (section instanceof HTMLElement) return section;
  }

  return null;
}

function focusFirstSelectedEvent() {
  const section = findSelectedDaySection();
  if (!section) return;

  const firstEventButton = section.querySelector<HTMLButtonElement>(
    ".mt-4.space-y-3 > div > button"
  );

  if (!firstEventButton) return;

  firstEventButton.scrollIntoView({
    behavior: "smooth",
    block: "start",
    inline: "nearest",
  });

  window.setTimeout(() => {
    firstEventButton.focus({ preventScroll: true });
  }, 350);
}

export default function CalendarTemplate({ children }: { children: ReactNode }) {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("button");
      if (!(button instanceof HTMLButtonElement)) return;

      const calendarGrid = button.closest(".grid.grid-cols-7");
      if (!calendarGrid) return;

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          focusFirstSelectedEvent();
        });
      });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <>
      <style>{`
        main section > div.flex.items-center.justify-between > div.text-center:has(> button[aria-label="Как читать календарь"]) {
          position: relative;
        }

        main section > div.flex.items-center.justify-between > div.text-center > button[aria-label="Как читать календарь"] {
          position: absolute !important;
          left: calc(100% + 0.5rem);
          top: 0;
          margin-top: 0 !important;
        }
      `}</style>
      {children}
    </>
  );
}
