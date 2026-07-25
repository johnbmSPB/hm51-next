import {
  ceremonyCookie,
  makeCeremonyState,
  registrationOptions,
  resolveWebAuthnRp,
  validateWebAuthnToken,
  webAuthnErrorResponse,
} from "../../../../lib/webauthnServer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();
    const login = String(data.login || "").trim();

    if (!token || !login) {
      return Response.json(
        { result: false, error: "Не переданы данные для настройки биометрии" },
        { status: 400 }
      );
    }

    await validateWebAuthnToken(token);
    const rp = resolveWebAuthnRp(request);
    const state = makeCeremonyState("register", login, rp);

    return Response.json(
      { result: true, options: registrationOptions(state, login) },
      {
        headers: {
          "Set-Cookie": ceremonyCookie(state, token, rp.secure),
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return webAuthnErrorResponse(error, "Не удалось начать настройку биометрии");
  }
}
