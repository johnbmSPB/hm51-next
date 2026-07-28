import { formatTimeWithoutSeconds } from "../../lib/timeDisplay";

async function postForm(url: string, params: Record<string, string>) {
  const body = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    body.append(key, value);
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      "User-Agent": "HM51-Web/1.0",
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
    text,
  };
}

function toArray(value: any) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "object") return Object.values(value);
  return [];
}

function text(value: any) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function boolValue(value: any) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value || "").trim().toLowerCase() === "true"
  );
}

function firstLineupValue(sources: any[], keys: string[]) {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    for (const key of keys) {
      const matchingKey = Object.keys(source).find(
        (item) => item.toLowerCase() === key.toLowerCase()
      );
      if (!matchingKey) continue;

      const value = source[matchingKey];
      const normalized = text(value);
      if (normalized && !["null", "undefined"].includes(normalized.toLowerCase())) {
        return value;
      }
    }
  }

  return "";
}

function lineupSquadValue(member: any, event: any) {
  return firstLineupValue([member, event], [
    "SQUAD", "squad", "LINE", "line", "LINE_NUMBER", "line_number",
    "LINE_NUM", "line_num", "SQUAD_NUMBER", "squad_number",
  ]);
}

function lineupPositionValue(member: any, event: any) {
  return firstLineupValue([member, event], [
    "POS", "pos", "POSITION", "position", "LINE_POSITION", "line_position",
    "POSITION_IN_LINE", "position_in_line", "ROLE", "role",
  ]);
}

function lineupShirtColorValue(member: any, event: any) {
  return firstLineupValue([member, event], [
    "SHIRT_COLOR", "shirt_color", "JERSEY_COLOR", "jersey_color",
    "VEST_COLOR", "vest_color", "BIB_COLOR", "bib_color",
    "MANISHKA_COLOR", "manishka_color", "MAYKA_COLOR", "mayka_color",
    "SHIRT", "shirt", "JERSEY", "jersey", "COLOR", "color",
  ]);
}

function getActiveTeamIds(profile: any) {
  const gamerTeams = [
    profile?.GAMER_TEAMS,
    profile?.gamer_teams,
    profile?.data?.GAMER_TEAMS,
    profile?.data?.gamer_teams,
  ].flatMap((value) => toArray(value));

  return new Set(
    gamerTeams
      .filter((item) =>
        boolValue(
          item?.ACTIVE_STATUS ??
          item?.active_status
        )
      )
      .map((item) =>
        text(
          item?.TEAM ??
          item?.team ??
          item?.TEAM_ID ??
          item?.team_id
        )
      )
      .filter(Boolean)
  );
}

function normalizeGame(game: any) {
  return {
    ...game,
    hm51_type: "game",
    hm51_id: game.ID,
    hm51_team_id: game.TEAM,
    hm51_date: game.GAME_DATE,
    hm51_time: formatTimeWithoutSeconds(game.GAME_TIME),
    hm51_title:
      game.RIVAL?.RIVAL_TXT ||
      game.RIVAL_TXT ||
      "Игра",
    hm51_stadium: game.STADIUM?.NAME || "",
    hm51_address: game.STADIUM?.ADDRESS || "",
    hm51_note: game.NOTE || "",
    hm51_duration: "",
    hm51_attendance: "",
    hm51_member_id: "",
  };
}

function normalizeTraining(training: any) {
  return {
    ...training,
    hm51_type: "training",
    hm51_id: training.ID,
    hm51_team_id: training.TEAM,
    hm51_date: training.TRAINING_DATE,
    hm51_time: formatTimeWithoutSeconds(training.TRAINING_TIME),
    hm51_title: "Тренировка",
    hm51_stadium: training.STADIUM?.NAME || "",
    hm51_address: training.ADDRESS || training.STADIUM?.ADDRESS || "",
    hm51_note: training.NOTE || "",
    hm51_duration: formatTimeWithoutSeconds(training.DURATION),
    hm51_attendance: "",
    hm51_member_id: "",
  };
}

function boolToAttendance(value: any) {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return "coming";
  }

  if (value === false || value === 0 || value === "0" || value === "false") {
    return "notcoming";
  }

  return "";
}

