"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Script inline que corre antes del primer paint (ver layout.tsx) para
 * fijar la clase `dark` sin parpadeo. Se mantiene como string para poder
 * inyectarlo vía dangerouslySetInnerHTML fuera de este componente cliente. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem("theme");
    var dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export default function ThemeToggle() {
  const [oscuro, setOscuro] = useState<boolean | null>(null);

  useEffect(() => {
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const siguiente = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", siguiente);
    localStorage.setItem("theme", siguiente ? "dark" : "light");
    setOscuro(siguiente);
  }

  return (
    <button
      onClick={alternar}
      title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400
                 transition-colors hover:bg-gray-100 hover:text-gray-700
                 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
    >
      {oscuro === null ? (
        <span className="h-4 w-4" />
      ) : oscuro ? (
        <Sun className="h-4 w-4" strokeWidth={1.75} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={1.75} />
      )}
    </button>
  );
}
