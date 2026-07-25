import {
  clearWebAuthnCookie,
  resolveWebAuthnRp,
  WEBAUTHN_AUTH_COOKIE,
  WEBAUTHN_CREDENTIAL_COOKIE,
  WEBAUTHN_REGISTER_COOKIE,
  webAuthnErrorResponse,
} from "../../../lib/webauthnServer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rp = resolveWebAuthnRp(request);
    const headers = new Headers({ "Cache-Control": "no-store" });

    for (const name of [
      WEBAUTHN_CREDENTIAL_COOKIE,
      WEBAUTHN_REGISTER_COOKIE,
      WEBAUTHN_AUTH_COOKIE,
    ]) {
      headers.append("Set-Cookie", clearWebAuthnCookie(name, rp.secure));
    }

    return Response.json({ result: true, disabled: true }, { headers });
  } catch (error) {
    return webAuthnErrorResponse(error, "Не удалось отключить биометрический вход");
  }
}
