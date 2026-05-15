import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Users, Truck, BarChart3, LogOut, DollarSign, AlertTriangle, MessageCircle } from "lucide-react";
import { useDB, api } from "@/lib/store";
import { useEffect } from "react";

const tabs = [
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/cobrar", label: "Cobrar", icon: DollarSign },
  { to: "/entregas", label: "Entregas", icon: Truck },
  { to: "/morosos", label: "Morosos", icon: AlertTriangle },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
] as const;

export function AppShell() {
  const db = useDB();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!db.auth.user) navigate({ to: "/" });
  }, [db.auth.user, navigate]);

  if (!db.auth.user) return null;

  const showWhats = tabs.some((t) => path.startsWith(t.to));

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <header className="sticky top-0 z-30 bg-brand-black text-white px-5 py-4 flex items-center justify-between shadow-lg border-b border-white/5">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center font-extrabold text-white text-lg shadow-[var(--shadow-red)]">N</div>
          <div>
            <div className="font-extrabold tracking-tight leading-none text-lg">NOVAMIX</div>
            <div className="text-[11px] text-white/60 mt-0.5">Hola, {db.auth.user}</div>
          </div>
        </Link>
        <button
          onClick={() => {
            api.logout();
            navigate({ to: "/" });
          }}
          className="h-10 w-10 rounded-xl bg-white/10 active:bg-white/20 flex items-center justify-center"
          aria-label="Salir"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 pb-28">
        <Outlet />
      </main>

      {showWhats && (
        <a
          href="https://wa.me/"
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-24 left-5 h-14 w-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg active:scale-95 transition z-30"
          aria-label="WhatsApp"
        >
          <MessageCircle className="h-7 w-7" />
        </a>
      )}

      <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-brand-black text-white border-t border-white/10 grid grid-cols-5 z-40 pb-1">
        {tabs.map((t) => {
          const active = path.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="flex flex-col items-center gap-1 py-3 active:bg-white/5"
            >
              <Icon className={`h-6 w-6 ${active ? "text-primary" : "text-white/60"}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? "text-primary" : "text-white/60"}`}>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
