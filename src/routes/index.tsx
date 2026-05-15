import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDB, api } from "@/lib/store";
import { Lock, User } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Login,
});

function Login() {
  const db = useDB();
  const navigate = useNavigate();
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("1234");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (db.auth.user) navigate({ to: "/clientes" });
  }, [db.auth.user, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.trim() || !pass.trim()) {
      setErr("Ingresa usuario y contraseña");
      return;
    }
    api.login(user.trim());
    navigate({ to: "/clientes" });
  };

  return (
    <div className="min-h-screen bg-brand-black text-white flex flex-col max-w-md mx-auto">
      <div className="flex-1 flex flex-col justify-center px-7 py-10">
        <div className="mb-10 text-center">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-primary flex items-center justify-center text-4xl font-extrabold mb-5 shadow-[var(--shadow-red)]">
            N
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">NOVAMIX</h1>
          <p className="text-white/60 mt-2 text-sm">Gestión de clientes y cobranza</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-white/60 font-semibold">Usuario</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-base focus:outline-none focus:border-primary"
                placeholder="usuario"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-white/60 font-semibold">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-base focus:outline-none focus:border-primary"
                placeholder="••••••"
              />
            </div>
          </div>

          {err && <p className="text-primary text-sm">{err}</p>}

          <button
            type="submit"
            className="w-full bg-primary hover:bg-brand-red-dark text-white font-bold py-4 rounded-xl text-base shadow-[var(--shadow-red)] active:scale-[0.98] transition"
          >
            INICIAR SESIÓN
          </button>
        </form>

        <p className="text-center text-xs text-white/40 mt-8">
          Demo: cualquier usuario / contraseña
        </p>
      </div>
    </div>
  );
}
