async function postForm(url: string, params: Record<string, string>) {
  const body = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    body.append(key, value);
  });

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
    const clean = text.trim();
    const startObject = clean.indexOf("{");
    const startArray = clean.indexOf("[");
    const start =
      startObject >= 0 && startArray >= 0
        ? Math.min(startObject, startArray)
        : Math.max(startObject, startArray);
    const end = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));

    if (start >= 0 && end >= start) {
      try {
        json = JSON.parse(clean.slice(start, end + 1));
      } catch {
        json = null;
      }
    }
  }

  return { ok: response.ok, status: response.status, json };
}

function serverRejected(json: any) {
  return json?.result === false || json?.RESULT === false;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();
    const teamId = String(data.teamId || data.TEAM_ID || "").trim();
    const action = String(data.action || data.ACTION || "subscribe").trim() || "subscribe";
    const fcmToken = String(data.fcmToken || data.fcm_token || "").trim();
    const deviceId = String(data.deviceId || data.device_id || "").trim();
    const platform = String(data.platform || "web").trim();

    if (!token) return Response.json({ result: false, error: "Токен не передан" }, { status: 400 });
    if (!teamId) return Response.json({ result: false, error: "Команда не выбрана" }, { status: 400 });

    const params: Record<string, string> = {
      token,
      TEAM_ID: teamId,
      ACTION: action,
      platform,
    };
    if (fcmToken) params.fcm_token = fcmToken;
    if (deviceId) params.device_id = deviceId;

    const result = await postForm("https://itandsports.ru/chats/set_topic.php", params);

    if (!result.ok || serverRejected(result.json)) {
      return Response.json(
        {
          result: false,
          error: result.json?.error || result.json?.ERROR || "Сервер не выполнил подписку на topic",
        },
        { status: result.ok ? 400 : 502 }
      );
    }

    return Response.json({
      result: true,
      teamId,
      action,
      topic: `team_${teamId}`,
      device_id: deviceId,
      platform,
    });
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка подписки на topic" },
      { status: 500 }
    );
  }
}
