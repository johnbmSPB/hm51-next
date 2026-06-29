async function postForm(url: string, params: Record<string, string> = {}) {
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

function extractArray(json: any, keys: string[]) {
  if (Array.isArray(json)) return json;

  for (const key of keys) {
    const value = json?.[key];
    if (Array.isArray(value)) return value;
  }

  for (const value of Object.values(json || {})) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

function text(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function first(item: any, keys: string[]) {
  for (const key of keys) {
    const value = text(item?.[key]);
    if (value && value !== "null") return value;
  }

  return "";
}

function getTeamId(item: any) {
  return first(item, [
    "TEAM_ID",
    "team_id",
    "TEAM",
    "team",
    "teamId",
    "ID_TEAM",
    "id_team",
  ]);
}

function getStadiumId(item: any) {
  return first(item, [
    "STADIUM_ID",
    "stadium_id",
    "STADIUM",
    "stadium",
    "stadiumId",
    "ID_STADIUM",
    "id_stadium",
  ]);
}

function getId(item: any) {
  return first(item, [
    "ID",
    "id",
    "STADIUM_ID",
    "stadium_id",
  ]);
}

function normalizeTime(value: string) {
  const raw = text(value);

  if (!raw) return "";

  if (raw.endsWith(":00")) {
    return raw.slice(0, -3);
  }

  return raw;
}

function getScheduleValue(item: any, type: "time" | "duration", day: number) {
  const upper = type === "time" ? "TIME" : "DURATION";
  const lower = type === "time" ? "time" : "duration";

  const keys = [
    `${upper}${day}`,
    `${upper}_${day}`,
    `${lower}${day}`,
    `${lower}_${day}`,
    `${upper}_${String(day).padStart(2, "0")}`,
    `${lower}_${String(day).padStart(2, "0")}`,
  ];

  for (const key of keys) {
    const value = text(item?.[key]);
    if (value && value !== "null") return normalizeTime(value);
  }

  return "";
}

function makeSchedule(teamStadium: any) {
  if (!teamStadium) return [];

  const dayNames: Record<number, string> = {
    1: "Пн",
    2: "Вт",
    3: "Ср",
    4: "Чт",
    5: "Пт",
    6: "Сб",
    7: "Вс",
  };

  const result = [];

  for (let day = 1; day <= 7; day++) {
    const time = getScheduleValue(teamStadium, "time", day);
    const duration = getScheduleValue(teamStadium, "duration", day);

    if (time) {
      result.push({
        day: dayNames[day],
        time,
        duration,
      });
    }
  }

  return result;
}

function hasSchedule(item: any) {
  return makeSchedule(item).length > 0;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const teamId = String(data.teamId || data.team_id || "").trim();

    if (!teamId) {
      return Response.json(
        { result: false, error: "ID команды не передан" },
        { status: 400 }
      );
    }

    const teamStadiumResult = await postForm(
      "https://itandsports.ru/stadiums/get_team_stadium.php",
      token ? { token } : {}
    );

    const stadiumResult = await postForm(
      "https://itandsports.ru/stadiums/get_stadiums.php",
      token ? { token } : {}
    );

    const teamStadiums = extractArray(teamStadiumResult.json, [
      "teamStadium",
      "team_stadium",
      "TEAM_STADIUM",
      "teamStadiums",
      "team_stadiums",
      "TEAM_STADIUMS",
    ]);

    const stadiums = extractArray(stadiumResult.json, [
      "stadiums",
      "STADIUMS",
      "stadium",
      "STADIUM",
    ]);

    const candidates = teamStadiums.filter(
      (item) => String(getTeamId(item)) === String(teamId)
    );

    const selectedTeamStadium =
      candidates.find((item) => hasSchedule(item)) ||
      candidates[0] ||
      null;

    const stadiumId = selectedTeamStadium
      ? getStadiumId(selectedTeamStadium)
      : "";

    const stadium =
      stadiums.find((item) => String(getId(item)) === String(stadiumId)) ||
      null;

    return Response.json({
      result: true,
      stadium: stadium
        ? {
            id: getId(stadium),
            name: first(stadium, ["NAME", "name", "TITLE", "title"]),
            address: first(stadium, ["ADDRESS", "address", "ADRESS", "adress"]),
            phone: first(stadium, ["TEL", "tel", "PHONE", "phone"]),
            site: first(stadium, ["SITE", "site", "WEB", "web", "WEBSITE", "website"]),
          }
        : null,
      schedule: makeSchedule(selectedTeamStadium),
      raw: {
        teamStadium: selectedTeamStadium,
        stadium,
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка загрузки информации команды",
      },
      { status: 500 }
    );
  }
}
