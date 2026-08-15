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
    url,
  };
}

function toArray(value: any) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "object") return Object.values(value);
  return [];
}

function valueToText(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeStatus(value: any) {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return "coming";
  }

  if (value === false || value === 0 || value === "0" || value === "false") {
    return "notcoming";
  }

  return "unknown";
}

function buildNameMap(teamGamers: any[]) {
  const map: Record<string, { fullName: string; login: boolean }> = {};

  teamGamers.forEach((item) => {
    const gamerId = valueToText(item.GAMER_ID || item.gamer_id || item.ID || item.id);

    const fullName = [
      valueToText(item.FAMILY || item.family),
      valueToText(item.NAME || item.name),
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const login =
      item.LOGIN === true ||
      item.LOGIN === 1 ||
      item.LOGIN === "1" ||
      item.LOGIN === "true";

    if (gamerId) {
      map[gamerId] = {
        fullName: fullName || `Игрок ID ${gamerId}`,
        login,
      };
    }
  });

  return map;
}

function normalizePlayer(player: any, nameMap: Record<string, { fullName: string; login: boolean }>) {
  const gamerId = valueToText(player.GAMER_ID || player.gamer_id || player.ID || player.id);

  const agree =
    player.AGREE ??
    player.agree ??
    player.STATUS ??
    player.status ??
    null;

  const confirmed =
    player.CONFIRMED ??
    player.confirmed ??
    null;

  const found = nameMap[gamerId];

  return {
    id: gamerId || Math.random().toString(36),
    gamerId,
    name: found?.fullName || `Игрок ID ${gamerId}`,
    login: found?.login || false,
    status: normalizeStatus(agree),
    confirmed,
    isGuest: false,
    raw: player,
  };
}

function normalizeGuest(guest: any) {
  const guestId = valueToText(
    guest.GUEST_ID ||
      guest.guest_id ||
      guest.ID ||
      guest.id
  );

  const fullName = [
    valueToText(guest.FAMILY || guest.family),
    valueToText(guest.NAME || guest.name),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const agree =
    guest.AGREE ??
    guest.agree ??
    guest.STATUS ??
    guest.status ??
    null;

  const confirmed =
    guest.CONFIRMED ??
    guest.confirmed ??
    null;

  return {
    id: `guest-${guestId || Math.random().toString(36)}`,
    guestId,
    name: fullName || `Гость ID ${guestId || "без номера"}`,
    login: false,
    status: normalizeStatus(agree),
    confirmed,
    isGuest: true,
    raw: guest,
  };
}

function sortPlayers(players: any[]) {
  const statusOrder: Record<string, number> = {
    coming: 1,
    notcoming: 2,
    unknown: 3,
  };

  return players.sort((a, b) => {
    const first = statusOrder[a.status] || 99;
    const second = statusOrder[b.status] || 99;

    if (first !== second) return first - second;

    return String(a.name || "").localeCompare(String(b.name || ""), "ru");
  });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const eventId = String(data.eventId || "").trim();
    const teamId = String(data.teamId || "").trim();
    const type = String(data.type || "game").trim();

    if (!token) {
      return Response.json(
        { result: false, error: "Токен не передан" },
        { status: 400 }
      );
    }

    if (!eventId) {
      return Response.json(
        { result: false, error: "ID события не передан" },
        { status: 400 }
      );
    }

    if (!teamId) {
      return Response.json(
        { result: false, error: "ID команды не передан" },
        { status: 400 }
      );
    }

    const whoUrl =
      type === "training"
        ? "https://itandsports.ru/trainings/who_will_go.php"
        : "https://itandsports.ru/games/who_will_go.php";

   const whoParams: Record<string, string> = {
  token: String(token),
};

if (type === "training") {
  whoParams.training_id = String(eventId);
} else {
  whoParams.game_id = String(eventId);
}

const whoResult = await postForm(whoUrl, whoParams);

    if (!whoResult.ok || whoResult.json?.result === false) {
      return Response.json(
        {
          result: false,
          error: whoResult.json?.error || "Не удалось загрузить статусы игроков",
          server: whoResult.json,
        },
        { status: whoResult.status || 500 }
      );
    }

    const teamResult = await postForm("https://itandsports.ru/teams/get_gamers_of_team.php", {
      token,
      team_id: teamId,
    });

    if (!teamResult.ok || teamResult.json?.result === false) {
      return Response.json(
        {
          result: false,
          error: teamResult.json?.error || "Не удалось загрузить ФИО игроков команды",
          server: teamResult.json,
        },
        { status: teamResult.status || 500 }
      );
    }

    const teamGamers = toArray(teamResult.json);
    const teamCount = teamGamers.length;
    const nameMap = buildNameMap(teamGamers);

    let rawGamers: any[] = [];
    let rawGuests: any[] = [];

    if (Array.isArray(whoResult.json)) {
      rawGuests = whoResult.json.filter((item: any) =>
        Boolean(valueToText(item?.GUEST_ID || item?.guest_id))
      );

      rawGamers = whoResult.json.filter(
        (item: any) =>
          !Boolean(valueToText(item?.GUEST_ID || item?.guest_id))
      );
    } else {
      rawGamers = toArray(
        whoResult.json?.GAMERS ||
          whoResult.json?.gamers
      );

      rawGuests = toArray(
        whoResult.json?.GUESTS ||
          whoResult.json?.guests
      );
    }

    const players = sortPlayers(
      rawGamers.map((player) => normalizePlayer(player, nameMap))
    );

    const guests = sortPlayers(
      rawGuests.map((guest) => normalizeGuest(guest))
    );

    const participants = [...players, ...guests];

    const comingCount = participants.filter(
      (participant) => participant.status === "coming"
    ).length;

    const notComingCount = participants.filter(
      (participant) => participant.status === "notcoming"
    ).length;

    const unknownCount = participants.filter(
      (participant) => participant.status === "unknown"
    ).length;

    const playerComingCount = players.filter(
      (player) => player.status === "coming"
    ).length;

    const guestComingCount = guests.filter(
      (guest) => guest.status === "coming"
    ).length;

    const playerNotComingCount = players.filter(
      (player) => player.status === "notcoming"
    ).length;

    const thinkingCount = Math.max(
      teamCount - playerComingCount - playerNotComingCount,
      0
    );

    return Response.json({
      result: true,
      players,
      guests,
      teamCount,
      comingCount,
      playerComingCount,
      guestComingCount,
      notComingCount,
      playerNotComingCount,
      thinkingCount,
      unknownCount,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка загрузки игроков события",
      },
      { status: 500 }
    );
  }
}
