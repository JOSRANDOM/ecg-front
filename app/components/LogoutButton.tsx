"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton({ variant = "icon" }: { variant?: "icon" | "full" }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (variant === "full") {
    return (
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-500
                   transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
        Cerrar sesión
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      title="Cerrar sesión"
      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500"
    >
      <LogOut className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}
