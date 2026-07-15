function encodeSafe(text: string) {
  let result = "";

  for (const char of text) {
    const codePoint = char.codePointAt(0);

    if (codePoint && codePoint > 0xffff) {
      result += `\\u{${codePoint.toString(16)}}`;
    } else {
      result += char;
    }
  }

  return result;
}

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
    raw,
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
    const messageText = String(data.text || data.TEXT || "").trim();
    const messID = String(data.messID || data.MESS_ID || "").trim();
    const replyTo = String(data.replyTo || data.REPLY_TO || "").trim();

    if (!token) return Response.json({ result: false, error: "Токен не передан" }, { status: 400 });
    if (!teamId) return Response.json({ result: false, error: "Команда не выбрана" }, { status: 400 });
    if (!messageText) return Response.json({ result: false, error: "Сообщение пустое" }, { status: 400 });
    if (!messID) return Response.json({ result: false, error: "MESS_ID не передан" }, { status: 400 });

    // Полностью повторяем рабочий Android ChatRepository.sendTeamMessageToServer().
    // Сервер восстанавливает REPLY_TEXT и REPLY_SENDER по REPLY_TO.
    const params: Record<string, string> = {
      token,
      TEXT: encodeSafe(messageText),
      MESS_ID: messID,
      TEAM_ID: teamId,
    };

    if (replyTo) params.REPLY_TO = replyTo;

    const result = await postForm("https://itandsports.ru/chats/send_team_chat.php", params);

    if (!result.ok || serverRejected(result.json)) {
      return Response.json(
        {
          result: false,
          error: result.json?.error || result.json?.ERROR || "Сервер не принял сообщение",
          server: result.json,
          raw: result.raw,
        },
        { status: result.ok ? 400 : 502 }
      );
    }

    return Response.json({
      result: true,
      message_id:
        result.json?.message_id ||
        result.json?.MESSAGE_ID ||
        result.json?.ID ||
        messID,
      server: result.json,
      raw: result.raw,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка отправки сообщения",
      },
      { status: 500 }
    );
  }
}
