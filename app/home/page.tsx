"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type TouchEvent } from "react";

type AnyObject = Record<string, any>;

function valueToText(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getGamer(data: AnyObject) {
  return (
    data.GAMER ||
    data.gamer ||
    data.PLAYER ||
    data.player ||
    data.USER ||
    data.user ||
    data.PROFILE ||
    data.profile ||
    {}
  );
}

function toArray(value: any): AnyObject[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "object") return Object.values(value);
  return [];
}

function roleFromShort(value: string) {
  if (value === "Нп") return "Нападающий";
  if (value === "Зщ") return "Защитник";
  if (value === "Вр") return "Вратарь";
  return value;
}

function isActiveTeamMembership(team: AnyObject) {
  const raw =
    team.ACTIVE_STATUS ??
    team.active_status ??
    team.ACTIVE ??
    team.active ??
    team.IS_ACTIVE ??
    team.is_active;

  if (raw === null || raw === undefined || raw === "") {
    return true;
  }

  const value = String(raw).trim().toLowerCase();

  return ![
    "0",
    "false",
    "no",
    "нет",
    "inactive",
    "deleted",
    "excluded",
  ].includes(value);
}

function boolText(value: any) {
  if (value === true || value === "true" || value === 1 || value === "1") return "Да";
  if (value === false || value === "false" || value === 0 || value === "0") return "Нет";
  return "";
}

type TeamSection = {
  id: string;
  teamId: string;
  teamName: string;
  isExpanded: boolean;
  citizenship: string;
  birthPlace: string;
  height: string;
  weight: string;
  playerNumber: string;
  role: string;
  level: string;
  phone: string;
  activeStatus: string;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl bg-[#121715] p-4">
      <p className="text-xs font-bold text-[#20d1a8]">{label}</p>
      <p className="mt-1 break-words text-base font-black text-white">
        {value}
      </p>
    </div>
  );
}

function toInputDate(value: string) {
  const trimmed = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split(".");
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  readOnly?: boolean;
}) {

  return (
    <label className="block">
      <span className="mb-2 block px-[20px] text-base text-white">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        readOnly={readOnly}
        className={
          readOnly
            ? "h-12 w-full rounded-[10px] border border-white/15 bg-white/5 px-[14px] text-base font-semibold text-white/45 outline-none placeholder:text-white/25"
            : "h-12 w-full rounded-[10px] border border-white/30 bg-white/10 px-[14px] text-base font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#20d1a8]"
        }
      />
    </label>
  );
}

