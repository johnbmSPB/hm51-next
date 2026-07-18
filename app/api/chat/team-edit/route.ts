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

  const raw = await response.text();
  let json: any = null;

  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
  };
}

function serverRejected(json: any) {
  return json?.result === false || json?.RESULT === false;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const teamId = String(data.teamId || data.TEAM_ID || "").trim();
    const messageId = String(data.messageId || data.MESSAGE_ID || data.messID || "").trim();
    const newText = String(data.text || data.newText || data.NEW_TEXT || "").trim();

    if (!token) return Response.json({ result: false, error: "Токен не передан" }, { status: 400 });
    if (!teamId) return Response.json({ result: false, error: "Команда не выбрана" }, { status: 400 });
    if (!messageId) return Response.json({ result: false, error: "MESSAGE_ID не передан" }, { status: 400 });
    if (!newText) return Response.json({ result: false, error: "Сообщение пустое" }, { status: 400 });

    const result = await postForm("https://itandsports.ru/chats/edit_team_chat.php", {
      token,
      TEAM_ID: teamId,
      MESSAGE_ID: messageId,
      NEW_TEXT: newText,
    });

    if (!result.ok || serverRejected(result.json)) {
      return Response.json(
        {
          result: false,
          error: result.json?.error || result.json?.ERROR || "Сервер не принял изменение сообщения",
        },
        { status: result.ok ? 400 : 502 }
      );
    }

    return Response.json({
      result: true,
      message_id: result.json?.message_id || result.json?.MESSAGE_ID || messageId,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка изменения сообщения",
      },
      { status: 500 }
    );
  }
}
