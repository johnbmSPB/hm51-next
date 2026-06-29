function detectContentType(bytes: Uint8Array) {
  if (bytes.length >= 8) {
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return "image/png";
    }
  }

  if (bytes.length >= 3) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "image/jpeg";
    }
  }

  if (bytes.length >= 12) {
    const text = Buffer.from(bytes.slice(0, 12)).toString("utf8");
    if (text.includes("RIFF")) return "image/webp";
  }

  return "image/jpeg";
}

function isDirectImage(bytes: Uint8Array) {
  if (bytes.length < 4) return false;

  const png =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;

  const jpg =
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  const webp =
    bytes.length >= 12 &&
    Buffer.from(bytes.slice(0, 12)).toString("utf8").includes("RIFF");

  return png || jpg || webp;
}

function parseServerImage(data: Buffer) {
  if (isDirectImage(data)) {
    return data;
  }

  const separators = ["\r\n", "\n"];

  for (const separator of separators) {
    const sep = Buffer.from(separator);
    let positions: number[] = [];
    let start = 0;

    while (positions.length < 3) {
      const index = data.indexOf(sep, start);
      if (index === -1) break;

      positions.push(index);
      start = index + sep.length;
    }

    if (positions.length === 3) {
      const imageStart = positions[2] + sep.length;
      const imageBytes = data.subarray(imageStart);

      if (isDirectImage(imageBytes)) {
        return imageBytes;
      }
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const teamId = String(data.teamId || "").trim();

    if (!token) {
      return Response.json(
        { result: false, error: "Токен не передан" },
        { status: 400 }
      );
    }

    if (!teamId) {
      return Response.json(
        { result: false, error: "team_id не передан" },
        { status: 400 }
      );
    }

    const body = new URLSearchParams();
    body.append("token", token);
    body.append("team_id", teamId);

    const response = await fetch("https://itandsports.ru/teams/get_picture.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "HM51-Web/1.0",
      },
      body,
      cache: "no-store",
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!response.ok || buffer.length === 0) {
      return Response.json(
        { result: false, error: "Логотип команды не найден" },
        { status: 404 }
      );
    }

    const textStart = buffer.subarray(0, Math.min(buffer.length, 120)).toString("utf8");

    if (textStart.includes('"result":false') || textStart.trim() === "0") {
      return Response.json(
        { result: false, error: "Логотип команды отсутствует" },
        { status: 404 }
      );
    }

    const image = parseServerImage(buffer);

    if (!image) {
      return Response.json(
        {
          result: false,
          error: "Сервер вернул логотип в неизвестном формате",
          preview: textStart,
        },
        { status: 500 }
      );
    }

    const imageBody = image.buffer.slice(
  image.byteOffset,
  image.byteOffset + image.byteLength
) as ArrayBuffer;

return new Response(imageBody, {
  status: 200,
  headers: {
    "Content-Type": detectContentType(image),
  },
});
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка загрузки логотипа",
      },
      { status: 500 }
    );
  }
}
