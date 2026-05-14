import { createFileRoute, Link } from "@tanstack/react-router";
import { useDB, fmtMoney, totalDeudaCliente, tieneVencido } from "@/lib/store";
import { AlertTriangle, DollarSign, Truck, Users, ArrowRight, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const deudaTotal = db.clientes.reduce((s, c) => s + totalDeudaCliente(db, c.id), 0);
  const cobradoHoy = db.pagos.filter((p) => p.fecha >= startOfDay).reduce((s, p) => s + p.monto, 0);
  const entregasPendientes = db.entregas.filter((e) => e.estado !== "Entregado").length;
  const clientesVencidos = db.clientes.filter((c) => tieneVencido(db, c.id));

  return (
    <div className="px-5 py-5 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Resumen</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Panel de control</h1>
      </div>

      <div className="bg-gradient-to-br from-brand-black to-[oklch(0.22_0_0)] text-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
        <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">Deuda total</p>
        <p className="text-4xl font-extrabold mt-1">{fmtMoney(deudaTotal)}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <div>
            <p className="text-white/60 text-xs">Cobrado hoy</p>
            <p className="font-bold text-primary">{fmtMoney(cobradoHoy)}</p>
          </div>
          <Link to="/reportes" className="flex items-center gap-1 text-xs text-white/80">
            Ver reporte <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} label="Clientes" value={String(db.clientes.length)} to="/clientes" />
        <StatCard icon={Truck} label="Entregas pend." value={String(entregasPendientes)} to="/entregas" />
        <StatCard icon={AlertTriangle} label="Vencidos" value={String(clientesVencidos.length)} to="/clientes" tone="danger" />
        <StatCard icon={DollarSign} label="Pagos hoy" value={String(db.pagos.filter((p) => p.fecha >= startOfDay).length)} to="/reportes" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Deudas vencidas</h2>
          <Link to="/clientes" className="text-xs text-primary font-semibold">Ver todos</Link>
        </div>
        {clientesVencidos.length === 0 ? (
          <div className="bg-card rounded-xl p-5 text-center text-sm text-muted-foreground border border-border">
            Sin deudas vencidas
          </div>
        ) : (
          <div className="space-y-2">
            {clientesVencidos.slice(0, 5).map((c) => {
              const deuda = totalDeudaCliente(db, c.id);
              return (
                <Link
                  key={c.id}
                  to="/clientes/$id"
                  params={{ id: c.id }}
                  className="flex items-center justify-between bg-card border-2 border-primary/20 rounded-xl p-4 active:scale-[0.99] transition"
                >
                  <div>
                    <p className="font-bold text-foreground">{c.nombre}</p>
                    <p className="text-xs text-primary font-semibold mt-0.5">VENCIDO</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-primary">{fmtMoney(deuda)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Link
        to="/clientes"
        className="fixed bottom-24 right-5 h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center shadow-[var(--shadow-red)] active:scale-95 transition z-30"
        aria-label="Nuevo"
      >
        <Plus className="h-7 w-7" />
      </Link>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  to,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  to: "/clientes" | "/entregas" | "/reportes" | "/dashboard";
  tone?: "default" | "danger";
}) {
  const danger = tone === "danger";
  return (
    <Link
      to={to}
      className={`rounded-2xl p-4 border active:scale-[0.98] transition ${
        danger ? "bg-primary text-white border-primary" : "bg-card border-border"
      }`}
    >
      <Icon className={`h-5 w-5 ${danger ? "text-white/80" : "text-primary"}`} />
      <p className={`text-2xl font-extrabold mt-2 ${danger ? "text-white" : "text-foreground"}`}>{value}</p>
      <p className={`text-xs ${danger ? "text-white/80" : "text-muted-foreground"}`}>{label}</p>
    </Link>
  );
}