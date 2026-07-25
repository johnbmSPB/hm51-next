import {
  createHash,
  createHmac,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify as verifyCryptoSignature,
} from "node:crypto";
import { getServerRoles, type ServerRole } from "./serverRoles.ts";

export const WEBAUTHN_CREDENTIAL_COOKIE = "hm51_webauthn_credential_v1";
export const WEBAUTHN_REGISTER_COOKIE = "hm51_webauthn_register_v1";
export const WEBAUTHN_AUTH_COOKIE = "hm51_webauthn_auth_v1";

const CEREMONY_TTL_MS = 5 * 60_000;
const CREDENTIAL_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const RP_NAME = "XM 5.1";
const SUPPORTED_ALGORITHMS = [-7, -257] as const;

type JsonRecord = Record<string, unknown>;
type PublicKeyJwk = Record<string, string | boolean | string[] | undefined>;
type CeremonyKind = "register" | "authenticate";

export type WebAuthnRp = {
  rpID: string;
  origin: string;
  secure: boolean;
};

export type WebAuthnCeremonyState = {
  version: 1;
  kind: CeremonyKind;
  challenge: string;
  login: string;
  rpID: string;
  origin: string;
  credentialId?: string;
  expiresAt: number;
};

export type WebAuthnCredentialRecord = {
  version: 1;
  login: string;
  credentialId: string;
  publicKeyJwk: PublicKeyJwk;
  algorithm: -7 | -257;
  counter: number;
  transports: string[];
  rpID: string;
  createdAt: number;
  updatedAt: number;
};

export type RegistrationResponseJSON = {
  id: string;
  rawId: string;
  type: string;
  authenticatorAttachment?: string | null;
  clientExtensionResults?: JsonRecord;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: string[];
  };
};

export type AuthenticationResponseJSON = {
  id: string;
  rawId: string;
  type: string;
  authenticatorAttachment?: string | null;
  clientExtensionResults?: JsonRecord;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string | null;
  };
};

function normalizedLogin(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function base64UrlEncode(value: Uint8Array | Buffer | string) {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value);
  return buffer.toString("base64url");
}

function base64UrlDecode(value: unknown, fieldName = "value") {
  const text = String(value ?? "").trim();
  if (!text || !/^[A-Za-z0-9_-]+$/.test(text)) {
    throw new Error(`WEBAUTHN_INVALID_${fieldName.toUpperCase()}`);
  }
  return Buffer.from(text, "base64url");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const object = value as JsonRecord;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}

function signEncodedPayload(encodedPayload: string, token: string) {
  return createHmac("sha256", token).update(encodedPayload).digest("base64url");
}

function makeSignedValue(payload: unknown, token: string) {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken) throw new Error("AUTH_TOKEN_MISSING");

  const encodedPayload = base64UrlEncode(stableStringify(payload));
  return `${encodedPayload}.${signEncodedPayload(encodedPayload, normalizedToken)}`;
}

function readSignedValue<T>(value: string, token: string): T {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken) throw new Error("AUTH_TOKEN_MISSING");

  const [encodedPayload, suppliedSignature, extra] = String(value || "").split(".");
  if (!encodedPayload || !suppliedSignature || extra !== undefined) {
    throw new Error("WEBAUTHN_SIGNED_VALUE_INVALID");
  }

  const expectedSignature = signEncodedPayload(encodedPayload, normalizedToken);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error("WEBAUTHN_SIGNED_VALUE_INVALID");
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload, "payload").toString("utf8")) as T;
  } catch {
    throw new Error("WEBAUTHN_SIGNED_VALUE_INVALID");
  }
}

function cookieMap(request: Request) {
  const result = new Map<string, string>();
  const header = request.headers.get("cookie") || "";

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) result.set(name, value);
  }

  return result;
}

