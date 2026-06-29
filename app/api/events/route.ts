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

function normalizeGame(game: any) {
  return {
    ...game,
    hm51_type: "game",
    hm51_id: game.ID,
    hm51_team_id: game.TEAM,
    hm51_date: game.GAME_DATE,
    hm51_time: game.GAME_TIME,
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
    hm51_time: training.TRAINING_TIME,
    hm51_title: "Тренировка",
    hm51_stadium: training.STADIUM?.NAME || "",
    hm51_address: training.ADDRESS || training.STADIUM?.ADDRESS || "",
    hm51_note: training.NOTE || "",
    hm51_duration: training.DURATION || "",
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
      hm51_squad: member?.SQUAD || "",
      hm51_pos: member?.POS || "",
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
      hm51_squad: member?.SQUAD || "",
      hm51_pos: member?.POS || "",
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

    let games = toArray(gamesResponse.json?.GAMES).map(normalizeGame);
    let trainings = toArray(trainingsResponse.json?.TRAININGS).map(normalizeTraining);

    let events = [...games, ...trainings];

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
