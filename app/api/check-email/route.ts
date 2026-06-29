export async function POST(request: Request) {
  try {
    const data = await request.json();

    const email = String(data.email || "").trim();
    const code = String(data.code || "").trim();

    if (!email) {
      return Response.json(
        { result: false, error: "Email не передан" },
        { status: 400 }
      );
    }

    if (!code) {
      return Response.json(
        { result: false, error: "Код не передан" },
        { status: 400 }
      );
    }

    const body = new URLSearchParams();
    body.append("code", code);
    body.append("email", email);

    const response = await fetch("https://itandsports.ru/users/check_email.php", {
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
      return Response.json(
        {
          result: false,
          error: "Некорректный ответ сервера проверки кода",
          raw: text,
        },
        { status: 500 }
      );
    }

    if (json?.error) {
      return Response.json(
        {
          result: false,
          error: json.error,
          raw: json,
        },
        { status: 400 }
      );
    }

    if (json?.result === false) {
      return Response.json(
        {
          result: false,
          error: "Неверный код подтверждения",
          raw: json,
        },
        { status: 400 }
      );
    }

    if (typeof json?.result === "string" && json.result.trim()) {
      return Response.json({
        result: true,
        message: json.result,
        raw: json,
      });
    }

    if (json?.result === true) {
      return Response.json({
        result: true,
        message: "Код подтверждён",
        raw: json,
      });
    }

    return Response.json(
      {
        result: false,
        error: "Неизвестный ответ сервера проверки кода",
        raw: json,
      },
      { status: 500 }
    );
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка проверки кода",
      },
      { status: 500 }
    );
  }
}
