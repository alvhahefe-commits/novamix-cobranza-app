import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Truck, BarChart3, LogOut } from "lucide-react";
import { useDB, api } from "@/lib/store";
import { useEffect } from "react";

const tabs = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/entregas", label: "Entregas", icon: Truck },
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

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <header className="sticky top-0 z-30 bg-brand-black text-white px-5 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center font-extrabold text-white">N</div>
          <div>
            <div className="font-extrabold tracking-tight leading-none">NOVAMIX</div>
            <div className="text-[11px] text-white/60">Hola, {db.auth.user}</div>
          </div>
        </div>
        <button
          onClick={() => {
            api.logout();
            navigate({ to: "/" });
          }}
          className="h-9 w-9 rounded-lg bg-white/10 active:bg-white/20 flex items-center justify-center"
          aria-label="Salir"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-brand-black text-white border-t border-white/10 grid grid-cols-4 z-40">
        {tabs.map((t) => {
          const active = path.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="flex flex-col items-center gap-1 py-3 active:bg-white/5"
            >
              <Icon className={`h-6 w-6 ${active ? "text-primary" : "text-white/70"}`} />
              <span className={`text-[11px] font-medium ${active ? "text-primary" : "text-white/70"}`}>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}