function cookieHeader(name: string, value: string, maxAge: number, secure: boolean) {
  return [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearWebAuthnCookie(name: string, secure: boolean) {
  return cookieHeader(name, "", 0, secure);
}

export function resolveWebAuthnRp(request: Request): WebAuthnRp {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = (forwardedHost || request.headers.get("host") || url.host).toLowerCase();
  const hostname = host.split(":")[0];
  const protocol = (forwardedProto || url.protocol.replace(":", "")).toLowerCase();
  const local = hostname === "localhost" || hostname === "127.0.0.1";
  const allowed =
    local ||
    hostname === "hm51-next.vercel.app" ||
    hostname === "app.hm5-1.ru" ||
    hostname.endsWith(".vercel.app");

  if (!allowed) throw new Error("WEBAUTHN_RP_NOT_ALLOWED");
  if (!local && protocol !== "https") throw new Error("WEBAUTHN_HTTPS_REQUIRED");

  const origin = `${local ? protocol || "http" : "https"}://${host}`;
  const suppliedOrigin = request.headers.get("origin");
  if (suppliedOrigin && suppliedOrigin !== origin) {
    throw new Error("WEBAUTHN_ORIGIN_MISMATCH");
  }

  return {
    rpID: hostname,
    origin,
    secure: !local,
  };
}

export async function validateWebAuthnToken(token: string): Promise<ServerRole[]> {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken) throw new Error("AUTH_TOKEN_MISSING");

  const result = await getServerRoles(normalizedToken);
  const raw = result.raw && typeof result.raw === "object" ? (result.raw as JsonRecord) : null;
  const rejected =
    raw?.result === false ||
    raw?.RESULT === false ||
    Boolean(String(raw?.error || raw?.ERROR || "").trim());

  if (rejected) throw new Error("AUTH_REJECTED");
  return result.roles;
}

export function makeCeremonyState(
  kind: CeremonyKind,
  login: string,
  rp: WebAuthnRp,
  credentialId = ""
): WebAuthnCeremonyState {
  return {
    version: 1,
    kind,
    challenge: randomBytes(32).toString("base64url"),
    login: normalizedLogin(login),
    rpID: rp.rpID,
    origin: rp.origin,
    ...(credentialId ? { credentialId } : {}),
    expiresAt: Date.now() + CEREMONY_TTL_MS,
  };
}

export function ceremonyCookie(
  state: WebAuthnCeremonyState,
  token: string,
  secure: boolean
) {
  const name = state.kind === "register" ? WEBAUTHN_REGISTER_COOKIE : WEBAUTHN_AUTH_COOKIE;
  return cookieHeader(name, makeSignedValue(state, token), Math.ceil(CEREMONY_TTL_MS / 1000), secure);
}

export function readCeremonyState(
  request: Request,
  token: string,
  kind: CeremonyKind,
  login: string,
  rp: WebAuthnRp
) {
  const name = kind === "register" ? WEBAUTHN_REGISTER_COOKIE : WEBAUTHN_AUTH_COOKIE;
  const raw = cookieMap(request).get(name) || "";
  if (!raw) throw new Error("WEBAUTHN_CHALLENGE_MISSING");

  const state = readSignedValue<WebAuthnCeremonyState>(raw, token);
  if (
    state.version !== 1 ||
    state.kind !== kind ||
    state.login !== normalizedLogin(login) ||
    state.rpID !== rp.rpID ||
    state.origin !== rp.origin ||
    !state.challenge ||
    state.expiresAt < Date.now()
  ) {
    throw new Error("WEBAUTHN_CHALLENGE_INVALID");
  }

  return state;
}

export function credentialCookie(
  credential: WebAuthnCredentialRecord,
  token: string,
  secure: boolean
) {
  return cookieHeader(
    WEBAUTHN_CREDENTIAL_COOKIE,
    makeSignedValue(credential, token),
    CREDENTIAL_MAX_AGE_SECONDS,
    secure
  );
}

export function readCredentialCookie(
  request: Request,
  token: string,
  login: string,
  rp: WebAuthnRp
) {
  const raw = cookieMap(request).get(WEBAUTHN_CREDENTIAL_COOKIE) || "";
  if (!raw) throw new Error("WEBAUTHN_CREDENTIAL_MISSING");

  const credential = readSignedValue<WebAuthnCredentialRecord>(raw, token);
  if (
    credential.version !== 1 ||
    credential.login !== normalizedLogin(login) ||
    credential.rpID !== rp.rpID ||
    !credential.credentialId ||
    !credential.publicKeyJwk ||
    !SUPPORTED_ALGORITHMS.includes(credential.algorithm)
  ) {
    throw new Error("WEBAUTHN_CREDENTIAL_INVALID");
  }

  return credential;
}

export function rebindCredentialCookie(
  request: Request,
  oldToken: string,
  newToken: string,
  login: string,
  rp: WebAuthnRp
) {
  const credential = readCredentialCookie(request, oldToken, login, rp);
  return {
    credential,
    header: credentialCookie(credential, newToken, rp.secure),
  };
}

export function registrationOptions(state: WebAuthnCeremonyState, login: string) {
  const userID = createHash("sha256").update(normalizedLogin(login)).digest("base64url");

  return {
    challenge: state.challenge,
    rp: {
      id: state.rpID,
      name: RP_NAME,
    },
    user: {
      id: userID,
      name: String(login || "").trim(),
      displayName: String(login || "").trim(),
    },
    pubKeyCredParams: SUPPORTED_ALGORITHMS.map((alg) => ({ type: "public-key", alg })),
    timeout: 60_000,
    attestation: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      requireResidentKey: false,
      userVerification: "required",
    },
  };
}

