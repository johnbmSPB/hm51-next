"use client";

import Link from "next/link";
import { getScopedItem } from "../lib/accountStorage";
import LogoutButton from "../components/LogoutButton";
import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";

type AnyObject = Record<string, any>;
type EventItem = Record<string, any>;

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

  for (let i = 0; i < 42; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
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
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
  });

  const value = formatter.format(new Date());
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function currentShortDate() {
  const date = new Date();
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}

function valueToText(value: any): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    return (
      value.NAME ||
      value.name ||
      value.TITLE ||
      value.title ||
      value.ADDRESS ||
      value.address ||
      ""
    );
  }

  return String(value);
}

function toArray(value: any): AnyObject[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "object") return Object.values(value);
  return [];
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

function getRawGamerTeams(data: AnyObject) {
  return toArray(
    data.GAMER_TEAMS ||
      data.gamer_teams ||
      data.data?.GAMER_TEAMS ||
      data.data?.gamer_teams ||
      []
  );
}

function getRawTeams(data: AnyObject) {
  return toArray(
    data.TEAMS ||
      data.teams ||
      data.data?.TEAMS ||
      data.data?.teams ||
      []
  );
}



function normalizeTrainingTime(value: unknown) {
  const raw = String(value || "").trim();

  if (!raw || raw === "0" || raw === "00:00" || raw === "00:00:00") {
    return "";
  }

  const match = raw.match(/(\d{1,2})[:.](\d{2})/);

  if (!match) {
    return raw;
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function getAnyTeamValue(team: any, keys: string[]) {
  if (!team) return "";

  for (const key of keys) {
    const direct = team[key];

    if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
      return direct;
    }

    const foundKey = Object.keys(team).find(
      (item) => item.toLowerCase() === key.toLowerCase()
    );

    if (foundKey) {
      const value = team[foundKey];

      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
  }

  return "";
}

function isTrainingDayEnabled(value: unknown) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return false;

  return !["0", "false", "нет", "no", "null", "undefined"].includes(raw);
}

function getTeamTrainingSchedule(team: any) {
  const days = [
    {
      title: "Пн.",
      dayKeys: ["MON", "MONDAY", "PN", "D1", "DAY1", "DAY_1", "TRAIN_DAY_1", "TRAINING_DAY_1", "day1"],
      timeKeys: ["MON_TIME", "MONDAY_TIME", "PN_TIME", "TIME1", "TIME_1", "TRAIN_TIME_1", "TRAINING_TIME_1", "training_time_1"],
    },
    {
      title: "Вт.",
      dayKeys: ["TUE", "TUESDAY", "VT", "D2", "DAY2", "DAY_2", "TRAIN_DAY_2", "TRAINING_DAY_2", "day2"],
      timeKeys: ["TUE_TIME", "TUESDAY_TIME", "VT_TIME", "TIME2", "TIME_2", "TRAIN_TIME_2", "TRAINING_TIME_2", "training_time_2"],
    },
    {
      title: "Ср.",
      dayKeys: ["WED", "WEDNESDAY", "SR", "D3", "DAY3", "DAY_3", "TRAIN_DAY_3", "TRAINING_DAY_3", "day3"],
      timeKeys: ["WED_TIME", "WEDNESDAY_TIME", "SR_TIME", "TIME3", "TIME_3", "TRAIN_TIME_3", "TRAINING_TIME_3", "training_time_3"],
    },
    {
      title: "Чт.",
      dayKeys: ["THU", "THURSDAY", "CHT", "D4", "DAY4", "DAY_4", "TRAIN_DAY_4", "TRAINING_DAY_4", "day4"],
      timeKeys: ["THU_TIME", "THURSDAY_TIME", "CHT_TIME", "TIME4", "TIME_4", "TRAIN_TIME_4", "TRAINING_TIME_4", "training_time_4"],
    },
    {
      title: "Пт.",
      dayKeys: ["FRI", "FRIDAY", "PT", "D5", "DAY5", "DAY_5", "TRAIN_DAY_5", "TRAINING_DAY_5", "day5"],
      timeKeys: ["FRI_TIME", "FRIDAY_TIME", "PT_TIME", "TIME5", "TIME_5", "TRAIN_TIME_5", "TRAINING_TIME_5", "training_time_5"],
    },
    {
      title: "Сб.",
      dayKeys: ["SAT", "SATURDAY", "SB", "D6", "DAY6", "DAY_6", "TRAIN_DAY_6", "TRAINING_DAY_6", "day6"],
      timeKeys: ["SAT_TIME", "SATURDAY_TIME", "SB_TIME", "TIME6", "TIME_6", "TRAIN_TIME_6", "TRAINING_TIME_6", "training_time_6"],
    },
    {
      title: "Вс.",
      dayKeys: ["SUN", "SUNDAY", "VS", "D7", "DAY7", "DAY_7", "TRAIN_DAY_7", "TRAINING_DAY_7", "day7"],
      timeKeys: ["SUN_TIME", "SUNDAY_TIME", "VS_TIME", "TIME7", "TIME_7", "TRAIN_TIME_7", "TRAINING_TIME_7", "training_time_7"],
    },
  ];

  return days
    .map((day) => {
      const dayValue = getAnyTeamValue(team, day.dayKeys);
      const timeValue = normalizeTrainingTime(getAnyTeamValue(team, day.timeKeys));

      if (!timeValue) return "";

      if (dayValue && !isTrainingDayEnabled(dayValue)) return "";

      return `${day.title} в ${timeValue}`;
    })
    .filter(Boolean);
}


function getTeamId(team: AnyObject) {
  return (
    valueToText(team.TEAM_ID) ||
    valueToText(team.team_id) ||
    valueToText(team.TEAM) ||
    valueToText(team.team) ||
    valueToText(team.ID) ||
    valueToText(team.id) ||
    valueToText(team.TEAM_INFO?.TEAM_ID) ||
    valueToText(team.TEAM_INFO?.team_id) ||
    ""
  );
}

function getGamerTeamId(team: AnyObject) {
  return (
    valueToText(team.GAMER_TEAM_ID) ||
    valueToText(team.gamer_team_id) ||
    valueToText(team.GAMERTEAM_ID) ||
    valueToText(team.gamerteam_id) ||
    ""
  );
}

function isActiveTeamMembership(team: AnyObject) {
  const raw =
    team.ACTIVE_STATUS ??
    team.active_status ??
    team.ACTIVE ??
    team.active ??
    team.IS_ACTIVE ??
    team.is_active;

  if (raw === null || raw === undefined || raw === "") {
    return true;
  }

  const value = String(raw).trim().toLowerCase();

  return ![
    "0",
    "false",
    "no",
    "нет",
    "inactive",
    "deleted",
    "excluded",
  ].includes(value);
}

function mergeTeams(data: AnyObject) {
  const gamerTeams = getRawGamerTeams(data);
  const teams = getRawTeams(data);

  const teamsById: Record<string, AnyObject> = {};

  teams.forEach((team) => {
    const teamId = getTeamId(team);
    if (teamId) teamsById[teamId] = team;
  });

  if (gamerTeams.length > 0) {
    return gamerTeams
      .filter(isActiveTeamMembership)
      .map((gamerTeam) => {
        const teamId = getTeamId(gamerTeam);
        const teamInfo = teamsById[teamId] || {};

        return {
          ...teamInfo,
          ...gamerTeam,
          TEAM_INFO: teamInfo,
        };
      });
  }

  return teams.filter(isActiveTeamMembership);
}

function getTeamName(team: AnyObject, index: number) {
  const teamInfo = team.TEAM_INFO || {};

  return (
    valueToText(teamInfo.NAME) ||
    valueToText(teamInfo.name) ||
    valueToText(teamInfo.TEAM_NAME) ||
    valueToText(teamInfo.team_name) ||
    valueToText(team.NAME) ||
    valueToText(team.name) ||
    valueToText(team.TEAM_NAME) ||
    valueToText(team.team_name) ||
    valueToText(team.NAME_TEAM) ||
    valueToText(team.name_team) ||
    `Команда ${index + 1}`
  );
}

function getTeamSite(team: AnyObject | null) {
  if (!team) return "";

  const teamInfo = team.TEAM_INFO || {};

  return (
    valueToText(team.SITE) ||
    valueToText(team.site) ||
    valueToText(team.WEB) ||
    valueToText(team.web) ||
    valueToText(team.WEBSITE) ||
    valueToText(team.website) ||
    valueToText(teamInfo.SITE) ||
    valueToText(teamInfo.site) ||
    valueToText(teamInfo.WEB) ||
    valueToText(teamInfo.web) ||
    valueToText(teamInfo.WEBSITE) ||
    valueToText(teamInfo.website)
  );
}

function getTeamEmail(team: AnyObject | null) {
  if (!team) return "";

  const teamInfo = team.TEAM_INFO || {};

  return (
    valueToText(team.EMAIL) ||
    valueToText(team.email) ||
    valueToText(team.MAIL) ||
    valueToText(team.mail) ||
    valueToText(teamInfo.EMAIL) ||
    valueToText(teamInfo.email) ||
    valueToText(teamInfo.MAIL) ||
    valueToText(teamInfo.mail)
  );
}

function TeamInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  if (!value) return null;

  return (
    <div className="rounded-2xl bg-[#121715] p-4">
      <p className="text-xs font-bold text-[#20d1a8]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function findTeamStatusClass(status: string) {
  if (status === "Идёт набор в команду") {
    return "bg-[#20d1a8]/15 text-[#20d1a8]";
  }

  if (status === "Заявка в команду подана") {
    return "bg-yellow-500/15 text-yellow-300";
  }

  return "bg-white/10 text-white/45";
}

function includesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

function getFullName(gamer: AnyObject) {
  const family =
    valueToText(gamer.FAMILY) ||
    valueToText(gamer.family) ||
    valueToText(gamer.SURNAME) ||
    valueToText(gamer.surname);

  const name =
    valueToText(gamer.NAME) ||
    valueToText(gamer.name) ||
    valueToText(gamer.FIRST_NAME) ||
    valueToText(gamer.first_name);

  const midname =
    valueToText(gamer.MIDNAME) ||
    valueToText(gamer.midname) ||
    valueToText(gamer.MIDDLE_NAME) ||
    valueToText(gamer.middle_name);

  return `${family} ${name} ${midname}`.trim() || "Игрок";
}

function getEventKey(event: EventItem) {
  return `${event.hm51_type}-${event.hm51_id}`;
}

function getAttendanceText(value: string) {
  if (value === "coming") return "Приду";
  if (value === "notcoming") return "Не приду";
  return "Ответ не выбран";
}

function playerStatusText(value: string) {
  if (value === "coming") return "Придёт";
  if (value === "notcoming") return "Не придёт";
  return "Не определился";
}

function playerStatusClass(value: string) {
  if (value === "coming") {
    return "bg-[#20d1a8] text-[#121715]";
  }

  if (value === "notcoming") {
    return "bg-[#ff0a8a] text-white";
  }

  return "bg-white/10 text-white/60";
}

function approvalValue(value: any) {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }

  if (value === false || value === 0 || value === "0" || value === "false") {
    return false;
  }

  return null;
}


