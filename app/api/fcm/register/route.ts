async function postForm(url: string, params: Record<string, string>) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => body.append(key, value));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      "User-Agent": "HM51-Web/2.0",
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

  return { ok: response.ok, json };
}

function serverRejected(json: any) {
  const status = String(json?.status || json?.STATUS || "").trim().toLowerCase();
  return (
    json?.result === false ||
    json?.RESULT === false ||
    json?.success === false ||
    json?.SUCCESS === false ||
    status === "error" ||
    status === "failed" ||
    status === "failure"
  );
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

    const result = await postForm("https://itandsports.ru/users/set_fcm.php", {
      token,
      fcm_token: fcmToken,
      device_id: deviceId,
      platform,
      device_name: deviceName,
    });

    if (!result.ok || serverRejected(result.json)) {
      return Response.json(
        {
          result: false,
          error: result.json?.error || result.json?.ERROR || "Сервер не сохранил FCM токен",
        },
        { status: result.ok ? 400 : 502 }
      );
    }

    return Response.json({
      result: true,
      device_id: deviceId,
      platform,
    });
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка регистрации FCM" },
      { status: 500 }
    );
  }
}
