"use client";

import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    ymaps?: any;
    __hm51YandexMapsLoading?: Promise<any>;
  }
}

function toNumber(value: any) {
  if (value === null || value === undefined) return null;

  const normalized = String(value).trim().replace(",", ".");
  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function getTeamCoords(team: any) {
  const lat =
    toNumber(team.lat) ||
    toNumber(team.latitude) ||
    toNumber(team.LAT) ||
    toNumber(team.LATITUDE) ||
    toNumber(team.geo_lat) ||
    toNumber(team.GEO_LAT) ||
    toNumber(team.stadiumLat) ||
    toNumber(team.stadium_lat) ||
    toNumber(team.STADIUM_LAT);

  const lng =
    toNumber(team.lng) ||
    toNumber(team.lon) ||
    toNumber(team.longitude) ||
    toNumber(team.LNG) ||
    toNumber(team.LON) ||
    toNumber(team.LONGITUDE) ||
    toNumber(team.geo_lng) ||
    toNumber(team.GEO_LNG) ||
    toNumber(team.stadiumLng) ||
    toNumber(team.stadium_lng) ||
    toNumber(team.STADIUM_LNG);

  if (lat && lng) {
    return { lat, lng };
  }

  const geo = String(team.geo || team.GEO || team.coordinates || "").trim();

  if (geo.includes(",")) {
    const [geoLat, geoLng] = geo.split(",").map((item) => toNumber(item));

    if (geoLat && geoLng) {
      return {
        lat: geoLat,
        lng: geoLng,
      };
    }
  }

  return null;
}

function loadYandexMaps() {
  if (window.ymaps) {
    return Promise.resolve(window.ymaps);
  }

  if (window.__hm51YandexMapsLoading) {
    return window.__hm51YandexMapsLoading;
  }

  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || "";

  window.__hm51YandexMapsLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(
      apiKey
    )}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      window.ymaps.ready(() => {
        resolve(window.ymaps);
      });
    };

    script.onerror = () => {
      reject(new Error("Не удалось загрузить Яндекс.Карты"));
    };

    document.head.appendChild(script);
  });

  return window.__hm51YandexMapsLoading;
}

