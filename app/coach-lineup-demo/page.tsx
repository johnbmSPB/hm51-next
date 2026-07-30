"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Screen =
  | "calendar"
  | "event"
  | "players"
  | "lineup"
  | "review"
  | "approved";

type EventType = "game" | "training";
type Attendance = "coming" | "notcoming" | "";
type PositionCode = "ЛН" | "Ц" | "ПН" | "ЛЗ" | "ПЗ";

type Player = {
  id: string;
  name: string;
  number: number;
  role: "Нападающий" | "Защитник" | "Вратарь";
  attendance: "coming" | "thinking";
};

type Line = {
  id: number;
  title: string;
  colorCode: number;
  positions: Record<PositionCode, string>;
};

const positions: Array<{ code: PositionCode; label: string }> = [
  { code: "ЛН", label: "Левый нападающий" },
  { code: "Ц", label: "Центральный" },
  { code: "ПН", label: "Правый нападающий" },
  { code: "ЛЗ", label: "Левый защитник" },
  { code: "ПЗ", label: "Правый защитник" },
];

const shirtColors = [
  { code: 0, name: "Жёлтая", hex: "#facc15", text: "#121715" },
  { code: 1, name: "Красная", hex: "#ef4444", text: "#ffffff" },
  { code: 2, name: "Синяя", hex: "#3b82f6", text: "#ffffff" },
  { code: 3, name: "Зелёная", hex: "#22c55e", text: "#08140d" },
  { code: 4, name: "Белая", hex: "#f8fafc", text: "#121715" },
  { code: 5, name: "Чёрная", hex: "#171717", text: "#ffffff" },
];

const players: Player[] = [
  { id: "p1", name: "Иванов Сергей", number: 17, role: "Нападающий", attendance: "coming" },
  { id: "p2", name: "Петров Алексей", number: 21, role: "Нападающий", attendance: "coming" },
  { id: "p3", name: "Сидоров Дмитрий", number: 91, role: "Нападающий", attendance: "coming" },
  { id: "p4", name: "Кузнецов Андрей", number: 27, role: "Защитник", attendance: "coming" },
  { id: "p5", name: "Морозов Илья", number: 44, role: "Защитник", attendance: "coming" },
  { id: "p6", name: "Фёдоров Максим", number: 9, role: "Нападающий", attendance: "coming" },
  { id: "p7", name: "Алексеев Роман", number: 55, role: "Нападающий", attendance: "coming" },
  { id: "p8", name: "Орлов Денис", number: 8, role: "Нападающий", attendance: "coming" },
  { id: "p9", name: "Смирнов Павел", number: 13, role: "Защитник", attendance: "coming" },
  { id: "p10", name: "Васильев Олег", number: 74, role: "Защитник", attendance: "coming" },
  { id: "p11", name: "Ковалёв Антон", number: 68, role: "Нападающий", attendance: "coming" },
  { id: "p12", name: "Гусев Игорь", number: 32, role: "Нападающий", attendance: "coming" },
  { id: "p13", name: "Николаев Артём", number: 19, role: "Нападающий", attendance: "coming" },
  { id: "p14", name: "Попов Михаил", number: 47, role: "Защитник", attendance: "coming" },
  { id: "p15", name: "Борисов Виктор", number: 73, role: "Защитник", attendance: "coming" },
  { id: "g1", name: "Волков Артём", number: 33, role: "Вратарь", attendance: "coming" },
  { id: "g2", name: "Егоров Максим", number: 1, role: "Вратарь", attendance: "thinking" },
];

const initialLines: Line[] = [
  {
    id: 1,
    title: "1 звено",
    colorCode: 0,
    positions: { ЛН: "p1", Ц: "p2", ПН: "p3", ЛЗ: "p4", ПЗ: "p5" },
  },
  {
    id: 2,
    title: "2 звено",
    colorCode: 1,
    positions: { ЛН: "p6", Ц: "p7", ПН: "p8", ЛЗ: "p9", ПЗ: "p10" },
  },
  {
    id: 3,
    title: "3 звено",
    colorCode: 2,
    positions: { ЛН: "p11", Ц: "p12", ПН: "p13", ЛЗ: "p14", ПЗ: "p15" },
  },
  {
    id: 4,
    title: "4 звено",
    colorCode: 4,
    positions: { ЛН: "", Ц: "", ПН: "", ЛЗ: "", ПЗ: "" },
  },
];

