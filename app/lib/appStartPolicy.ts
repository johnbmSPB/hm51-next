export type PasswordlessStartCandidate = {
  enabled?: boolean;
  token?: string;
  login?: string;
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
