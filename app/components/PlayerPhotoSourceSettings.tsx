"use client";

import { useEffect, useState } from "react";
import { getScopedItem, removeScopedItem, setScopedItem } from "../lib/accountStorage";

const PLAYER_PHOTO_MODE_KEY = "hm51_player_photo_mode";
const CUSTOM_PLAYER_PHOTO_KEY = "hm51_custom_player_photo";

function resizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSize = 700;
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Не удалось обработать фото"));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.onerror = () => reject(new Error("Не удалось открыть фото"));
      image.src = String(reader.result || "");
    };

    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

function notifyPhotoChanged() {
  window.dispatchEvent(new Event("hm51_player_photo_changed"));
}

export default function PlayerPhotoSourceSettings() {
  const [mode, setMode] = useState<"server" | "gallery">("server");
  const [photo, setPhoto] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedMode = getScopedItem(PLAYER_PHOTO_MODE_KEY) || "server";
    const savedPhoto = getScopedItem(CUSTOM_PLAYER_PHOTO_KEY) || "";

    setMode(savedMode === "gallery" ? "gallery" : "server");
    setPhoto(savedPhoto);
  }, []);

  async function toggleMode() {
    setMessage("");

    if (mode === "gallery") {
      setMode("server");
      setScopedItem(PLAYER_PHOTO_MODE_KEY, "server");
      notifyPhotoChanged();
      return;
    }

    setMode("gallery");
    setScopedItem(PLAYER_PHOTO_MODE_KEY, "gallery");
    notifyPhotoChanged();
  }

  async function choosePhoto(file: File | null) {
    if (!file) return;

    try {
      setLoading(true);
      setMessage("");

      const resized = await resizeImage(file);

      setPhoto(resized);
      setMode("gallery");

      setScopedItem(PLAYER_PHOTO_MODE_KEY, "gallery");
      setScopedItem(CUSTOM_PLAYER_PHOTO_KEY, resized);

      notifyPhotoChanged();
      setMessage("Фото сохранено для этого аккаунта");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить фото");
    } finally {
      setLoading(false);
    }
  }

  function removePhoto() {
    setPhoto("");
    setMode("server");

    setScopedItem(PLAYER_PHOTO_MODE_KEY, "server");
    removeScopedItem(CUSTOM_PLAYER_PHOTO_KEY);

    notifyPhotoChanged();
    setMessage("Фото из галереи удалено для этого аккаунта");
  }

  const galleryEnabled = mode === "gallery";

  return (
    <section className="mt-5 rounded-[32px] bg-[#2d332f] p-5">
      <button
        type="button"
        role="switch"
        aria-checked={galleryEnabled}
        onClick={toggleMode}
        className="flex w-full items-center justify-between gap-4 rounded-3xl bg-[#121715] p-4 text-left"
      >
        <div className="pr-4">
          <p className="text-lg font-black text-white">Фото игрока</p>
          <p className="mt-2 text-sm font-semibold leading-5 text-white/45">
            Выберите фото команды или своё изображение из галереи для этого аккаунта.
          </p>
        </div>

        <div
          className={
            galleryEnabled
              ? "flex h-8 min-w-14 items-center justify-end rounded-full bg-[#20d1a8] p-1"
              : "flex h-8 min-w-14 items-center justify-start rounded-full bg-white/15 p-1"
          }
        >
          <span className="h-6 w-6 rounded-full bg-white shadow-lg" />
        </div>
      </button>

      <p
        className={
          galleryEnabled
            ? "mt-4 rounded-2xl bg-[#20d1a8]/10 p-3 text-sm font-bold text-[#20d1a8]"
            : "mt-4 rounded-2xl bg-white/5 p-3 text-sm font-bold text-white/45"
        }
      >
        {galleryEnabled
          ? photo
            ? "Используется своё фото из галереи"
            : "Выберите своё фото из галереи"
          : "Используется фото из команды"}
      </p>

      {galleryEnabled && (
        <div className="mt-4 rounded-3xl bg-[#121715] p-4">
          {photo && (
            <img
              src={photo}
              alt="Фото игрока"
              className="mb-4 h-28 w-28 rounded-3xl border border-white/10 object-cover shadow-lg"
            />
          )}

          <label className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#20d1a8] text-sm font-black text-[#121715]">
            {loading ? "Сохраняем..." : photo ? "Заменить фото" : "Выбрать фото"}
            <input
              type="file"
              accept="image/*"
              disabled={loading}
              className="hidden"
              onChange={(event) => choosePhoto(event.target.files?.[0] || null)}
            />
          </label>

          {photo && (
            <button
              type="button"
              onClick={removePhoto}
              disabled={loading}
              className="mt-3 h-12 w-full rounded-2xl bg-white/10 text-sm font-black text-white disabled:opacity-50"
            >
              Удалить фото из галереи
            </button>
          )}
        </div>
      )}

      {message && (
        <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm font-semibold leading-5 text-white/65">
          {message}
        </p>
      )}
    </section>
  );
}
