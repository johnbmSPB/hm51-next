import { phpProxyErrorResponse, postPhpForm, type PhpJson } from "../../../lib/phpProxy";

function deleteConfirmed(json: PhpJson, requestedMessageId: string) {
  const returnedId = String(
    json.message_id || json.MESSAGE_ID || json.id || json.ID || ""
  ).trim();
  if (returnedId && (!requestedMessageId || returnedId === requestedMessageId)) return true;

  for (const key of [
    "deleted",
    "DELETED",
    "delete",
    "DELETE",
    "message",
    "MESSAGE",
    "status",
    "STATUS",
    "action",
    "ACTION",
  ]) {
    const value = String(json[key] ?? "").trim().toLowerCase();
    if (!value) continue;

    if (["1", "true", "ok", "success", "done"].includes(value)) return true;
    if (/удал(ен|ено|ена|ены|ить)|deleted|removed|delete\s+success/.test(value)) return true;
  }

  return false;
}

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
      "Сервер не принял удаление сообщения",
      {
        acceptImplicitSuccess: (json) => deleteConfirmed(json, messageId),
      }
    );

    return Response.json({
      result: true,
      message_id: result.message_id || result.MESSAGE_ID || result.id || result.ID || messageId,
    });
  } catch (error: unknown) {
    return phpProxyErrorResponse(error, "Ошибка удаления сообщения");
  }
}
