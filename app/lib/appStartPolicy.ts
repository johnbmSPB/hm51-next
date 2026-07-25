export type PasswordlessStartCandidate = {
  enabled?: boolean;
  token?: string;
  login?: string;
};

export type BiometricStartCandidate = {
  enabled?: boolean;
  token?: string;
  login?: string;
};

export type AppStartDecision =
  | {
      mode: "biometric";
      token: string;
      login: string;
    }
  | {
      mode: "passwordless";
      token: string;
      login: string;
    }
  | {
      mode: "login";
    };

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function resolvePasswordlessStartSession(
  candidate: PasswordlessStartCandidate | null | undefined
) {
  if (candidate?.enabled !== true) return null;

  const token = clean(candidate.token);
  if (!token) return null;

  return {
    token,
    login: clean(candidate.login),
  };
}

export function resolveBiometricStartSession(
  candidate: BiometricStartCandidate | null | undefined
) {
  if (candidate?.enabled !== true) return null;

  const token = clean(candidate.token);
  const login = clean(candidate.login);

  if (!token || !login) return null;

  return {
    token,
    login,
  };
}

export function resolveAppStartDecision(
  biometric: BiometricStartCandidate | null | undefined,
  passwordless: PasswordlessStartCandidate | null | undefined
): AppStartDecision {
  const biometricSession = resolveBiometricStartSession(biometric);

  if (biometricSession) {
    return {
      mode: "biometric",
      ...biometricSession,
    };
  }

  const passwordlessSession = resolvePasswordlessStartSession(passwordless);

  if (passwordlessSession) {
    return {
      mode: "passwordless",
      ...passwordlessSession,
    };
  }

  return { mode: "login" };
}
