import { phpProxyErrorResponse, postPhpForm } from "../../../lib/phpProxy";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();
    const teamId = String(data.teamId || data.TEAM_ID || "").trim();
    const messageId = String(data.messageId || data.MESSAGE_ID || data.messID || "").trim();

    if (!token) return Response.json({ result: false, error: "Токен не передан" }, { status: 400 });
    if (!teamId) return Response.json({ result: false, error: "Команда не выбрана" }, { status: 400 });
    if (!messageId) return Response.json({ result: false, error: "MESSAGE_ID не передан" }, { status: 400 });

    const result = await postPhpForm(
      "https://itandsports.ru/chats/delete_from_team_chat.php",
      {
        token,
        TEAM_ID: teamId,
        MESSAGE_ID: messageId,
      },
      "Сервер не принял удаление сообщения"
    );

    return Response.json({
      result: true,
      message_id: result.message_id || result.MESSAGE_ID || messageId,
    });
  } catch (error: unknown) {
    return phpProxyErrorResponse(error, "Ошибка удаления сообщения");
  }
}
