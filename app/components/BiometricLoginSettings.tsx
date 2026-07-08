"use client";

import { useEffect, useState } from "react";
import {
  canUseBiometric,
  disableBiometricLogin,
  enableBiometricLogin,
  isBiometricEnabled,
} from "../lib/biometric";

export default function BiometricLoginSettings() {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setEnabled(isBiometricEnabled());

    canUseBiometric().then((value) => {
      setAvailable(value);
    });
  }, []);

  async function toggleBiometric() {
    try {
      setLoading(true);
      setMessage("");

      if (enabled) {
        disableBiometricLogin();
        setEnabled(false);
        setMessage("Вход по биометрии выключен");
        return;
      }

      await enableBiometricLogin();
      setEnabled(true);
      setMessage("Вход по биометрии включён");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось настроить биометрию"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-5 rounded-[32px] bg-[#2d332f] p-5">
      <button
        type="button"
        onClick={toggleBiometric}
        disabled={loading || !available}
        className="flex w-full items-center justify-between gap-4 rounded-3xl bg-[#121715] p-4 text-left disabled:opacity-50"
      >
        <div className="pr-4">
          <p className="text-lg font-black text-white">
            Вход по биометрии
          </p>

          <p className="mt-2 text-sm font-semibold leading-5 text-white/45">
            Вход в приложение по отпечатку, Face ID или PIN-коду устройства.
          </p>
        </div>

        <div
          className={
            enabled
              ? "flex h-8 min-w-14 items-center justify-end rounded-full bg-[#20d1a8] p-1"
              : "flex h-8 min-w-14 items-center justify-start rounded-full bg-white/15 p-1"
          }
        >
          <div className="h-6 w-6 rounded-full bg-white shadow-lg" />
        </div>
      </button>

      {!available && (
        <p className="mt-4 rounded-2xl bg-white/5 p-3 text-sm font-bold text-white/45">
          Биометрия недоступна в этом браузере или на этом устройстве.
        </p>
      )}

      {message && (
        <p
          className={
            enabled
              ? "mt-4 rounded-2xl bg-[#20d1a8]/10 p-3 text-sm font-bold text-[#20d1a8]"
              : "mt-4 rounded-2xl bg-white/5 p-3 text-sm font-bold text-white/45"
          }
        >
          {message}
        </p>
      )}
    </section>
  );
}
