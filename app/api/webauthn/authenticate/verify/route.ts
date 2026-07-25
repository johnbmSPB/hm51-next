import {
  clearWebAuthnCookie,
  credentialCookie,
  readCeremonyState,
  readCredentialCookie,
  resolveWebAuthnRp,
  validateWebAuthnToken,
  verifyAuthenticationCeremony,
  WEBAUTHN_AUTH_COOKIE,
  webAuthnErrorResponse,
  type AuthenticationResponseJSON,
} from "../../../../lib/webauthnServer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();
    const login = String(data.login || "").trim();
    const response = data.response as AuthenticationResponseJSON;

    if (!token || !login || !response) {
      return Response.json(
        { result: false, error: "Не передан результат биометрического входа" },
        { status: 400 }
      );
    }

    const roles = await validateWebAuthnToken(token);
    const rp = resolveWebAuthnRp(request);
    const credential = readCredentialCookie(request, token, login, rp);
    const state = readCeremonyState(request, token, "authenticate", login, rp);
    const updatedCredential = verifyAuthenticationCeremony(
      response,
      state,
      credential
    );

    const headers = new Headers({ "Cache-Control": "no-store" });
    headers.append(
      "Set-Cookie",
      credentialCookie(updatedCredential, token, rp.secure)
    );
    headers.append(
      "Set-Cookie",
      clearWebAuthnCookie(WEBAUTHN_AUTH_COOKIE, rp.secure)
    );

    return Response.json(
      {
        result: true,
        verified: true,
        roles,
      },
      { headers }
    );
  } catch (error) {
    return webAuthnErrorResponse(error, "Биометрический вход не подтверждён");
  }
}
