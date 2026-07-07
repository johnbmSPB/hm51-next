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
    raw: text,
  };
}

function isSuccessResponse(json: any) {
  if (!json) return false;

  if (typeof json.error === "string" && json.error.trim()) {
    return false;
  }

  const result = json.result ?? json.RESULT;

  if (result === true || result === 1 || result === "1") return true;

  // В iOS-коде любой непустой string result считается успешным ответом.
  if (typeof result === "string" && result.trim()) return true;

  return false;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const newEmail = String(
      data.new_email ||
        data.newEmail ||
        data.email ||
        ""
    ).trim();

    if (!token) {
      return Response.json(
        { result: false, error: "Токен пользователя не найден" },
        { status: 400 }
      );
    }

    if (!newEmail || !newEmail.includes("@") || !newEmail.includes(".")) {
      return Response.json(
        { result: false, error: "Введите корректный email" },
        { status: 400 }
      );
    }

    const result = await postForm(
      "https://itandsports.ru/users/change_email.php",
      {
        token,
        new_email: newEmail,
      }
    );

    const message =
      result.json?.result ||
      result.json?.RESULT ||
      result.json?.message ||
      result.json?.MESSAGE ||
      result.json?.text ||
      result.json?.TEXT ||
      "";

    if (!result.ok || !isSuccessResponse(result.json)) {
      return Response.json(
        {
          result: false,
          error:
            result.json?.error ||
            result.json?.ERROR ||
            message ||
            "Сервер не подтвердил смену email",
          server: result.json,
          raw: result.raw,
        },
        { status: 500 }
      );
    }

    return Response.json({
      result: true,
      message: message || "Эл. почта успешно изменена",
      email: newEmail,
      server: result.json,
      raw: result.raw,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка смены email",
      },
      { status: 500 }
    );
  }
}
