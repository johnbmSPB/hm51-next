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

function serverBool(value: any) {
  return value === true || value === "true" || value === "1" || value === 1 || value === "Ok";
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const teamId = String(data.teamId || data.TEAM_ID || "").trim();

    if (!token) {
      return Response.json(
        { result: false, text: "Токен не передан" },
        { status: 400 }
      );
    }

    if (!teamId) {
      return Response.json(
        { result: false, text: "Команда не выбрана" },
        { status: 400 }
      );
    }

    const result = await postForm(
      "https://itandsports.ru/gamer-team/ask_to_leave_team.php",
      {
        token,
        TEAM_ID: teamId,
      }
    );

    if (!result.ok) {
      return Response.json(
        {
          result: false,
          text: "Сервер не принял заявку на выход из команды",
          server: result.json,
          raw: result.text,
        },
        { status: 500 }
      );
    }

    const isSuccess = serverBool(result.json?.RESULT ?? result.json?.result);
    const textResult =
      result.json?.TEXT_RESULT ||
      result.json?.text ||
      result.json?.TEXT ||
      result.json?.message ||
      "";

    return Response.json({
      result: isSuccess,
      text:
        textResult ||
        (isSuccess
          ? "Заявка на выход из команды отправлена"
          : "Сервер не подтвердил выход из команды"),
      server: result.json,
      raw: result.text,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        text: error?.message || "Ошибка выхода из команды",
      },
      { status: 500 }
    );
  }
}
