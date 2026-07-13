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

export default function PlayerCoachProfileAction() {
  const pathname = usePathname();
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [hasCoachProfile, setHasCoachProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (pathname !== "/home") {
      setMountNode(null);
      return;
    }

    setHasCoachProfile(readRoles().includes("COACH"));

    const pageRoot = document.querySelector("main > div");
    const header = pageRoot?.querySelector(":scope > header");

    if (!pageRoot || !header) return;

    let node = pageRoot.querySelector<HTMLElement>(
      "[data-player-coach-profile-action]"
    );

    if (!node) {
      node = document.createElement("div");
      node.setAttribute("data-player-coach-profile-action", "true");
      header.insertAdjacentElement("afterend", node);
    }

    setMountNode(node);

    return () => {
      node?.remove();
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
    <section className="mt-5 rounded-3xl border border-[#20d1a8]/30 bg-[#20d1a8]/10 p-5 text-white">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20d1a8]">
        Дополнительный профиль
      </p>
      <h2 className="mt-2 text-xl font-black">
        {hasCoachProfile ? "Профиль тренера подключён" : "Добавить профиль тренера"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/55">
        {hasCoachProfile
          ? "Переключитесь в режим тренера на этой же учётной записи."
          : "Основные данные игрока будут автоматически перенесены в анкету тренера."}
      </p>

      {message && (
        <div className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-200">
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={openCoachProfile}
        disabled={loading}
        className="mt-5 h-14 w-full rounded-[30px] bg-[#20d1a8] text-base font-black text-[#121715] disabled:opacity-50"
      >
        {loading
          ? "Загружаем..."
          : hasCoachProfile
            ? "Перейти в профиль тренера"
            : "Добавить профиль тренера"}
      </button>
    </section>,
    mountNode
  );
}
