import { requireCoachRole } from "../../../lib/serverRoles";

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

function hasPlayerRole(json: any) {
  if (!Array.isArray(json)) return false;

  return json.some((item) => {
    const role = String(item?.ROLE || item?.role || item || "").toUpperCase();
    return role === "GAMER_ROLE" || role === "PLAYER";
  });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();

    if (!token) {
      return Response.json({ result: false, error: "Токен не передан" }, { status: 401 });
    }

    const access = await requireCoachRole(token);
    if (!access.ok) return access.response;

    const rolesResult = await postForm("https://itandsports.ru/users/get_roles.php", { token });
    const dualRoleAccount =
      Boolean(data.hasPlayerProfile) ||
      (rolesResult.response.ok && hasPlayerRole(rolesResult.json));

    // В текущем API XM 5.1 подтверждён только users/delete_user.php,
    // который удаляет всю учётную запись. Для аккаунта игрок + тренер
    // безопасно отключаем только веб-профиль тренера и запоминаем это
    // между повторными входами в приложение.
    if (dualRoleAccount) {
      return Response.json(
        {
          result: true,
          localOnly: true,
          accountDeleted: false,
          message: "Профиль тренера отключён. Профиль игрока и учётная запись сохранены.",
        },
        {
          headers: {
            "Set-Cookie": "hm51_coach_profile_disabled=1; Path=/; Max-Age=31536000; SameSite=Lax",
          },
        }
      );
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

    return Response.json(
      {
        result: true,
        localOnly: false,
        accountDeleted: true,
        message: message || "Учётная запись тренера удалена",
      },
      {
        headers: {
          "Set-Cookie": "hm51_coach_profile_disabled=; Path=/; Max-Age=0; SameSite=Lax",
        },
      }
    );
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка удаления профиля тренера" },
      { status: 500 }
    );
  }
}
