type AppRole = "PLAYER" | "COACH";

type JsonObject = Record<string, any>;

function isObject(
  value: unknown
): value is JsonObject {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function findToken(data: any) {
  return (
    data?.new_token ||
    data?.NEW_TOKEN ||
    data?.token ||
    data?.TOKEN ||
    data?.access_token ||
    data?.ACCESS_TOKEN ||
    ""
  );
}

async function postForm(
  url: string,
  params: Record<string, string>
) {
  const body = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      body.append(key, value);
    }
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":
        "application/x-www-form-urlencoded; charset=utf-8",
      "User-Agent": "HM51-Web/2.1",
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
    response,
    json,
    text,
  };
}

function parseRoles(
  payload: any
): AppRole[] {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.roles)
      ? payload.roles
      : Array.isArray(payload?.ROLES)
        ? payload.ROLES
        : [];

  const roles = source.flatMap(
    (item: any) => {
      const raw = String(
        item?.ROLE ||
          item?.role ||
          item ||
          ""
      ).toUpperCase();

      if (
        raw === "TRAINER_ROLE" ||
        raw === "COACH"
      ) {
        return ["COACH" as const];
      }

      if (
        raw === "GAMER_ROLE" ||
        raw === "PLAYER"
      ) {
        return ["PLAYER" as const];
      }

      return [];
    }
  );

  return Array.from(new Set(roles));
}

function hasCompletePlayerProfile(
  payload: unknown
) {
  if (!isObject(payload)) {
    return false;
  }

  const nested = isObject(payload.data)
    ? payload.data
    : null;

  const gamer =
    payload.GAMER ||
    payload.gamer ||
    payload.USER ||
    payload.user ||
    nested?.GAMER ||
    nested?.gamer ||
    nested?.USER ||
    nested?.user;

  if (!isObject(gamer)) {
    return false;
  }

  const teamCollections = [
    payload.GAMER_TEAMS,
    payload.gamer_teams,
    payload.TEAMS,
    payload.teams,
    nested?.GAMER_TEAMS,
    nested?.gamer_teams,
    nested?.TEAMS,
    nested?.teams,
  ];

  return teamCollections.some(
    (value) =>
      Array.isArray(value) ||
      isObject(value)
  );
}

function chooseRedirect(
  roles: AppRole[]
) {
  const hasPlayer =
    roles.includes("PLAYER");

  const hasCoach =
    roles.includes("COACH");

  if (hasPlayer && hasCoach) {
    return "/role-select";
  }

  if (hasCoach) {
    return "/coach";
  }

  return "/calendar";
}

export async function POST(
  request: Request
) {
  try {
    const data = await request.json();

    const username = String(
      data.login ||
        data.username ||
        ""
    ).trim();

    const password = String(
      data.password || ""
    ).trim();

    if (!username) {
      return Response.json(
        {
          result: false,
          error: "Введите логин",
        },
        { status: 400 }
      );
    }

    if (!password) {
      return Response.json(
        {
          result: false,
          error: "Введите пароль",
        },
        { status: 400 }
      );
    }

    const loginResult = await postForm(
      "https://itandsports.ru/users/new_token.php",
      {
        username,
        password,
      }
    );

    if (!loginResult.response.ok) {
      return Response.json(
        {
          result: false,
          error: "Ошибка сервера входа",
          raw: loginResult.text,
        },
        {
          status:
            loginResult.response.status,
        }
      );
    }

    const token = findToken(
      loginResult.json
    );

    if (
      !loginResult.json?.result ||
      !token
    ) {
      const rawError = String(
        loginResult.json?.error || ""
      ).trim();

      let message =
        "Неверный логин или пароль";

      if (
        rawError
          .toLowerCase()
          .includes(
            "пользователь не найден"
          )
      ) {
        message =
          "Пользователь не найден";
      } else if (rawError) {
        message = rawError;
      }

      return Response.json(
        {
          result: false,
          error: message,
        },
        { status: 401 }
      );
    }

    const rolesResult = await postForm(
      "https://itandsports.ru/users/get_roles.php",
      {
        token,
      }
    );

    let roles =
      rolesResult.response.ok
        ? parseRoles(rolesResult.json)
        : [];

    let profile: any = null;
    let gamerTeamId = "";

    const shouldCheckPlayerProfile =
      roles.length === 0 ||
      roles.includes("PLAYER");

    if (shouldCheckPlayerProfile) {
      const profileResult =
        await postForm(
          "https://itandsports.ru/start/about_me.php",
          {
            token,
          }
        );

      const profileComplete =
        profileResult.response.ok &&
        profileResult.json?.result !==
          false &&
        hasCompletePlayerProfile(
          profileResult.json
        );

      if (profileComplete) {
        profile = profileResult.json;

        const firstTeam =
          Array.isArray(
            profileResult.json
              ?.GAMER_TEAMS
          )
            ? profileResult.json
                .GAMER_TEAMS[0]
            : null;

        gamerTeamId = String(
          firstTeam?.GAMER_TEAM_ID ||
            firstTeam?.ID ||
            ""
        );

        if (
          !roles.includes("PLAYER")
        ) {
          roles = [
            ...roles,
            "PLAYER",
          ];
        }
      } else {
        const serverUnavailable =
          profileResult.response.status >=
          500;

        if (serverUnavailable) {
          return Response.json(
            {
              result: false,
              error:
                "Не удалось проверить состояние профиля. Повторите вход.",
            },
            { status: 502 }
          );
        }

        const hasCoach =
          roles.includes("COACH");

        if (!hasCoach) {
          return Response.json({
            result: true,
            new_token: token,
            token,
            roles: [],
            registrationIncomplete:
              true,
            redirect:
              "/connecting-team",
            email:
              loginResult.json?.email ||
              loginResult.json?.EMAIL ||
              "",
            gamerTeamId: "",
            profile: null,
          });
        }

        // Если тренер существует,
        // но профиль игрока неполный,
        // не предлагаем вход как игрок.
        roles = roles.filter(
          (role) =>
            role !== "PLAYER"
        );
      }
    }

    roles = Array.from(
      new Set(roles)
    );

    return Response.json({
      result: true,
      new_token: token,
      token,
      roles,
      redirect:
        chooseRedirect(roles),
      gamerTeamId,
      profile,
      registrationIncomplete: false,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error:
          error?.message ||
          "Ошибка входа",
      },
      { status: 500 }
    );
  }
}
