async function postJson(path: string, data: Record<string, string>) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      json?.error ||
        json?.message ||
        json?.cause ||
        "Ошибка сервера"
    );
  }

  return json;
}

export async function loginUser(login: string, password: string) {
  const result = await postJson("/api/login", {
    login,
    username: login,
    password,
  });

  if (result.result === false) {
    throw new Error(result.error || result.message || "Неверный логин или пароль");
  }

  const token =
    result.token ||
    result.TOKEN ||
    result.access_token ||
    result.ACCESS_TOKEN ||
    result.new_token ||
    result.NEW_TOKEN ||
    result.user_token ||
    result.USER_TOKEN ||
    result.session ||
    result.SESSION ||
    result.key ||
    result.KEY ||
    result?.data?.token ||
    result?.data?.TOKEN ||
    result?.user?.token ||
    result?.USER?.TOKEN;

  if (!token || typeof token !== "string") {
    throw new Error(
      "Сервер ответил, но токен не найден. Ответ сервера: " +
        JSON.stringify(result).slice(0, 700)
    );
  }

  return {
    token,
    raw: result,
  };
}

export async function registerUser(params: {
  role: string;
  login: string;
  email: string;
  password: string;
}) {
  return postJson("/api/register", {
    role: params.role,
    login: params.login,
    username: params.login,
    email: params.email,
    password: params.password,
  });
}
