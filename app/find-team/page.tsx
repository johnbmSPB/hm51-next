"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function statusClass(status: string) {
  if (status === "Идёт набор в команду") {
    return "bg-[#20d1a8]/15 text-[#20d1a8]";
  }

  if (status === "Заявка в команду подана") {
    return "bg-yellow-500/15 text-yellow-300";
  }

  return "bg-white/10 text-white/45";
}

function includesSearch(value: string, search: string) {
  return String(value || "")
    .toLowerCase()
    .includes(search.trim().toLowerCase());
}

function TeamInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  if (!value) return null;

  return (
    <div className="rounded-2xl bg-[#121715] p-4">
      <p className="text-xs font-bold text-[#20d1a8]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-white">
        {value}
      </p>
    </div>
  );
}

export default function FindTeamPage() {
  const [token, setToken] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openTeamId, setOpenTeamId] = useState("");
  const [actionTeamId, setActionTeamId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("hm51_token") || "";

    if (!savedToken) {
      window.location.href = "/login";
      return;
    }

    setToken(savedToken);
    loadTeams(savedToken);
  }, []);

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return teams;

    return teams.filter((team) => {
      return (
        includesSearch(team.title || "", search) ||
        includesSearch(team.level || "", search) ||
        includesSearch(team.stadiumName || "", search) ||
        includesSearch(team.address || "", search)
      );
    });
  }, [teams, search]);

  async function loadTeams(currentToken = token) {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/find-teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token: currentToken,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось загрузить команды");
      }

      setTeams(Array.isArray(json.teams) ? json.teams : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки команд");
    } finally {
      setLoading(false);
    }
  }

  async function askJoinTeam(team: any) {
    try {
      setActionTeamId(team.id);
      setMessage("");

      const response = await fetch("/api/join-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          teamId: team.id,
          gameLevel: team.gameLevelForRequest || team.level || "",
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось подать заявку");
      }

      setTeams((oldTeams) =>
        oldTeams.map((item) =>
          item.id === team.id
            ? {
                ...item,
                isPending: true,
                canJoin: false,
                status: "Заявка в команду подана",
              }
            : item
        )
      );

      setMessage(json.message || "Заявка в команду подана");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка подачи заявки");
    } finally {
      setActionTeamId("");
    }
  }

  async function cancelJoinTeam(team: any) {
    try {
      setActionTeamId(team.id);
      setMessage("");

      const response = await fetch("/api/cancel-join-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          token,
          teamId: team.id,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.result === false) {
        throw new Error(json.error || "Не удалось отменить заявку");
      }

      setTeams((oldTeams) =>
        oldTeams.map((item) =>
          item.id === team.id
            ? {
                ...item,
                isPending: false,
                canJoin: true,
                status: "Идёт набор в команду",
              }
            : item
        )
      );

      setMessage(json.message || "Заявка отменена");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка отмены заявки");
    } finally {
      setActionTeamId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#121715] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-md">
        <header>
          <p className="text-sm text-white/40">ХМ 5.1</p>
          <h1 className="text-3xl font-black">Найти команду</h1>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Поиск команд, просмотр стадиона, расписания и подача заявки.
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

          {loading && (
            <p className="mt-4 text-sm text-white/45">
              Загружаем команды...
            </p>
          )}

          {!loading && filteredTeams.length === 0 && (
            <p className="mt-4 text-sm text-white/45">
              Команды не найдены.
            </p>
          )}

          {!loading && filteredTeams.length > 0 && (
            <div className="mt-4 space-y-3">
              {filteredTeams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-3xl bg-[#121715] p-4"
                >
                  <button
                    onClick={() =>
                      setOpenTeamId(openTeamId === team.id ? "" : team.id)
                    }
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-white">
                        {team.title}
                      </p>

                      <p className="mt-1 text-sm font-bold text-white/45">
                        Уровень: {team.level || "Не указан"}
                      </p>

                      <span
                        className={`mt-3 inline-flex rounded-xl px-3 py-2 text-xs font-black ${statusClass(
                          team.status
                        )}`}
                      >
                        {team.status}
                      </span>
                    </div>

                    <div
                      className={
                        openTeamId === team.id
                          ? "shrink-0 rotate-180 text-2xl font-black text-white transition-transform"
                          : "shrink-0 text-2xl font-black text-white transition-transform"
                      }
                    >
                      ˅
                    </div>
                  </button>

                  {openTeamId === team.id && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <div className="grid gap-3">
                        <TeamInfoRow
                          label="Сайт команды"
                          value={team.teamWebsite || ""}
                        />

                        <TeamInfoRow
                          label="Email команды"
                          value={team.email || ""}
                        />

                        <TeamInfoRow
                          label="Стадион"
                          value={team.stadiumName || ""}
                        />

                        <TeamInfoRow
                          label="Адрес стадиона"
                          value={team.address || ""}
                        />

                        <TeamInfoRow
                          label="Телефон стадиона"
                          value={team.phone || ""}
                        />

                        <TeamInfoRow
                          label="Сайт стадиона"
                          value={team.stadiumWebsite || ""}
                        />

                        <div className="rounded-2xl bg-[#2d332f] p-4">
                          <p className="text-xs font-bold text-[#20d1a8]">
                            Расписание тренировок
                          </p>

                          {(team.schedule || []).length === 0 ? (
                            <p className="mt-1 text-sm font-bold text-white/45">
                              Расписание не указано
                            </p>
                          ) : (
                            <div className="mt-3 space-y-2">
                              {(team.schedule || []).map((item: any) => (
                                <div
                                  key={`${team.id}-${item.day}-${item.time}`}
                                  className="flex items-center justify-between gap-3 rounded-xl bg-[#121715] px-3 py-2"
                                >
                                  <span className="text-sm font-black text-white">
                                    {item.day}
                                  </span>

                                  <span className="text-sm font-bold text-white/75">
                                    {item.time}
                                    {item.duration ? ` · ${item.duration}` : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {team.canJoin && (
                        <button
                          onClick={() => askJoinTeam(team)}
                          disabled={actionTeamId === team.id}
                          className="mt-4 h-12 w-full rounded-[30px] bg-[#20d1a8] text-sm font-black text-[#121715] disabled:opacity-50"
                        >
                          {actionTeamId === team.id
                            ? "Отправляем..."
                            : "Подать заявку"}
                        </button>
                      )}

                      {team.isPending && (
                        <button
                          onClick={() => cancelJoinTeam(team)}
                          disabled={actionTeamId === team.id}
                          className="mt-4 h-12 w-full rounded-[30px] bg-yellow-500 text-sm font-black text-[#121715] disabled:opacity-50"
                        >
                          {actionTeamId === team.id
                            ? "Отменяем..."
                            : "Отменить заявку"}
                        </button>
                      )}

                      {!team.canJoin && !team.isPending && (
                        <p className="mt-4 rounded-2xl bg-white/5 p-3 text-center text-sm font-bold text-white/40">
                          Набор в команду закрыт
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        <nav className="fixed bottom-5 left-1/2 grid w-[calc(100%-24px)] max-w-md -translate-x-1/2 grid-cols-5 gap-1 rounded-3xl bg-[#2d332f] p-2 shadow-2xl">
          <Link href="/calendar" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Календарь</Link>
          <Link href="/home" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Профиль</Link>
          <Link href="/find-team" className="rounded-2xl bg-[#20d1a8] px-1 py-3 text-center text-[10px] font-black text-[#121715]">Найти</Link>
          <Link href="/chat" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Чат</Link>
          <Link href="/menu" className="rounded-2xl px-1 py-3 text-center text-[10px] font-bold text-white/50">Меню</Link>
        </nav>
      </div>
    </main>
  );
}
