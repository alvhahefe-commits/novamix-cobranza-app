import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApi, useAuth } from "@/lib/store";
import { Lock, Mail, User } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Login,
});

function Login() {
  const auth = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.user) navigate({ to: "/clientes" });
  }, [auth.user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setInfo("");
    if (!email.trim() || !pass.trim()) {
      setErr("Ingresa correo y contraseña");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await api.login(email.trim(), pass);
      } else {
        await api.signup(email.trim(), pass, name.trim() || undefined);
        setInfo("Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.");
        setMode("login");
      }
    } catch (e: any) {
      setErr(e?.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
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

        <div className="grid grid-cols-2 gap-2 mb-5 bg-white/5 rounded-xl p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setErr(""); setInfo(""); }}
              className={`py-2.5 rounded-lg text-sm font-bold transition ${
                mode === m ? "bg-primary text-white" : "text-white/60"
              }`}
            >
              {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <Field label="Nombre" icon={<User className="h-5 w-5 text-white/40" />}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent pl-12 pr-4 py-4 text-base focus:outline-none"
                placeholder="Tu nombre"
              />
            </Field>
          )}
          <Field label="Correo" icon={<Mail className="h-5 w-5 text-white/40" />}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent pl-12 pr-4 py-4 text-base focus:outline-none"
              placeholder="correo@ejemplo.com"
              autoComplete="email"
            />
          </Field>
          <Field label="Contraseña" icon={<Lock className="h-5 w-5 text-white/40" />}>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full bg-transparent pl-12 pr-4 py-4 text-base focus:outline-none"
              placeholder="••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </Field>

          {err && <p className="text-primary text-sm">{err}</p>}
          {info && <p className="text-green-400 text-sm">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-brand-red-dark text-white font-bold py-4 rounded-xl text-base shadow-[var(--shadow-red)] active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading ? "..." : mode === "login" ? "INICIAR SESIÓN" : "CREAR CUENTA"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-white/60 font-semibold">{label}</label>
      <div className="relative bg-white/5 border border-white/10 rounded-xl focus-within:border-primary">
        <span className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</span>
        {children}
      </div>
    </div>
  );
}
