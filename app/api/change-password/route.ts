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
    json,
  };
}

function serverMessage(json: any) {
  if (!json) return "";

  return String(
    json.result ??
      json.RESULT ??
      json.error ??
      json.ERROR ??
      json.message ??
      json.MESSAGE ??
      ""
  ).trim();
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();
    const newPassword = String(
      data.new_password || data.newPassword || ""
    );

    if (!token) {
      return Response.json(
        { result: false, error: "Токен пользователя не найден" },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return Response.json(
        { result: false, error: "Введите новый пароль" },
        { status: 400 }
      );
    }

    const result = await postForm(
      "https://itandsports.ru/users/change_password.php",
      {
        token,
        new_password: newPassword,
      }
    );

    const message = serverMessage(result.json);
    const success =
      result.ok &&
      (result.json?.result === true ||
        String(result.json?.result ?? result.json?.RESULT ?? "")
          .trim()
          .toLowerCase() === "true");

    if (!success) {
      return Response.json(
        {
          result: false,
          error: message || "Сервер не подтвердил смену пароля",
        },
        { status: result.ok ? 400 : 502 }
      );
    }

    return Response.json({
      result: true,
      message: "Пароль успешно изменён",
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка смены пароля",
      },
      { status: 500 }
    );
  }
}
