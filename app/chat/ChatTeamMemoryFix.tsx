"use client";

import { useEffect } from "react";

const LAST_TEAM_NAME_KEY = "hm51_last_chat_team_name";
const LAST_TEAM_INDEX_KEY = "hm51_last_chat_team_index";

function getTeamButtons() {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>('main[data-hm51-chat-main="true"] header button')
  ).filter((button) => button.textContent?.trim());
}

function buttonText(button: HTMLButtonElement) {
  return String(button.textContent || "").replace(/\s+/g, " ").trim();
}

function isActiveTeamButton(button: HTMLButtonElement) {
  return button.className.includes("bg-[#20d1a8]") || button.className.includes("text-[#07110c]");
}

function scrollTeamButtonIntoView(button: HTMLButtonElement, behavior: ScrollBehavior = "smooth") {
  button.scrollIntoView({ behavior, block: "nearest", inline: "center" });
}

function saveSelectedTeam(button: HTMLButtonElement) {
  const buttons = getTeamButtons();
  const index = buttons.indexOf(button);
  const name = buttonText(button);

  if (!name) return;

  localStorage.setItem(LAST_TEAM_NAME_KEY, name);
  if (index >= 0) localStorage.setItem(LAST_TEAM_INDEX_KEY, String(index));
  scrollTeamButtonIntoView(button);
}

function scrollActiveTeamButton() {
  const active = getTeamButtons().find(isActiveTeamButton);
  if (active) scrollTeamButtonIntoView(active);
}

function restoreLastTeam() {
  const buttons = getTeamButtons();
  if (buttons.length <= 1) return false;

  const savedName = localStorage.getItem(LAST_TEAM_NAME_KEY) || "";
  const savedIndex = Number(localStorage.getItem(LAST_TEAM_INDEX_KEY) || "-1");

  const targetByName = savedName ? buttons.find((button) => buttonText(button) === savedName) : undefined;
  const targetByIndex = savedIndex >= 0 && savedIndex < buttons.length ? buttons[savedIndex] : undefined;
  const target = targetByName || targetByIndex;

  if (!target) {
    scrollActiveTeamButton();
    return false;
  }

  if (!isActiveTeamButton(target)) target.click();
  scrollTeamButtonIntoView(target, "auto");
  return true;
}

export default function ChatTeamMemoryFix() {
  useEffect(() => {
    let restored = false;
    let userTouchedTeam = false;

    function applyRestore() {
      if (!restored && !userTouchedTeam) restored = restoreLastTeam();
      scrollActiveTeamButton();
    }

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('main[data-hm51-chat-main="true"] header button');
      if (!button) return;

      userTouchedTeam = true;
      window.setTimeout(() => saveSelectedTeam(button), 0);
      window.setTimeout(() => saveSelectedTeam(button), 180);
    }

    const timers = [80, 260, 600, 1100, 1800].map((delay) => window.setTimeout(applyRestore, delay));
    document.addEventListener("click", onClick, true);

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyRestore);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener("click", onClick, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
