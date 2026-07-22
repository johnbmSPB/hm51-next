export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const family = String(data.family || "").trim();
    const name = String(data.name || "").trim();
    const midname = String(data.midname || "").trim();
    const birthday = String(data.birthday || "").trim();
    const tel = String(data.tel || "").trim();
    const email = String(data.email || "").trim();

    if (!token) {
      return Response.json(
        { result: false, error: "Токен не найден. Нужно войти в приложение." },
        { status: 400 }
      );
    }

    if (!family) {
      return Response.json(
        { result: false, error: "Заполните поле: Фамилия" },
        { status: 400 }
      );
    }

    if (!name) {
      return Response.json(
        { result: false, error: "Заполните поле: Имя" },
        { status: 400 }
      );
    }

    if (!tel) {
      return Response.json(
        { result: false, error: "Заполните поле: Телефон" },
        { status: 400 }
      );
    }

    if (!birthday) {
      return Response.json(
        { result: false, error: "Заполните поле: Дата рождения" },
        { status: 400 }
      );
    }

    const body = new URLSearchParams();
    body.append("token", token);
    body.append("family", family);
    body.append("name", name);
    body.append("midname", midname);
    body.append("birthday", birthday);
    body.append("tel", tel);
    if (email) {
      body.append("email", email);
    }

    const response = await fetch("https://itandsports.ru/gamers/new_gamer.php", {
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

    const message =
      json?.text ||
      json?.TEXT_RESULT ||
      json?.error ||
      json?.ERROR ||
      text ||
      "";

    if (!response.ok || message !== "Ok") {
      return Response.json(
        {
          result: false,
          error: message || "Не удалось сохранить профиль",
          raw: json || text,
        },
        { status: 400 }
      );
    }

    return Response.json({
      result: true,
      message: "Профиль сохранён",
      raw: json || text,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка сохранения профиля",
      },
      { status: 500 }
    );
  }
}
