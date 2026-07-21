"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RegistrationType =
  | "loading"
  | "player"
  | "coach";

function detectRegistrationType(
  role: string
): RegistrationType {
  const normalizedRole = role
    .trim()
    .toUpperCase();

  if (
    normalizedRole === "ТРЕНЕР" ||
    normalizedRole === "COACH" ||
    normalizedRole === "TRAINER_ROLE"
  ) {
    return "coach";
  }

  return "player";
}

export default function ConnectingTeamPage() {
  const [
    registrationType,
    setRegistrationType,
  ] = useState<RegistrationType>(
    "loading"
  );

  useEffect(() => {
    const savedRole =
      localStorage.getItem(
        "hm51_register_role"
      ) || "";

    setRegistrationType(
      detectRegistrationType(savedRole)
    );
  }, []);

  if (registrationType === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#07110c] text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-[#24d7b3]" />

          <p className="mt-4 text-sm font-bold text-white/50">
            Загружаем данные регистрации...
          </p>
        </div>
      </main>
    );
  }

  const isCoach =
    registrationType === "coach";

  return (
    <main className="min-h-dvh bg-[#07110c] px-6 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-md flex-col">
        <section className="pt-8 text-center">
          <h1 className="px-4 text-[28px] font-black leading-[36px] text-white">
            Регистрация ещё не завершена
          </h1>

          <p className="mt-[28px] whitespace-pre-line px-4 text-[17px] font-semibold leading-[28px] text-white/70">
            {isCoach
              ? `Учётная запись уже создана.

Чтобы пользоваться приложением,
заполните профиль тренера.`
              : `Учётная запись уже создана.

Чтобы пользоваться приложением,
заполните профиль либо подключитесь
к существующей карточке игрока
по коду администратора команды.`}
          </p>
        </section>

        <div className="flex-1" />

        <section className="space-y-4 pb-6">
          {isCoach ? (
            <Link
              href="/coach/profile-setup"
              className="flex h-[64px] w-full items-center justify-center rounded-[32px] bg-[#24d7b3] text-[18px] font-black text-black"
            >
              Заполнить профиль тренера
            </Link>
          ) : (
            <>
              <Link
                href="/profile-setup"
                className="flex h-[64px] w-full items-center justify-center rounded-[32px] bg-[#24d7b3] text-[18px] font-black text-black"
              >
                Заполнить профиль игрока
              </Link>

              <Link
                href="/team-code"
                className="flex h-[64px] w-full items-center justify-center rounded-[32px] bg-[#24d7b3] text-[18px] font-black text-black"
              >
                Подключиться по коду
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
