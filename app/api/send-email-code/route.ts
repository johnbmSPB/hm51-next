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
    body.append("email", email);
    body.append("code", code);

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

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    const result = String(json?.result || "").toLowerCase();

    if (!response.ok || result !== "ok") {
      return Response.json(
        {
          result: false,
          error:
            json?.error ||
            json?.info ||
            json?.result ||
            text ||
            "Не удалось отправить код на почту",
          raw: json || text,
        },
        { status: 400 }
      );
    }

    return Response.json({
      result: true,
      message: json?.info || "Код отправлен на электронную почту",
      raw: json || text,
    });
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
