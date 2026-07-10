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

  return (
    <section className="mt-5 rounded-3xl bg-[#2d332f] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Фото игрока</h2>
          <p className="mt-1 text-sm font-bold text-white/45">
            Выключено — фото берётся из команды. Включено — своё фото из галереи только для этого аккаунта.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleMode}
          className={
            mode === "gallery"
              ? "flex h-8 w-14 shrink-0 items-center justify-end rounded-full bg-[#20d1a8] p-1"
              : "flex h-8 w-14 shrink-0 items-center justify-start rounded-full bg-white/15 p-1"
          }
        >
          <span className="h-6 w-6 rounded-full bg-white" />
        </button>
      </div>

      {mode === "gallery" && (
        <div className="mt-4">
          {photo && (
            <img
              src={photo}
              alt="Фото игрока"
              className="mb-4 h-28 w-28 rounded-3xl object-cover"
            />
          )}

          <label className="flex h-12 w-full items-center justify-center rounded-[30px] bg-[#20d1a8] text-sm font-black text-[#121715]">
            {loading ? "Сохраняем..." : photo ? "Заменить фото" : "Выбрать фото"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => choosePhoto(event.target.files?.[0] || null)}
            />
          </label>

          {photo && (
            <button
              type="button"
              onClick={removePhoto}
              className="mt-3 h-12 w-full rounded-[30px] bg-white/10 text-sm font-black text-white"
            >
              Удалить фото из галереи
            </button>
          )}
        </div>
      )}

      {message && (
        <p className="mt-4 rounded-2xl bg-[#121715] p-3 text-sm font-bold text-[#20d1a8]">
          {message}
        </p>
      )}
    </section>
  );
}
