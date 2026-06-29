export async function POST(request: Request) {
  try {
    const data = await request.json();
    const username = String(data.login || data.username || "").trim();

    if (!username) {
      return Response.json({ result: false, error: "Введите логин" }, { status: 400 });
    }

    const body = new URLSearchParams();
    body.append("username", username.toUpperCase());
    body.append("email", "");

    const response = await fetch("https://itandsports.ru/users/restore_password.php", {
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

    const info = String(json?.info || "").trim();
    const desc = String(json?.desc || "").trim();
    const combined = [info, desc].filter(Boolean).join("\n");

    const normalized = combined.toLowerCase().replaceAll("!", "").trim();

    if (
      normalized.includes("сообщение успешно отправлено") ||
      normalized.includes("success") ||
      normalized.includes("ok")
    ) {
      return Response.json({
        result: true,
        message: "Логин и пароль отправлены на адрес эл.почты, указанной при регистрации!",
      });
    }

    return Response.json({
      result: response.ok,
      message: combined || text || "Неизвестный ответ сервера",
      raw: json,
    });
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка восстановления пароля" },
      { status: 500 }
    );
  }
}
