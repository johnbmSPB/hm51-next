export async function POST(request: Request) {
  try {
    const data = await request.json();
    const email = String(data.email || "").trim();

    if (!email) {
      return Response.json(
        { result: false, error: "Email не передан" },
        { status: 400 }
      );
    }

    const body = new URLSearchParams();
    body.append("email", email);

    const response = await fetch("https://itandsports.ru/users/send_email_code.php", {
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
          error: "Некорректный ответ сервера отправки кода",
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
          error: "Сервер не отправил код",
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
        message: "Код отправлен на почту",
        raw: json,
      });
    }

    return Response.json(
      {
        result: false,
        error: "Неизвестный ответ сервера отправки кода",
        raw: json,
      },
      { status: 500 }
    );
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка отправки кода",
      },
      { status: 500 }
    );
  }
}
