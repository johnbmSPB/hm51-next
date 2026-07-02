export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const code = String(data.code || "").trim();
    const tel = String(data.tel || "").trim();

    if (!token) {
      return Response.json(
        { result: false, error: "Токен не найден. Нужно войти в приложение." },
        { status: 400 }
      );
    }

    if (!tel) {
      return Response.json(
        { result: false, error: "Введите номер телефона" },
        { status: 400 }
      );
    }

    if (!code) {
      return Response.json(
        { result: false, error: "Введите код подтверждения" },
        { status: 400 }
      );
    }

    const body = new URLSearchParams();
    body.append("token", token);
    body.append("code", code);
    body.append("tel", tel);

    const response = await fetch("https://itandsports.ru/gamers/bind_by_telcode.php", {
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

    const ok =
      response.ok &&
      (
        json?.result === true ||
        String(json?.result || "").toLowerCase() === "true" ||
        String(json?.result || "").toLowerCase() === "ok"
      );

    if (!ok) {
      return Response.json(
        {
          result: false,
          error:
            json?.text ||
            json?.error ||
            text ||
            "Не удалось подключиться к команде",
          raw: json || text,
        },
        { status: 400 }
      );
    }

    return Response.json({
      result: true,
      message: json?.text || "Игрок успешно подключён к команде",
      raw: json || text,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка подключения к команде",
      },
      { status: 500 }
    );
  }
}
