import { phpProxyErrorResponse, postPhpForm } from "../../../lib/phpProxy";

function encodeSafe(text: string) {
  let result = "";
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    result += codePoint && codePoint > 0xffff ? `\\u{${codePoint.toString(16)}}` : char;
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();
    const teamId = String(data.teamId || data.TEAM_ID || "").trim();
    const messageText = String(data.text || data.TEXT || "").trim();
    const clientId = String(data.clientId || data.CLIENT_ID || data.messID || data.MESS_ID || "").trim();
    const replyTo = String(data.replyTo || data.REPLY_TO || "").trim();
    const replyText = String(data.replyText || data.REPLY_TEXT || "").trim();
    const replySender = String(
      data.replySender || data.REPLY_SENDER || data.replyAuthor || data.REPLY_AUTHOR || ""
    ).trim();

    if (!token) return Response.json({ result: false, error: "Токен не передан" }, { status: 400 });
    if (!teamId) return Response.json({ result: false, error: "Команда не выбрана" }, { status: 400 });
    if (!messageText) return Response.json({ result: false, error: "Сообщение пустое" }, { status: 400 });
    if (!clientId) return Response.json({ result: false, error: "CLIENT_ID не передан" }, { status: 400 });

    const params: Record<string, string> = {
      token,
      TEXT: encodeSafe(messageText),
      TEAM_ID: teamId,
      CLIENT_ID: clientId,
      MESS_ID: clientId,
    };

    if (replyTo) params.REPLY_TO = replyTo;
    if (replyText) params.REPLY_TEXT = encodeSafe(replyText);
    if (replySender) {
      params.REPLY_SENDER = encodeSafe(replySender);
      params.REPLY_AUTHOR = encodeSafe(replySender);
    }

    const result = await postPhpForm(
      "https://itandsports.ru/chats/send_team_chat.php",
      params,
      "Сервер не принял сообщение"
    );

    const messageId = String(result.message_id || result.MESSAGE_ID || result.ID || "").trim();

    return Response.json({
      result: true,
      client_id: clientId,
      message_id: messageId,
    });
  } catch (error: unknown) {
    return phpProxyErrorResponse(error, "Ошибка отправки сообщения");
  }
}
