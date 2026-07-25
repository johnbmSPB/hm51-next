import {
  authenticationOptions,
  ceremonyCookie,
  makeCeremonyState,
  readCredentialCookie,
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
        { result: false, error: "Не переданы данные биометрического входа" },
        { status: 400 }
      );
    }

    await validateWebAuthnToken(token);
    const rp = resolveWebAuthnRp(request);
    const credential = readCredentialCookie(request, token, login, rp);
    const state = makeCeremonyState(
      "authenticate",
      login,
      rp,
      credential.credentialId
    );

    return Response.json(
      { result: true, options: authenticationOptions(state, credential) },
      {
        headers: {
          "Set-Cookie": ceremonyCookie(state, token, rp.secure),
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return webAuthnErrorResponse(error, "Не удалось начать биометрический вход");
  }
}
