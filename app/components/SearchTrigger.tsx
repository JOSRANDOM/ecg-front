"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { EVENTO_ABRIR_BUSCADOR } from "./CommandPalette";

export default function SearchTrigger() {
  const [esMac, setEsMac] = useState(true);

  useEffect(() => {
    setEsMac(/Mac|iPhone|iPod|iPad/.test(navigator.userAgent));
  }, []);

  return (
    <button
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_BUSCADOR))}
      className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-400
                 transition-colors hover:bg-gray-50 hover:text-gray-600
                 dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
    >
      <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
      <span className="hidden sm:inline">Buscar</span>
      <kbd className="hidden rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-sans
                       dark:border-gray-700 dark:bg-gray-800 sm:inline">
        {esMac ? "⌘K" : "Ctrl+K"}
      </kbd>
    </button>
  );
}
