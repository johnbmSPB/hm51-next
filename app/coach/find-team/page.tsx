"use client";

import SmartContactValue from "../../components/SmartContactValue";

import { useEffect, useMemo, useState } from "react";
import CoachBottomNav from "../components/CoachBottomNav";

function includesSearch(value: string, search: string) {
  return String(value || "").toLowerCase().includes(search.trim().toLowerCase());
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl bg-[#2d332f] p-4">
      <p className="text-xs font-bold text-[#20d1a8]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-white"><SmartContactValue label={label} value={value} className="mt-1 break-words text-sm font-bold text-white" /></p>
    </div>
  );
}

export default function CoachFindTeamPage() {
  const [token, setToken] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openTeamId, setOpenTeamId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedToken =
      localStorage.getItem("hm51_token") || localStorage.getItem("auth_token") || "";

    if (!savedToken) {
      window.location.replace("/login");
      return;
    }

    localStorage.setItem("hm51_active_role", "COACH");
    setToken(savedToken);
    loadTeams(savedToken);
  }, []);

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return teams;

    return teams.filter((team) =>
      [team.title, team.level, team.stadiumName, team.address].some((value) =>
        includesSearch(value || "", search)
      )
    );
  }, [teams, search]);

  async function loadTeams(currentToken = token) {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/find-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({ token: currentToken }),
      });
      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось загрузить команды");
      }

      setTeams(Array.isArray(json.teams) ? json.teams : []);
    } catch (error) {
      setTeams([]);
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки команд");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <header>
          <p className="text-sm text-white/40">ХМ 5.1 · Тренер</p>
          <h1 className="text-3xl font-black">Найти команду</h1>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Просмотр команд, стадионов и расписаний. Подключение тренера к команде подтверждает администратор.
          </p>
        </header>

        {message && (
          <section className="mt-5 rounded-3xl bg-[#2d332f] p-4 text-sm font-bold text-[#20d1a8]">
            {message}
          </section>
        )}

        <section className="mt-5 rounded-3xl bg-[#2d332f] p-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Введите название команды"
            className="h-12 w-full rounded-2xl border border-white/20 bg-[#121715] px-4 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-[#20d1a8]"
          />

          {loading && <p className="mt-4 text-sm text-white/45">Загружаем команды...</p>}

          {!loading && filteredTeams.length === 0 && (
            <p className="mt-4 text-sm text-white/45">Команды не найдены.</p>
          )}

          {!loading && filteredTeams.length > 0 && (
            <div className="mt-4 space-y-3">
              {filteredTeams.map((team) => (
                <div key={team.id} className="rounded-3xl bg-[#121715] p-4">
                  <button
                    type="button"
                    onClick={() => setOpenTeamId(openTeamId === team.id ? "" : team.id)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-white">{team.title}</p>
                      <p className="mt-1 text-sm font-bold text-white/45">
                        Уровень: {team.level || "Не указан"}
                      </p>
                      <span className="mt-3 inline-flex rounded-xl bg-[#20d1a8]/15 px-3 py-2 text-xs font-black text-[#20d1a8]">
                        {team.status || "Информация о команде"}
                      </span>
                    </div>
                    <span className={openTeamId === team.id ? "rotate-180 text-2xl" : "text-2xl"}>˅</span>
                  </button>

                  {openTeamId === team.id && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <div className="grid gap-3">
                        <InfoRow label="Сайт команды" value={team.teamWebsite} />
                        <InfoRow label="Email команды" value={team.email} />
                        <InfoRow label="Стадион" value={team.stadiumName} />
                        <InfoRow label="Адрес стадиона" value={team.address} />
                        <InfoRow label="Телефон стадиона" value={team.phone} />

                        <div className="rounded-2xl bg-[#2d332f] p-4">
                          <p className="text-xs font-bold text-[#20d1a8]">Расписание тренировок</p>
                          {(team.schedule || []).length === 0 ? (
                            <p className="mt-1 text-sm font-bold text-white/45">Расписание не указано</p>
                          ) : (
                            <div className="mt-3 space-y-2">
                              {(team.schedule || []).map((item: any) => (
                                <div
                                  key={`${team.id}-${item.day}-${item.time}`}
                                  className="flex items-center justify-between rounded-xl bg-[#121715] px-3 py-2"
                                >
                                  <span className="text-sm font-black">{item.day}</span>
                                  <span className="text-sm font-bold text-white/70">{item.time}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMessage("Для подключения к команде запросите приглашение или код у её администратора.")}
                        className="mt-4 h-12 w-full rounded-[30px] bg-[#20d1a8] text-sm font-black text-[#121715]"
                      >
                        Подключиться к команде
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <CoachBottomNav active="find" />
      </div>
    </main>
  );
}
