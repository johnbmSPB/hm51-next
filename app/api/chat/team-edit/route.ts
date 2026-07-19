import { CHAT_MESSAGE_MAX_LENGTH } from "../../../lib/chatLimits";
import { phpProxyErrorResponse, postPhpForm } from "../../../lib/phpProxy";

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
    if (newText.length > CHAT_MESSAGE_MAX_LENGTH) {
      return Response.json({ result: false, error: `Сообщение длиннее ${CHAT_MESSAGE_MAX_LENGTH} символов` }, { status: 400 });
    }

    const result = await postPhpForm(
      "https://itandsports.ru/chats/edit_team_chat.php",
      {
        token,
        TEAM_ID: teamId,
        MESSAGE_ID: messageId,
        NEW_TEXT: newText,
      },
      "Сервер не принял изменение сообщения"
    );

    return Response.json({
      result: true,
      message_id: result.message_id || result.MESSAGE_ID || messageId,
    });
  } catch (error: unknown) {
    return phpProxyErrorResponse(error, "Ошибка изменения сообщения");
  }
}
