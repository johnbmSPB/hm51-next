"use client";

import {
  getAccountKeyByLogin,
  getCurrentAccountKey,
  getScopedItem,
  removeScopedItem,
  setScopedItem,
} from "./accountStorage";

const BIOMETRIC_ENABLED_KEY = "hm51_biometric_enabled";
const BIOMETRIC_CREDENTIAL_ID_KEY = "hm51_biometric_credential_id";
const BIOMETRIC_TOKEN_KEY = "hm51_biometric_token";
const SERVER_WEBAUTHN_KEY = "hm51_server_webauthn_v1";

type JsonObject = Record<string, any>;

class BiometricRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function bufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64UrlToBuffer(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function currentToken() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("hm51_token") ||
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("hm51_token") ||
    sessionStorage.getItem("auth_token") ||
    ""
  ).trim();
}

function currentLogin() {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem("hm51_login") || "").trim();
}

async function postJson(url: string, body: JsonObject, keepalive = false) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify(body),
    cache: "no-store",
    keepalive,
  });

  let json: JsonObject = {};
  try {
    json = await response.json();
  } catch {
    json = {};
  }

  if (!response.ok || json.result === false) {
    throw new BiometricRequestError(
      String(json.error || "Сервер не подтвердил биометрию"),
      response.status || 400
    );
  }

  return json;
}

function creationOptionsFromJson(value: JsonObject): PublicKeyCredentialCreationOptions {
  return {
    ...value,
    challenge: base64UrlToBuffer(String(value.challenge || "")),
    user: {
      ...value.user,
      id: base64UrlToBuffer(String(value.user?.id || "")),
    },
    excludeCredentials: Array.isArray(value.excludeCredentials)
      ? value.excludeCredentials.map((credential: JsonObject) => ({
          ...credential,
          id: base64UrlToBuffer(String(credential.id || "")),
        }))
      : undefined,
  } as PublicKeyCredentialCreationOptions;
}

function requestOptionsFromJson(value: JsonObject): PublicKeyCredentialRequestOptions {
  return {
    ...value,
    challenge: base64UrlToBuffer(String(value.challenge || "")),
    allowCredentials: Array.isArray(value.allowCredentials)
      ? value.allowCredentials.map((credential: JsonObject) => ({
          ...credential,
          id: base64UrlToBuffer(String(credential.id || "")),
        }))
      : undefined,
  } as PublicKeyCredentialRequestOptions;
}

function registrationResponseToJson(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
      transports: typeof response.getTransports === "function" ? response.getTransports() : [],
    },
  };
}

function authenticationResponseToJson(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : null,
    },
  };
}

function clearLocalBiometric(accountKey = getCurrentAccountKey()) {
  removeScopedItem(BIOMETRIC_ENABLED_KEY, accountKey);
  removeScopedItem(BIOMETRIC_CREDENTIAL_ID_KEY, accountKey);
  removeScopedItem(BIOMETRIC_TOKEN_KEY, accountKey);
  removeScopedItem(SERVER_WEBAUTHN_KEY, accountKey);
}

export function isBiometricEnabled(accountKey = getCurrentAccountKey()) {
  return (
    getScopedItem(BIOMETRIC_ENABLED_KEY, accountKey) === "1" &&
    getScopedItem(SERVER_WEBAUTHN_KEY, accountKey) === "1" &&
    Boolean(getScopedItem(BIOMETRIC_CREDENTIAL_ID_KEY, accountKey)) &&
    Boolean(getScopedItem(BIOMETRIC_TOKEN_KEY, accountKey))
  );
}

