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

function getMessage(json: any, text: string) {
  return String(
    json?.text ||
      json?.TEXT ||
      json?.message ||
      json?.MESSAGE ||
      json?.error ||
      json?.ERROR ||
      text ||
      ""
  ).trim();
}

function isSuccess(response: Response, json: any, text: string) {
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
    const trainerId = String(data.trainerId || data.trainer_id || "").trim();

    if (!token) {
      return Response.json({ result: false, error: "Токен не передан" }, { status: 400 });
    }

    const params = {
      token,
      trainer_id: trainerId,
      TRAINER_ID: trainerId,
    };

    let result = await postForm("https://itandsports.ru/trainers/delete_trainer.php", params);

    if (result.response.status === 404 || result.response.status === 405) {
      result = await postForm("https://itandsports.ru/trainers/delete.php", params);
    }

    const message = getMessage(result.json, result.text);

    if (!isSuccess(result.response, result.json, result.text)) {
      return Response.json(
        {
          result: false,
          error: message || "Не удалось удалить профиль тренера",
          raw: result.json,
        },
        { status: result.response.status >= 400 ? result.response.status : 400 }
      );
    }

    return Response.json({
      result: true,
      message: message || "Профиль тренера удалён",
      raw: result.json,
    });
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка удаления профиля тренера" },
      { status: 500 }
    );
  }
}
