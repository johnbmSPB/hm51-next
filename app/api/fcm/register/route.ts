async function postForm(url: string, params: Record<string, string>) {
  const body = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    body.append(key, value);
  });

  const response = await fetch(url, {
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
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
    text,
  };
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const fcmToken = String(data.fcmToken || "").trim();

    if (!token) {
      return Response.json(
        { result: false, error: "Токен пользователя не передан" },
        { status: 400 }
      );
    }

    if (!fcmToken) {
      return Response.json(
        { result: false, error: "FCM токен не передан" },
        { status: 400 }
      );
    }

    const result = await postForm("https://itandsports.ru/users/set_fcm.php", {
      token,
      fcm_token: fcmToken,
    });

    if (!result.ok) {
      return Response.json(
        {
          result: false,
          error: "Сервер не сохранил FCM токен",
          server: result.json,
          raw: result.text,
        },
        { status: 500 }
      );
    }

    return Response.json({
      result: true,
      server: result.json,
      raw: result.text,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка регистрации FCM",
      },
      { status: 500 }
    );
  }
}
