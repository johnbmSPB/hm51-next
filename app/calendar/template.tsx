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

function colorMonthlyEventCounts() {
  const paragraphs = Array.from(document.querySelectorAll<HTMLParagraphElement>("main p"));

  paragraphs.forEach((paragraph) => {
    const text = paragraph.textContent?.trim() || "";
    const match = text.match(/^(\d+)\s+игр\s+·\s+(\d+)\s+тренировок$/);
    if (!match) return;

    const gameText = `${match[1]} игр`;
    const separatorText = " · ";
    const trainingText = `${match[2]} тренировок`;

    const style = window.getComputedStyle(paragraph);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;

    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

    const gameWidth = context.measureText(gameText).width;
    const separatorWidth = context.measureText(separatorText).width;
    const trainingWidth = context.measureText(trainingText).width;
    const totalWidth = gameWidth + separatorWidth + trainingWidth;

    if (totalWidth <= 0) return;

    const gameEnd = (gameWidth / totalWidth) * 100;
    const separatorEnd = ((gameWidth + separatorWidth) / totalWidth) * 100;

    paragraph.style.backgroundImage = `linear-gradient(to right, #20d1a8 0%, #20d1a8 ${gameEnd}%, rgba(255,255,255,0.4) ${gameEnd}%, rgba(255,255,255,0.4) ${separatorEnd}%, #ff0a8a ${separatorEnd}%, #ff0a8a 100%)`;
    paragraph.style.backgroundClip = "text";
    paragraph.style.webkitBackgroundClip = "text";
    paragraph.style.color = "transparent";
    paragraph.style.webkitTextFillColor = "transparent";
    paragraph.style.fontWeight = "900";
  });
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

    colorMonthlyEventCounts();

    const observer = new MutationObserver(() => {
      colorMonthlyEventCounts();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    document.addEventListener("click", handleClick);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleClick);
    };
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

        main section > div.flex.items-center.justify-between:has(> div.text-center) > button:first-child,
        main section > div.flex.items-center.justify-between:has(> div.text-center) > button:last-child {
          width: 48px !important;
          height: 48px !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 0 !important;
          line-height: 1 !important;
        }

        main section > div.flex.items-center.justify-between:has(> div.text-center) > button:first-child::before,
        main section > div.flex.items-center.justify-between:has(> div.text-center) > button:last-child::before {
          content: "→";
          display: block;
          font-size: 24px;
          font-weight: 900;
          line-height: 1;
          color: rgba(255,255,255,0.7);
        }

        main section > div.flex.items-center.justify-between:has(> div.text-center) > button:first-child::before {
          transform: rotate(180deg);
        }
      `}</style>
      {children}
    </>
  );
}