export async function canUseBiometric() {
  if (typeof window === "undefined") return false;

  if (!window.PublicKeyCredential || !navigator.credentials) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function enableBiometricLogin(accountKey = getCurrentAccountKey()) {
  if (typeof window === "undefined") {
    throw new Error("Биометрия доступна только в браузере");
  }

  const login = currentLogin();
  const token = currentToken();

  if (!accountKey || !login || !token) {
    throw new Error("Сначала войдите в аккаунт");
  }

  if (!window.PublicKeyCredential || !navigator.credentials) {
    throw new Error("На этом устройстве биометрия недоступна");
  }

  const start = await postJson("/api/webauthn/register/options", { token, login });
  const credential = (await navigator.credentials.create({
    publicKey: creationOptionsFromJson(start.options || {}),
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Биометрическая регистрация отменена");
  }

  const verification = await postJson("/api/webauthn/register/verify", {
    token,
    login,
    response: registrationResponseToJson(credential),
  });

  if (verification.verified !== true || !verification.credentialId) {
    throw new Error("Сервер не подтвердил ключ устройства");
  }

  setScopedItem(BIOMETRIC_CREDENTIAL_ID_KEY, String(verification.credentialId), accountKey);
  setScopedItem(BIOMETRIC_TOKEN_KEY, token, accountKey);
  setScopedItem(SERVER_WEBAUTHN_KEY, "1", accountKey);
  setScopedItem(BIOMETRIC_ENABLED_KEY, "1", accountKey);
}

export function disableBiometricLogin(accountKey = getCurrentAccountKey()) {
  clearLocalBiometric(accountKey);

  if (typeof window !== "undefined") {
    void fetch("/api/webauthn/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body: "{}",
      cache: "no-store",
      keepalive: true,
    }).catch(() => undefined);
  }
}

async function authenticate(login: string, accountKey: string) {
  if (typeof window === "undefined") {
    throw new Error("Биометрия доступна только в браузере");
  }

  const token = getScopedItem(BIOMETRIC_TOKEN_KEY, accountKey) || "";
  if (!login || !token || !isBiometricEnabled(accountKey)) {
    throw new Error("Биометрический вход не настроен для этого аккаунта");
  }

  if (!navigator.credentials) {
    throw new Error("На этом устройстве биометрия недоступна");
  }

  try {
    const start = await postJson("/api/webauthn/authenticate/options", { token, login });
    const credential = (await navigator.credentials.get({
      publicKey: requestOptionsFromJson(start.options || {}),
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error("Биометрическая проверка отменена");
    }

    const verification = await postJson("/api/webauthn/authenticate/verify", {
      token,
      login,
      response: authenticationResponseToJson(credential),
    });

    if (verification.verified !== true) {
      throw new Error("Сервер не подтвердил биометрический вход");
    }

    return credential;
  } catch (error) {
    if (
      error instanceof BiometricRequestError &&
      [401, 403, 404].includes(error.status)
    ) {
      clearLocalBiometric(accountKey);
    }
    throw error;
  }
}

export function authenticateWithBiometric(accountKey = getCurrentAccountKey()) {
  return authenticate(currentLogin(), accountKey);
}

export function saveBiometricToken(token: string, accountKey = getCurrentAccountKey()) {
  const nextToken = String(token || "").trim();
  if (!nextToken || !accountKey) return;

  const previousToken = getScopedItem(BIOMETRIC_TOKEN_KEY, accountKey) || "";
  const login = currentLogin();

  if (!isBiometricEnabled(accountKey) || !previousToken || previousToken === nextToken) {
    setScopedItem(BIOMETRIC_TOKEN_KEY, nextToken, accountKey);
    return;
  }

  void postJson(
    "/api/webauthn/rebind",
    {
      oldToken: previousToken,
      newToken: nextToken,
      login,
    },
    true
  )
    .then(() => {
      setScopedItem(BIOMETRIC_TOKEN_KEY, nextToken, accountKey);
    })
    .catch(() => {
      clearLocalBiometric(accountKey);
    });
}

export function getBiometricToken(accountKey = getCurrentAccountKey()) {
  return getScopedItem(BIOMETRIC_TOKEN_KEY, accountKey) || "";
}

export function getBiometricTokenByLogin(login: string) {
  return getBiometricToken(getAccountKeyByLogin(login));
}

export function isBiometricEnabledByLogin(login: string) {
  return isBiometricEnabled(getAccountKeyByLogin(login));
}

export function authenticateWithBiometricByLogin(login: string) {
  return authenticate(login.trim(), getAccountKeyByLogin(login));
}
