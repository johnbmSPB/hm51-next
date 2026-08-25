export async function POST(request: Request) {
  try {
    const data = await request.json();

    const rawIdentifier = String(
      data.identifier ||
        data.email ||
        data.username ||
        data.login ||
        data.LOGIN ||
        ""
    ).trim();

    if (!rawIdentifier) {
      return Response.json(
        {
          result: false,
          error: "Введите логин или email",
        },
        { status: 400 }
      );
    }

    const isEmail = rawIdentifier.includes("@");
    const body = new URLSearchParams();

    if (isEmail) {
      // Android отправляет при восстановлении по email только поле email.
      // Пустые username/login передавать нельзя: PHP воспринимает их как
      // выбранный сценарий восстановления по логину и возвращает ошибку.
      body.append("email", rawIdentifier.toLowerCase());
    } else {
      const username = rawIdentifier.toUpperCase();
      body.append("username", username);
      body.append("email", "");
    }

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
            json?.desc ||
            json?.info ||
            "Не удалось восстановить пароль",
        },
        { status: response.status || 400 }
      );
    }

    const serverMessage = [json?.info, json?.desc]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join("\n");

    return Response.json({
      result: true,
      message:
        isEmail && serverMessage === "Сообщение успешно отправлено!"
          ? "Логин и пароль отправлены на адрес указанной электронной почты"
          : serverMessage || "Пароль отправлен на Вашу электронную почту",
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
