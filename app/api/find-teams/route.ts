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

function getTeamId(item: any) {
  return first(item, [
    "TEAM_ID",
    "team_id",
    "ID",
    "id",
    "TEAM",
    "team",
  ]);
}

function getStadiumId(item: any) {
  return first(item, [
    "STADIUM_ID",
    "stadium_id",
    "STADIUM",
    "stadium",
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

function boolValue(value: any) {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }

  return false;
}

function normalizeTime(value: any) {
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
  const dayKey = String(day);

  const nestedValue =
    item?.[upper]?.[dayKey] ??
    item?.[lower]?.[dayKey] ??
    item?.[upper]?.[day] ??
    item?.[lower]?.[day];

  const nestedNormalized = normalizeTime(nestedValue);

  if (nestedNormalized && nestedNormalized !== "null") {
    return nestedNormalized.replace(":", ".");
  }

  const keys = [
    `${upper}${day}`,
    `${upper}_${day}`,
    `${lower}${day}`,
    `${lower}_${day}`,
    `${upper}_${String(day).padStart(2, "0")}`,
    `${lower}_${String(day).padStart(2, "0")}`,
  ];

  for (const key of keys) {
    const value = normalizeTime(item?.[key]);

    if (value && value !== "null") {
      return value.replace(":", ".");
    }
  }

  return "";
}


function getTeamStadiumTeamId(item: any) {
  return text(
    item?.TEAM ??
      item?.team ??
      item?.TEAM_ID ??
      item?.team_id
  );
}

function getTeamStadiumStadiumId(item: any) {
  return text(
    item?.STADIUM ??
      item?.stadium ??
      item?.STADIUM_ID ??
      item?.stadium_id
  );
}

function makeSchedule(teamStadium: any) {
  if (!teamStadium) return [];

  const dayNames: Record<number, string> = {
    1: "Пн.",
    2: "Вт.",
    3: "Ср.",
    4: "Чт.",
    5: "Пт.",
    6: "Сб.",
    7: "Вс.",
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

    if (!token) {
      return Response.json(
        { result: false, error: "Токен не передан" },
        { status: 400 }
      );
    }

    const teamsResult = await postForm(
      "https://itandsports.ru/teams/get_all_teams.php",
      { token }
    );

    const teamStadiumResult = await postForm(
      "https://itandsports.ru/stadiums/get_team_stadium.php",
      { token }
    );

    const stadiumResult = await postForm(
      "https://itandsports.ru/stadiums/get_stadiums.php",
      { token }
    );

    const aboutResult = await postForm(
      "https://itandsports.ru/start/about_me.php",
      { token }
    );

    const teams = extractArray(teamsResult.json, [
      "TEAMS",
      "teams",
      "team",
      "TEAM",
    ]);

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

    const myGamerTeams = extractArray(aboutResult.json, [
      "GAMER_TEAMS",
      "gamer_teams",
    ]);

    const activeTeamIds = new Set(
      myGamerTeams
        .filter((item) => boolValue(item.ACTIVE_STATUS ?? item.active_status))
        .map((item) => text(item.TEAM ?? item.team ?? item.TEAM_ID ?? item.team_id))
        .filter(Boolean)
    );

    const pendingTeamIds = new Set(
      myGamerTeams
        .filter((item) => {
          const wantJoin = boolValue(item.WANT_JOIN ?? item.want_join);
          const active = boolValue(item.ACTIVE_STATUS ?? item.active_status);
          return wantJoin && !active;
        })
        .map((item) => text(item.TEAM ?? item.team ?? item.TEAM_ID ?? item.team_id))
        .filter(Boolean)
    );

    const stadiumById: Record<string, any> = {};

    stadiums.forEach((stadium) => {
      const id = getId(stadium);
      if (id) stadiumById[id] = stadium;
    });

    const resultTeams = teams
      .map((team) => {
        const teamId = getTeamId(team);

        const candidates = teamStadiums.filter(
          (item) => String(getTeamStadiumTeamId(item)) === String(teamId)
        );

        const selectedTeamStadium =
          candidates.find((item) => hasSchedule(item)) ||
          candidates[0] ||
          null;

        const stadiumId = selectedTeamStadium
          ? getTeamStadiumStadiumId(selectedTeamStadium)
          : "";

        const stadium = stadiumById[stadiumId] || null;

        const needForPlayers = boolValue(
          team.NEED_FOR_PLAYERS ??
            team.need_for_players ??
            team.NEED_PLAYERS ??
            team.need_players ??
            team.CAN_JOIN ??
            team.can_join
        );

        const isMyTeam = activeTeamIds.has(String(teamId));
        const isPending = pendingTeamIds.has(String(teamId));

        const status = isPending
          ? "Заявка в команду подана"
          : needForPlayers
            ? "Идёт набор в команду"
            : "Набор закрыт";

        return {
          id: teamId,
          title:
            first(team, ["NAME", "name", "TEAM_NAME", "team_name"]) ||
            `Команда ${teamId}`,
          level:
            first(team, ["TEAM_LEVEL", "team_level", "LEVEL", "level"]) ||
            "Не указан",
          status,
          canJoin: needForPlayers && !isPending && !isMyTeam,
          isMyTeam,
          isPending,
          gameLevelForRequest:
            first(team, ["TEAM_LEVEL", "team_level", "LEVEL", "level"]) || "",
          teamWebsite:
            first(team, ["SITE", "site", "WEB", "web", "WEBSITE", "website"]) ||
            "",
          email:
            first(team, ["EMAIL", "email", "MAIL", "mail"]) ||
            "",
          stadiumName:
            first(stadium, ["NAME", "name", "TITLE", "title"]) ||
            "",
          address:
            first(stadium, ["ADDRESS", "address", "ADRESS", "adress"]) ||
            "",
          phone:
            first(stadium, ["TEL", "tel", "PHONE", "phone"]) ||
            "",
          stadiumWebsite:
            first(stadium, ["SITE", "site", "WEB", "web", "WEBSITE", "website"]) ||
            "",
          schedule: makeSchedule(selectedTeamStadium),
        };
      })
      .filter((team) => !team.isMyTeam);

    resultTeams.sort((a, b) => {
      const priority: Record<string, number> = {
        "Заявка в команду подана": 0,
        "Идёт набор в команду": 1,
        "Набор закрыт": 2,
      };

      const firstPriority = priority[a.status] ?? 9;
      const secondPriority = priority[b.status] ?? 9;

      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }

      return String(a.title).localeCompare(String(b.title), "ru");
    });

    return Response.json({
      result: true,
      teams: resultTeams,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка загрузки команд",
      },
      { status: 500 }
    );
  }
}
