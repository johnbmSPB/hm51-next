export async function POST(request: Request) {
  try {
    const data = await request.json();

    const username = String(
      data.username ||
        data.login ||
        data.LOGIN ||
        ""
    )
      .trim()
      .toUpperCase();

    if (!username) {
      return Response.json(
        {
          result: false,
          error: "Логин не передан",
        },
        { status: 400 }
      );
    }

    const body = new URLSearchParams();
    body.append("username", username);
    body.append("login", username);
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

    if (!response.ok || json?.result === false || json?.RESULT === false || json?.error) {
      return Response.json(
        {
          result: false,
          error:
            json?.error ||
            json?.TEXT_RESULT ||
            json?.text ||
            "Не удалось восстановить пароль",
          raw: json,
        },
        { status: response.status || 400 }
      );
    }

    return Response.json({
      result: true,
      message: "Пароль отправлен на Вашу электронную почту",
      raw: json,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка восстановления пароля",
      },
      { status: 500 }
    );
  }
}