export function authenticationOptions(
  state: WebAuthnCeremonyState,
  credential: WebAuthnCredentialRecord
) {
  return {
    challenge: state.challenge,
    rpId: state.rpID,
    timeout: 60_000,
    userVerification: "required",
    allowCredentials: [
      {
        id: credential.credentialId,
        type: "public-key",
        transports: credential.transports,
      },
    ],
  };
}

class CborReader {
  private offset = 0;
  private readonly data: Uint8Array;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  private readByte() {
    if (this.offset >= this.data.length) throw new Error("WEBAUTHN_CBOR_TRUNCATED");
    return this.data[this.offset++];
  }

  private readLength(additional: number) {
    if (additional < 24) return additional;
    if (additional === 24) return this.readByte();
    if (additional === 25) {
      return (this.readByte() << 8) | this.readByte();
    }
    if (additional === 26) {
      const value =
        this.readByte() * 0x1000000 +
        (this.readByte() << 16) +
        (this.readByte() << 8) +
        this.readByte();
      return value >>> 0;
    }
    if (additional === 27) {
      let value = 0n;
      for (let index = 0; index < 8; index += 1) {
        value = (value << 8n) | BigInt(this.readByte());
      }
      if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("WEBAUTHN_CBOR_TOO_LARGE");
      return Number(value);
    }
    throw new Error("WEBAUTHN_CBOR_UNSUPPORTED");
  }

  read(): unknown {
    const initial = this.readByte();
    const major = initial >> 5;
    const additional = initial & 0x1f;

    if (major === 0) return this.readLength(additional);
    if (major === 1) return -1 - this.readLength(additional);

    if (major === 2 || major === 3) {
      const length = this.readLength(additional);
      if (this.offset + length > this.data.length) throw new Error("WEBAUTHN_CBOR_TRUNCATED");
      const value = this.data.slice(this.offset, this.offset + length);
      this.offset += length;
      return major === 2 ? value : new TextDecoder().decode(value);
    }

    if (major === 4) {
      const length = this.readLength(additional);
      return Array.from({ length }, () => this.read());
    }

    if (major === 5) {
      const length = this.readLength(additional);
      const result = new Map<unknown, unknown>();
      for (let index = 0; index < length; index += 1) {
        result.set(this.read(), this.read());
      }
      return result;
    }

    if (major === 6) {
      this.readLength(additional);
      return this.read();
    }

    if (major === 7) {
      if (additional === 20) return false;
      if (additional === 21) return true;
      if (additional === 22) return null;
      if (additional === 23) return undefined;
      throw new Error("WEBAUTHN_CBOR_SIMPLE_UNSUPPORTED");
    }

    throw new Error("WEBAUTHN_CBOR_UNSUPPORTED");
  }
}

function mapValue(map: Map<unknown, unknown>, key: unknown) {
  if (!map.has(key)) throw new Error("WEBAUTHN_CBOR_FIELD_MISSING");
  return map.get(key);
}

function asMap(value: unknown) {
  if (!(value instanceof Map)) throw new Error("WEBAUTHN_CBOR_MAP_EXPECTED");
  return value;
}

function asBytes(value: unknown) {
  if (!(value instanceof Uint8Array)) throw new Error("WEBAUTHN_CBOR_BYTES_EXPECTED");
  return value;
}

function asNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("WEBAUTHN_CBOR_NUMBER_EXPECTED");
  }
  return value;
}

