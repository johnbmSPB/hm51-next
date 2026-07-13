async function postForm(url: string, params: Record<string, string>) {
  const body = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== "") body.append(key, value);
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
  let json: any;

  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { response, text, json };
}

function getMessage(json: any, fallback: string) {
  return String(
    json?.text ||
      json?.TEXT ||
      json?.message ||
      json?.MESSAGE ||
      json?.error ||
      json?.ERROR ||
      fallback
  ).trim();
}

function isDeleteUserSuccess(response: Response, json: any, text: string) {
  if (!response.ok || json?.result === false || json?.error || json?.ERROR) return false;

  const message = getMessage(json, text).toLowerCase();
  return (
    json?.result === true ||
    message === "ok" ||
    message.includes("удален") ||
    message.includes("удалён") ||
    message.includes("успеш")
  );
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();
    const hasPlayerProfile = Boolean(data.hasPlayerProfile);

    if (!token) {
      return Response.json({ result: false, error: "Токен не передан" }, { status: 400 });
    }

    // В текущем API XM 5.1 есть только users/delete_user.php,
    // который удаляет всю учётную запись. Для совмещённого аккаунта
    // безопасно отключаем только веб-профиль тренера.
    if (hasPlayerProfile) {
      return Response.json({
        result: true,
        localOnly: true,
        accountDeleted: false,
        message: "Профиль тренера отключён. Профиль игрока и учётная запись сохранены.",
      });
    }

    const result = await postForm("https://itandsports.ru/users/delete_user.php", { token });
    const message = getMessage(result.json, result.text || "Не удалось удалить учётную запись");

    if (!isDeleteUserSuccess(result.response, result.json, result.text)) {
      return Response.json(
        {
          result: false,
          error:
            result.response.status === 404
              ? "Серверный метод удаления временно недоступен"
              : message || "Не удалось удалить профиль тренера",
        },
        { status: result.response.status >= 400 ? result.response.status : 400 }
      );
    }

    return Response.json({
      result: true,
      localOnly: false,
      accountDeleted: true,
      message: message || "Учётная запись тренера удалена",
    });
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка удаления профиля тренера" },
      { status: 500 }
    );
  }
}