function formatGameSquad(value: any) {
  const raw = String(value || "").trim();

  if (!raw || raw === "0" || raw.toLowerCase() === "null") {
    return "";
  }

  if (/^\d+$/.test(raw)) {
    return `${raw} звено`;
  }

  return raw;
}

function formatGamePosition(value: any) {
  const raw = String(value || "").trim();

  if (!raw || raw === "0" || raw.toLowerCase() === "null") {
    return "";
  }

  const normalized = raw.toLowerCase().replace(/\s+/g, "");

  const map: Record<string, string> = {
    "лн": "Левый нападающий",
    "левыйнападающий": "Левый нападающий",

    "цн": "Центральный нападающий",
    "центр": "Центральный нападающий",
    "центральныйнападающий": "Центральный нападающий",

    "пн": "Правый нападающий",
    "правыйнападающий": "Правый нападающий",

    "лз": "Левый защитник",
    "левыйзащитник": "Левый защитник",

    "пз": "Правый защитник",
    "правыйзащитник": "Правый защитник",

    "вр": "Вратарь",
    "вратарь": "Вратарь",

    "нп": "Нападающий",
    "нападающий": "Нападающий",

    "зщ": "Защитник",
    "защитник": "Защитник",
  };

  return map[normalized] || raw;
}

function getApprovedGameDetails(event: EventItem) {
  const confirmed = approvalValue(event.hm51_confirmed);

  if (event.hm51_type !== "game" || confirmed !== true) {
    return null;
  }

  const squad = formatGameSquad(event.hm51_squad);
  const position = formatGamePosition(event.hm51_pos);

  if (!squad && !position) {
    return null;
  }

  return {
    squad,
    position,
  };
}

