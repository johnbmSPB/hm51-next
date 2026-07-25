import {
  makeAttendanceErrorPayload,
  makeAttendanceSuccessPayload,
  type AttendanceAgree,
} from "../../lib/attendanceResponse";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
};

function jsonResponse(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: PRIVATE_RESPONSE_HEADERS,
  });
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
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: response.ok,
    json,
  };
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const eventId = String(data.eventId || "").trim();
    const memberId = String(data.memberId || "").trim();
    const type = String(data.type || "game").trim();

    const agree: AttendanceAgree =
      data.agree === true ||
      data.agree === "true" ||
      data.agree === "1" ||
      data.agree === 1
        ? "true"
        : "false";

    if (!token) {
      return jsonResponse(
        makeAttendanceErrorPayload("Токен не передан"),
        400
      );
    }

    if (!eventId) {
      return jsonResponse(
        makeAttendanceErrorPayload("ID события не передан"),
        400
      );
    }

    const isTraining = type === "training";

    const url = isTraining
      ? "https://itandsports.ru/trainings/set_agree.php"
      : "https://itandsports.ru/games/set_game_agree.php";

    const paramName = isTraining ? "training_id" : "game_member";
    const idForServer = isTraining ? eventId : memberId;

    if (!isTraining && !idForServer) {
      return jsonResponse(
        makeAttendanceErrorPayload("Не удалось определить участника игры"),
        400
      );
    }

    const upstreamParams: Record<string, string> = {
      token,
      agree,
      [paramName]: idForServer,
    };

    const result = await postForm(url, upstreamParams);

    if (!result.ok || result.json?.result !== true) {
      return jsonResponse(
        makeAttendanceErrorPayload("Сервер не сохранил статус"),
        500
      );
    }

    return jsonResponse(makeAttendanceSuccessPayload(agree));
  } catch {
    return jsonResponse(
      makeAttendanceErrorPayload("Ошибка отправки участия"),
      500
    );
  }
}
