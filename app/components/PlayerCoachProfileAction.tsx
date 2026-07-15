"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

type AnyObject = Record<string, any>;

type CoachPrefill = {
  family: string;
  name: string;
  midname: string;
  birthday: string;
  tel: string;
  email: string;
  login: string;
};

function text(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readRoles() {
  try {
    const stored = JSON.parse(localStorage.getItem("hm51_roles") || "[]");
    return Array.isArray(stored) ? stored.map(String) : [];
  } catch {
    return [];
  }
}

function isCoachProfileDisabled() {
  return document.cookie
    .split(";")
    .map((item) => item.trim())
    .some((item) => item === "hm51_coach_profile_disabled=1");
}

function getGamer(data: AnyObject) {
  return (
    data.GAMER ||
    data.gamer ||
    data.PLAYER ||
    data.player ||
    data.USER ||
    data.user ||
    data.PROFILE ||
    data.profile ||
    {}
  );
}

function toInputDate(value: string) {
  const trimmed = text(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split(".");
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

function findDeleteProfileSection(pageRoot: Element) {
  return Array.from(pageRoot.children).find((element) => {
    if (!(element instanceof HTMLElement) || element.tagName !== "SECTION") {
      return false;
    }

    return Array.from(element.querySelectorAll("p")).some(
      (paragraph) => paragraph.textContent?.trim() === "Удалить профиль"
    );
  }) as HTMLElement | undefined;
}

export default function PlayerCoachProfileAction() {
  const pathname = usePathname();
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [hasCoachProfile, setHasCoachProfile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (pathname !== "/home") {
      setMountNode(null);
      return;
    }

    setHasCoachProfile(
      readRoles().includes("COACH") && !isCoachProfileDisabled()
    );

    let node: HTMLElement | null = null;
    let observer: MutationObserver | null = null;

    const attachBeforeDeleteProfile = () => {
      const pageRoot = document.querySelector("main > div");
      if (!pageRoot) return false;

      const deleteSection = findDeleteProfileSection(pageRoot);
      if (!deleteSection) return false;

      node = pageRoot.querySelector<HTMLElement>(
        "[data-player-coach-profile-action]"
      );

      if (!node) {
        node = document.createElement("div");
        node.setAttribute("data-player-coach-profile-action", "true");
      }

      deleteSection.insertAdjacentElement("beforebegin", node);
      setMountNode(node);
      return true;
    };

    if (!attachBeforeDeleteProfile()) {
      observer = new MutationObserver(() => {
        if (attachBeforeDeleteProfile()) {
          observer?.disconnect();
          observer = null;
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer?.disconnect();
      node?.remove();
      setMountNode(null);
    };
  }, [pathname]);

  async function openCoachProfile() {
    if (hasCoachProfile) {
      localStorage.setItem("hm51_active_role", "COACH");
      window.location.href = "/coach/profile";
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const token =
        localStorage.getItem("hm51_token") ||
        localStorage.getItem("auth_token") ||
        "";

      if (!token) {
        throw new Error("Токен не найден. Войдите в приложение заново.");
      }

      const response = await fetch("/api/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({ token }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось загрузить данные игрока");
      }

      const gamer = getGamer(json);

      const prefill: CoachPrefill = {
        family: text(gamer.FAMILY || gamer.family),
        name: text(gamer.NAME || gamer.name),
        midname: text(gamer.MIDNAME || gamer.midname),
        birthday: toInputDate(text(gamer.BIRTHDAY || gamer.birthday)),
        tel: text(gamer.TEL || gamer.tel || gamer.PHONE || gamer.phone),
        email: text(
          gamer.EMAIL ||
            gamer.email ||
            localStorage.getItem("hm51_register_email")
        ),
        login: text(
          gamer.LOGIN || gamer.login || localStorage.getItem("hm51_login")
        ),
      };

      localStorage.setItem("hm51_coach_prefill", JSON.stringify(prefill));
      localStorage.setItem("hm51_coach_setup_source", "PLAYER");
      window.location.href = "/coach/profile-setup?source=player";
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Не удалось открыть анкету тренера"
      );
    } finally {
      setLoading(false);
    }
  }

  if (!mountNode) return null;

  return createPortal(
    <section className="mt-5 overflow-hidden rounded-3xl border border-[#20d1a8]/30 bg-[#20d1a8]/10 text-white">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className="min-w-0">
          <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#20d1a8]">
            Дополнительный профиль
          </span>
          <span className="mt-1 block text-sm font-semibold text-white/50">
            Тренер и другие роли
          </span>
        </span>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#20d1a8] text-2xl font-black leading-none text-[#121715]">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-[#20d1a8]/20 p-4 pt-4">
          <article className="rounded-[24px] bg-[#121715] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-black text-white">Профиль тренера</p>
                <p className="mt-1 text-sm leading-5 text-white/45">
                  {hasCoachProfile
                    ? "Профиль подключён к этой учётной записи."
                    : "Основные данные игрока будут перенесены в анкету тренера."}
                </p>
              </div>

              <span
                className={
                  hasCoachProfile
                    ? "shrink-0 rounded-xl bg-[#20d1a8]/15 px-3 py-2 text-xs font-black text-[#20d1a8]"
                    : "shrink-0 rounded-xl bg-white/5 px-3 py-2 text-xs font-black text-white/40"
                }
              >
                {hasCoachProfile ? "Подключён" : "Не добавлен"}
              </span>
            </div>

            {message && (
              <div className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-200">
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={openCoachProfile}
              disabled={loading}
              className="mt-4 h-14 w-full rounded-[30px] bg-[#20d1a8] text-base font-black text-[#121715] disabled:opacity-50"
            >
              {loading
                ? "Загружаем..."
                : hasCoachProfile
                  ? "Перейти в профиль тренера"
                  : "Добавить профиль тренера"}
            </button>
          </article>
        </div>
      )}
    </section>,
    mountNode
  );
}