function approvalText(event: EventItem) {
  const confirmed = approvalValue(event.hm51_confirmed);
  const target = event.hm51_type === "training" ? "тренировку" : "игру";

  if (confirmed === true) {
    return `Вас утвердили на ${target}`;
  }

  if (confirmed === false) {
    return `Вас не утвердили на ${target}`;
  }

  return `Ожидает утверждения на ${target}`;
}

function approvalClass(event: EventItem) {
  const confirmed = approvalValue(event.hm51_confirmed);

  if (confirmed === true) {
    return "border-[#20d1a8]/40 bg-[#20d1a8]/15 text-[#20d1a8]";
  }

  if (confirmed === false) {
    return "border-[#ff0a8a]/40 bg-[#ff0a8a]/15 text-[#ff7abf]";
  }

  return "border-yellow-400/30 bg-yellow-400/10 text-yellow-200";
}

function approvalCalendarRingClass(event: EventItem) {
  const confirmed = approvalValue(event.hm51_confirmed);

  if (confirmed === true) {
    return "ring-2 ring-[#20d1a8] ring-offset-1 ring-offset-[#121715]";
  }

  if (confirmed === false) {
    return "ring-2 ring-[#ff0a8a] ring-offset-1 ring-offset-[#121715]";
  }

  return "";
}


function formatTrainingScheduleTime(value: any) {
  const raw = String(value || "").trim();

  if (!raw || raw === "0" || raw === "00:00" || raw === "00:00:00") {
    return "";
  }

  const match = raw.match(/(\d{1,2})[:.](\d{2})/);

  if (!match) {
    return raw;
  }

  return `${match[1].padStart(2, "0")}.${match[2]}`;
}

function formatTrainingScheduleDay(value: any) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  const map: Record<string, string> = {
    "1": "Пн.",
    "2": "Вт.",
    "3": "Ср.",
    "4": "Чт.",
    "5": "Пт.",
    "6": "Сб.",
    "7": "Вс.",
    "mon": "Пн.",
    "monday": "Пн.",
    "пн": "Пн.",
    "пн.": "Пн.",
    "tue": "Вт.",
    "tuesday": "Вт.",
    "вт": "Вт.",
    "вт.": "Вт.",
    "wed": "Ср.",
    "wednesday": "Ср.",
    "ср": "Ср.",
    "ср.": "Ср.",
    "thu": "Чт.",
    "thursday": "Чт.",
    "чт": "Чт.",
    "чт.": "Чт.",
    "fri": "Пт.",
    "friday": "Пт.",
    "пт": "Пт.",
    "пт.": "Пт.",
    "sat": "Сб.",
    "saturday": "Сб.",
    "сб": "Сб.",
    "сб.": "Сб.",
    "sun": "Вс.",
    "sunday": "Вс.",
    "вс": "Вс.",
    "вс.": "Вс.",
  };

  const key = raw.toLowerCase();

  return map[key] || (raw.endsWith(".") ? raw : `${raw}.`);
}

function formatTrainingScheduleLine(item: any) {
  const day = formatTrainingScheduleDay(
    item?.day ??
      item?.DAY ??
      item?.week_day ??
      item?.WEEK_DAY ??
      item?.weekday ??
      item?.WEEKDAY
  );

  const time = formatTrainingScheduleTime(
    item?.time ??
      item?.TIME ??
      item?.start_time ??
      item?.START_TIME ??
      item?.training_time ??
      item?.TRAINING_TIME
  );

  if (!day && !time) return "";
  if (day && time) return `${day} в ${time}`;
  return day || time;
}



const PLAYER_PHOTO_MODE_KEY = "hm51_player_photo_mode";
const CUSTOM_PLAYER_PHOTO_KEY = "hm51_custom_player_photo";




function formatShortName(value: any) {
  const raw = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return "";

  const parts = raw.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0];
  }

  const lastName = parts[0];
  const initials = parts
    .slice(1, 3)
    .map((part) => `${part.slice(0, 1).toUpperCase()}.`)
    .join("");

  return `${lastName} ${initials}`;
}

function getCustomPlayerPhotoFromStorage() {
  if (typeof window === "undefined") return "";

  const mode = getScopedItem(PLAYER_PHOTO_MODE_KEY);
  const photo = getScopedItem(CUSTOM_PLAYER_PHOTO_KEY) || "";

  if (mode === "gallery" && photo) {
    return photo;
  }

  return "";
}


function sameTeam(event: EventItem, selectedTeamId: string) {
  if (!selectedTeamId) return true;
  return String(event.hm51_team_id || "") === String(selectedTeamId);
}

