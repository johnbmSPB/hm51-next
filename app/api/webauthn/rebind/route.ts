import {
  rebindCredentialCookie,
  resolveWebAuthnRp,
  validateWebAuthnToken,
  webAuthnErrorResponse,
} from "../../../lib/webauthnServer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const oldToken = String(data.oldToken || "").trim();
    const newToken = String(data.newToken || "").trim();
    const login = String(data.login || "").trim();

    if (!oldToken || !newToken || !login) {
      return Response.json(
        { result: false, error: "Не переданы данные для обновления биометрического входа" },
        { status: 400 }
      );
    }

    await validateWebAuthnToken(newToken);
    const rp = resolveWebAuthnRp(request);
    const rebound = rebindCredentialCookie(
      request,
      oldToken,
      newToken,
      login,
      rp
    );

    return Response.json(
      { result: true, rebound: true },
      {
        headers: {
          "Set-Cookie": rebound.header,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return webAuthnErrorResponse(error, "Не удалось обновить биометрический вход");
  }
}
