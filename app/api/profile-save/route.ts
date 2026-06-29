function toServerDate(value: string) {
  const trimmed = String(value || "").trim();

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split(".");
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

async function postForm(url: string, params: Record<string, string>) {
  const body = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    body.append(key, value);
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      "User-Agent": "HM51-Web/1.0",
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
    text,
  };
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();

    if (!token) {
      return Response.json(
        { result: false, error: "Токен не передан" },
        { status: 400 }
      );
    }

    const result = await postForm("https://itandsports.ru/gamers/edit.php", {
      token,
      family: String(data.family || "").trim(),
      name: String(data.name || "").trim(),
      midname: String(data.midname || "").trim(),
      birthday: toServerDate(String(data.birthday || "")),
      tel: String(data.tel || "").trim(),
      email: String(data.email || "").trim(),
    });

    if (!result.ok) {
      return Response.json(
        { result: false, error: "Ошибка сервера", raw: result.text },
        { status: result.status }
      );
    }

    if (result.json?.error) {
      return Response.json(
        { result: false, error: result.json.error, raw: result.json },
        { status: 400 }
      );
    }

    return Response.json({
      result: true,
      message:
        result.json?.text ||
        result.json?.result ||
        result.json?.message ||
        "Основные данные профиля успешно сохранены",
      raw: result.json,
    });
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка сохранения профиля" },
      { status: 500 }
    );
  }
}
