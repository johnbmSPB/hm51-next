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

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export function isBiometricEnabled(accountKey = getCurrentAccountKey()) {
  return getScopedItem(BIOMETRIC_ENABLED_KEY, accountKey) === "1";
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

  if (!accountKey) {
    throw new Error("Сначала войдите в аккаунт");
  }

  if (!window.PublicKeyCredential || !navigator.credentials) {
    throw new Error("На этом устройстве биометрия недоступна");
  }

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: {
        name: "XM 5.1",
      },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: accountKey,
        displayName: accountKey,
      },
      pubKeyCredParams: [
        {
          type: "public-key",
          alg: -7,
        },
        {
          type: "public-key",
          alg: -257,
        },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none",
    },
  });

  if (!credential) {
    throw new Error("Биометрический вход не создан");
  }

  const publicKeyCredential = credential as PublicKeyCredential;

  setScopedItem(
    BIOMETRIC_CREDENTIAL_ID_KEY,
    bufferToBase64Url(publicKeyCredential.rawId),
    accountKey
  );

  setScopedItem(BIOMETRIC_ENABLED_KEY, "1", accountKey);
}

export function disableBiometricLogin(accountKey = getCurrentAccountKey()) {
  removeScopedItem(BIOMETRIC_ENABLED_KEY, accountKey);
  removeScopedItem(BIOMETRIC_CREDENTIAL_ID_KEY, accountKey);
  removeScopedItem(BIOMETRIC_TOKEN_KEY, accountKey);
}

export async function authenticateWithBiometric(accountKey = getCurrentAccountKey()) {
  if (typeof window === "undefined") {
    throw new Error("Биометрия доступна только в браузере");
  }

  const credentialId = getScopedItem(BIOMETRIC_CREDENTIAL_ID_KEY, accountKey);

  if (!credentialId) {
    throw new Error("Биометрический вход не настроен для этого аккаунта");
  }

  if (!navigator.credentials) {
    throw new Error("На этом устройстве биометрия недоступна");
  }

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [
        {
          type: "public-key",
          id: base64UrlToBuffer(credentialId),
        },
      ],
      userVerification: "required",
      timeout: 60000,
    },
  });

  if (!credential) {
    throw new Error("Биометрическая проверка отменена");
  }

  return credential;
}

export function saveBiometricToken(token: string, accountKey = getCurrentAccountKey()) {
  if (!token || !accountKey) return;

  setScopedItem(BIOMETRIC_TOKEN_KEY, token, accountKey);
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

export async function authenticateWithBiometricByLogin(login: string) {
  return authenticateWithBiometric(getAccountKeyByLogin(login));
}