function parseCosePublicKey(coseValue: unknown) {
  const cose = asMap(coseValue);
  const kty = asNumber(mapValue(cose, 1));
  const algorithm = asNumber(mapValue(cose, 3));

  if (kty === 2 && algorithm === -7) {
    const curve = asNumber(mapValue(cose, -1));
    if (curve !== 1) throw new Error("WEBAUTHN_EC_CURVE_UNSUPPORTED");

    return {
      algorithm: -7 as const,
      publicKeyJwk: {
        kty: "EC",
        crv: "P-256",
        x: base64UrlEncode(asBytes(mapValue(cose, -2))),
        y: base64UrlEncode(asBytes(mapValue(cose, -3))),
        ext: true,
        key_ops: ["verify"],
      } satisfies PublicKeyJwk,
    };
  }

  if (kty === 3 && algorithm === -257) {
    return {
      algorithm: -257 as const,
      publicKeyJwk: {
        kty: "RSA",
        n: base64UrlEncode(asBytes(mapValue(cose, -1))),
        e: base64UrlEncode(asBytes(mapValue(cose, -2))),
        alg: "RS256",
        ext: true,
        key_ops: ["verify"],
      } satisfies PublicKeyJwk,
    };
  }

  throw new Error("WEBAUTHN_PUBLIC_KEY_UNSUPPORTED");
}

function verifyRpIdHash(authenticatorData: Buffer, rpID: string) {
  if (authenticatorData.length < 37) throw new Error("WEBAUTHN_AUTH_DATA_INVALID");
  const expected = createHash("sha256").update(rpID).digest();
  const supplied = authenticatorData.subarray(0, 32);
  if (!timingSafeEqual(expected, supplied)) throw new Error("WEBAUTHN_RP_ID_HASH_INVALID");
}

function parseClientData(
  encoded: string,
  expectedType: "webauthn.create" | "webauthn.get",
  state: WebAuthnCeremonyState
) {
  const raw = base64UrlDecode(encoded, "client_data");
  let clientData: JsonRecord;

  try {
    clientData = JSON.parse(raw.toString("utf8")) as JsonRecord;
  } catch {
    throw new Error("WEBAUTHN_CLIENT_DATA_INVALID");
  }

  if (
    clientData.type !== expectedType ||
    clientData.challenge !== state.challenge ||
    clientData.origin !== state.origin ||
    clientData.crossOrigin === true
  ) {
    throw new Error("WEBAUTHN_CLIENT_DATA_INVALID");
  }

  return raw;
}

function requireUserVerification(flags: number) {
  const userPresent = Boolean(flags & 0x01);
  const userVerified = Boolean(flags & 0x04);
  if (!userPresent || !userVerified) throw new Error("WEBAUTHN_USER_VERIFICATION_REQUIRED");
}

function uint32(buffer: Buffer, offset: number) {
  if (offset + 4 > buffer.length) throw new Error("WEBAUTHN_AUTH_DATA_INVALID");
  return buffer.readUInt32BE(offset);
}

function normalizedCredentialId(value: string) {
  return base64UrlEncode(base64UrlDecode(value, "credential_id"));
}

export function verifyRegistrationCeremony(
  response: RegistrationResponseJSON,
  state: WebAuthnCeremonyState,
  login: string
): WebAuthnCredentialRecord {
  if (!response || response.type !== "public-key" || !response.response) {
    throw new Error("WEBAUTHN_REGISTRATION_RESPONSE_INVALID");
  }

  parseClientData(response.response.clientDataJSON, "webauthn.create", state);

  const attestationObject = new CborReader(
    base64UrlDecode(response.response.attestationObject, "attestation_object")
  ).read();
  const attestation = asMap(attestationObject);
  const format = mapValue(attestation, "fmt");
  if (format !== "none") throw new Error("WEBAUTHN_ATTESTATION_FORMAT_UNSUPPORTED");

  const authenticatorData = Buffer.from(asBytes(mapValue(attestation, "authData")));
  verifyRpIdHash(authenticatorData, state.rpID);

  const flags = authenticatorData[32];
  requireUserVerification(flags);
  if (!(flags & 0x40)) throw new Error("WEBAUTHN_ATTESTED_DATA_MISSING");

  const counter = uint32(authenticatorData, 33);
  let offset = 37 + 16;
  if (offset + 2 > authenticatorData.length) throw new Error("WEBAUTHN_AUTH_DATA_INVALID");
  const credentialLength = authenticatorData.readUInt16BE(offset);
  offset += 2;
  if (credentialLength <= 0 || offset + credentialLength > authenticatorData.length) {
    throw new Error("WEBAUTHN_CREDENTIAL_ID_INVALID");
  }

  const credentialId = base64UrlEncode(
    authenticatorData.subarray(offset, offset + credentialLength)
  );
  offset += credentialLength;

  if (
    normalizedCredentialId(response.id) !== credentialId ||
    normalizedCredentialId(response.rawId) !== credentialId
  ) {
    throw new Error("WEBAUTHN_CREDENTIAL_ID_MISMATCH");
  }

  const cosePublicKey = new CborReader(authenticatorData.subarray(offset)).read();
  const parsedKey = parseCosePublicKey(cosePublicKey);
  const now = Date.now();

  return {
    version: 1,
    login: normalizedLogin(login),
    credentialId,
    publicKeyJwk: parsedKey.publicKeyJwk,
    algorithm: parsedKey.algorithm,
    counter,
    transports: Array.isArray(response.response.transports)
      ? response.response.transports.map(String).slice(0, 10)
      : [],
    rpID: state.rpID,
    createdAt: now,
    updatedAt: now,
  };
}

