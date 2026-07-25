import { requireCoachRole } from "../../../lib/serverRoles";

function toServerDate(value: string) {
  const trimmed = String(value || "").trim();

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split(".");
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

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
    message.includes("успеш") ||
    message.includes("сохран") ||
    message.includes("измен")
  );
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const trainerId = String(data.trainerId || data.trainer_id || "").trim();
    const family = String(data.family || "").trim();
    const name = String(data.name || "").trim();
    const midname = String(data.midname || "").trim();
    const birthday = toServerDate(String(data.birthday || ""));
    const tel = String(data.tel || "").replace(/\D/g, "");
    const specialization = String(data.specialization || "").trim();

    if (!token) {
      return Response.json({ result: false, error: "Токен не передан" }, { status: 401 });
    }

    const access = await requireCoachRole(token);
    if (!access.ok) return access.response;

    if (!family || !name || !birthday || !tel || !specialization) {
      return Response.json(
        { result: false, error: "Заполните фамилию, имя, дату рождения, телефон и специализацию" },
        { status: 400 }
      );
    }

    const params = {
      token,
      trainer_id: trainerId,
      TRAINER_ID: trainerId,
      family,
      name,
      midname,
      birthday,
      tel,
      specialization,
    };

    let result = await postForm("https://itandsports.ru/trainers/edit.php", params);

    if (result.response.status === 404 || result.response.status === 405) {
      result = await postForm("https://itandsports.ru/trainers/edit_trainer.php", params);
    }

    const message = getMessage(result.json, result.text);

    if (!isSuccess(result.response, result.json, result.text)) {
      return Response.json(
        {
          result: false,
          error: message || "Не удалось сохранить данные тренера",
          raw: result.json,
        },
        { status: result.response.status >= 400 ? result.response.status : 400 }
      );
    }

    return Response.json({
      result: true,
      message: message || "Данные тренера сохранены",
      raw: result.json,
    });
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка сохранения данных тренера" },
      { status: 500 }
    );
  }
}
