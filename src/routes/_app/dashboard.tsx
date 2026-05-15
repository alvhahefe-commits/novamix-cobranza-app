import { createFileRoute, Link } from "@tanstack/react-router";
import { useDB, fmtMoney, totalDeudaCliente, tieneVencido } from "@/lib/store";
import { AlertTriangle, DollarSign, Truck, Users, BarChart3, ArrowRight } from "lucide-react";

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
  const morosos = db.clientes.filter((c) => tieneVencido(db, c.id));

  const quick = [
    { to: "/cobrar", label: "Cobrar", icon: DollarSign, color: "bg-primary" },
    { to: "/clientes", label: "Clientes", icon: Users, color: "bg-card border-2 border-border" },
    { to: "/entregas", label: "Entregas", icon: Truck, color: "bg-card border-2 border-border" },
    { to: "/morosos", label: "Morosos", icon: AlertTriangle, color: "bg-card border-2 border-primary/50" },
  ] as const;

  return (
    <div className="px-5 py-5 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Resumen</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Inicio</h1>
      </div>

      <div className="bg-gradient-to-br from-primary to-brand-red-dark text-white rounded-2xl p-5 shadow-[var(--shadow-red)]">
        <p className="text-xs uppercase tracking-wider text-white/80 font-bold">Deuda total</p>
        <p className="text-4xl font-extrabold mt-1">{fmtMoney(deudaTotal)}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <div>
            <p className="text-white/70 text-xs">Cobrado hoy</p>
            <p className="font-extrabold">{fmtMoney(cobradoHoy)}</p>
          </div>
          <Link to="/reportes" className="flex items-center gap-1 text-xs text-white/90 font-bold bg-white/15 px-3 py-2 rounded-lg">
            Reporte <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div>
        <h2 className="font-extrabold text-lg mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          {quick.map((q) => {
            const Icon = q.icon;
            const danger = q.to === "/cobrar" || q.to === "/morosos";
            return (
              <Link
                key={q.to}
                to={q.to}
                className={`${q.color} rounded-2xl p-5 flex flex-col gap-3 active:scale-[0.97] transition`}
              >
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${q.to === "/cobrar" ? "bg-white/20" : "bg-primary/15"}`}>
                  <Icon className={`h-6 w-6 ${q.to === "/cobrar" ? "text-white" : "text-primary"}`} />
                </div>
                <div className={`font-extrabold text-lg ${q.to === "/cobrar" ? "text-white" : ""}`}>{q.label}</div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4">
          <Truck className="h-5 w-5 text-primary" />
          <p className="text-2xl font-extrabold mt-2">{entregasPendientes}</p>
          <p className="text-xs text-muted-foreground font-bold uppercase">Entregas pend.</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <p className="text-2xl font-extrabold mt-2">{db.pagos.filter((p) => p.fecha >= startOfDay).length}</p>
          <p className="text-xs text-muted-foreground font-bold uppercase">Pagos hoy</p>
        </div>
      </div>

      {morosos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-lg">Morosos</h2>
            <Link to="/morosos" className="text-xs text-primary font-bold">Ver todos</Link>
          </div>
          <div className="space-y-2">
            {morosos.slice(0, 3).map((c) => (
              <Link
                key={c.id}
                to="/clientes/$id"
                params={{ id: c.id }}
                className="flex items-center justify-between bg-primary/10 border-2 border-primary rounded-2xl p-4 active:scale-[0.99] transition"
              >
                <div>
                  <p className="font-extrabold">{c.nombre}</p>
                  <p className="text-[10px] text-primary font-bold uppercase">VENCIDO</p>
                </div>
                <p className="font-extrabold text-primary text-lg">{fmtMoney(totalDeudaCliente(db, c.id))}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
