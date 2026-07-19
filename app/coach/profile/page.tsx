"use client";

import { clearPasswordlessLogin } from "../../components/AuthTokenGuard";

import { useEffect, useState } from "react";
import CoachBottomNav from "../components/CoachBottomNav";

type CoachProfile = {
  family: string;
  name: string;
  midname: string;
  birthday: string;
  tel: string;
  email: string;
  login: string;
  specialization: string;
};

const specializations = [
  "Главный тренер",
  "Помощник тренера",
  "Тренер вратарей",
  "Тренер по физической подготовке",
  "Дополнительный тренер",
];

function readRoles() {
  try {
    const value = JSON.parse(localStorage.getItem("hm51_roles") || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

function toInputDate(value: string) {
  const trimmed = String(value || "").trim();

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split(".");
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (!numbers) return "";

  let result = numbers[0];
  if (numbers.length >= 2) result += ` (${numbers.slice(1, 4)}`;
  if (numbers.length >= 4) result += ")";
  if (numbers.length >= 5) result += ` ${numbers.slice(4, 7)}`;
  if (numbers.length >= 8) result += `-${numbers.slice(7, 9)}`;
  if (numbers.length >= 10) result += `-${numbers.slice(9, 11)}`;
  return result;
}

function readProfile(): CoachProfile {
  let saved: Partial<CoachProfile> = {};

  try {
    saved = JSON.parse(localStorage.getItem("hm51_coach_profile") || "{}");
  } catch {
    saved = {};
  }

  const storedName = localStorage.getItem("hm51_coach_name") || "";
  const nameParts = storedName.split(/\s+/).filter(Boolean);

  return {
    family: saved.family || nameParts[0] || "",
    name: saved.name || nameParts[1] || "",
    midname: saved.midname || nameParts.slice(2).join(" ") || "",
    birthday: toInputDate(saved.birthday || ""),
    tel: formatPhone(saved.tel || ""),
    email: saved.email || localStorage.getItem("hm51_register_email") || "",
    login: saved.login || localStorage.getItem("hm51_login") || "",
    specialization:
      saved.specialization ||
      localStorage.getItem("hm51_coach_specialization") ||
      specializations[0],
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-white/60">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        readOnly={readOnly}
        max={max}
        className={
          readOnly
            ? "h-14 w-full rounded-2xl border border-white/10 bg-[#121715] px-4 text-base font-bold text-white/40 outline-none"
            : "h-14 w-full rounded-2xl border border-white/15 bg-[#121715] px-4 text-base font-bold text-white outline-none focus:border-[#20d1a8]"
        }
      />
    </label>
  );
}

export default function CoachProfilePage() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<CoachProfile>(() => ({
    family: "",
    name: "",
    midname: "",
    birthday: "",
    tel: "",
    email: "",
    login: "",
    specialization: specializations[0],
  }));
  const [draft, setDraft] = useState<CoachProfile>(() => ({
    family: "",
    name: "",
    midname: "",
    birthday: "",
    tel: "",
    email: "",
    login: "",
    specialization: specializations[0],
  }));
  const [hasPlayerProfile, setHasPlayerProfile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const savedToken =
      localStorage.getItem("hm51_token") || localStorage.getItem("auth_token") || "";
    const roles = readRoles();
    const activeRole = localStorage.getItem("hm51_active_role") || "";

    if (!savedToken) {
      window.location.replace("/login");
      return;
    }

    if (!roles.includes("COACH") && activeRole !== "COACH") {
      window.location.replace("/login");
      return;
    }

    const loadedProfile = readProfile();

    localStorage.setItem("hm51_active_role", "COACH");
    setToken(savedToken);
    setHasPlayerProfile(roles.includes("PLAYER"));
    setProfile(loadedProfile);
    setDraft(loadedProfile);
    setReady(true);
  }, []);

  function updateDraft(key: keyof CoachProfile, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function startEditing() {
    setDraft(profile);
    setMessage("");
    setIsError(false);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(profile);
    setMessage("");
    setIsError(false);
    setEditing(false);
  }

  async function saveProfile() {
    try {
      setSaving(true);
      setMessage("");
      setIsError(false);

      const family = draft.family.trim();
      const name = draft.name.trim();
      const midname = draft.midname.trim();
      const birthday = draft.birthday.trim();
      const tel = draft.tel.replace(/\D/g, "");
      const specialization = draft.specialization.trim();

      if (!family) throw new Error("Введите фамилию");
      if (!name) throw new Error("Введите имя");
      if (!birthday) throw new Error("Введите дату рождения");
      if (birthday < "1900-01-01" || birthday > today) {
        throw new Error("Введите корректную дату рождения");
      }
      if (tel.length < 10) throw new Error("Введите корректный телефон");
      if (!specialization) throw new Error("Выберите специализацию");

      const trainerId = localStorage.getItem("hm51_trainer_id") || "";
      const response = await fetch("/api/coach/profile-save", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({
          token,
          trainerId,
          family,
          name,
          midname,
          birthday,
          tel,
          specialization,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось сохранить данные тренера");
      }

      const updated: CoachProfile = {
        ...draft,
        family,
        name,
        midname,
        birthday,
        tel: formatPhone(tel),
        specialization,
      };

      localStorage.setItem("hm51_coach_profile", JSON.stringify({ ...updated, tel }));
      localStorage.setItem("hm51_coach_name", [family, name, midname].filter(Boolean).join(" "));
      localStorage.setItem("hm51_coach_specialization", specialization);

      setProfile(updated);
      setDraft(updated);
      setEditing(false);
      setMessage(json.message || "Данные тренера сохранены");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Ошибка сохранения данных тренера");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCoachProfile() {
    try {
      setDeleting(true);
      setMessage("");
      setIsError(false);

      const trainerId = localStorage.getItem("hm51_trainer_id") || "";
      const response = await fetch("/api/coach/delete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({ token, trainerId }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось удалить профиль тренера");
      }

      const remainingRoles = readRoles().filter((role) => role !== "COACH");
      localStorage.setItem("hm51_roles", JSON.stringify(remainingRoles));
      localStorage.removeItem("hm51_coach_profile");
      localStorage.removeItem("hm51_coach_name");
      localStorage.removeItem("hm51_coach_specialization");
      localStorage.removeItem("hm51_trainer_id");
      localStorage.removeItem("hm51_add_coach_profile_draft");

      if (remainingRoles.includes("PLAYER")) {
        localStorage.setItem("hm51_active_role", "PLAYER");
        window.location.replace("/home");
      } else {
        localStorage.removeItem("hm51_active_role");
        window.location.replace("/login");
      }
    } catch (error) {
      setShowDeleteConfirm(false);
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Ошибка удаления профиля тренера");
    } finally {
      setDeleting(false);
    }
  }

  function openPlayerProfile() {
    localStorage.setItem("hm51_active_role", "PLAYER");
    window.location.href = "/home";
  }

  async function logout() {
    const token =
      localStorage.getItem("hm51_token") ||
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("hm51_token") ||
      sessionStorage.getItem("auth_token") ||
      "";

    await clearPasswordlessLogin(token);
    localStorage.removeItem("hm51_active_role");
    localStorage.removeItem("hm51_roles");
    window.location.replace("/login");
  }

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#121715] text-white/45">
        Загружаем профиль…
      </main>
    );
  }

  const shown = editing ? draft : profile;
  const fullName = [shown.family, shown.name, shown.midname].filter(Boolean).join(" ");

  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/40">ХМ 5.1 · Тренер</p>
            <h1 className="text-3xl font-black">Профиль</h1>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              className="rounded-2xl bg-[#20d1a8] px-4 py-3 text-xs font-black text-[#121715]"
            >
              Изменить
            </button>
          )}
        </header>

        {message && (
          <section
            className={`mt-5 rounded-3xl p-4 text-sm font-bold ${
              isError ? "bg-red-500/15 text-red-200" : "bg-[#20d1a8]/10 text-[#20d1a8]"
            }`}
          >
            {message}
          </section>
        )}

        <section className="mt-6 rounded-3xl bg-[#2d332f] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[#20d1a8] text-3xl font-black text-[#121715]">
              {(fullName || shown.login || "Т").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white/40">
                {shown.specialization || "Тренер"}
              </p>
              <h2 className="mt-1 break-words text-2xl font-black">
                {fullName || shown.login || "Тренер"}
              </h2>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-[#2d332f] p-5">
          <p className="mb-5 text-lg font-black">
            {editing ? "Корректировка данных" : "Данные тренера"}
          </p>

          <div className="space-y-5">
            <Field label="Фамилия" value={shown.family} onChange={(value) => updateDraft("family", value)} readOnly={!editing} />
            <Field label="Имя" value={shown.name} onChange={(value) => updateDraft("name", value)} readOnly={!editing} />
            <Field label="Отчество" value={shown.midname} onChange={(value) => updateDraft("midname", value)} readOnly={!editing} />
            <Field label="Дата рождения" value={shown.birthday} onChange={(value) => updateDraft("birthday", value)} type="date" max={today} readOnly={!editing} />
            <Field
              label="Телефон"
              value={shown.tel}
              onChange={(value) => updateDraft("tel", formatPhone(value))}
              type="tel"
              readOnly={!editing}
            />

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-white/60">Специализация</span>
              <select
                value={shown.specialization}
                onChange={(event) => updateDraft("specialization", event.target.value)}
                disabled={!editing}
                className={
                  editing
                    ? "h-14 w-full rounded-2xl border border-white/15 bg-[#121715] px-4 text-base font-bold text-white outline-none focus:border-[#20d1a8]"
                    : "h-14 w-full rounded-2xl border border-white/10 bg-[#121715] px-4 text-base font-bold text-white/40 outline-none"
                }
              >
                {specializations.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <Field label="Логин" value={shown.login} onChange={() => {}} readOnly />
            <Field label="Email" value={shown.email} onChange={() => {}} type="email" readOnly />
          </div>

          {editing && (
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="h-14 rounded-[28px] bg-[#121715] text-base font-black text-white/65 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="h-14 rounded-[28px] bg-[#20d1a8] text-base font-black text-[#121715] disabled:opacity-50"
              >
                {saving ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          )}
        </section>

        {hasPlayerProfile && (
          <section className="mt-5 rounded-3xl border border-[#20d1a8]/30 bg-[#20d1a8]/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20d1a8]">
              Переключение профиля
            </p>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Профиль игрока останется доступен независимо от изменений профиля тренера.
            </p>
            <button
              type="button"
              onClick={openPlayerProfile}
              className="mt-4 h-14 w-full rounded-[28px] bg-[#20d1a8] px-3 text-base font-black text-[#121715]"
            >
              Перейти в профиль игрока
            </button>
          </section>
        )}

        <section className="mt-5 rounded-3xl border border-red-500/25 bg-red-500/10 p-5">
          <p className="text-lg font-black text-red-200">Удалить профиль тренера</p>
          <p className="mt-2 text-sm leading-6 text-red-100/65">
            Будет удалён только профиль тренера. Общая учётная запись и профиль игрока сохранятся.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-5 h-14 w-full rounded-[28px] bg-red-500 text-base font-black text-white"
          >
            Удалить профиль тренера
          </button>
        </section>

        <button
          type="button"
          onClick={logout}
          className="mt-5 h-14 w-full rounded-[28px] bg-[#2d332f] text-sm font-black text-white/60"
        >
          Выйти из учётной записи
        </button>

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-5">
            <section className="w-full max-w-sm rounded-[32px] bg-[#2d332f] p-5 shadow-2xl">
              <h2 className="text-xl font-black">Удалить профиль тренера?</h2>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Данные тренера и роль COACH будут удалены. Профиль игрока удалён не будет.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="h-14 rounded-[28px] bg-[#121715] text-base font-black text-white disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={deleteCoachProfile}
                  disabled={deleting}
                  className="h-14 rounded-[28px] bg-red-500 text-base font-black text-white disabled:opacity-50"
                >
                  {deleting ? "Удаляем…" : "Удалить"}
                </button>
              </div>
            </section>
          </div>
        )}

        <CoachBottomNav active="profile" />
      </div>
    </main>
  );
}
