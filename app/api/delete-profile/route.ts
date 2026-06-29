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

    const response = await fetch("https://itandsports.ru/users/delete_user.php", {
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

    if (!response.ok || json?.error) {
      return Response.json(
        {
          result: false,
          error: json?.error || "Не удалось удалить профиль",
          raw: json,
        },
        { status: response.status || 400 }
      );
    }

    return Response.json({
      result: true,
      message: json?.text || json?.result || "Профиль успешно удалён",
      raw: json,
    });
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка удаления профиля" },
      { status: 500 }
    );
  }
}