function applyGameStatuses(events: any[], upcoming: any[]) {
  const map: Record<string, any> = {};

  upcoming.forEach((wrapper) => {
    const gameId = String(wrapper?.GAME?.ID || wrapper?.ID || "");
    if (gameId) map[gameId] = wrapper;
  });

  return events.map((event) => {
    if (event.hm51_type !== "game") return event;

    const wrapper = map[String(event.hm51_id)];
    const member = wrapper?.GAME_MEMBER || null;

    if (!wrapper) return event;

    return {
      ...event,
      hm51_attendance: boolToAttendance(member?.AGREE),
      hm51_member_id: member?.ID || "",
      hm51_confirmed: member?.CONFIRMED ?? null,
      hm51_squad: lineupSquadValue(member, wrapper),
      hm51_pos: lineupPositionValue(member, wrapper),
      hm51_shirt_color: lineupShirtColorValue(member, wrapper),
    };
  });
}

function applyTrainingStatuses(events: any[], upcoming: any[]) {
  const map: Record<string, any> = {};

  upcoming.forEach((training) => {
    const trainingId = String(training?.ID || "");
    if (trainingId) map[trainingId] = training;
  });

  return events.map((event) => {
    if (event.hm51_type !== "training") return event;

    const training = map[String(event.hm51_id)];
    const member = training?.MEMBER || null;

    if (!training) return event;

    return {
      ...event,
      hm51_attendance: boolToAttendance(member?.AGREE),
      hm51_member_id: member?.ID || "",
      hm51_confirmed: member?.CONFIRMED ?? null,
      hm51_squad: lineupSquadValue(member, training),
      hm51_pos: lineupPositionValue(member, training),
      hm51_shirt_color: lineupShirtColorValue(member, training),
    };
  });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const date1 = String(data.date1 || "").trim();
    const date2 = String(data.date2 || "").trim();

    if (!token) {
      return Response.json(
        { result: false, error: "Токен не передан" },
        { status: 400 }
      );
    }

    if (!date1 || !date2) {
      return Response.json(
        { result: false, error: "Диапазон дат не передан" },
        { status: 400 }
      );
    }

    const profileResponse = await postForm(
      "https://itandsports.ru/start/about_me.php",
      {
        token,
      }
    );

    if (
      !profileResponse.ok ||
      profileResponse.json?.result === false
    ) {
      return Response.json(
        {
          result: false,
          error:
            "Не удалось проверить членство пользователя в командах",
        },
        { status: 502 }
      );
    }

    const activeTeamIds = getActiveTeamIds(
      profileResponse.json
    );

    if (activeTeamIds.size === 0) {
      return Response.json({
        result: true,
        events: [],
        gamesCount: 0,
        trainingsCount: 0,
      });
    }

    const gamesResponse = await postForm("https://itandsports.ru/games/get.php", {
      token,
      DATE1: date1,
      DATE2: date2,
    });

    const trainingsResponse = await postForm("https://itandsports.ru/trainings/get.php", {
      token,
      DATE1: date1,
      DATE2: date2,
    });

    let games = toArray(
      gamesResponse.json?.GAMES
    )
      .map(normalizeGame)
      .filter((event) =>
        activeTeamIds.has(
          text(event.hm51_team_id)
        )
      );

    let trainings = toArray(
      trainingsResponse.json?.TRAININGS
    )
      .map(normalizeTraining)
      .filter((event) =>
        activeTeamIds.has(
          text(event.hm51_team_id)
        )
      );

    let events = [
      ...games,
      ...trainings,
    ];

    const upcomingGamesResponse = await postForm("https://itandsports.ru/games/get_upcoming.php", {
      token,
    });

    const upcomingTrainingsResponse = await postForm("https://itandsports.ru/trainings/get_upcoming.php", {
      token,
    });

    events = applyGameStatuses(events, toArray(upcomingGamesResponse.json?.UPCOMING_GAMES));
    events = applyTrainingStatuses(events, toArray(upcomingTrainingsResponse.json?.UPCOMING_TRAININGS));

    events.sort((a, b) => {
      const first = `${a.hm51_date || ""} ${a.hm51_time || ""}`;
      const second = `${b.hm51_date || ""} ${b.hm51_time || ""}`;
      return first.localeCompare(second);
    });

    return Response.json({
      result: true,
      events,
      gamesCount: games.length,
      trainingsCount: trainings.length,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка загрузки календаря",
      },
      { status: 500 }
    );
  }
}
