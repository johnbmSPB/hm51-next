type AnyJson = Record<string, any>;

const TEAM_STADIUM_URL = "https://itandsports.ru/stadiums/get_team_stadium.php";
const STADIUMS_URL = "https://itandsports.ru/stadiums/get_stadiums.php";

async function postEmpty(url: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      "User-Agent": "HM51-Web/1.0",
    },
    body: "",
    cache: "no-store",
  });

  const text = await response.text();

  let json: AnyJson = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
    text,
  };
}

function cleanValue(value: any) {
  const raw = String(value ?? "").trim();

  if (
    !raw ||
    raw === "0" ||
    raw === "00:00" ||
    raw === "00:00:00" ||
    raw.toLowerCase() === "null" ||
    raw.toLowerCase() === "undefined"
  ) {
    return "";
  }

  return raw;
}

function formatScheduleTime(value: any) {
  const raw = cleanValue(value);

  if (!raw) return "";

  const match = raw.match(/(\d{1,2})[:.](\d{2})/);

  if (!match) return raw;

  return `${match[1].padStart(2, "0")}.${match[2]}`;
}

function formatScheduleDuration(value: any) {
  const raw = cleanValue(value);

  if (!raw) return "";

  const match = raw.match(/(\d{1,2})[:.](\d{2})/);

  if (!match) return raw;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 0 && minutes > 0) return `${hours} ч ${minutes} мин`;
  if (hours > 0) return `${hours} ч`;
  if (minutes > 0) return `${minutes} мин`;

  return "";
}

const DAYS: Record<string, string> = {
  "1": "Пн.",
  "2": "Вт.",
  "3": "Ср.",
  "4": "Чт.",
  "5": "Пт.",
  "6": "Сб.",
  "7": "Вс.",
};

function getField(obj: any, keys: string[]) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }

    const foundKey = Object.keys(obj || {}).find(
      (item) => item.toLowerCase() === key.toLowerCase()
    );

    if (foundKey) {
      return obj[foundKey];
    }
  }

  return "";
}

function buildSchedule(teamStadiumRows: any[]) {
  const result: Array<{
    day: string;
    time: string;
    duration: string;
  }> = [];

  teamStadiumRows.forEach((row) => {
    const timeObj = getField(row, ["TIME", "time"]) || {};
    const durationObj = getField(row, ["DURATION", "duration"]) || {};

    for (let day = 1; day <= 7; day += 1) {
      const key = String(day);

      const time = formatScheduleTime(timeObj[key]);
      const duration = formatScheduleDuration(durationObj[key]);

      if (!time) continue;

      result.push({
        day: DAYS[key] || key,
        time,
        duration,
      });
    }
  });

  const seen = new Set<string>();

  return result.filter((item) => {
    const key = `${item.day}-${item.time}-${item.duration}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const teamId = String(
      body.teamId ||
        body.TEAM_ID ||
        body.team_id ||
        body.team ||
        ""
    ).trim();

    if (!teamId) {
      return Response.json(
        {
          result: false,
          text: "TEAM_ID не передан",
        },
        { status: 400 }
      );
    }

    const [teamStadiumResponse, stadiumsResponse] = await Promise.all([
      postEmpty(TEAM_STADIUM_URL),
      postEmpty(STADIUMS_URL),
    ]);

    const teamStadiumArray =
      teamStadiumResponse.json?.TEAM_STADIUM ||
      teamStadiumResponse.json?.TEAM_STADIUMS ||
      teamStadiumResponse.json?.team_stadium ||
      teamStadiumResponse.json?.team_stadiums ||
      [];

    const stadiumsArray =
      stadiumsResponse.json?.STADIUMS ||
      stadiumsResponse.json?.stadiums ||
      [];

    const teamRows = Array.isArray(teamStadiumArray)
      ? teamStadiumArray.filter((item: any) => {
          const rowTeamId = String(
            item?.TEAM ||
              item?.team ||
              item?.TEAM_ID ||
              item?.team_id ||
              ""
          ).trim();

          return rowTeamId === teamId;
        })
      : [];

    const firstTeamRow = teamRows[0] || null;

    const stadiumId = firstTeamRow
      ? String(
          firstTeamRow.STADIUM ||
            firstTeamRow.stadium ||
            firstTeamRow.STADIUM_ID ||
            firstTeamRow.stadium_id ||
            ""
        ).trim()
      : "";

    const stadium = Array.isArray(stadiumsArray)
      ? stadiumsArray.find((item: any) => {
          const id = String(item?.ID || item?.id || "").trim();
          return id === stadiumId;
        })
      : null;

    const schedule = buildSchedule(teamRows);

    return Response.json({
      result: true,
      teamId,
      stadium: {
        id: stadium?.ID || stadium?.id || stadiumId || "",
        name: stadium?.NAME || stadium?.name || "",
        address: stadium?.ADDRESS || stadium?.address || "",
        phone: stadium?.TEL || stadium?.tel || "",
        site: stadium?.SITE || stadium?.site || "",
        geo: stadium?.GEO || stadium?.geo || "",
      },
      schedule,
      debug: {
        teamRowsCount: teamRows.length,
        scheduleCount: schedule.length,
        stadiumId,
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        text: error?.message || "Ошибка загрузки информации о команде",
      },
      { status: 500 }
    );
  }
}
