import {
  clearWebAuthnCookie,
  credentialCookie,
  readCeremonyState,
  resolveWebAuthnRp,
  validateWebAuthnToken,
  verifyRegistrationCeremony,
  WEBAUTHN_REGISTER_COOKIE,
  webAuthnErrorResponse,
  type RegistrationResponseJSON,
} from "../../../../lib/webauthnServer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();
    const login = String(data.login || "").trim();
    const response = data.response as RegistrationResponseJSON;

    if (!token || !login || !response) {
      return Response.json(
        { result: false, error: "Не передан результат настройки биометрии" },
        { status: 400 }
      );
    }

    const roles = await validateWebAuthnToken(token);
    const rp = resolveWebAuthnRp(request);
    const state = readCeremonyState(request, token, "register", login, rp);
    const credential = verifyRegistrationCeremony(response, state, login);

    const headers = new Headers({ "Cache-Control": "no-store" });
    headers.append("Set-Cookie", credentialCookie(credential, token, rp.secure));
    headers.append(
      "Set-Cookie",
      clearWebAuthnCookie(WEBAUTHN_REGISTER_COOKIE, rp.secure)
    );

    return Response.json(
      {
        result: true,
        verified: true,
        credentialId: credential.credentialId,
        roles,
      },
      { headers }
    );
  } catch (error) {
    return webAuthnErrorResponse(error, "Устройство не подтвердило настройку биометрии");
  }
}
