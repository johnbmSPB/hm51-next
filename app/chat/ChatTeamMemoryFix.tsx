"use client";

import { useEffect } from "react";

const LAST_TEAM_NAME_KEY = "hm51_last_chat_team_name";

function teamButtons() {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>('main[data-hm51-chat-main="true"] header button')
  ).filter((button) => String(button.textContent || "").trim());
}

function nameOf(button: HTMLButtonElement) {
  return String(button.textContent || "").replace(/\s+/g, " ").trim();
}

function isActive(button: HTMLButtonElement) {
  return button.className.includes("bg-[#20d1a8]") || button.className.includes("text-[#07110c]");
}

function center(button: HTMLButtonElement, behavior: ScrollBehavior = "auto") {
  button.scrollIntoView({ behavior, block: "nearest", inline: "center" });
}

export default function ChatTeamMemoryFix() {
  useEffect(() => {
    let disposed = false;
    let programmaticClick = false;
    let restoreTimer = 0;

    function save(button: HTMLButtonElement) {
      const name = nameOf(button);
      if (!name) return;
      localStorage.setItem(LAST_TEAM_NAME_KEY, name);
      center(button, "smooth");
    }

    function restore() {
      if (disposed || programmaticClick) return;

      const buttons = teamButtons();
      if (buttons.length === 0) return;

      const savedName = localStorage.getItem(LAST_TEAM_NAME_KEY) || "";
      const active = buttons.find(isActive);

      if (!savedName) {
        if (active) save(active);
        return;
      }

      const saved = buttons.find((button) => nameOf(button) === savedName);
      if (!saved) {
        if (active) save(active);
        return;
      }

      if (isActive(saved)) {
        center(saved);
        return;
      }

      programmaticClick = true;
      saved.click();
      center(saved);
      window.setTimeout(() => {
        programmaticClick = false;
      }, 120);
    }

    function scheduleRestore(delay = 0) {
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(restore, delay);
    }

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('main[data-hm51-chat-main="true"] header button');
      if (!button || programmaticClick) return;

      // Сохраняем выбор до того, как React успеет перерисовать список команд.
      save(button);
      scheduleRestore(180);
    }

    document.addEventListener("click", onClick, true);

    const observer = new MutationObserver(() => scheduleRestore(20));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    [40, 120, 300, 700, 1300].forEach((delay) => window.setTimeout(restore, delay));

    return () => {
      disposed = true;
      window.clearTimeout(restoreTimer);
      document.removeEventListener("click", onClick, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
