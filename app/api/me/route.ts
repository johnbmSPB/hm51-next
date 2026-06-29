export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();

    if (!token) {
      return Response.json(
        { result: false, error: "Токен не передан" },
        { status: 400 }
      );
    }

    const body = new URLSearchParams();
    body.append("token", token);

    const response = await fetch("https://itandsports.ru/start/about_me.php", {
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

    return Response.json(json, { status: response.status });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка загрузки профиля",
      },
      { status: 500 }
    );
  }
}
