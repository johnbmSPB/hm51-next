import { phpProxyErrorResponse, postPhpForm } from "../../../lib/phpProxy";

const ACTIVE_REGISTRATIONS = new Map<string, Promise<void>>();
const RECENT_REGISTRATIONS = new Map<string, number>();
const REGISTRATION_DEDUP_MS = 60_000;

async function registerOnce(
  key: string,
  params: Record<string, string>
) {
  const recent = RECENT_REGISTRATIONS.get(key) || 0;
  if (Date.now() - recent < REGISTRATION_DEDUP_MS) return;

  const active = ACTIVE_REGISTRATIONS.get(key);
  if (active) return active;

  const task = postPhpForm(
    "https://itandsports.ru/users/set_fcm.php",
    params,
    "Сервер не сохранил FCM токен"
  )
    .then(() => {
      RECENT_REGISTRATIONS.set(key, Date.now());
      if (RECENT_REGISTRATIONS.size > 500) {
        const cutoff = Date.now() - 5 * REGISTRATION_DEDUP_MS;
        for (const [savedKey, savedAt] of RECENT_REGISTRATIONS) {
          if (savedAt < cutoff) RECENT_REGISTRATIONS.delete(savedKey);
        }
      }
    })
    .finally(() => {
      ACTIVE_REGISTRATIONS.delete(key);
    });

  ACTIVE_REGISTRATIONS.set(key, task);
  return task;
}

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

    const key = `${deviceId}:${fcmToken}`;
    await registerOnce(key, {
      token,
      fcm_token: fcmToken,
      device_id: deviceId,
      platform,
      device_name: deviceName,
    });

    return Response.json({
      result: true,
      device_id: deviceId,
      platform,
    });
  } catch (error: unknown) {
    return phpProxyErrorResponse(error, "Ошибка регистрации FCM");
  }
}
