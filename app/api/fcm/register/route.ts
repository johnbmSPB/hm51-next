import { phpProxyErrorResponse, postPhpForm } from "../../../lib/phpProxy";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();
    const fcmToken = String(data.fcmToken || data.fcm_token || "").trim();
    const deviceId = String(data.deviceId || data.device_id || "").trim();
    const platform = String(data.platform || "web").trim();
    const deviceName = String(data.deviceName || data.device_name || "").trim().slice(0, 500);

    if (!token) {
      return Response.json({ result: false, error: "Токен пользователя не передан" }, { status: 400 });
    }
    if (!fcmToken) {
      return Response.json({ result: false, error: "FCM токен не передан" }, { status: 400 });
    }
    if (!deviceId) {
      return Response.json({ result: false, error: "device_id не передан" }, { status: 400 });
    }

    await postPhpForm(
      "https://itandsports.ru/users/set_fcm.php",
      {
        token,
        fcm_token: fcmToken,
        device_id: deviceId,
        platform,
        device_name: deviceName,
      },
      "Сервер не сохранил FCM токен"
    );

    return Response.json({
      result: true,
      device_id: deviceId,
      platform,
    });
  } catch (error: unknown) {
    return phpProxyErrorResponse(error, "Ошибка регистрации FCM");
  }
}
