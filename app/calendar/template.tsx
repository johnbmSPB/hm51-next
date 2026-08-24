import type { ReactNode } from "react";

export default function CalendarTemplate({ children }: { children: ReactNode }) {
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