function playerById(id: string) {
  return players.find((player) => player.id === id);
}

function shortName(name: string) {
  const [family, first] = name.split(" ");
  return first ? `${family} ${first.slice(0, 1)}.` : family;
}

function ScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#121715]/95 px-4 pb-4 pt-[max(18px,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2d332f] text-xl font-black text-white active:scale-95"
            aria-label="Назад"
          >
            ←
          </button>
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#20d1a8] text-sm font-black text-[#121715]">
            ХМ
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black text-white">{title}</h1>
          <p className="mt-0.5 truncate text-xs font-semibold text-white/40">
            {subtitle}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#20d1a8]/50 bg-[#2d332f] text-sm font-black text-white">
          АИ
        </div>
      </div>
    </header>
  );
}

function StepBar({ current }: { current: number }) {
  return (
    <div className="mx-auto flex max-w-md gap-2 px-4 pt-4">
      {[1, 2, 3, 4].map((step) => (
        <span
          key={step}
          className={`h-1.5 flex-1 rounded-full ${
            step <= current ? "bg-[#20d1a8]" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

function BottomNavigation() {
  return (
    <nav className="fixed bottom-5 left-1/2 z-50 grid w-[calc(100%-24px)] max-w-md -translate-x-1/2 grid-cols-5 gap-1 rounded-3xl bg-[#2d332f] p-2 shadow-2xl">
      <Link
        href="/calendar"
        className="rounded-2xl bg-[#20d1a8] px-1 py-3 text-center text-[10px] font-black text-[#121715]"
      >
        Календарь
      </Link>
      <Link
        href="/home"
        className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50"
      >
        Профиль
      </Link>
      <Link
        href="/find-team"
        className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50"
      >
        Найти
      </Link>
      <Link
        href="/chat"
        className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50"
      >
        Чат
      </Link>
      <Link
        href="/menu"
        className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50"
      >
        Меню
      </Link>
    </nav>
  );
}

export default function CoachLineupDemoPage() {
  const [screen, setScreen] = useState<Screen>("calendar");
  const [eventType, setEventType] = useState<EventType>("game");
  const [attendance, setAttendance] = useState<Attendance>("coming");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    players.map((player) => player.id)
  );
  const [lines, setLines] = useState<Line[]>(initialLines);
  const [activeLineId, setActiveLineId] = useState(1);
  const [pickerPosition, setPickerPosition] = useState<PositionCode | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [goalkeepers, setGoalkeepers] = useState({ main: "g1", reserve: "g2" });

  const activeLine = lines.find((line) => line.id === activeLineId) || lines[0];
  const activeColor =
    shirtColors.find((color) => color.code === activeLine.colorCode) || shirtColors[0];

  const selectedSkaters = useMemo(
    () =>
      players.filter(
        (player) =>
          selectedPlayerIds.includes(player.id) && player.role !== "Вратарь"
      ),
    [selectedPlayerIds]
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function openLineup(type: EventType) {
    setEventType(type);
    setScreen("players");
  }

  function togglePlayer(id: string) {
    setSelectedPlayerIds((current) =>
      current.includes(id)
        ? current.filter((playerId) => playerId !== id)
        : [...current, id]
    );
  }

  function assignPlayer(playerId: string) {
    if (!pickerPosition) return;

    setLines((currentLines) =>
      currentLines.map((line) => {
        const cleanedPositions = Object.fromEntries(
          Object.entries(line.positions).map(([position, assignedId]) => [
            position,
            assignedId === playerId ? "" : assignedId,
          ])
        ) as Record<PositionCode, string>;

        if (line.id !== activeLineId) {
          return { ...line, positions: cleanedPositions };
        }

        return {
          ...line,
          positions: {
            ...cleanedPositions,
            [pickerPosition]: playerId,
          },
        };
      })
    );

    setPickerPosition(null);
    showToast("Игрок назначен на позицию");
  }

  function setLineColor(code: number) {
    setLines((currentLines) =>
      currentLines.map((line) =>
        line.id === activeLineId ? { ...line, colorCode: code } : line
      )
    );
    setColorPickerOpen(false);
    showToast("Цвет маек изменён");
  }

  function saveDraft() {
    localStorage.setItem(
      "hm51_coach_lineup_demo",
      JSON.stringify({ eventType, selectedPlayerIds, lines, goalkeepers })
    );
    showToast("Черновик сохранён на этом устройстве");
  }

  const incompletePositions = lines
    .slice(0, 3)
    .flatMap((line) =>
      positions
        .filter((position) => !line.positions[position.code])
        .map((position) => `${line.title}: ${position.code}`)
    );

  return (
    <main className="min-h-screen bg-[#121715] pb-28 text-white">
      {screen === "calendar" && (
        <>
          <ScreenHeader
            title="Календарь"
            subtitle="Макет профиля тренера · команда «Айсберг»"
          />

          <div className="mx-auto max-w-md px-4 pt-5">
            <section className="rounded-3xl bg-[#2d332f] p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <button className="rounded-2xl bg-[#121715] px-4 py-3 font-black text-white/70">
                  ←
                </button>
                <div className="text-center">
                  <p className="text-xl font-black">Июль 2026</p>
                  <p className="mt-1 text-xs text-white/40">
                    2 игры · 3 тренировки
                  </p>
                </div>
                <button className="rounded-2xl bg-[#121715] px-4 py-3 font-black text-white/70">
                  →
                </button>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-1 text-center">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(
                  (day) => (
                    <div key={day} className="py-2 text-xs font-bold text-white/35">
                      {day}
                    </div>
                  )
                )}

                {Array.from({ length: 35 }, (_, index) => {
                  const day = index + 1;
                  const eventDay = day === 26;
                  const trainingDay = day === 27 || day === 30;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => eventDay && setScreen("event")}
                      className={`min-h-16 rounded-2xl p-1 text-white ${
                        eventDay
                          ? "border-2 border-white/85 bg-[#1b211e] ring-2 ring-[#20d1a8]/25"
                          : "bg-[#121715]"
                      }`}
                    >
                      <div className="text-sm font-black">{day}</div>
                      <div className="mt-2 flex justify-center gap-1">
                        {eventDay && (
                          <>
                            <span className="h-2 w-2 rounded-full bg-[#20d1a8]" />
                            <span className="h-2 w-2 rounded-full bg-[#ff0a8a]" />
                          </>
                        )}
                        {trainingDay && (
                          <span className="h-2 w-2 rounded-full bg-[#ff0a8a]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-5 rounded-3xl border border-[#20d1a8]/25 bg-[#20d1a8]/10 p-4">
              <p className="text-sm font-black text-[#20d1a8]">Как проверить макет</p>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Нажмите на 26 июля. Календарь и подтверждение участия повторяют
                сценарий игрока, а у тренера добавлена кнопка «Определить состав».
              </p>
            </section>
          </div>
        </>
      )}

      {screen === "event" && (
        <>
          <ScreenHeader
            title="26 июля 2026"
            subtitle="События выбранного дня"
            onBack={() => setScreen("calendar")}
          />

          <div className="mx-auto max-w-md space-y-4 px-4 pt-5">
            <section className="rounded-3xl border-2 border-[#20d1a8] bg-[#121715] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#20d1a8]">Игра</p>
                  <h2 className="mt-1 text-lg font-black">Айсберг — Северные Волки</h2>
                  <p className="mt-1 text-sm text-white/40">СК «Юбилейный»</p>
                </div>
                <div className="rounded-xl bg-[#2d332f] px-3 py-2 text-sm font-black">
                  21:30–23:00
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAttendance("coming")}
                  className={`h-12 rounded-2xl text-sm font-black ${
                    attendance === "coming"
                      ? "bg-[#20d1a8] text-[#121715]"
                      : "border border-[#20d1a8]/50 text-[#20d1a8]"
                  }`}
                >
                  Приду
                </button>
                <button
                  type="button"
                  onClick={() => setAttendance("notcoming")}
                  className={`h-12 rounded-2xl text-sm font-black ${
                    attendance === "notcoming"
                      ? "bg-[#ff0a8a] text-white"
                      : "bg-[#2d332f] text-white/60"
                  }`}
                >
                  Не приду
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-[#2d332f] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black">Участники события</p>
                  <span className="rounded-xl bg-[#121715] px-3 py-1.5 text-xs font-black text-[#20d1a8]">
                    Придут: 16
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-white/45">
                  Не придут: 3 · Не ответили: 2 · Вратари: 2
                </p>
              </div>

              <button
                type="button"
                onClick={() => openLineup("game")}
                className="mt-3 h-14 w-full rounded-2xl bg-[#20d1a8] text-sm font-black text-[#121715] shadow-lg shadow-[#20d1a8]/15 active:scale-[0.99]"
              >
                Определить состав на игру
              </button>
            </section>

            <section className="rounded-3xl border-2 border-[#ff0a8a] bg-[#121715] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#ff0a8a]">Тренировка</p>
                  <h2 className="mt-1 text-lg font-black">Командная тренировка</h2>
                  <p className="mt-1 text-sm text-white/40">СК «Ледовый»</p>
                </div>
                <div className="rounded-xl bg-[#2d332f] px-3 py-2 text-sm font-black">
                  19:00–20:30
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="h-12 rounded-2xl bg-[#20d1a8] text-sm font-black text-[#121715]">
                  Приду
                </button>
                <button className="h-12 rounded-2xl bg-[#2d332f] text-sm font-black text-white/60">
                  Не приду
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-[#2d332f] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black">Участники события</p>
                  <span className="rounded-xl bg-[#121715] px-3 py-1.5 text-xs font-black text-[#20d1a8]">
                    Придут: 17
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openLineup("training")}
                className="mt-3 h-14 w-full rounded-2xl bg-[#20d1a8] text-sm font-black text-[#121715] shadow-lg shadow-[#20d1a8]/15 active:scale-[0.99]"
              >
                Определить состав на тренировку
              </button>
            </section>
          </div>
        </>
      )}

      {screen === "players" && (
        <>
          <ScreenHeader
            title="Участники состава"
            subtitle={`${eventType === "game" ? "Игра" : "Тренировка"} · 26 июля`}
            onBack={() => setScreen("event")}
          />
          <StepBar current={1} />

          <div className="mx-auto max-w-md px-4 pt-4">
            <div className="grid grid-cols-3 gap-2 rounded-3xl bg-[#2d332f] p-3 text-center">
              <div className="rounded-2xl bg-[#121715] p-3">
                <b className="text-xl text-[#20d1a8]">16</b>
                <p className="mt-1 text-[10px] font-bold text-white/40">Придут</p>
              </div>
              <div className="rounded-2xl bg-[#121715] p-3">
                <b className="text-xl">{selectedSkaters.length}</b>
                <p className="mt-1 text-[10px] font-bold text-white/40">Полевые</p>
              </div>
              <div className="rounded-2xl bg-[#121715] p-3">
                <b className="text-xl">2</b>
                <p className="mt-1 text-[10px] font-bold text-white/40">Вратари</p>
              </div>
            </div>

            <h2 className="mb-3 mt-5 text-lg font-black">Кого включить в состав</h2>
            <div className="overflow-hidden rounded-3xl bg-[#2d332f]">
              {players.map((player) => {
                const selected = selectedPlayerIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => togglePlayer(player.id)}
                    className="flex w-full items-center gap-3 border-b border-white/5 p-3 text-left last:border-b-0"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#121715] text-xs font-black text-[#20d1a8]">
                      {player.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{player.name}</p>
                      <p className="mt-0.5 text-xs text-white/35">
                        {player.role} · {player.attendance === "coming" ? "Придёт" : "Не ответил"}
                      </p>
                    </div>
                    <span
                      className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
                        selected ? "bg-[#20d1a8]" : "bg-white/15"
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full bg-white transition ${
                          selected ? "translate-x-5" : ""
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-3 text-xs leading-5 text-yellow-100/80">
              Игрок со статусом «Не ответил» может быть включён вручную. Перед
              утверждением приложение покажет предупреждение.
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPlayerIds(players.map((player) => player.id));
                  showToast("Выбраны все доступные участники");
                }}
                className="h-14 rounded-2xl bg-[#2d332f] text-sm font-black text-white"
              >
                Выбрать всех
              </button>
              <button
                type="button"
                onClick={() => setScreen("lineup")}
                className="h-14 rounded-2xl bg-[#20d1a8] text-sm font-black text-[#121715]"
              >
                Перейти к звеньям
              </button>
            </div>
          </div>
        </>
      )}

      {screen === "lineup" && (
        <>
          <ScreenHeader
            title="Состав по звеньям"
            subtitle="Нажмите на позицию для замены игрока"
            onBack={() => setScreen("players")}
          />
          <StepBar current={2} />

          <div className="mx-auto max-w-md pt-4">
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
              {lines.map((line) => (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => setActiveLineId(line.id)}
                  className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black ${
                    line.id === activeLineId
                      ? "bg-[#20d1a8] text-[#121715]"
                      : "bg-[#2d332f] text-white/60"
                  }`}
                >
                  {line.title}
                </button>
              ))}
            </div>

            <section className="mx-4 rounded-3xl bg-[#2d332f] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black">{activeLine.title}</p>
                  <p className="mt-1 text-xs text-white/40">Цвет маек звена</p>
                </div>
                <button
                  type="button"
                  onClick={() => setColorPickerOpen(true)}
                  className="flex items-center gap-2 rounded-2xl bg-[#121715] p-2 pr-3 text-xs font-black"
                >
                  <span
                    className="h-9 w-9 rounded-xl border-2 border-white/70"
                    style={{ backgroundColor: activeColor.hex }}
                  />
                  {activeColor.name}
                </button>
              </div>
            </section>

            <section className="relative mx-4 mt-3 overflow-hidden rounded-[34px] border-4 border-white/80 bg-gradient-to-b from-[#e8f8ff] to-[#cfeaf6] p-4 text-[#121715] shadow-2xl">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 bg-red-400/45" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-400/35" />

              <div className="relative grid grid-cols-2 gap-3">
                {[positions[0], positions[2]].map((position) => {
                  const assigned = playerById(activeLine.positions[position.code]);
                  return (
                    <button
                      key={position.code}
                      type="button"
                      onClick={() => setPickerPosition(position.code)}
                      className="min-h-24 rounded-3xl border-2 border-white bg-blue-300/90 p-3 text-center shadow-lg"
                    >
                      <p className="text-[10px] font-black text-[#24465d]">{position.label}</p>
                      <p className="mt-2 rounded-2xl bg-[#20d1a8] px-2 py-2 text-xs font-black">
                        {assigned ? shortName(assigned.name) : "Выбрать"}
                      </p>
                    </button>
                  );
                })}

                <div className="col-span-2 flex justify-center py-2">
                  {(() => {
                    const position = positions[1];
                    const assigned = playerById(activeLine.positions[position.code]);
                    return (
                      <button
                        type="button"
                        onClick={() => setPickerPosition(position.code)}
                        className="min-h-24 w-[56%] rounded-3xl border-2 border-white bg-blue-300/90 p-3 text-center shadow-lg"
                      >
                        <p className="text-[10px] font-black text-[#24465d]">{position.label}</p>
                        <p className="mt-2 rounded-2xl bg-[#20d1a8] px-2 py-2 text-xs font-black">
                          {assigned ? shortName(assigned.name) : "Выбрать"}
                        </p>
                      </button>
                    );
                  })()}
                </div>

                {[positions[3], positions[4]].map((position) => {
                  const assigned = playerById(activeLine.positions[position.code]);
                  return (
                    <button
                      key={position.code}
                      type="button"
                      onClick={() => setPickerPosition(position.code)}
                      className="min-h-24 rounded-3xl border-2 border-white bg-blue-300/90 p-3 text-center shadow-lg"
                    >
                      <p className="text-[10px] font-black text-[#24465d]">{position.label}</p>
                      <p className="mt-2 rounded-2xl bg-[#20d1a8] px-2 py-2 text-xs font-black">
                        {assigned ? shortName(assigned.name) : "Выбрать"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mx-4 mt-3 rounded-3xl bg-[#2d332f] p-4">
              <p className="text-sm font-black">Вратари</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["main", "reserve"] as const).map((slot) => {
                  const goalkeeper = playerById(goalkeepers[slot]);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() =>
                        setGoalkeepers((current) => ({
                          ...current,
                          [slot]: current[slot] === "g1" ? "g2" : "g1",
                        }))
                      }
                      className="rounded-2xl bg-[#121715] p-3 text-left"
                    >
                      <p className="text-[10px] font-black text-[#20d1a8]">
                        {slot === "main" ? "Основной" : "Запасной"}
                      </p>
                      <p className="mt-1 text-sm font-black">
                        {goalkeeper ? shortName(goalkeeper.name) : "Выбрать"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="mx-4 mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={saveDraft}
                className="h-14 rounded-2xl bg-[#2d332f] text-sm font-black"
              >
                Сохранить черновик
              </button>
              <button
                type="button"
                onClick={() => setScreen("review")}
                className="h-14 rounded-2xl bg-[#20d1a8] text-sm font-black text-[#121715]"
              >
                Проверить состав
              </button>
            </div>
          </div>
        </>
      )}

      {screen === "review" && (
        <>
          <ScreenHeader
            title="Проверка состава"
            subtitle="Звенья, позиции, вратари и цвета маек"
            onBack={() => setScreen("lineup")}
          />
          <StepBar current={3} />

          <div className="mx-auto max-w-md space-y-3 px-4 pt-4">
            {lines.map((line) => {
              const color =
                shirtColors.find((item) => item.code === line.colorCode) ||
                shirtColors[0];
              const filledCount = Object.values(line.positions).filter(Boolean).length;

              return (
                <section key={line.id} className="rounded-3xl bg-[#2d332f] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-black">{line.title}</p>
                      <p className="mt-1 text-xs text-white/40">
                        Заполнено позиций: {filledCount} из 5
                      </p>
                    </div>
                    <span
                      className="flex h-10 min-w-10 items-center justify-center rounded-xl border-2 border-white/60 px-2 text-[10px] font-black"
                      style={{ backgroundColor: color.hex, color: color.text }}
                    >
                      {color.name}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {positions.map((position) => {
                      const assigned = playerById(line.positions[position.code]);
                      return (
                        <div
                          key={position.code}
                          className="rounded-xl bg-[#121715] p-2 text-center"
                        >
                          <p className="text-[9px] font-black text-[#20d1a8]">
                            {position.code}
                          </p>
                          <p className="mt-1 truncate text-[9px] font-bold text-white/70">
                            {assigned ? assigned.name.split(" ")[0] : "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <section className="rounded-3xl bg-[#2d332f] p-4">
              <p className="text-sm font-black">Вратари</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl bg-[#121715] p-3">
                  <p className="font-bold text-[#20d1a8]">Основной</p>
                  <p className="mt-1 font-black">
                    {playerById(goalkeepers.main)?.name || "Не выбран"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#121715] p-3">
                  <p className="font-bold text-[#20d1a8]">Запасной</p>
                  <p className="mt-1 font-black">
                    {playerById(goalkeepers.reserve)?.name || "Не выбран"}
                  </p>
                </div>
              </div>
            </section>

            <section
              className={`rounded-2xl border p-3 text-xs leading-5 ${
                incompletePositions.length === 0
                  ? "border-[#20d1a8]/30 bg-[#20d1a8]/10 text-[#7af1d5]"
                  : "border-yellow-400/30 bg-yellow-400/10 text-yellow-100"
              }`}
            >
              {incompletePositions.length === 0
                ? "Проверка пройдена: первые три звена заполнены, дубли игроков удаляются автоматически, цвета маек выбраны."
                : `Не заполнено: ${incompletePositions.join(", ")}`}
            </section>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScreen("lineup")}
                className="h-14 rounded-2xl bg-[#2d332f] text-sm font-black"
              >
                Откорректировать
              </button>
              <button
                type="button"
                onClick={() => setScreen("approved")}
                className="h-14 rounded-2xl bg-[#20d1a8] text-sm font-black text-[#121715]"
              >
                Утвердить состав
              </button>
            </div>
          </div>
        </>
      )}

      {screen === "approved" && (
        <>
          <ScreenHeader
            title="Состав утверждён"
            subtitle={`${eventType === "game" ? "Игра" : "Тренировка"} · 26 июля`}
          />
          <StepBar current={4} />

          <div className="mx-auto max-w-md px-4 pt-7 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#20d1a8] text-5xl font-black text-[#121715] shadow-2xl shadow-[#20d1a8]/25">
              ✓
            </div>
            <h2 className="mt-5 text-2xl font-black">Игроки получили состав</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-white/50">
              Каждому участнику отправлены звено, позиция и цвет майки. После
              корректировки уведомление получат только затронутые игроки.
            </p>

            <section className="mt-6 rounded-3xl bg-[#2d332f] p-4 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black">
                    {eventType === "game" ? "Айсберг — Северные Волки" : "Командная тренировка"}
                  </p>
                  <p className="mt-1 text-xs text-white/40">26 июля · 21:30</p>
                </div>
                <span className="rounded-xl bg-[#20d1a8] px-3 py-2 text-[10px] font-black text-[#121715]">
                  УТВЕРЖДЁН
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl bg-[#121715] p-3">
                  <p className="text-white/40">Участников</p>
                  <p className="mt-1 text-lg font-black">17</p>
                </div>
                <div className="rounded-2xl bg-[#121715] p-3">
                  <p className="text-white/40">Опубликовано</p>
                  <p className="mt-1 text-lg font-black text-[#20d1a8]">Сейчас</p>
                </div>
              </div>
            </section>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => setScreen("lineup")}
                className="h-14 rounded-2xl bg-[#20d1a8] text-sm font-black text-[#121715]"
              >
                Откорректировать состав
              </button>
              <button
                type="button"
                onClick={() => {
                  setScreen("event");
                  showToast("Возврат к событию");
                }}
                className="h-14 rounded-2xl bg-[#2d332f] text-sm font-black"
              >
                Вернуться в календарь
              </button>
            </div>
          </div>
        </>
      )}

      {pickerPosition && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75">
          <section className="max-h-[78vh] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-[#2d332f] p-4 pb-[max(24px,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Позиция {pickerPosition}</h2>
                <p className="mt-1 text-xs text-white/40">
                  Выберите участника состава
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerPosition(null)}
                className="h-11 w-11 rounded-full bg-[#121715] text-xl font-black"
              >
                ×
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl bg-[#121715]">
              {selectedSkaters.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => assignPlayer(player.id)}
                  className="flex w-full items-center gap-3 border-b border-white/5 p-3 text-left last:border-0"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2d332f] text-xs font-black text-[#20d1a8]">
                    {player.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm">{player.name}</b>
                    <span className="text-xs text-white/35">{player.role}</span>
                  </span>
                  <span className="text-xl text-white/30">›</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {colorPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75">
          <section className="w-full max-w-md rounded-t-[32px] bg-[#2d332f] p-4 pb-[max(24px,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Цвет маек</h2>
                <p className="mt-1 text-xs text-white/40">{activeLine.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setColorPickerOpen(false)}
                className="h-11 w-11 rounded-full bg-[#121715] text-xl font-black"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {shirtColors.map((color) => (
                <button
                  key={color.code}
                  type="button"
                  onClick={() => setLineColor(color.code)}
                  className="flex min-h-20 items-center gap-3 rounded-3xl border-2 border-white/15 p-3 text-left font-black"
                  style={{ backgroundColor: color.hex, color: color.text }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-current/30 text-xs">
                    {color.code}
                  </span>
                  {color.name}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-[120] -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-3 text-xs font-black text-[#121715] shadow-2xl">
          {toast}
        </div>
      )}

      <BottomNavigation />
    </main>
  );
}
