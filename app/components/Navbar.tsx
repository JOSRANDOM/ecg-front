import Link from "next/link";
import { Activity } from "lucide-react";
import NavDrawer from "./NavDrawer";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";
import SearchTrigger from "./SearchTrigger";
import NotificationBadge from "./NotificationBadge";

interface Props {
  etiqueta: string;
  permisos: string[];
}

export default function Navbar({ etiqueta, permisos }: Props) {
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 dark:bg-gray-950 dark:border-gray-800 print:hidden">
      <div className="flex h-14 w-full items-center gap-3 px-6">
        <NavDrawer permisos={permisos} />
        <Link
          href="/"
          className="flex items-center gap-2.5 text-gray-900 transition-opacity hover:opacity-70 dark:text-gray-100"
        >
          <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
          <span className="text-sm font-semibold tracking-tight">Cardioflow E3</span>
        </Link>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          {etiqueta}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <SearchTrigger />
          <NotificationBadge permisos={permisos} />
          <ThemeToggle />
          <LogoutButton variant="icon" />
        </div>
      </div>
    </header>
  );
}
