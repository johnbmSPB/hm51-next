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
    const teamId = String(data.teamId || "").trim();
    const text = String(data.text || "").trim();
    const messID = String(data.messID || "").trim();
    const replyTo = String(data.replyTo || "").trim();
    const replyText = String(data.replyText || "").trim();
    const replyAuthor = String(data.replyAuthor || "").trim();

    if (!token) {
      return Response.json({ result: false, error: "Токен не передан" }, { status: 400 });
    }

    if (!teamId) {
      return Response.json({ result: false, error: "Команда не выбрана" }, { status: 400 });
    }

    if (!text) {
      return Response.json({ result: false, error: "Сообщение пустое" }, { status: 400 });
    }

    if (!messID) {
      return Response.json({ result: false, error: "MESS_ID не передан" }, { status: 400 });
    }

    const params: Record<string, string> = {
      token,
      TEXT: encodeSafe(text),
      MESS_ID: messID,
      TEAM_ID: teamId,
    };

    if (replyTo) params.REPLY_TO = replyTo;
    if (replyText) params.REPLY_TEXT = encodeSafe(replyText);
    if (replyAuthor) params.REPLY_AUTHOR = encodeSafe(replyAuthor);

    const result = await postForm(
      "https://itandsports.ru/chats/send_team_chat.php",
      params
    );

    if (!result.ok) {
      return Response.json(
        {
          result: false,
          error: "Сервер не принял сообщение",
          server: result.json,
          raw: result.text,
        },
        { status: 500 }
      );
    }

    return Response.json({
      result: true,
      message_id: result.json?.message_id || messID,
      server: result.json,
      raw: result.text,
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
