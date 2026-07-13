function findToken(data: any) {
  return (
    data?.token ||
    data?.new_token ||
    data?.TOKEN ||
    data?.NEW_TOKEN ||
    data?.data?.token ||
    data?.data?.new_token ||
    ""
  );
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const role = String(data.role || "").trim();
    const username = String(data.login || data.username || "").trim();
    const email = String(data.email || "").trim();
    const password = String(data.password || "").trim();

    if (!role) {
      return Response.json({ result: false, error: "Выберите роль" }, { status: 400 });
    }

    if (!username) {
      return Response.json({ result: false, error: "Введите логин" }, { status: 400 });
    }

    if (!email) {
      return Response.json({ result: false, error: "Введите email" }, { status: 400 });
    }

    if (!password) {
      return Response.json({ result: false, error: "Введите пароль" }, { status: 400 });
    }

    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);
    body.append("email", email);

    const response = await fetch("https://itandsports.ru/users/new_user.php", {
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

    if (!response.ok || json?.result === false || json?.error) {
      return Response.json(
        {
          result: false,
          error: json?.error || json?.message || "Не удалось зарегистрироваться",
          raw: json,
        },
        { status: 400 }
      );
    }

    const token = findToken(json);

    if (!token) {
      return Response.json(
        { result: false, error: "Сервер не вернул токен новой учётной записи", raw: json },
        { status: 502 }
      );
    }

    return Response.json({
      result: true,
      token,
      new_token: token,
      role,
      message: json?.text || json?.message || "Регистрация выполнена",
      raw: json,
    });
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка регистрации" },
      { status: 500 }
    );
  }
}
