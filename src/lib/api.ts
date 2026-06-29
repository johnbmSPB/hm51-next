export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://itandsports.ru";

async function postForm(path: string, data: Record<string, string>) {
  const url = `${API_BASE}/${path.replace(/^\/+/, "")}`;
  const body = new URLSearchParams();

  Object.entries(data).forEach(([key, value]) => {
    body.append(key, value);
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
  });

  const text = await response.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(json?.message || json?.error || "Ошибка сервера");
  }

  return json;
}

export async function loginUser(login: string, password: string) {
  const result = await postForm("users/new_token.php", {
    login,
    LOGIN: login,
    password,
    PASSWORD: password,
    pass: password,
    PASS: password,
  });

  const token =
    result.token ||
    result.TOKEN ||
    result.access_token ||
    result.ACCESS_TOKEN ||
    result?.data?.token ||
    result?.raw;

  if (!token || typeof token !== "string") {
    throw new Error("Сервер не вернул токен входа");
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
  return postForm("users/new_user.php", {
    role: params.role,
    ROLE: params.role,
    login: params.login,
    LOGIN: params.login,
    email: params.email,
    EMAIL: params.email,
    password: params.password,
    PASSWORD: params.password,
    pass: params.password,
    PASS: params.password,
  });
}
