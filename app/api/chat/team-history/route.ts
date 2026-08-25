function clean(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function decodeEmojiUnicode(text: string) {
  return String(text || "").replace(/\\u\{([0-9a-fA-F]+)\}/g, (match, hex) => {
    const codePoint = Number.parseInt(hex, 16);
    if (!Number.isFinite(codePoint)) return match;
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return match;
    }
  });
}

function timestampOf(date: string, time: string) {
  const normalizedDate = clean(date);
  const normalizedTime = clean(time);
  if (!normalizedDate || !normalizedTime) return 0;

  const parsed = Date.parse(`${normalizedDate}T${normalizedTime}`);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function lastServerIdFromRows(rows: any[], fallback: string) {
  // LAST_ID — это ID именно последнего сообщения в массиве,
  // который вернул сервер, а не максимум по времени/локальному кэшу/push.
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const id = clean(rows[index]?.ID);
    if (id) return id;
  }
  return fallback || "0";
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = clean(data.token);
    const teamId = clean(data.teamId || data.TEAM_ID);
    const lastId = clean(data.lastId || data.LAST_ID) || "0";
    const gamerId = clean(data.gamerId || data.GAMER_ID);
    const rawList = Array.isArray(data.listId || data.LIST_ID)
      ? (data.listId || data.LIST_ID)
      : [];
    const listId = rawList.map(clean).filter(Boolean).slice(-250);

    if (!token) {
      return Response.json({ result: false, error: "Токен не передан" }, { status: 400 });
    }
    if (!teamId) {
      return Response.json({ result: false, error: "Команда не выбрана" }, { status: 400 });
    }

    const form = new URLSearchParams();
    form.set("token", token);
    form.set("TEAM_ID", teamId);
    form.set("LAST_ID", lastId);
    form.set("LIST_ID", `[${listId.join(",")}]`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    let text = "";
    try {
      response = await fetch("https://itandsports.ru/chats/get_team_history.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
          "User-Agent": "HM51-Web/2.0",
        },
        body: form,
        cache: "no-store",
        signal: controller.signal,
      });
      text = await response.text();
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return Response.json(
        { result: false, error: "Сервер не вернул историю сообщений" },
        { status: 502 }
      );
    }

    if (!text.trim()) {
      return Response.json({ result: true, messages: [], lastServerId: lastId });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json(
        { result: false, error: "Сервер вернул некорректную историю сообщений" },
        { status: 502 }
      );
    }

    if (!Array.isArray(parsed)) {
      return Response.json(
        { result: false, error: "Сервер вернул историю в неизвестном формате" },
        { status: 502 }
      );
    }

    const rows = parsed as any[];
    const serverLastId = lastServerIdFromRows(rows, lastId);

    const base = rows
      .map((item: any) => {
        const id = clean(item?.ID);
        if (!id) return null;

        const senderId = clean(item?.GAMER);
        const author = [item?.FAMILY, item?.NAME, item?.MIDNAME]
          .map(clean)
          .filter(Boolean)
          .join(" ") || "Игрок";
        const date = clean(item?.ADATE);
        const time = clean(item?.ATIME);
        const textValue = decodeEmojiUnicode(clean(item?.TEXT));
        const replyTo = clean(item?.REPLY);

        return {
          id,
          messageId: id,
          senderId,
          author,
          text: textValue,
          time,
          date,
          createdAt: timestampOf(date, time),
          replyTo,
          isMine: !!gamerId && senderId === gamerId,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        messageId: string;
        senderId: string;
        author: string;
        text: string;
        time: string;
        date: string;
        createdAt: number;
        replyTo: string;
        isMine: boolean;
      }>;

    const byId = new Map(base.map((message) => [message.id, message]));
    const messages = base.map((message) => {
      const replied = message.replyTo ? byId.get(message.replyTo) : undefined;
      return {
        clientId: `server:${message.id}`,
        messageId: message.id,
        teamId,
        author: message.isMine ? "Вы" : message.author,
        text: message.text,
        time: message.time,
        isMine: message.isMine,
        createdAt: message.createdAt || undefined,
        status: "delivered",
        quote: replied
          ? {
              messageId: replied.id,
              author: replied.isMine ? "Вы" : replied.author,
              text: replied.text,
            }
          : undefined,
      };
    });

    return Response.json({ result: true, messages, lastServerId: serverLastId });
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Ошибка загрузки истории чата";
    return Response.json({ result: false, error: message }, { status: 500 });
  }
}