export function verifyAuthenticationCeremony(
  response: AuthenticationResponseJSON,
  state: WebAuthnCeremonyState,
  credential: WebAuthnCredentialRecord
): WebAuthnCredentialRecord {
  if (!response || response.type !== "public-key" || !response.response) {
    throw new Error("WEBAUTHN_AUTHENTICATION_RESPONSE_INVALID");
  }

  if (
    normalizedCredentialId(response.id) !== credential.credentialId ||
    normalizedCredentialId(response.rawId) !== credential.credentialId ||
    state.credentialId !== credential.credentialId
  ) {
    throw new Error("WEBAUTHN_CREDENTIAL_ID_MISMATCH");
  }

  const clientDataJSON = parseClientData(
    response.response.clientDataJSON,
    "webauthn.get",
    state
  );
  const authenticatorData = base64UrlDecode(
    response.response.authenticatorData,
    "authenticator_data"
  );
  verifyRpIdHash(authenticatorData, state.rpID);

  const flags = authenticatorData[32];
  requireUserVerification(flags);
  const newCounter = uint32(authenticatorData, 33);

  const signedData = Buffer.concat([
    authenticatorData,
    createHash("sha256").update(clientDataJSON).digest(),
  ]);
  const signature = base64UrlDecode(response.response.signature, "signature");
  const publicKey = createPublicKey({
    key: credential.publicKeyJwk as JsonWebKey,
    format: "jwk",
  });
  const verified = verifyCryptoSignature("sha256", signedData, publicKey, signature);

  if (!verified) throw new Error("WEBAUTHN_SIGNATURE_INVALID");
  if (credential.counter > 0 && newCounter > 0 && newCounter <= credential.counter) {
    throw new Error("WEBAUTHN_COUNTER_INVALID");
  }

  return {
    ...credential,
    counter: newCounter,
    updatedAt: Date.now(),
  };
}

export function webAuthnErrorResponse(error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : "WEBAUTHN_FAILED";
  const status =
    code === "AUTH_TOKEN_MISSING" || code === "AUTH_REJECTED"
      ? 401
      : code.includes("MISSING")
        ? 404
        : code.includes("RP_NOT_ALLOWED") || code.includes("HTTPS_REQUIRED")
          ? 403
          : 400;

  const messages: Record<string, string> = {
    AUTH_TOKEN_MISSING: "Сессия не найдена. Войдите повторно.",
    AUTH_REJECTED: "Сессия недействительна. Войдите повторно.",
    WEBAUTHN_CREDENTIAL_MISSING: "Вход по биометрии не настроен на этом устройстве.",
    WEBAUTHN_CHALLENGE_MISSING: "Проверка биометрии устарела. Повторите попытку.",
    WEBAUTHN_CHALLENGE_INVALID: "Проверка биометрии устарела или повреждена.",
    WEBAUTHN_USER_VERIFICATION_REQUIRED: "Устройство не подтвердило пользователя.",
    WEBAUTHN_SIGNATURE_INVALID: "Подпись устройства не подтверждена.",
    WEBAUTHN_COUNTER_INVALID: "Обнаружен повтор старого ответа биометрии.",
  };

  return Response.json(
    {
      result: false,
      error: messages[code] || fallback,
      code,
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
