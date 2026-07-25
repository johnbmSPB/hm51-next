export type AttendanceAgree = "true" | "false";

export type AttendanceSuccessPayload = {
  result: true;
  agree: AttendanceAgree;
};

export type AttendanceErrorPayload = {
  result: false;
  error: string;
};

const DEFAULT_ATTENDANCE_ERROR = "Ошибка отправки участия";

export function makeAttendanceSuccessPayload(
  agree: AttendanceAgree
): AttendanceSuccessPayload {
  return {
    result: true,
    agree,
  };
}

export function makeAttendanceErrorPayload(
  error: unknown
): AttendanceErrorPayload {
  const message = String(error || "").trim();

  return {
    result: false,
    error: message || DEFAULT_ATTENDANCE_ERROR,
  };
}
