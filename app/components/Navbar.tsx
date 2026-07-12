import Link from "next/link";
import { Activity } from "lucide-react";
import NavDrawer from "./NavDrawer";
import LogoutButton from "./LogoutButton";

interface Props {
  etiqueta: string;
  permisos: string[];
}

export default function Navbar({ etiqueta, permisos }: Props) {
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
      <div className="flex h-14 w-full items-center gap-3 px-6">
        <NavDrawer permisos={permisos} />
        <Link
          href="/"
          className="flex items-center gap-2.5 text-gray-900 transition-opacity hover:opacity-70"
        >
          <Activity className="h-5 w-5 text-blue-600" strokeWidth={2} />
          <span className="text-sm font-semibold tracking-tight">Cardioflow E3</span>
        </Link>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600">
          {etiqueta}
        </span>
        <div className="ml-auto">
          <LogoutButton variant="icon" />
        </div>
      </div>
    </header>
  );
}
