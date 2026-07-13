"use client";

import Link from "next/link";

type CoachNavItem = "calendar" | "profile" | "find" | "chat" | "menu";

const items: Array<{ id: CoachNavItem; href: string; label: string }> = [
  { id: "calendar", href: "/coach", label: "Календарь" },
  { id: "profile", href: "/coach/profile", label: "Профиль" },
  { id: "find", href: "/coach/find-team", label: "Найти" },
  { id: "chat", href: "/coach/chat", label: "Чат" },
  { id: "menu", href: "/coach/menu", label: "Меню" },
];

export default function CoachBottomNav({ active }: { active: CoachNavItem }) {
  return (
    <nav
      data-chat-bottom-nav={active === "chat" ? "true" : undefined}
      className="fixed bottom-5 left-1/2 z-[70] grid w-[calc(100%-24px)] max-w-md -translate-x-1/2 grid-cols-5 gap-1 rounded-3xl bg-[#2d332f] p-2 shadow-2xl shadow-black/40"
    >
      {items.map((item) => {
        const selected = item.id === active;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={
              selected
                ? "rounded-2xl bg-[#20d1a8] px-1 py-3 text-center text-[10px] font-black text-[#121715]"
                : "rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