function TeamMapCard({
  team,
  actionTeamId,
  onClose,
  onAskJoin,
  onCancelJoin,
}: {
  team: any;
  actionTeamId: string;
  onClose: () => void;
  onAskJoin: (team: any) => void;
  onCancelJoin: (team: any) => void;
}) {
  return (
    <div className="absolute bottom-4 left-4 right-4 z-[500] rounded-[28px] bg-[#121715] p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-white">
            {team.title || "Команда"}
          </p>

          <p className="mt-1 text-sm font-bold text-white/45">
            Уровень: {team.level || "Не указан"}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-black text-white"
        >
          ×
        </button>
      </div>

      <div className="mt-4 grid gap-2 text-sm font-bold">
        {team.stadiumName && (
          <p className="text-white/75">
            <span className="text-[#20d1a8]">Стадион:</span> {team.stadiumName}
          </p>
        )}

        {team.address && (
          <p className="text-white/75">
            <span className="text-[#20d1a8]">Адрес:</span> {team.address}
          </p>
        )}

        {team.phone && (
          <p className="text-white/75">
            <span className="text-[#20d1a8]">Телефон:</span> {team.phone}
          </p>
        )}

        {team.stadiumWebsite && (
          <p className="break-words text-white/75">
            <span className="text-[#20d1a8]">Сайт:</span> {team.stadiumWebsite}
          </p>
        )}

        {(team.schedule || []).length > 0 && (
          <div className="mt-1 rounded-2xl bg-[#2d332f] p-3">
            <p className="text-xs font-black text-[#20d1a8]">
              Расписание тренировок
            </p>

            <div className="mt-2 grid gap-1">
              {(team.schedule || []).map((item: any, index: number) => (
                <p
                  key={`${team.id}-${index}-${item.day}-${item.time}`}
                  className="text-sm font-bold text-white/75"
                >
                  {item.day} в {item.time}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {team.canJoin && (
        <button
          type="button"
          onClick={() => onAskJoin(team)}
          disabled={actionTeamId === team.id}
          className="mt-4 h-12 w-full rounded-[30px] bg-[#20d1a8] text-sm font-black text-[#121715] disabled:opacity-50"
        >
          {actionTeamId === team.id ? "Отправляем..." : "Подать заявку"}
        </button>
      )}

      {team.isPending && (
        <button
          type="button"
          onClick={() => onCancelJoin(team)}
          disabled={actionTeamId === team.id}
          className="mt-4 h-12 w-full rounded-[30px] bg-yellow-500 text-sm font-black text-[#121715] disabled:opacity-50"
        >
          {actionTeamId === team.id ? "Отменяем..." : "Отменить заявку"}
        </button>
      )}

      {!team.canJoin && !team.isPending && (
        <p className="mt-4 rounded-2xl bg-white/5 p-3 text-center text-sm font-bold text-white/40">
          Набор в команду закрыт
        </p>
      )}
    </div>
  );
}

export default function FindTeamMap({
  teams,
  actionTeamId,
  onAskJoin,
  onCancelJoin,
}: {
  teams: any[];
  actionTeamId: string;
  onAskJoin: (team: any) => void;
  onCancelJoin: (team: any) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const clusterOrObjectsRef = useRef<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [mapError, setMapError] = useState("");

  const teamsWithCoords = useMemo(() => {
    return teams
      .map((team) => ({
        team,
        coords: getTeamCoords(team),
      }))
      .filter((item) => item.coords);
  }, [teams]);

  useEffect(() => {
    let active = true;

    async function initMap() {
      try {
        if (!mapRef.current || mapInstanceRef.current) return;

        const ymaps = await loadYandexMaps();

        if (!active || !mapRef.current) return;

        const map = new ymaps.Map(mapRef.current, {
          center: [59.9386, 30.3141],
          zoom: 10,
          controls: ["zoomControl", "geolocationControl"],
        });

        mapInstanceRef.current = map;
      } catch {
        setMapError("Не удалось загрузить Яндекс.Карты");
      }
    }

    initMap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    async function updateMarkers() {
      const ymaps = await loadYandexMaps();
      const map = mapInstanceRef.current;

      if (!map) return;

      clusterOrObjectsRef.current.forEach((item) => {
        map.geoObjects.remove(item);
      });

      clusterOrObjectsRef.current = [];

      const points: any[] = [];

      teamsWithCoords.forEach(({ team, coords }: any) => {
        const placemark = new ymaps.Placemark(
          [coords.lat, coords.lng],
          {
            hintContent: team.title || "Команда",
          },
          {
            preset: "islands#greenSportIcon",
          }
        );

        placemark.events.add("click", () => {
          setSelectedTeam(team);
        });

        map.geoObjects.add(placemark);
        clusterOrObjectsRef.current.push(placemark);
        points.push([coords.lat, coords.lng]);
      });

      if (points.length > 0) {
        map.setBounds(ymaps.util.bounds.fromPoints(points), {
          checkZoomRange: true,
          zoomMargin: 40,
        });
      }
    }

    updateMarkers();
  }, [teamsWithCoords]);

  return (
    <div className="relative mt-4 overflow-hidden rounded-[28px] bg-[#121715]">
      {mapError && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center p-6 text-center">
          <p className="rounded-3xl bg-[#2d332f] p-4 text-sm font-bold text-red-200">
            {mapError}
          </p>
        </div>
      )}

      {!mapError && teamsWithCoords.length === 0 && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center p-6 text-center">
          <p className="rounded-3xl bg-[#2d332f] p-4 text-sm font-bold text-white/60">
            У команд пока нет координат стадионов для отображения на карте.
          </p>
        </div>
      )}

      <div ref={mapRef} className="h-[560px] w-full" />

      {selectedTeam && (
        <TeamMapCard
          team={selectedTeam}
          actionTeamId={actionTeamId}
          onClose={() => setSelectedTeam(null)}
          onAskJoin={onAskJoin}
          onCancelJoin={onCancelJoin}
        />
      )}
    </div>
  );
}
