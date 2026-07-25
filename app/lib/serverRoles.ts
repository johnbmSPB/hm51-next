export type ServerRole = "PLAYER" | "COACH";

type RoleCheckResult = {
  roles: ServerRole[];
  raw: unknown;
};

const ROLE_CHECK_TIMEOUT_MS = 10_000;

function normalizeRole(value: unknown): ServerRole | null {
  const role = String(
    typeof value === "object" && value
      ? (value as Record<string, unknown>).ROLE ||
          (value as Record<string, unknown>).role ||
          ""
      : value || ""
  )
    .trim()
    .toUpperCase();

  if (role === "TRAINER_ROLE" || role === "COACH") return "COACH";
  if (role === "GAMER_ROLE" || role === "PLAYER") return "PLAYER";
  return null;
}

export function parseServerRoles(payload: unknown): ServerRole[] {
  const object = payload && typeof payload === "object"
    ? (payload as Record<string, unknown>)
    : null;

  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(object?.roles)
      ? object.roles
      : Array.isArray(object?.ROLES)
        ? object.ROLES
        : Array.isArray((object?.data as Record<string, unknown> | undefined)?.roles)
          ? ((object?.data as Record<string, unknown>).roles as unknown[])
          : Array.isArray((object?.data as Record<string, unknown> | undefined)?.ROLES)
            ? ((object?.data as Record<string, unknown>).ROLES as unknown[])
            : [];

  return Array.from(
    new Set(source.map(normalizeRole).filter((role): role is ServerRole => Boolean(role)))
  );
}

export async function getServerRoles(token: string): Promise<RoleCheckResult> {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken) throw new Error("AUTH_TOKEN_MISSING");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROLE_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch("https://itandsports.ru/users/get_roles.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "User-Agent": "HM51-Web/2.2",
      },
      body: new URLSearchParams({ token: normalizedToken }),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new Error("ROLE_RESPONSE_INVALID");
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("AUTH_REJECTED");
      }
      throw new Error("ROLE_SERVER_UNAVAILABLE");
    }

    return {
      roles: parseServerRoles(payload),
      raw: payload,
    };
  } catch (error) {
    if (controller.signal.aborted) throw new Error("ROLE_CHECK_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requireCoachRole(token: string) {
  try {
    const result = await getServerRoles(token);

    if (!result.roles.includes("COACH")) {
      return {
        ok: false as const,
        response: Response.json(
          { result: false, error: "Доступ разрешён только тренеру" },
          { status: 403 }
        ),
      };
    }

    return {
      ok: true as const,
      roles: result.roles,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "ROLE_CHECK_FAILED";

    if (code === "AUTH_TOKEN_MISSING" || code === "AUTH_REJECTED") {
      return {
        ok: false as const,
        response: Response.json(
          { result: false, error: "Сессия недействительна. Войдите повторно." },
          { status: 401 }
        ),
      };
    }

    return {
      ok: false as const,
      response: Response.json(
        { result: false, error: "Не удалось проверить роль тренера" },
        { status: 502 }
      ),
    };
  }
}
