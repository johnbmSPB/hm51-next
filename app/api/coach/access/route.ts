import { requireCoachRole } from "../../../lib/serverRoles";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();

    if (!token) {
      return Response.json(
        { result: false, error: "Токен не передан" },
        { status: 401 }
      );
    }

    const access = await requireCoachRole(token);
    if (!access.ok) return access.response;

    return Response.json({
      result: true,
      allowed: true,
      roles: access.roles,
    });
  } catch (error: unknown) {
    return Response.json(
      {
        result: false,
        error: error instanceof Error ? error.message : "Ошибка проверки доступа",
      },
      { status: 500 }
    );
  }
}
