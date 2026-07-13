"use client";

export default function AcceptPolicyButton() {
  function acceptPolicy() {
    localStorage.setItem("hm51_policy_accepted", "true");

    const role = localStorage.getItem("hm51_register_role") || "Игрок";

    if (role === "Тренер") {
      window.location.href = "/coach/profile-setup";
      return;
    }

    window.location.href = "/connecting-team";
  }

  return (
    <button
      type="button"
      onClick={acceptPolicy}
      className="flex h-14 w-full items-center justify-center rounded-[30px] bg-[#24d7b3] text-lg font-black text-black"
    >
      Принять
    </button>
  );
}
