"use client";

import { clearPasswordlessLogin } from "../components/AuthTokenGuard";

import { useEffect, useMemo, useState } from "react";
import CoachBottomNav from "./components/CoachBottomNav";

type AnyObject = Record<string, any>;

type CoachProfile = {
  name: string;
  specialization: string;
  login: string;
  email: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getMonthRange(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    date1: formatDate(first),
    date2: formatDate(last),
  };
}

function getCalendarDays(currentDate: Date) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekDay = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
  const start = new Date(year, month, 1 - (firstWeekDay - 1));
  const days: Date[] = [];

  for (let index = 0; index < 42; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    days.push(day);
  }

  return days;
}

function monthTitle(date: Date) {
  const months = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];

  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function currentWeekday() {
  const value = new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(new Date());
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function currentShortDate() {
  const date = new Date();
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}

function readableDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function text(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asList(value: any): AnyObject[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "object") return Object.values(value);
  return [];
}

function teamIdOf(team: AnyObject) {
  return text(
    team.TEAM_ID ||
      team.team_id ||
      team.TEAM ||
      team.team ||
      team.ID ||
      team.id ||
      team.TEAM_INFO?.TEAM_ID
  );
}

function teamNameOf(team: AnyObject, index: number) {
  const info = team.TEAM_INFO || {};
  return (
    text(info.NAME || info.name) ||
    text(team.NAME || team.name || team.TEAM_NAME || team.team_name) ||
    `Команда ${index + 1}`
  );
}

function mergeCoachTeams(data: AnyObject) {
  const memberships = asList(
    data.TRAINER_TEAMS ||
      data.trainer_teams ||
      data.COACH_TEAMS ||
      data.coach_teams ||
      data.data?.TRAINER_TEAMS ||
      data.data?.COACH_TEAMS
  );
  const teams = asList(data.TEAMS || data.teams || data.data?.TEAMS || data.data?.teams);
  const byId: Record<string, AnyObject> = {};

  teams.forEach((team) => {
    const id = teamIdOf(team);
    if (id) byId[id] = team;
  });

  if (memberships.length > 0) {
    return memberships.map((membership) => {
      const id = teamIdOf(membership);
      const info = byId[id] || {};
      return { ...info, ...membership, TEAM_INFO: info };
    });
  }

  return teams;
}

function fullNameFromServer(data: AnyObject) {
  const coach =
    data.TRAINER ||
    data.trainer ||
    data.COACH ||
    data.coach ||
    data.data?.TRAINER ||
    data.data?.COACH ||
    {};

  return [
    coach.FAMILY || coach.family || coach.LAST_NAME || coach.last_name,
    coach.NAME || coach.name || coach.FIRST_NAME || coach.first_name,
    coach.MIDNAME || coach.midname || coach.MIDDLE_NAME || coach.middle_name,
  ]
    .map(text)
    .filter(Boolean)
    .join(" ");
}

function eventDate(event: AnyObject) {
  return text(
    event.hm51_date ||
      event.date ||
      event.GAME_DATE ||
      event.game_date ||
      event.TRAINING_DATE ||
      event.training_date
  ).slice(0, 10);
}

function eventTime(event: AnyObject) {
  return text(
    event.hm51_time ||
      event.time ||
      event.GAME_TIME ||
      event.game_time ||
      event.TRAINING_TIME ||
      event.training_time
  ).slice(0, 5);
}

function eventType(event: AnyObject) {
  const raw = text(event.hm51_type || event.type || event.EVENT_TYPE || event.event_type).toLowerCase();
  if (raw.includes("game") || raw.includes("игр")) return "game";
  return "training";
}

function eventTeamId(event: AnyObject) {
  return text(event.hm51_team_id || event.TEAM_ID || event.team_id || event.TEAM || event.team);
}

function eventTitle(event: AnyObject) {
  if (eventType(event) === "game") {
    return text(event.hm51_title || event.RIVAL_TXT || event.rival || event.title) || "Игра";
  }

  return text(event.hm51_title || event.title || event.NOTE || event.note) || "Тренировка";
}

function eventPlace(event: AnyObject) {
  return text(
    event.hm51_stadium ||
      event.stadium ||
      event.STADIUM?.NAME ||
      event.STADIUM_NAME ||
      event.hm51_address ||
      event.address
  );
}

function eventNote(event: AnyObject) {
  return text(event.hm51_note || event.note || event.NOTE);
}

function eventKey(event: AnyObject, index: number) {
  return text(event.hm51_id || event.ID || event.id) || `${eventDate(event)}-${eventTime(event)}-${index}`;
}

function readStoredRoles() {
  try {
    const value = JSON.parse(localStorage.getItem("hm51_roles") || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

export default function CoachPage() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<CoachProfile>({
    name: "",
    specialization: "Тренер",
    login: "",
    email: "",
  });
  const [teams, setTeams] = useState<AnyObject[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [events, setEvents] = useState<AnyObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openEventKey, setOpenEventKey] = useState("");

  const range = useMemo(() => getMonthRange(currentDate), [currentDate]);
  const calendarDays = useMemo(() => getCalendarDays(currentDate), [currentDate]);

  useEffect(() => {
    const savedToken =
      localStorage.getItem("hm51_token") || localStorage.getItem("auth_token") || "";
    const roles = readStoredRoles();
    const activeRole = localStorage.getItem("hm51_active_role") || "";

    if (!savedToken) {
      window.location.replace("/login");
      return;
    }

    if (!roles.includes("COACH") && activeRole !== "COACH") {
      window.location.replace("/login");
      return;
    }

    localStorage.setItem("hm51_active_role", "COACH");

    setToken(savedToken);
    setProfile({
      name:
        localStorage.getItem("hm51_coach_name") ||
        localStorage.getItem("hm51_login") ||
        "Тренер",
      specialization: localStorage.getItem("hm51_coach_specialization") || "Тренер",
      login: localStorage.getItem("hm51_login") || "",
      email: localStorage.getItem("hm51_register_email") || "",
    });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!token) return;
    loadProfileAndTeams(token);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadEvents(token);
  }, [token, range.date1, range.date2]);

  async function loadProfileAndTeams(currentToken: string) {
    try {
      const response = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({ token: currentToken }),
      });
      const json = await response.json();

      if (!response.ok || json.result === false) return;

      const serverName = fullNameFromServer(json);
      const loadedTeams = mergeCoachTeams(json);

      if (serverName) {
        setProfile((old) => ({ ...old, name: serverName }));
        localStorage.setItem("hm51_coach_name", serverName);
      }

      setTeams(loadedTeams);
      setSelectedTeamId((old) => old || teamIdOf(loadedTeams[0] || {}));
    } catch {
      setTeams([]);
    }
  }

  async function loadEvents(currentToken: string) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({
          token: currentToken,
          date1: range.date1,
          date2: range.date2,
        }),
      });
      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось загрузить календарь");
      }

      setEvents(Array.isArray(json.events) ? json.events : []);
    } catch (loadError) {
      setEvents([]);
      setError(loadError instanceof Error ? loadError.message : "Ошибка загрузки календаря");
    } finally {
      setLoading(false);
    }
  }

  function previousMonth() {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(next);
    setSelectedDate(formatDate(next));
    setOpenEventKey("");
  }

  function nextMonth() {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(next);
    setSelectedDate(formatDate(next));
    setOpenEventKey("");
  }

  async function logout() {
    const token =
      localStorage.getItem("hm51_token") ||
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("hm51_token") ||
      sessionStorage.getItem("auth_token") ||
      "";

    await clearPasswordlessLogin(token);
    localStorage.removeItem("hm51_active_role");
    localStorage.removeItem("hm51_roles");
    window.location.replace("/login");
  }

  const visibleEvents = useMemo(() => {
    if (!selectedTeamId) return events;

    return events.filter((event) => {
      const id = eventTeamId(event);
      return !id || String(id) === String(selectedTeamId);
    });
  }, [events, selectedTeamId]);

  const eventsByDate = useMemo(() => {
    const result: Record<string, AnyObject[]> = {};

    visibleEvents.forEach((event) => {
      const date = eventDate(event);
      if (!date) return;
      if (!result[date]) result[date] = [];
      result[date].push(event);
    });

    return result;
  }, [visibleEvents]);

  const selectedEvents = eventsByDate[selectedDate] || [];
  const gamesCount = visibleEvents.filter((event) => eventType(event) === "game").length;
  const trainingsCount = visibleEvents.filter((event) => eventType(event) === "training").length;
  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const selectedTeamIndex = teams.findIndex(
    (team) => String(teamIdOf(team)) === String(selectedTeamId)
  );
  const selectedTeam = selectedTeamIndex >= 0 ? teams[selectedTeamIndex] : null;
  const selectedTeamName = selectedTeam
    ? teamNameOf(selectedTeam, selectedTeamIndex)
    : "Команда не подключена";

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#121715] text-white/45">
        Проверяем доступ тренера…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white/40">ХМ 5.1 · Тренер</p>
            <h1 className="text-3xl font-black">Календарь</h1>
          </div>

          <button
            type="button"
            onClick={logout}
            className="h-10 min-w-[96px] rounded-[22px] bg-[#2d332f] px-5 text-xs font-black text-white/60"
          >
            Выйти
          </button>
        </header>

        <section className="mt-6 rounded-3xl bg-[#2d332f] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[#20d1a8] text-3xl font-black text-[#121715]">
              {(profile.name || profile.login || "Т").slice(0, 1).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-white/40">{profile.specialization}</p>
              <h2 className="mt-1 break-words text-2xl font-black">
                {profile.name || profile.login || "Тренер"}
              </h2>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-3xl bg-[#2d332f] p-4">
            <p className="text-xs font-bold text-white/35">{currentWeekday()}</p>
            <p className="mt-1 text-2xl font-black">{currentShortDate()}</p>
          </div>

          <div className="rounded-3xl bg-[#2d332f] p-4">
            <p className="text-xs font-bold text-white/35">Игр</p>
            <p className="mt-1 text-2xl font-black text-[#20d1a8]">{gamesCount}</p>
          </div>

          <div className="rounded-3xl bg-[#2d332f] p-4">
            <p className="text-xs font-bold text-white/35">Тренировок</p>
            <p className="mt-1 text-2xl font-black text-[#ff0a8a]">{trainingsCount}</p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-[#2d332f] p-5">
          <p className="text-lg font-black">Ваша команда</p>

          {teams.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-white/15 bg-[#121715] p-5">
              <p className="font-black">Команды пока не подключены</p>
              <p className="mt-2 text-sm leading-6 text-white/45">
                Перейдите во вкладку «Найти», чтобы посмотреть команды.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {teams.map((team, index) => {
                  const id = teamIdOf(team);
                  const active = String(id) === String(selectedTeamId);

                  return (
                    <button
                      key={`${id}-${index}`}
                      type="button"
                      onClick={() => {
                        setSelectedTeamId(id);
                        setOpenEventKey("");
                      }}
                      className={
                        active
                          ? "shrink-0 rounded-2xl bg-[#20d1a8] px-4 py-3 text-sm font-black text-[#121715]"
                          : "shrink-0 rounded-2xl bg-[#121715] px-4 py-3 text-sm font-black text-white/55"
                      }
                    >
                      {teamNameOf(team, index)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 rounded-2xl bg-[#121715] p-4">
                <p className="text-xs font-bold text-[#20d1a8]">Выбранная команда</p>
                <p className="mt-1 text-lg font-black">{selectedTeamName}</p>
              </div>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-3xl bg-[#2d332f] p-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={previousMonth}
              className="rounded-2xl bg-[#121715] px-4 py-3 font-black text-white/70"
            >
              ←
            </button>

            <div className="text-center">
              <p className="text-xl font-black">{monthTitle(currentDate)}</p>
              <p className="mt-1 text-xs text-white/40">
                {gamesCount} игр · {trainingsCount} тренировок
              </p>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="rounded-2xl bg-[#121715] px-4 py-3 font-black text-white/70"
            >
              →
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day) => (
              <div key={day} className="py-2 text-xs font-black text-white/35">
                {day}
              </div>
            ))}

            {calendarDays.map((day) => {
              const date = formatDate(day);
              const dayEvents = eventsByDate[date] || [];
              const selected = date === selectedDate;
              const currentMonth = day.getMonth() === currentDate.getMonth();

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date);
                    setOpenEventKey("");
                  }}
                  className={
                    selected
                      ? "min-h-[58px] rounded-2xl bg-[#20d1a8] px-1 py-2 text-[#121715]"
                      : "min-h-[58px] rounded-2xl bg-[#121715] px-1 py-2 text-white"
                  }
                >
                  <div className={currentMonth ? "text-sm font-black" : "text-sm font-black opacity-25"}>
                    {day.getDate()}
                  </div>

                  <div className="mt-1 flex justify-center gap-1">
                    {dayEvents.slice(0, 3).map((event, index) => (
                      <span
                        key={eventKey(event, index)}
                        className={
                          eventType(event) === "game"
                            ? "h-1.5 w-1.5 rounded-full bg-[#20d1a8] ring-1 ring-[#121715]"
                            : "h-1.5 w-1.5 rounded-full bg-[#ff0a8a]"
                        }
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {loading && (
          <section className="mt-5 rounded-3xl bg-[#2d332f] p-5 text-sm text-white/50">
            Загружаем календарь...
          </section>
        )}

        {error && (
          <section className="mt-5 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            {error}
          </section>
        )}

        {!loading && (
          <section className="mt-5 rounded-3xl bg-[#2d332f] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white/40">Выбранный день</p>
                <h2 className="text-xl font-black">{readableDate(selectedDate)}</h2>
              </div>

              <div className="rounded-2xl bg-[#121715] px-3 py-2 text-sm font-black text-white/60">
                {selectedEvents.length}
              </div>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="mt-4 text-sm text-white/50">В этот день событий нет.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedEvents.map((event, index) => {
                  const key = eventKey(event, index);
                  const opened = openEventKey === key;
                  const game = eventType(event) === "game";

                  return (
                    <div key={key} className="rounded-2xl bg-[#121715] p-4">
                      <button
                        type="button"
                        onClick={() => setOpenEventKey(opened ? "" : key)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className={
                                game
                                  ? "text-xs font-black text-[#20d1a8]"
                                  : "text-xs font-black text-[#ff0a8a]"
                              }
                            >
                              {game ? "Игра" : "Тренировка"}
                            </p>
                            <h3 className="mt-1 text-lg font-black">{eventTitle(event)}</h3>
                            <p className="mt-1 text-sm text-white/40">
                              {eventPlace(event) || "Место не указано"}
                            </p>
                          </div>

                          <div className="shrink-0 rounded-xl bg-[#2d332f] px-3 py-2 text-sm font-black">
                            {eventTime(event) || "—"}
                          </div>
                        </div>
                      </button>

                      {opened && (
                        <div className="mt-4 border-t border-white/10 pt-4">
                          <div className="grid gap-3">
                            <div className="rounded-2xl bg-[#2d332f] p-3">
                              <p className="text-xs font-bold text-[#20d1a8]">Место</p>
                              <p className="mt-1 text-sm font-black">
                                {eventPlace(event) || "Не указано"}
                              </p>
                            </div>

                            {eventNote(event) && (
                              <div className="rounded-2xl bg-[#2d332f] p-3">
                                <p className="text-xs font-bold text-[#20d1a8]">Примечание</p>
                                <p className="mt-1 text-sm font-black">{eventNote(event)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <CoachBottomNav active="calendar" />
      </div>
    </main>
  );
}
