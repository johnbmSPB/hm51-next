"use client";

import { useEffect, useRef, useState } from "react";

const PHOTO_MODE_KEY = "hm51_player_photo_mode";
const CUSTOM_PHOTO_KEY = "hm51_custom_player_photo";

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const maxSize = 700;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Не удалось обработать фото"));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      img.onerror = () => reject(new Error("Не удалось открыть фото"));
      img.src = String(reader.result || "");
    };

    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

function notifyPhotoChanged() {
  window.dispatchEvent(new Event("hm51_player_photo_changed"));
}

export default function PlayerPhotoSourceSettings() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [useGalleryPhoto, setUseGalleryPhoto] = useState(false);
  const [photo, setPhoto] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const mode = localStorage.getItem(PHOTO_MODE_KEY);
    const savedPhoto = localStorage.getItem(CUSTOM_PHOTO_KEY) || "";

    setUseGalleryPhoto(mode === "gallery");
    setPhoto(savedPhoto);
  }, []);

  function toggleMode() {
    const nextValue = !useGalleryPhoto;

    setUseGalleryPhoto(nextValue);
    localStorage.setItem(PHOTO_MODE_KEY, nextValue ? "gallery" : "server");

    setMessage(
      nextValue
        ? "Будет использоваться фото из галереи для всех команд"
        : "Будет использоваться фото игрока с сервера команды"
    );

    notifyPhotoChanged();
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return;

    try {
      setMessage("");

      if (!file.type.startsWith("image/")) {
        throw new Error("Выберите изображение");
      }

      const resized = await resizeImage(file);

      localStorage.setItem(CUSTOM_PHOTO_KEY, resized);
      localStorage.setItem(PHOTO_MODE_KEY, "gallery");

      setPhoto(resized);
      setUseGalleryPhoto(true);
      setMessage("Фото сохранено и будет использоваться для всех команд");

      notifyPhotoChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки фото");
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function deleteCustomPhoto() {
    localStorage.removeItem(CUSTOM_PHOTO_KEY);
    localStorage.setItem(PHOTO_MODE_KEY, "server");

    setPhoto("");
    setUseGalleryPhoto(false);
    setMessage("Фото из галереи удалено. Теперь используется фото с сервера.");

    notifyPhotoChanged();
  }

  return (
    <section className="mt-5 rounded-[32px] bg-[#2d332f] p-5">
      <button
        type="button"
        onClick={toggleMode}
        className="flex w-full items-center justify-between gap-4 rounded-3xl bg-[#121715] p-4 text-left"
      >
        <div className="pr-4">
          <p className="text-lg font-black text-white">
            Фото игрока
          </p>

          <p className="mt-2 text-sm font-semibold leading-5 text-white/45">
            Если выключено — фото загружается с сервера команды.
            Если включено — одно фото из галереи используется для всех команд.
          </p>
        </div>

        <div
          className={
            useGalleryPhoto
              ? "flex h-8 min-w-14 items-center justify-end rounded-full bg-[#20d1a8] p-1"
              : "flex h-8 min-w-14 items-center justify-start rounded-full bg-white/15 p-1"
          }
        >
          <div className="h-6 w-6 rounded-full bg-white shadow-lg" />
        </div>
      </button>

      <div className="mt-4 rounded-3xl bg-[#121715] p-4">
        <p className="text-sm font-black text-[#20d1a8]">
          {useGalleryPhoto
            ? "Используется фото из галереи"
            : "Используется фото с сервера команды"}
        </p>

        {photo && (
          <div className="mt-4 flex items-center gap-4">
            <img
              src={photo}
              alt="Фото игрока"
              className="h-20 w-20 rounded-3xl object-cover"
            />

            <div className="text-sm font-semibold text-white/50">
              Это фото будет показано во всех командах.
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFileChange(event.target.files?.[0])}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 h-12 w-full rounded-[30px] bg-[#20d1a8] text-sm font-black text-[#121715]"
        >
          Выбрать фото из галереи
        </button>

        {photo && (
          <button
            type="button"
            onClick={deleteCustomPhoto}
            className="mt-3 h-12 w-full rounded-[30px] bg-red-500 text-sm font-black text-white"
          >
            Удалить фото из галереи
          </button>
        )}

        {message && (
          <p className="mt-4 rounded-2xl bg-white/5 p-3 text-sm font-bold text-white/60">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