function TeamLogo({
  token,
  teamId,
  title,
}: {
  token: string;
  teamId: string;
  title: string;
}) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadLogo() {
      try {
        if (!token || !teamId) {
          setFailed(true);
          return;
        }

        const response = await fetch("/api/team-logo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
          },
          body: JSON.stringify({
            token,
            teamId,
          }),
        });

        if (!response.ok) {
          setFailed(true);
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (active) setSrc(url);
      } catch {
        if (active) setFailed(true);
      }
    }

    loadLogo();

    return () => {
      active = false;
    };
  }, [token, teamId]);

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#2d332f]">
      {src && !failed ? (
        <img
          src={src}
          alt="Логотип команды"
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xl font-black text-[#20d1a8]">
          {title.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}


function ConfirmLogoutButton({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  function logout() {
    localStorage.removeItem("hm51_token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("hm51_gamer_team_id");

    sessionStorage.removeItem("hm51_token");
    sessionStorage.removeItem("auth_token");

    window.location.href = "/login";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        Выход
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-sm rounded-[32px] bg-[#2d332f] p-5 text-white shadow-2xl">
            <p className="text-xl font-black">Выйти из профиля?</p>

            <p className="mt-3 text-sm font-semibold leading-6 text-white/55">
              Вы выйдете из текущего аккаунта. Фото, биометрия и настройки этого аккаунта сохранятся на телефоне.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-13 rounded-[28px] bg-[#121715] text-sm font-black text-white"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={logout}
                className="h-13 rounded-[28px] bg-red-500 text-sm font-black text-white"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function CalendarPage() {
  const [token, setToken] = useState("");
  const [gamer, setGamer] = useState<AnyObject>({});
  const [teams, setTeams] = useState<AnyObject[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const teamTouchStartX = useRef<number | null>(null);
  const teamDidSwipe = useRef(false);
  const [isTeamInfoOpen, setIsTeamInfoOpen] = useState(false);
  const [teamDetailsById, setTeamDetailsById] = useState<Record<string, any>>({});
  const [teamDetailsLoadingId, setTeamDetailsLoadingId] = useState("");
  const [isFindTeamOpen, setIsFindTeamOpen] = useState(false);
  const [findTeams, setFindTeams] = useState<any[]>([]);
  const [findTeamsSearch, setFindTeamsSearch] = useState("");
  const [findTeamsLoading, setFindTeamsLoading] = useState(false);
  const [openFindTeamId, setOpenFindTeamId] = useState("");
  const [findTeamActionId, setFindTeamActionId] = useState("");
  const [photoSrc, setPhotoSrc] = useState("");
  const [customPhotoSrc, setCustomPhotoSrc] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  useEffect(() => {
    function updateCustomPhoto() {
      setCustomPhotoSrc(getCustomPlayerPhotoFromStorage());
    }

    updateCustomPhoto();

    window.addEventListener("hm51_player_photo_changed", updateCustomPhoto);
    window.addEventListener("storage", updateCustomPhoto);

    return () => {
      window.removeEventListener("hm51_player_photo_changed", updateCustomPhoto);
      window.removeEventListener("storage", updateCustomPhoto);
    };
  }, []);


  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [events, setEvents] = useState<EventItem[]>([]);
  const [openEventKey, setOpenEventKey] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [eventPlayersByKey, setEventPlayersByKey] = useState<Record<string, any[]>>({});
  const [eventPlayersLoadingKey, setEventPlayersLoadingKey] = useState("");
  const [message, setMessage] = useState("");
  const [leaveTeamConfirmOpen, setLeaveTeamConfirmOpen] = useState(false);
  const [leaveTeamLoading, setLeaveTeamLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState("");

  const range = useMemo(() => getMonthRange(currentDate), [currentDate]);
  const calendarDays = useMemo(() => getCalendarDays(currentDate), [currentDate]);

  useEffect(() => {
    const savedToken = localStorage.getItem("hm51_token") || "";

    if (!savedToken) {
      window.location.href = "/login";
      return;
    }

    setToken(savedToken);
    loadProfile(savedToken);
    loadEvents(savedToken);
  }, [range.date1, range.date2]);

  async function loadProfile(currentToken: string) {
    try {
      setProfileLoading(true);

      const response = await fetch("/api/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({ token: currentToken }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) return;

      const gamerData = getGamer(json);
      const mergedTeams = mergeTeams(json);

      const gamerId =
        gamerData?.GAMER_ID ||
        gamerData?.gamer_id ||
        gamerData?.ID ||
        gamerData?.id ||
        "";

      if (!gamerId) {
        localStorage.removeItem("hm51_token");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("hm51_gamer_team_id");
        window.location.replace("/login");
        return;
      }

      setGamer(gamerData);
      setTeams(mergedTeams);

      const firstTeam = mergedTeams[0] || {};
      const firstTeamId = getTeamId(firstTeam);
      const firstGamerTeamId = getGamerTeamId(firstTeam);

      setSelectedTeamId((old) => {
        if (old) return old;
        return firstTeamId || "";
      });

      if (firstGamerTeamId) {
        await loadPhoto(currentToken, firstGamerTeamId);
      }
    } finally {
      setProfileLoading(false);
    }
  }

  async function loadPhoto(currentToken: string, gamerTeamId: string) {
    try {
      setPhotoStatus("Загружаем фото...");

      const response = await fetch("/api/gamer-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token: currentToken,
          gamerTeamId,
        }),
      });

      if (!response.ok) {
        setPhotoSrc("");
        setPhotoStatus("");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setPhotoSrc(url);
      setPhotoStatus("");
    } catch {
      setPhotoSrc("");
      setPhotoStatus("");
    }
  }

  async function loadEvents(currentToken: string) {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
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

      setEvents(json.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка календаря");
    } finally {
      setLoading(false);
    }
  }

  async function loadEventPlayers(event: EventItem, force = false) {
    const key = getEventKey(event);

    if (!force && eventPlayersByKey[key]) return;

    try {
      setEventPlayersLoadingKey(key);

      const response = await fetch("/api/event-players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          eventId: event.hm51_id,
          teamId: event.hm51_team_id,
          type: event.hm51_type,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось загрузить игроков");
      }

      const loadedPlayers = json.players || [];
      const currentStatus =
        event.hm51_attendance === "coming" || event.hm51_attendance === "notcoming"
          ? event.hm51_attendance
          : "";

      let nextPlayers = loadedPlayers;

      if (currentStatus) {
        const hasCurrentPlayer = loadedPlayers.some((player: any) =>
          isCurrentPlayerRow(player, event)
        );

        if (!hasCurrentPlayer) {
          nextPlayers = [
            {
              id: "current-player",
              gamerId:
                gamer.ID ||
                gamer.id ||
                gamer.GAMER_ID ||
                gamer.gamer_id ||
                "current-player",
              name: getFullName(gamer),
              login: true,
              status: currentStatus,
              confirmed: null,
              raw: {
                source: "local-current-player-from-event",
              },
            },
            ...loadedPlayers,
          ];
        }
      }

      setEventPlayersByKey((old) => ({
        ...old,
        [key]: nextPlayers,
      }));
    } catch (err) {
      setEventPlayersByKey((old) => ({
        ...old,
        [key]: [],
      }));

      setMessage(err instanceof Error ? err.message : "Ошибка загрузки игроков");
    } finally {
      setEventPlayersLoadingKey("");
    }
  }

  function isCurrentPlayerRow(player: any, event: EventItem) {
    const myIds = [
      gamer.ID,
      gamer.id,
      gamer.GAMER_ID,
      gamer.gamer_id,
      gamer.PLAYER_ID,
      gamer.player_id,
      event.hm51_gamer_id,
      event.hm51_player_id,
      event.hm51_member_id,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    const playerIds = [
      player.id,
      player.gamer_id,
      player.gamerId,
      player.player_id,
      player.playerId,
      player.member_id,
      player.memberId,
      player.gamer_team_id,
      player.gamerTeamId,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (myIds.some((id) => playerIds.includes(id))) {
      return true;
    }

    const myName = getFullName(gamer).replace(/\s+/g, " ").trim().toLowerCase();
    const playerName = String(player.name || player.fullName || player.title || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    return Boolean(myName && playerName && myName === playerName);
  }

  function upsertCurrentPlayerStatus(event: EventItem, status: "coming" | "notcoming") {
    const key = getEventKey(event);
    const currentName = getFullName(gamer);

    setEventPlayersByKey((old) => {
      const currentPlayers = old[key] || [];
      let foundCurrentPlayer = false;

      const updatedPlayers = currentPlayers.map((player) => {
        if (isCurrentPlayerRow(player, event)) {
          foundCurrentPlayer = true;

          return {
            ...player,
            status,
          };
        }

        return player;
      });

      if (!foundCurrentPlayer) {
        updatedPlayers.unshift({
          id: "current-player",
          gamerId:
            gamer.ID ||
            gamer.id ||
            gamer.GAMER_ID ||
            gamer.gamer_id ||
            "current-player",
          name: currentName,
          login: true,
          status,
          confirmed: null,
          raw: {
            source: "local-current-player",
          },
        });
      }

      return {
        ...old,
        [key]: updatedPlayers,
      };
    });
  }

  async function leaveSelectedTeam() {
    const teamIdToLeave = selectedTeamId;

    if (!token || !teamIdToLeave) {
      setMessage("Команда не выбрана");
      return;
    }

    try {
      setLeaveTeamLoading(true);
      setMessage("");

      const response = await fetch("/api/team-leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          teamId: teamIdToLeave,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.text || "Не удалось выйти из команды");
      }

      setLeaveTeamConfirmOpen(false);
      setIsTeamInfoOpen(false);

      setEvents((oldEvents) =>
        oldEvents.filter(
          (event) => String(event.hm51_team_id || "") !== String(teamIdToLeave)
        )
      );

      setTeams((oldTeams) => {
        const nextTeams = oldTeams.filter(
          (team) => String(getTeamId(team)) !== String(teamIdToLeave)
        );

        const nextTeamId = nextTeams[0] ? getTeamId(nextTeams[0]) : "";

        setSelectedTeamId(nextTeamId || "");

        return nextTeams;
      });

      setMessage(json.text || "Заявка на выход из команды отправлена");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ошибка выхода из команды"
      );
    } finally {
      setLeaveTeamLoading(false);
    }
  }

  async function sendAttendance(event: EventItem, status: "coming" | "notcoming") {
    const key = getEventKey(event);

    try {
      setSavingKey(key);
      setMessage("");

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          eventId: event.hm51_id,
          memberId: event.hm51_member_id || "",
          type: event.hm51_type,
          agree: status === "coming" ? "true" : "false",
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Сервер не принял отметку");
      }

      setEvents((oldEvents) =>
        oldEvents.map((item) =>
          getEventKey(item) === key
            ? {
                ...item,
                hm51_attendance: status,
              }
            : item
        )
      );

      upsertCurrentPlayerStatus(event, status);

      await loadEventPlayers(
        {
          ...event,
          hm51_attendance: status,
        },
        true
      );

      upsertCurrentPlayerStatus(event, status);

      setMessage(status === "coming" ? "Сохранено: Приду" : "Сохранено: Не приду");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSavingKey("");
    }
  }

  async function loadFindTeams() {
    try {
      setFindTeamsLoading(true);
      setMessage("");

      const response = await fetch("/api/find-teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось загрузить команды");
      }

      setFindTeams(Array.isArray(json.teams) ? json.teams : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки команд");
    } finally {
      setFindTeamsLoading(false);
    }
  }

  function toggleFindTeamBlock() {
    const nextValue = !isFindTeamOpen;

    setIsFindTeamOpen(nextValue);

    if (nextValue && findTeams.length === 0) {
      loadFindTeams();
    }
  }

  async function loadTeamDetails(teamId: string) {
    if (!teamId || teamDetailsById[teamId]) return;

    try {
      setTeamDetailsLoadingId(teamId);

      const response = await fetch("/api/team-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          teamId,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось загрузить информацию команды");
      }

      setTeamDetailsById((oldDetails) => ({
        ...oldDetails,
        [teamId]: json,
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки команды");
    } finally {
      setTeamDetailsLoadingId("");
    }
  }

  function toggleTeamInfo() {
    const nextValue = !isTeamInfoOpen;

    setIsTeamInfoOpen(nextValue);

    if (nextValue && selectedTeamId) {
      loadTeamDetails(selectedTeamId);
    }
  }

  async function askJoinTeam(team: any) {
    try {
      setFindTeamActionId(team.id);
      setMessage("");

      const response = await fetch("/api/join-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          teamId: team.id,
          gameLevel: team.gameLevelForRequest || team.level || "",
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось подать заявку");
      }

      setFindTeams((oldTeams) =>
        oldTeams.map((item) =>
          item.id === team.id
            ? {
                ...item,
                isPending: true,
                canJoin: false,
                status: "Заявка в команду подана",
              }
            : item
        )
      );

      setMessage(json.message || "Заявка в команду подана");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка подачи заявки");
    } finally {
      setFindTeamActionId("");
    }
  }

  async function cancelJoinTeam(team: any) {
    try {
      setFindTeamActionId(team.id);
      setMessage("");

      const response = await fetch("/api/cancel-join-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          teamId: team.id,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось отменить заявку");
      }

      setFindTeams((oldTeams) =>
        oldTeams.map((item) =>
          item.id === team.id
            ? {
                ...item,
                isPending: false,
                canJoin: true,
                status: "Идёт набор в команду",
              }
            : item
        )
      );

      setMessage(json.message || "Заявка отменена");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка отмены заявки");
    } finally {
      setFindTeamActionId("");
    }
  }

  function switchTeam(direction: "prev" | "next") {
    if (teams.length === 0) return;

    const currentIndex = teams.findIndex(
      (team) => String(getTeamId(team)) === String(selectedTeamId)
    );

    let nextIndex = currentIndex;

    if (direction === "prev") {
      nextIndex = currentIndex <= 0 ? teams.length - 1 : currentIndex - 1;
    } else {
      nextIndex = currentIndex >= teams.length - 1 ? 0 : currentIndex + 1;
    }

    const nextTeam = teams[nextIndex];
    const nextTeamId = getTeamId(nextTeam);
    const nextGamerTeamId = getGamerTeamId(nextTeam);

    setSelectedTeamId(nextTeamId);
    setOpenEventKey("");
    setIsTeamInfoOpen(false);

    if (nextGamerTeamId) {
      loadPhoto(token, nextGamerTeamId);
    }
  }

  function handleTeamTouchStart(event: TouchEvent<HTMLButtonElement>) {
    teamTouchStartX.current = event.touches[0]?.clientX ?? null;
    teamDidSwipe.current = false;
  }

  function handleTeamTouchEnd(event: TouchEvent<HTMLButtonElement>) {
    if (teamTouchStartX.current === null) return;

    const endX = event.changedTouches[0]?.clientX ?? teamTouchStartX.current;
    const diff = endX - teamTouchStartX.current;

    teamTouchStartX.current = null;

    if (Math.abs(diff) < 45) return;

    teamDidSwipe.current = true;

    if (diff > 0) {
      switchTeam("prev");
    } else {
      switchTeam("next");
    }
  }

  function handleTeamCardClick() {
    if (teamDidSwipe.current) {
      teamDidSwipe.current = false;
      return;
    }

    toggleTeamInfo();
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

  const teamEvents = useMemo(() => {
    return events.filter((event) => sameTeam(event, selectedTeamId));
  }, [events, selectedTeamId]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {};

    teamEvents.forEach((event) => {
      const date = event.hm51_date;
      if (!date) return;

      if (!map[date]) map[date] = [];
      map[date].push(event);
    });

    return map;
  }, [teamEvents]);

  const selectedEvents = eventsByDate[selectedDate] || [];

  const gamesCount = teamEvents.filter((event) => event.hm51_type === "game").length;
  const trainingsCount = teamEvents.filter((event) => event.hm51_type === "training").length;

  const selectedTeamIndex = teams.findIndex(
    (team) => String(getTeamId(team)) === String(selectedTeamId)
  );

  const selectedTeam = selectedTeamIndex >= 0 ? teams[selectedTeamIndex] : null;
  const selectedTeamName = selectedTeam ? getTeamName(selectedTeam, selectedTeamIndex) : "Команда";

  const selectedTeamTrainingSchedule = getTeamTrainingSchedule(selectedTeam);

  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white/40">ХМ 5.1</p>
            <h1 className="text-3xl font-black">Календарь</h1>
          </div>

          <ConfirmLogoutButton className="mt-4 h-10 min-w-[96px] rounded-[22px] bg-[#2d332f] px-5 text-xs font-black text-white/60" />
        </header>

        <section className="mt-6 rounded-3xl bg-[#2d332f] p-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (customPhotoSrc || photoSrc) {
                  setIsPhotoViewerOpen(true);
                }
              }}
              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-[#20d1a8] text-3xl font-black text-[#121715]"
              aria-label="Открыть фото на весь экран"
            >
              {customPhotoSrc || photoSrc ? (
                <img
                  src={customPhotoSrc || photoSrc}
                  alt="Фото игрока"
                  className="h-full w-full object-cover"
                />
              ) : (
                getFullName(gamer).slice(0, 1).toUpperCase()
              )}
            </button>

            <div className="min-w-0">
              <p className="text-sm font-bold text-white/40">Игрок</p>
              <h2 className="mt-1 break-words text-2xl font-black">
                {profileLoading ? "Загрузка..." : getFullName(gamer)}
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

        <section className="-mx-2 mt-5 rounded-3xl bg-[#2d332f] px-3 py-5">
          <p className="mb-4 px-2 text-lg font-black">Ваша команда</p>

          {teams.length === 0 && (
            <p className="text-sm text-white/50">Команды пока не найдены.</p>
          )}

          {selectedTeam && (
            <>
              <button
                type="button"
                onTouchStart={handleTeamTouchStart}
                onTouchEnd={handleTeamTouchEnd}
                onClick={handleTeamCardClick}
                className="w-full min-w-0 rounded-3xl border border-[#20d1a8]/50 bg-[#121715] p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <TeamLogo
                    token={token}
                    teamId={selectedTeamId}
                    title={selectedTeamName}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-black">
                      {selectedTeamName}
                    </p>

                    <p className="mt-1 text-xs text-white/35">
                      {teams.length > 1
                        ? `${selectedTeamIndex + 1} из ${teams.length} · свайп вправо/влево`
                        : "Выбранная команда"}
                    </p>
                  </div>

                  <div
                    className={
                      isTeamInfoOpen
                        ? "shrink-0 rotate-180 text-2xl font-black text-white transition-transform"
                        : "shrink-0 text-2xl font-black text-white transition-transform"
                    }
                  >
                    ˅
                  </div>
                </div>
              </button>

              {teams.length > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  {teams.map((team, index) => {
                    const dotTeamId = getTeamId(team);

                    return (
                      <button
                        key={`${dotTeamId}-${index}`}
                        type="button"
                        onClick={() => {
                          const nextGamerTeamId = getGamerTeamId(team);

                          setSelectedTeamId(dotTeamId);
                          setOpenEventKey("");
                          setIsTeamInfoOpen(false);

                          if (nextGamerTeamId) {
                            loadPhoto(token, nextGamerTeamId);
                          }
                        }}
                        aria-label={`Команда ${index + 1}`}
                        className={
                          index === selectedTeamIndex
                            ? "h-2.5 w-8 rounded-full bg-[#20d1a8]"
                            : "h-2.5 w-2.5 rounded-full bg-white/25"
                        }
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}

          {isTeamInfoOpen && selectedTeam && (
            <div className="mt-4 border-t border-white/10 pt-4">
              {teamDetailsLoadingId === selectedTeamId && (
                <p className="text-sm text-white/45">
                  Загружаем информацию команды...
                </p>
              )}

              {teamDetailsLoadingId !== selectedTeamId && (
                <div className="grid gap-3">
                  <TeamInfoRow
                    label="Сайт команды"
                    value={getTeamSite(selectedTeam)}
                  />

                  <TeamInfoRow
                    label="Email команды"
                    value={getTeamEmail(selectedTeam)}
                  />

                  <TeamInfoRow
                    label="Стадион"
                    value={teamDetailsById[selectedTeamId]?.stadium?.name || ""}
                  />

                  <TeamInfoRow
                    label="Адрес стадиона"
                    value={teamDetailsById[selectedTeamId]?.stadium?.address || ""}
                  />

                  <TeamInfoRow
                    label="Телефон стадиона"
                    value={teamDetailsById[selectedTeamId]?.stadium?.phone || ""}
                  />

                  <TeamInfoRow
                    label="Сайт стадиона"
                    value={teamDetailsById[selectedTeamId]?.stadium?.site || ""}
                  />

                  <div className="rounded-2xl bg-[#121715] p-4">
                    <p className="text-xs font-bold text-[#20d1a8]">
                      График тренировок
                    </p>

                    {(teamDetailsById[selectedTeamId]?.schedule || []).length === 0 ? (
                      <p className="mt-1 text-sm font-bold text-white/45">
                        График тренировок не указан
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {(teamDetailsById[selectedTeamId]?.schedule || []).map((item: any, index: number) => {
                          const scheduleLine = formatTrainingScheduleLine(item);

                          if (!scheduleLine) return null;

                          return (
                            <div
                              key={`${selectedTeamId}-${index}-${scheduleLine}`}
                              className="rounded-xl bg-[#2d332f] px-3 py-3 text-sm font-black text-white"
                            >
                              {scheduleLine}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setLeaveTeamConfirmOpen(true)}
                    className="mt-2 h-14 w-full rounded-[30px] bg-red-500 text-base font-black text-white shadow-lg shadow-red-500/20"
                  >
                    Выход из команды
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="mt-4 text-sm text-white/40">
            .
          </p>
        </section>


        <section className="mt-5 rounded-3xl bg-[#2d332f] p-5">
          <div className="flex items-center justify-between">
            <button
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
              onClick={nextMonth}
              className="rounded-2xl bg-[#121715] px-4 py-3 font-black text-white/70"
            >
              →
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day) => (
              <div key={day} className="py-2 text-xs font-bold text-white/35">
                {day}
              </div>
            ))}

            {calendarDays.map((day) => {
              const dayKey = formatDate(day);
              const dayEvents = eventsByDate[dayKey] || [];
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isSelected = dayKey === selectedDate;
              const isToday = dayKey === formatDate(new Date());

              return (
                <button
                  key={dayKey}
                  onClick={() => {
                    setSelectedDate(dayKey);
                    setOpenEventKey("");
                  }}
                  className={
                    isSelected
                      ? "min-h-16 rounded-2xl border-2 border-white/85 bg-[#1b211e] p-1 text-white ring-2 ring-[#20d1a8]/25"
                      : isToday
                        ? "min-h-16 rounded-2xl border border-[#20d1a8] bg-[#121715] p-1 text-white"
                        : "min-h-16 rounded-2xl bg-[#121715] p-1 text-white"
                  }
                >
                  <div
                    className={
                      isCurrentMonth
                        ? "text-sm font-black"
                        : "text-sm font-black opacity-25"
                    }
                  >
                    {day.getDate()}
                  </div>

                  <div className="mt-1 flex justify-center gap-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={getEventKey(event)}
                        className={
                          event.hm51_type === "game"
                            ? "h-1.5 w-1.5 rounded-full bg-[#20d1a8]"
                            : "h-1.5 w-1.5 rounded-full bg-[#ff0a8a]"
                        }
                      />
                    ))}
                  </div>

                  <div className="mt-1 flex justify-center gap-1">
                    {dayEvents.slice(0, 3).map((event) => {
                      if (!event.hm51_attendance) return null;

                      return (
                        <span
                          key={`${getEventKey(event)}-answer`}
                          className={`h-2.5 w-2.5 rounded-full ${
                            event.hm51_attendance === "coming"
                              ? "bg-[#20d1a8]"
                              : "bg-[#ff0a8a]"
                          } ${
                            event.hm51_attendance === "coming"
                              ? approvalCalendarRingClass(event)
                              : ""
                          }`}
                        />
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {message && (
          <section className="mt-5 rounded-3xl bg-[#2d332f] p-4 text-sm font-bold text-[#20d1a8]">
            {message}
          </section>
        )}

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

        {!loading && !error && (
          <section className="mt-5 rounded-3xl bg-[#2d332f] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/40">Выбранный день</p>
                <h2 className="text-xl font-black">{selectedDate}</h2>
              </div>

              <div className="rounded-2xl bg-[#121715] px-3 py-2 text-sm font-black text-white/60">
                {selectedEvents.length}
              </div>
            </div>

            {selectedEvents.length === 0 && (
              <p className="mt-4 text-sm text-white/50">
                В этот день событий выбранной команды нет.
              </p>
            )}

            {selectedEvents.length > 0 && (
              <div className="mt-4 space-y-3">
                {selectedEvents.map((event) => {
                  const key = getEventKey(event);
                  const opened = openEventKey === key;
                  const isGame = event.hm51_type === "game";
                  const saving = savingKey === key;

                  return (
                    <div key={key} className="rounded-2xl bg-[#121715] p-4">
                      <button
                        onClick={() => {
                          if (opened) {
                            setOpenEventKey("");
                          } else {
                            setOpenEventKey(key);
                            loadEventPlayers(event);
                          }
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className={
                                isGame
                                  ? "text-xs font-black text-[#20d1a8]"
                                  : "text-xs font-black text-[#ff0a8a]"
                              }
                            >
                              {isGame ? "Игра" : "Тренировка"}
                            </p>

                            <h3 className="mt-1 truncate text-lg font-black">
                              {event.hm51_title}
                            </h3>

                            <p className="mt-1 text-sm text-white/40">
                              {event.hm51_stadium || event.hm51_address || "Место не указано"}
                            </p>
                          </div>

                          <div className="shrink-0 rounded-xl bg-[#2d332f] px-3 py-2 text-sm font-black">
                            {event.hm51_time || "—"}
                          </div>
                        </div>
                      </button>

                      {opened && (
                        <div className="mt-4 border-t border-white/10 pt-4">
                          <div className="grid gap-3">
                            <div className="rounded-2xl bg-[#2d332f] p-3">
                              <p className="text-xs font-bold text-[#20d1a8]">
                                Ваш ответ
                              </p>
                              <p className="mt-1 text-sm font-black text-white">
                                {getAttendanceText(event.hm51_attendance)}
                              </p>
                            </div>

                            {event.hm51_attendance === "coming" && (
                              <>
                                <div
                                  className={`rounded-2xl border p-3 ${approvalClass(event)}`}
                                >
                                  <p className="text-xs font-bold opacity-80">
                                    Статус участия
                                  </p>
                                  <p className="mt-1 text-sm font-black">
                                    {approvalText(event)}
                                  </p>
                                </div>

                                {(() => {
                                  const approvedDetails = getApprovedGameDetails(event);

                                  if (!approvedDetails) return null;

                                  return (
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="rounded-2xl bg-[#2d332f] p-3">
                                        <p className="text-xs font-bold text-[#20d1a8]">
                                          Звено
                                        </p>
                                        <p className="mt-1 text-base font-black text-white">
                                          {approvedDetails.squad || "Не указано"}
                                        </p>
                                      </div>

                                      <div className="rounded-2xl bg-[#2d332f] p-3">
                                        <p className="text-xs font-bold text-[#20d1a8]">
                                          Позиция
                                        </p>
                                        <p className="mt-1 text-base font-black text-white">
                                          {approvedDetails.position || "Не указано"}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </>
                            )}

                            {event.hm51_address && (
                              <div className="rounded-2xl bg-[#2d332f] p-3">
                                <p className="text-xs font-bold text-[#20d1a8]">
                                  Адрес
                                </p>
                                <p className="mt-1 text-sm font-bold text-white">
                                  {event.hm51_address}
                                </p>
                              </div>
                            )}

                            {event.hm51_duration && (
                              <div className="rounded-2xl bg-[#2d332f] p-3">
                                <p className="text-xs font-bold text-[#20d1a8]">
                                  Длительность
                                </p>
                                <p className="mt-1 text-sm font-bold text-white">
                                  {event.hm51_duration}
                                </p>
                              </div>
                            )}

                            {event.hm51_note && (
                              <div className="rounded-2xl bg-[#2d332f] p-3">
                                <p className="text-xs font-bold text-[#20d1a8]">
                                  Примечание
                                </p>
                                <p className="mt-1 text-sm font-bold text-white">
                                  {event.hm51_note}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => sendAttendance(event, "coming")}
                              disabled={saving}
                              className={
                                event.hm51_attendance === "coming"
                                  ? "h-12 flex-1 rounded-2xl bg-[#20d1a8] text-sm font-black text-[#121715] disabled:opacity-50"
                                  : "h-12 flex-1 rounded-2xl border border-[#20d1a8]/50 text-sm font-black text-[#20d1a8] disabled:opacity-50"
                              }
                            >
                              {saving ? "..." : "Приду"}
                            </button>

                            <button
                              onClick={() => sendAttendance(event, "notcoming")}
                              disabled={saving}
                              className={
                                event.hm51_attendance === "notcoming"
                                  ? "h-12 flex-1 rounded-2xl bg-[#ff0a8a] text-sm font-black text-white disabled:opacity-50"
                                  : "h-12 flex-1 rounded-2xl bg-[#2d332f] text-sm font-black text-white/60 disabled:opacity-50"
                              }
                            >
                              {saving ? "..." : "Не приду"}
                            </button>
                          </div>

                          <div className="mt-4 rounded-2xl bg-[#2d332f] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-black text-white">
                                Игроки команды
                              </p>

                              <div className="rounded-xl bg-[#121715] px-3 py-1.5 text-xs font-black text-white/60">
                                {(eventPlayersByKey[key] || []).length}
                              </div>
                            </div>

                            {eventPlayersLoadingKey === key && (
                              <p className="mt-3 text-sm text-white/45">
                                Загружаем игроков...
                              </p>
                            )}

                            {eventPlayersLoadingKey !== key &&
                              (eventPlayersByKey[key] || []).length === 0 && (
                                <p className="mt-3 text-sm text-white/45">
                                  Игроки по событию не найдены.
                                </p>
                              )}

                            {eventPlayersLoadingKey !== key &&
                              (eventPlayersByKey[key] || []).length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {(eventPlayersByKey[key] || []).map((player) => (
                                    <div
                                      key={`${player.id}-${player.status}`}
                                      className="flex items-center justify-between gap-3 rounded-2xl bg-[#121715] p-3"
                                    >
                                      <p className="min-w-0 truncate text-sm font-bold text-white">
                                        {formatShortName(player.name)}
                                      </p>

                                      <span
                                        className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-black ${playerStatusClass(player.status)}`}
                                      >
                                        {playerStatusText(player.status)}
                                      </span>
                                    </div>
                                  ))}
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
        {leaveTeamConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
            <div className="w-full max-w-sm rounded-[32px] bg-[#2d332f] p-5 text-white shadow-2xl">
              <p className="text-xl font-black text-white">
                Выход из команды
              </p>

              <p className="mt-3 text-sm font-semibold leading-6 text-white/60">
                Вы действительно хотите выйти из команды
                {selectedTeamName ? ` «${selectedTeamName}»` : ""}?
              </p>

              <p className="mt-3 text-xs font-semibold leading-5 text-red-200/80">
                После подтверждения будет отправлена заявка на выход из команды.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveTeamConfirmOpen(false)}
                  disabled={leaveTeamLoading}
                  className="h-14 rounded-[30px] bg-[#121715] text-base font-black text-white disabled:opacity-50"
                >
                  Отмена
                </button>

                <button
                  type="button"
                  onClick={leaveSelectedTeam}
                  disabled={leaveTeamLoading}
                  className="h-14 rounded-[30px] bg-red-500 text-base font-black text-white disabled:opacity-50"
                >
                  {leaveTeamLoading ? "..." : "Да, выйти"}
                </button>
              </div>
            </div>
          </div>
        )}


        {isPhotoViewerOpen && (customPhotoSrc || photoSrc) && (
          <button
            type="button"
            onClick={() => setIsPhotoViewerOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            aria-label="Закрыть фото"
          >
            <img
              src={customPhotoSrc || photoSrc}
              alt="Фото игрока"
              className="max-h-full max-w-full rounded-[32px] object-contain shadow-2xl"
            />

            <span className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl font-black text-white">
              ×
            </span>
          </button>
        )}

        <nav className="fixed bottom-5 left-1/2 grid w-[calc(100%-24px)] max-w-md -translate-x-1/2 grid-cols-5 gap-1 rounded-3xl bg-[#2d332f] p-2 shadow-2xl">
          <Link href="/calendar" className="rounded-2xl bg-[#20d1a8] px-1 py-3 text-center text-[10px] font-black text-[#121715]">Календарь</Link>
          <Link href="/home" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Профиль</Link>
          <Link href="/find-team" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Найти</Link>
          <Link href="/chat" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Чат</Link>
          <Link href="/menu" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Меню</Link>
        </nav>
      </div>
    </main>
  );
}
