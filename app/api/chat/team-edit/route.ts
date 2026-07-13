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
    const messageId = String(data.messageId || data.messID || "").trim();
    const text = String(data.text || "").trim();

    if (!token) return Response.json({ result: false, error: "Токен не передан" }, { status: 400 });
    if (!teamId) return Response.json({ result: false, error: "Команда не выбрана" }, { status: 400 });
    if (!messageId) return Response.json({ result: false, error: "MESS_ID не передан" }, { status: 400 });
    if (!text) return Response.json({ result: false, error: "Сообщение пустое" }, { status: 400 });

    const result = await postForm("https://itandsports.ru/chats/edit_team_message.php", {
      token,
      TEAM_ID: teamId,
      MESS_ID: messageId,
      TEXT: encodeSafe(text),
    });

    if (!result.ok) {
      return Response.json(
        {
          result: false,
          error: "Сервер не принял изменение сообщения",
          server: result.json,
          raw: result.text,
        },
        { status: 500 }
      );
    }

    return Response.json({
      result: true,
      message_id: result.json?.message_id || messageId,
      server: result.json,
      raw: result.text,
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