export default function ProfilePage() {
  const [token, setToken] = useState("");

  const [family, setFamily] = useState("");
  const [name, setName] = useState("");
  const [midname, setMidname] = useState("");
  const [birthday, setBirthday] = useState("");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [teamSections, setTeamSections] = useState<TeamSection[]>([]);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const teamTouchStartX = useRef<number | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [isEmailBlockOpen, setIsEmailBlockOpen] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isCodeChecked, setIsCodeChecked] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("hm51_token") || "";

    if (!savedToken) {
      window.location.href = "/login";
      return;
    }

    setToken(savedToken);
    loadProfile(savedToken);
  }, []);

  async function loadProfile(currentToken: string) {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({ token: currentToken }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось загрузить профиль");
      }

      const gamer = getGamer(json);

      setFamily(valueToText(gamer.FAMILY || gamer.family));
      setName(valueToText(gamer.NAME || gamer.name));
      setMidname(valueToText(gamer.MIDNAME || gamer.midname));
      setBirthday(toInputDate(valueToText(gamer.BIRTHDAY || gamer.birthday)));
      setLogin(valueToText(gamer.LOGIN || gamer.login || localStorage.getItem("hm51_login")));
      setEmail(valueToText(gamer.EMAIL || gamer.email));
      setTel(valueToText(gamer.TEL || gamer.tel || gamer.PHONE || gamer.phone));

      const gamerTeams = toArray(
        json.GAMER_TEAMS ||
          json.gamer_teams ||
          json.data?.GAMER_TEAMS ||
          json.data?.gamer_teams
      );

      const teams = toArray(
        json.TEAMS ||
          json.teams ||
          json.data?.TEAMS ||
          json.data?.teams
      );

      const teamNamesById: Record<string, string> = {};

      teams.forEach((team) => {
        const teamId =
          valueToText(team.TEAM_ID) ||
          valueToText(team.team_id) ||
          valueToText(team.ID) ||
          valueToText(team.id);

        const teamName =
          valueToText(team.NAME) ||
          valueToText(team.name) ||
          valueToText(team.TEAM_NAME) ||
          valueToText(team.team_name) ||
          "Без названия";

        if (teamId) {
          teamNamesById[teamId] = teamName;
        }
      });

      const sections: TeamSection[] = gamerTeams
        .filter(isActiveTeamMembership)
        .map((gamerTeam, index) => {
        const teamId =
          valueToText(gamerTeam.TEAM) ||
          valueToText(gamerTeam.team) ||
          valueToText(gamerTeam.TEAM_ID) ||
          valueToText(gamerTeam.team_id);

        return {
          id: `${teamId || "team"}-${index}`,
          teamId,
          teamName: teamNamesById[teamId] || `Команда ${index + 1}`,
          isExpanded: false,
          citizenship:
            valueToText(gamerTeam.CITEZENSHIP) ||
            valueToText(gamerTeam.citezenship) ||
            valueToText(gamerTeam.CITIZENSHIP) ||
            valueToText(gamerTeam.citizenship),
          birthPlace:
            valueToText(gamerTeam.BIRTHPLACE) ||
            valueToText(gamerTeam.birthplace) ||
            valueToText(gamerTeam.BIRTH_PLACE) ||
            valueToText(gamerTeam.birth_place),
          height:
            valueToText(gamerTeam.H) ||
            valueToText(gamerTeam.h) ||
            valueToText(gamerTeam.HEIGHT) ||
            valueToText(gamerTeam.height),
          weight:
            valueToText(gamerTeam.M) ||
            valueToText(gamerTeam.m) ||
            valueToText(gamerTeam.WEIGHT) ||
            valueToText(gamerTeam.weight),
          playerNumber:
            valueToText(gamerTeam.GAME_NUM) ||
            valueToText(gamerTeam.game_num) ||
            valueToText(gamerTeam.NUMBER) ||
            valueToText(gamerTeam.number),
          role: roleFromShort(
            valueToText(gamerTeam.AMPLUA) ||
              valueToText(gamerTeam.amplua) ||
              valueToText(gamerTeam.ROLE) ||
              valueToText(gamerTeam.role)
          ),
          level:
            valueToText(gamerTeam.GAME_LEVEL) ||
            valueToText(gamerTeam.game_level) ||
            valueToText(gamerTeam.LEVEL) ||
            valueToText(gamerTeam.level),
          phone:
            valueToText(gamerTeam.TEL_IN_TEAM) ||
            valueToText(gamerTeam.tel_in_team) ||
            valueToText(gamerTeam.PHONE_IN_TEAM) ||
            valueToText(gamerTeam.phone_in_team) ||
            valueToText(gamer.TEL || gamer.tel || gamer.PHONE || gamer.phone),
          activeStatus: boolText(gamerTeam.ACTIVE_STATUS ?? gamerTeam.active_status),
        };
      });

      setTeamSections(sections);
      setSelectedTeamIndex(0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки профиля");
    } finally {
      setLoading(false);
    }
  }

  function toggleTeamSection(sectionId: string) {
    setTeamSections((oldSections) =>
      oldSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              isExpanded: !section.isExpanded,
            }
          : section
      )
    );
  }

  function showPreviousTeam() {
    setSelectedTeamIndex((current) => {
      if (teamSections.length === 0) return 0;
      return current === 0 ? teamSections.length - 1 : current - 1;
    });
  }

  function showNextTeam() {
    setSelectedTeamIndex((current) => {
      if (teamSections.length === 0) return 0;
      return current === teamSections.length - 1 ? 0 : current + 1;
    });
  }

  function handleTeamTouchStart(event: TouchEvent<HTMLDivElement>) {
    teamTouchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTeamTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (teamTouchStartX.current === null) return;

    const endX = event.changedTouches[0]?.clientX ?? teamTouchStartX.current;
    const diff = endX - teamTouchStartX.current;

    teamTouchStartX.current = null;

    if (Math.abs(diff) < 45) return;

    if (diff > 0) {
      showPreviousTeam();
    } else {
      showNextTeam();
    }
  }

  async function saveProfile() {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/profile-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          family,
          name,
          midname,
          birthday,
          tel,
          email,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось сохранить профиль");
      }

      setMessage(json.message || "Профиль сохранён");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function sendCodeToNewEmail() {
    try {
      setEmailSaving(true);
      setMessage("");

      if (!newEmail.includes("@") || !newEmail.includes(".")) {
        throw new Error("Введите корректную новую почту");
      }

      const response = await fetch("/api/send-email-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({ email: newEmail }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        const rawText = json.raw ? ` Ответ сервера: ${JSON.stringify(json.raw)}` : "";
        throw new Error((json.error || json.message || "Не удалось отправить код") + rawText);
      }

      setIsCodeSent(true);
      setIsCodeChecked(false);
      setMessage(json.message || "Код отправлен на новую почту");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка отправки кода");
    } finally {
      setEmailSaving(false);
    }
  }

  async function checkNewEmailCode() {
    try {
      setEmailSaving(true);
      setMessage("");

      const response = await fetch("/api/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          email: newEmail,
          code: emailCode,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || json.message || "Неверный код");
      }

      setIsCodeChecked(true);
      setMessage(json.message || "Код подтверждён");
    } catch (error) {
      setIsCodeChecked(false);
      setMessage(error instanceof Error ? error.message : "Ошибка проверки кода");
    } finally {
      setEmailSaving(false);
    }
  }

  async function changeEmail() {
    try {
      setEmailSaving(true);
      setMessage("");

      if (!isCodeChecked) {
        throw new Error("Сначала подтвердите код из письма");
      }

      const response = await fetch("/api/change-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          newEmail,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось изменить почту");
      }

      setEmail(newEmail);
      setNewEmail("");
      setEmailCode("");
      setIsCodeSent(false);
      setIsCodeChecked(false);
      setIsEmailBlockOpen(false);

      setMessage(json.message || "Эл. почта успешно изменена");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка смены почты");
    } finally {
      setEmailSaving(false);
    }
  }

  async function deleteProfile() {
    try {
      setDeleting(true);
      setMessage("");

      const response = await fetch("/api/delete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({ token }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось удалить профиль");
      }

      localStorage.removeItem("hm51_token");
      localStorage.removeItem("hm51_login");
      localStorage.removeItem("hm51_gamer_team_id");

      window.location.href = "/login";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка удаления профиля");
    } finally {
      setDeleting(false);
    }
  }

  const selectedTeam = teamSections[selectedTeamIndex] || teamSections[0];

  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/40">ХМ 5.1</p>
            <h1 className="text-3xl font-black">Профиль</h1>
          </div>

          <Link
            href="/calendar"
            className="rounded-2xl bg-[#20d1a8] px-4 py-3 text-xs font-black text-[#121715]"
          >
            Календарь
          </Link>
        </header>

        {message && (
          <section className="mt-5 rounded-3xl bg-[#2d332f] p-4 text-sm font-bold text-[#20d1a8]">
            {message}
          </section>
        )}

        {loading && (
          <section className="mt-6 rounded-3xl bg-[#2d332f] p-5 text-sm text-white/50">
            Загружаем профиль...
          </section>
        )}

        {!loading && (
          <>
            <section className="mt-6 rounded-3xl bg-[#2d332f] p-5">
              <p className="mb-5 text-lg font-black">Основные данные</p>

              <div className="space-y-5">
                <ProfileField
                  label="Ваша фамилия"
                  value={family}
                  onChange={setFamily}
                  placeholder="Фамилия"
                />

                <ProfileField
                  label="Ваше имя"
                  value={name}
                  onChange={setName}
                  placeholder="Имя"
                />

                <ProfileField
                  label="Ваше отчество"
                  value={midname}
                  onChange={setMidname}
                  placeholder="Отчество"
                />

                <ProfileField
                  label="Дата рождения"
                  value={birthday}
                  onChange={setBirthday}
                  placeholder="Дата рождения"
                  type="date"
                />

                <ProfileField
                  label="Ваш логин"
                  value={login}
                  onChange={setLogin}
                  placeholder="Логин"
                  readOnly
                />

                <ProfileField
                  label="Ваша электронная почта"
                  value={email}
                  onChange={setEmail}
                  placeholder="Почта"
                  type="email"
                  readOnly
                />

                <ProfileField
                  label="Ваш телефон"
                  value={tel}
                  onChange={setTel}
                  placeholder="Телефон"
                  type="tel"
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="mt-7 h-14 w-full rounded-[30px] bg-[#20d1a8] text-xl font-semibold text-[#121715] disabled:opacity-50"
              >
                {saving ? "Сохраняем..." : "Сохранить изменения"}
              </button>
            </section>

            <section className="-mx-3 mt-5 rounded-[32px] bg-[#2d332f] px-3 py-5">
              <div className="flex items-center justify-between px-2">
                <p className="text-lg font-black">Ваша команда</p>

                <span className="rounded-xl bg-[#121715] px-3 py-2 text-sm font-black text-white/60">
                  {teamSections.length > 0
                    ? `${selectedTeamIndex + 1} / ${teamSections.length}`
                    : "0"}
                </span>
              </div>

              {teamSections.length === 0 && (
                <p className="mt-4 px-2 text-sm text-white/50">
                  Команды пока не найдены.
                </p>
              )}

              {selectedTeam && (
                <>
                  <div
                    onTouchStart={handleTeamTouchStart}
                    onTouchEnd={handleTeamTouchEnd}
                    className="mt-4 w-full select-none rounded-[28px] bg-[#121715] p-5"
                  >
                    <p className="truncate text-xl font-black text-white">
                      {selectedTeam.teamName}
                    </p>

                    {teamSections.length > 1 && (
                      <p className="mt-2 text-sm font-semibold text-white/40">
                        Свайпайте карточку вправо или влево для смены команды
                      </p>
                    )}

                    <button
                      onClick={() => toggleTeamSection(selectedTeam.id)}
                      className="mt-5 flex w-full items-center justify-between rounded-2xl bg-[#2d332f] px-4 py-4 text-left"
                    >
                      <span className="text-base font-black text-white">
                        Доп. информация команды
                      </span>

                      <span className="text-sm font-black text-[#20d1a8]">
                        {selectedTeam.isExpanded ? "Свернуть" : "Подробнее"}
                      </span>
                    </button>

                    {selectedTeam.isExpanded && (
                      <div className="mt-4 border-t border-white/10 pt-4">
                        <div className="grid gap-3">
                          <DetailRow
                            label="Гражданство"
                            value={selectedTeam.citizenship}
                          />

                          <DetailRow
                            label="Место рождения"
                            value={selectedTeam.birthPlace}
                          />

                          <DetailRow
                            label="Рост"
                            value={selectedTeam.height}
                          />

                          <DetailRow
                            label="Вес"
                            value={selectedTeam.weight}
                          />

                          <DetailRow
                            label="Игровой номер"
                            value={selectedTeam.playerNumber}
                          />

                          <DetailRow
                            label="Амплуа"
                            value={selectedTeam.role}
                          />

                          <DetailRow
                            label="Уровень игры"
                            value={selectedTeam.level}
                          />

                          <DetailRow
                            label="Телефон в команде"
                            value={selectedTeam.phone}
                          />

                          <DetailRow
                            label="Активный игрок"
                            value={selectedTeam.activeStatus}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {teamSections.length > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {teamSections.map((section, index) => (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => setSelectedTeamIndex(index)}
                          aria-label={`Команда ${index + 1}`}
                          className={
                            index === selectedTeamIndex
                              ? "h-2.5 w-8 rounded-full bg-[#20d1a8]"
                              : "h-2.5 w-2.5 rounded-full bg-white/25"
                          }
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>\n\n            <section className="mt-5 rounded-3xl bg-[#2d332f] p-5">
              <button
                onClick={() => setIsEmailBlockOpen(!isEmailBlockOpen)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-lg font-black">Сменить email</span>
                <span className="text-2xl font-black text-[#20d1a8]">
                  {isEmailBlockOpen ? "−" : "+"}
                </span>
              </button>

              {isEmailBlockOpen && (
                <div className="mt-5 space-y-4">
                  <ProfileField
                    label="Новая электронная почта"
                    value={newEmail}
                    onChange={(value) => {
                      setNewEmail(value);
                      setIsCodeSent(false);
                      setIsCodeChecked(false);
                    }}
                    placeholder="new@mail.ru"
                    type="email"
                  />

                  <button
                    onClick={sendCodeToNewEmail}
                    disabled={emailSaving}
                    className="h-12 w-full rounded-2xl bg-[#121715] text-sm font-black text-[#20d1a8] disabled:opacity-50"
                  >
                    {emailSaving ? "Отправляем..." : "Получить код"}
                  </button>

                  {isCodeSent && (
                    <>
                      <ProfileField
                        label="Код из письма"
                        value={emailCode}
                        onChange={setEmailCode}
                        placeholder="Введите код"
                      />

                      <button
                        onClick={checkNewEmailCode}
                        disabled={emailSaving}
                        className="h-12 w-full rounded-2xl bg-[#121715] text-sm font-black text-white disabled:opacity-50"
                      >
                        {isCodeChecked ? "Код подтверждён" : "Проверить код"}
                      </button>
                    </>
                  )}

                  <button
                    onClick={changeEmail}
                    disabled={emailSaving || !isCodeChecked}
                    className="h-14 w-full rounded-[30px] bg-[#20d1a8] text-lg font-semibold text-[#121715] disabled:opacity-30"
                  >
                    Изменить почту
                  </button>
                </div>
              )}
            </section>

            <section className="mt-5 rounded-3xl border border-red-500/30 bg-red-500/10 p-5">
              <p className="text-lg font-black text-red-200">Удалить профиль</p>

              <p className="mt-2 text-sm leading-6 text-red-100/70">
                После удаления профиль будет недоступен.
              </p>

              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="mt-5 h-14 w-full rounded-[30px] bg-red-500 text-lg font-semibold text-white"
                >
                  Удалить профиль
                </button>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="h-14 rounded-[30px] bg-[#2d332f] text-lg font-semibold text-white"
                  >
                    Отмена
                  </button>

                  <button
                    onClick={deleteProfile}
                    disabled={deleting}
                    className="h-14 rounded-[30px] bg-red-500 text-lg font-semibold text-white disabled:opacity-50"
                  >
                    {deleting ? "..." : "Да, удалить"}
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        <nav className="fixed bottom-5 left-1/2 grid w-[calc(100%-40px)] max-w-md -translate-x-1/2 grid-cols-3 gap-2 rounded-3xl bg-[#2d332f] p-2 shadow-2xl">
          <Link
            href="/calendar"
            className="rounded-2xl px-3 py-3 text-center text-xs font-bold text-white/50"
          >
            Календарь
          </Link>

          <Link
            href="/find-team"
            className="rounded-2xl px-3 py-3 text-center text-xs font-bold text-white/50"
          >
            Найти
          </Link>

          <Link
            href="/home"
            className="rounded-2xl bg-[#20d1a8] px-3 py-3 text-center text-xs font-black text-[#121715]"
          >
            Профиль
          </Link>
        </nav>
      </div>
    </main>
  );
}
