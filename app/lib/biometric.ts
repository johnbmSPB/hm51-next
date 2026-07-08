const BIOMETRIC_ENABLED_KEY = "hm51_biometric_enabled";
const BIOMETRIC_CREDENTIAL_ID_KEY = "hm51_biometric_credential_id";

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

function randomBuffer(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes.buffer;
}

export function isBiometricEnabled() {
  if (typeof window === "undefined") return false;

  return (
    localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true" &&
    Boolean(localStorage.getItem(BIOMETRIC_CREDENTIAL_ID_KEY))
  );
}

export async function canUseBiometric() {
  if (
    typeof window === "undefined" ||
    !window.PublicKeyCredential ||
    !navigator.credentials
  ) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function enableBiometricLogin() {
  const available = await canUseBiometric();

  if (!available) {
    throw new Error("На этом устройстве биометрия недоступна");
  }

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomBuffer(),
      rp: {
        name: "ХМ 5.1",
      },
      user: {
        id: randomBuffer(16),
        name: "hm51-player",
        displayName: "Игрок ХМ 5.1",
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
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    },
  });

  if (!credential || !("rawId" in credential)) {
    throw new Error("Не удалось включить биометрию");
  }

  localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
  const publicKeyCredential = credential as PublicKeyCredential;

  localStorage.setItem(
    BIOMETRIC_CREDENTIAL_ID_KEY,
    bufferToBase64Url(publicKeyCredential.rawId)
  );

  return true;
}

export function disableBiometricLogin() {
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  localStorage.removeItem(BIOMETRIC_CREDENTIAL_ID_KEY);
  localStorage.removeItem("hm51_biometric_token");
}

export async function authenticateWithBiometric() {
  const credentialId = localStorage.getItem(BIOMETRIC_CREDENTIAL_ID_KEY) || "";

  if (!credentialId) {
    throw new Error("Биометрический вход не настроен");
  }

  const result = await navigator.credentials.get({
    publicKey: {
      challenge: randomBuffer(),
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

  if (!result) {
    throw new Error("Биометрия не подтверждена");
  }

  return true;
}

const BIOMETRIC_TOKEN_KEY = "hm51_biometric_token";

export function saveBiometricToken(token: string) {
  if (!token) return;
  localStorage.setItem(BIOMETRIC_TOKEN_KEY, token);
}

export function getBiometricToken() {
  return localStorage.getItem(BIOMETRIC_TOKEN_KEY) || "";
}

export function clearBiometricToken() {
  localStorage.removeItem(BIOMETRIC_TOKEN_KEY);
}
