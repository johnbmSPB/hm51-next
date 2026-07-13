type AppRole = "PLAYER" | "COACH";

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

  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { response, json, text };
}

function parseRoles(payload: any): AppRole[] {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.roles)
      ? payload.roles
      : Array.isArray(payload?.ROLES)
        ? payload.ROLES
        : [];

  return Array.from(
    new Set(
      source.flatMap((item: any) => {
        const raw = String(item?.ROLE || item?.role || item || "").toUpperCase();
        if (raw === "TRAINER_ROLE" || raw === "COACH") return ["COACH" as const];
        if (raw === "GAMER_ROLE" || raw === "PLAYER") return ["PLAYER" as const];
        return [];
      })
    )
  );
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const family = String(data.family || "").trim();
    const name = String(data.name || "").trim();
    const midname = String(data.midname || "").trim();
    const birthday = String(data.birthday || "").trim();
    const tel = String(data.tel || "").trim();
    const specialization = String(data.specialization || "").trim();

    if (!token) {
      return Response.json(
        { result: false, error: "Токен не найден. Нужно войти в приложение." },
        { status: 400 }
      );
    }

    if (!family) {
      return Response.json({ result: false, error: "Заполните поле: Фамилия" }, { status: 400 });
    }

    if (!name) {
      return Response.json({ result: false, error: "Заполните поле: Имя" }, { status: 400 });
    }

    if (!birthday) {
      return Response.json(
        { result: false, error: "Заполните поле: Дата рождения" },
        { status: 400 }
      );
    }

    if (!tel) {
      return Response.json({ result: false, error: "Заполните поле: Телефон" }, { status: 400 });
    }

    if (!specialization) {
      return Response.json(
        { result: false, error: "Выберите специализацию тренера" },
        { status: 400 }
      );
    }

    const trainerResult = await postForm(
      "https://itandsports.ru/trainers/new_trainer.php",
      {
        token,
        family,
        name,
        midname,
        birthday,
        tel,
        specialization,
      }
    );

    const message = String(
      trainerResult.json?.text ||
        trainerResult.json?.message ||
        trainerResult.json?.error ||
        trainerResult.text ||
        ""
    ).trim();

    const alreadyExists = message.toLowerCase().includes("уже есть тренер");
    const successful =
      trainerResult.response.ok &&
      (trainerResult.json?.result === true ||
        message.toLowerCase() === "ok" ||
        alreadyExists);

    if (!successful) {
      return Response.json(
        {
          result: false,
          error: message || "Не удалось создать профиль тренера",
          raw: trainerResult.json || trainerResult.text,
        },
        { status: 400 }
      );
    }

    const rolesResult = await postForm("https://itandsports.ru/users/get_roles.php", {
      token,
    });

    const roles = rolesResult.response.ok ? parseRoles(rolesResult.json) : ["COACH"];
    const normalizedRoles = roles.includes("COACH") ? roles : [...roles, "COACH"];

    return Response.json({
      result: true,
      trainerId:
        trainerResult.json?.trainer_id ||
        trainerResult.json?.TRAINER_ID ||
        trainerResult.json?.id ||
        null,
      roles: normalizedRoles,
      message: alreadyExists ? "Профиль тренера уже создан" : "Профиль тренера создан",
    });
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка создания профиля тренера" },
      { status: 500 }
    );
  }
}
