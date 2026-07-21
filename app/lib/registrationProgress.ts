"use client";

const PENDING_KEY =
  "hm51_registration_pending";

const PENDING_LOGIN_KEY =
  "hm51_registration_login";

type PendingRegistrationInput = {
  login?: string;
  role?: string;
  email?: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function markRegistrationPending({
  login = "",
  role = "",
  email = "",
}: PendingRegistrationInput = {}) {
  if (typeof window === "undefined") return;


  // Регистрация только что была подтверждена сервером.
  // Старый флаг от предыдущей ошибочной сессии
  // не должен скрывать новый токен.
  localStorage.removeItem(
    "hm51_force_manual_login"
  );

  sessionStorage.removeItem(
    "hm51_passwordless_skip_until"
  );

  const normalizedLogin = clean(login);
  const normalizedRole = clean(role);
  const normalizedEmail = clean(email);

  const previousLogin = clean(
    localStorage.getItem(PENDING_LOGIN_KEY)
  );

  const isDifferentAccount =
    normalizedLogin &&
    previousLogin &&
    normalizedLogin !== previousLogin;

  if (isDifferentAccount) {
    localStorage.removeItem(
      "hm51_register_role"
    );

    localStorage.removeItem(
      "hm51_register_email"
    );
  }

  localStorage.setItem(PENDING_KEY, "true");

  if (normalizedLogin) {
    localStorage.setItem(
      PENDING_LOGIN_KEY,
      normalizedLogin
    );

    localStorage.setItem(
      "hm51_login",
      normalizedLogin
    );
  }

  if (normalizedRole) {
    localStorage.setItem(
      "hm51_register_role",
      normalizedRole
    );
  }

  if (normalizedEmail) {
    localStorage.setItem(
      "hm51_register_email",
      normalizedEmail
    );
  }

  localStorage.removeItem(
    "hm51_active_role"
  );

  localStorage.removeItem(
    "hm51_roles"
  );
}

export function clearRegistrationPending() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(PENDING_KEY);
  localStorage.removeItem(PENDING_LOGIN_KEY);
  localStorage.removeItem(
    "hm51_register_role"
  );
}

export function isRegistrationPending() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    localStorage.getItem(PENDING_KEY) ===
    "true"
  );
}

export function getRegistrationContinuationPath() {
  if (typeof window === "undefined") {
    return "/connecting-team";
  }

  const role = clean(
    localStorage.getItem(
      "hm51_register_role"
    )
  ).toUpperCase();

  if (
    role === "ТРЕНЕР" ||
    role === "COACH" ||
    role === "TRAINER_ROLE"
  ) {
    return "/coach/profile-setup";
  }

  return "/connecting-team";
}
