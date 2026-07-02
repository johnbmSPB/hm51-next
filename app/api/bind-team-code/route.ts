export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const code = String(data.code || "").trim();
    const tel = String(data.tel || "").trim();

    const body = new URLSearchParams();
    body.append("token", token);
    body.append("code", code);
    body.append("tel", tel);

    const response = await fetch("https://itandsports.ru/gamers/bind_by_telcode.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    const responseStr = await response.text();

    console.log("BindByTelCode server response:", responseStr);

    let obj: any = null;

    try {
      obj = responseStr ? JSON.parse(responseStr) : null;
    } catch {
      return Response.json({
        result: false,
        text: "Сервер вернул не JSON",
        serverResponse: responseStr,
      });
    }

    return Response.json({
      result: obj?.result === true,
      text: obj?.text || "Сервер вернул пустой ответ",
      gamer_id: obj?.gamer_id ?? null,
      serverResponse: responseStr,
    });
  } catch (error: any) {
    return Response.json({
      result: false,
      text: error?.message || "Ошибка сети",
    });
  }
}
