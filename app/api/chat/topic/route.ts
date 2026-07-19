import { phpProxyErrorResponse, postPhpForm } from "../../../lib/phpProxy";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();
    const teamId = String(data.teamId || data.TEAM_ID || "").trim();
    const action = String(data.action || data.ACTION || "subscribe").trim().toLowerCase();
    const fcmToken = String(data.fcmToken || data.fcm_token || "").trim();
    const deviceId = String(data.deviceId || data.device_id || "").trim();
    const platform = String(data.platform || "web").trim();

    if (!token) return Response.json({ result: false, error: "Токен не передан" }, { status: 400 });
    if (!teamId) return Response.json({ result: false, error: "Команда не выбрана" }, { status: 400 });
    if (action !== "subscribe" && action !== "unsubscribe") {
      return Response.json({ result: false, error: "Некорректное действие topic" }, { status: 400 });
    }

    const params: Record<string, string> = {
      token,
      TEAM_ID: teamId,
      ACTION: action,
      platform,
    };
    if (fcmToken) params.fcm_token = fcmToken;
    if (deviceId) params.device_id = deviceId;

    await postPhpForm(
      "https://itandsports.ru/chats/set_topic.php",
      params,
      "Сервер не выполнил подписку на topic"
    );

    return Response.json({
      result: true,
      teamId,
      action,
      topic: `team_${teamId}`,
      device_id: deviceId,
      platform,
    });
  } catch (error: unknown) {
    return phpProxyErrorResponse(error, "Ошибка подписки на topic");
  }
}
