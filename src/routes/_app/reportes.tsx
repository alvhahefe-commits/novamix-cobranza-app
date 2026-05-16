import { createFileRoute } from "@tanstack/react-router";
import { useDB, fmtMoney, totalDeudaCliente, tieneVencido, fmtDate } from "@/lib/store";

export const Route = createFileRoute("/_app/reportes")({
  component: Reportes,
});

function Reportes() {
  const db = useDB();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfDay - 6 * 86400000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const cobradoHoy = db.pagos.filter((p) => p.fecha >= startOfDay).reduce((s, p) => s + p.monto, 0);
  const cobradoSem = db.pagos.filter((p) => p.fecha >= startOfWeek).reduce((s, p) => s + p.monto, 0);
  const cobradoMes = db.pagos.filter((p) => p.fecha >= startOfMonth).reduce((s, p) => s + p.monto, 0);

  const deudaTotal = db.clientes.reduce((s, c) => s + totalDeudaCliente(db, c.id), 0);
  const vencidos = db.clientes.filter((c) => tieneVencido(db, c.id));
  const deudaVencida = vencidos.reduce((s, c) => s + totalDeudaCliente(db, c.id), 0);

  const pagosHoy = db.pagos.filter((p) => p.fecha >= startOfDay).sort((a, b) => b.fecha - a.fecha);

  const ventasHoy = db.entregas.filter((e) => e.fecha >= startOfDay).reduce((s, e) => s + e.monto, 0);

  const topClientes = db.clientes
    .map((c) => ({
      c,
      compras: db.entregas.filter((e) => e.clienteId === c.id).reduce((s, e) => s + e.monto, 0),
    }))
    .filter((x) => x.compras > 0)
    .sort((a, b) => b.compras - a.compras)
    .slice(0, 5);

  return (
    <div className="px-5 py-5 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Análisis</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Reportes</h1>
      </div>

      <div className="bg-gradient-to-br from-primary to-brand-red-dark text-white rounded-2xl p-5 shadow-[var(--shadow-red)]">
        <p className="text-xs uppercase tracking-wider text-white/80 font-semibold">Cobrado hoy</p>
        <p className="text-4xl font-extrabold mt-1">{fmtMoney(cobradoHoy)}</p>
        <p className="text-xs text-white/80 mt-1">{pagosHoy.length} pago(s) registrado(s)</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Ventas hoy" value={fmtMoney(ventasHoy)} />
        <Stat label="Esta semana" value={fmtMoney(cobradoSem)} />
        <Stat label="Este mes" value={fmtMoney(cobradoMes)} />
        <Stat label="Deuda total" value={fmtMoney(deudaTotal)} />
        <Stat label="Deuda vencida" value={fmtMoney(deudaVencida)} danger />
      </div>

      <section>
        <h2 className="font-bold text-lg mb-2">Pagos de hoy</h2>
        {pagosHoy.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay pagos hoy</p>
        ) : (
          <div className="space-y-2">
            {pagosHoy.map((p) => {
              const cli = db.clientes.find((c) => c.id === p.clienteId);
              return (
                <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex justify-between">
                  <div>
                    <p className="font-bold">{cli?.nombre ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.metodo} • {fmtDate(p.fecha)}</p>
                  </div>
                  <p className="font-extrabold text-green-700">{fmtMoney(p.monto)}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold text-lg mb-2">Top deudores</h2>
        <div className="space-y-2">
          {db.clientes
            .map((c) => ({ c, deuda: totalDeudaCliente(db, c.id), vencido: tieneVencido(db, c.id) }))
            .filter((x) => x.deuda > 0)
            .sort((a, b) => b.deuda - a.deuda)
            .slice(0, 5)
            .map(({ c, deuda, vencido }) => (
              <div key={c.id} className={`flex justify-between items-center rounded-xl p-4 border ${vencido ? "bg-primary/5 border-primary/30" : "bg-card border-border"}`}>
                <p className="font-bold">{c.nombre}</p>
                <p className={`font-extrabold ${vencido ? "text-primary" : ""}`}>{fmtMoney(deuda)}</p>
              </div>
            ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-2">Top clientes (compras)</h2>
        {topClientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ventas registradas</p>
        ) : (
          <div className="space-y-2">
            {topClientes.map(({ c, compras }, i) => (
              <div key={c.id} className="flex justify-between items-center rounded-xl p-4 border bg-card border-border">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-extrabold text-sm">{i + 1}</span>
                  <p className="font-bold">{c.nombre}</p>
                </div>
                <p className="font-extrabold">{fmtMoney(compras)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${danger ? "bg-primary/5 border-primary/30" : "bg-card border-border"}`}>
      <p className="text-xs text-muted-foreground font-semibold">{label}</p>
      <p className={`text-xl font-extrabold mt-1 ${danger ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}