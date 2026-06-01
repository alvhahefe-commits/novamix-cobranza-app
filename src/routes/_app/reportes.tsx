import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useDB, fmtMoney, totalDeudaCliente, tieneVencido, fmtDate } from "@/lib/store";
import { exportExcel, exportPDF } from "@/lib/exports";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_app/reportes")({
  component: Reportes,
});

function Reportes() {
  const db = useDB();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfDay - 6 * 86400000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const toDateInput = (t: number) => new Date(t).toISOString().slice(0, 10);
  const [rangoIni, setRangoIni] = useState<string>(toDateInput(startOfMonth));
  const [rangoFin, setRangoFin] = useState<string>(toDateInput(Date.now()));

  const iniTs = useMemo(() => new Date(rangoIni + "T00:00:00").getTime(), [rangoIni]);
  const finTs = useMemo(() => new Date(rangoFin + "T23:59:59").getTime(), [rangoFin]);

  const entregasRango = db.entregas.filter((e) => e.fecha >= iniTs && e.fecha <= finTs);
  const pagosRango = db.pagos.filter((p) => p.fecha >= iniTs && p.fecha <= finTs);
  const bolsasRango = entregasRango.reduce((s, e) => s + (e.cantidad || 0), 0);
  const ventasRango = entregasRango.reduce((s, e) => s + e.monto, 0);
  const cobradoRango = pagosRango.reduce((s, p) => s + p.monto, 0);

  const porCliente = db.clientes.map((c) => {
    const ents = entregasRango.filter((e) => e.clienteId === c.id);
    const pgs = pagosRango.filter((p) => p.clienteId === c.id);
    return {
      cliente: c,
      bolsas: ents.reduce((s, e) => s + (e.cantidad || 0), 0),
      ventas: ents.reduce((s, e) => s + e.monto, 0),
      pagos: pgs.reduce((s, p) => s + p.monto, 0),
      notas: ents.map((e) => e.notaNumero).filter(Boolean) as string[],
    };
  }).filter((x) => x.ventas > 0 || x.pagos > 0);

  const porVendedor = (() => {
    const map = new Map<string, { vendedorId: string; bolsas: number; ventas: number; pagos: number }>();
    for (const e of entregasRango) {
      const k = e.vendedorId ?? "—";
      const cur = map.get(k) ?? { vendedorId: k, bolsas: 0, ventas: 0, pagos: 0 };
      cur.bolsas += e.cantidad || 0;
      cur.ventas += e.monto;
      map.set(k, cur);
    }
    for (const p of pagosRango) {
      const k = p.vendedorId ?? "—";
      const cur = map.get(k) ?? { vendedorId: k, bolsas: 0, ventas: 0, pagos: 0 };
      cur.pagos += p.monto;
      map.set(k, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.ventas - a.ventas);
  })();

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

  const ventasTotales = db.entregas.reduce((s, e) => s + e.monto, 0);
  const cobradoTotal = db.pagos.reduce((s, p) => s + p.monto, 0);
  const nuevosClientesMes = db.clientes.filter((c) => c.createdAt >= startOfMonth).length;
  const entregadasHoy = db.entregas.filter((e) => e.estado === "Entregado" && e.fecha >= startOfDay).length;

  const exportar = (tipo: "pdf" | "xlsx") => {
    const headers = ["Métrica", "Valor"];
    const rows: (string | number)[][] = [
      [`Rango ${rangoIni} → ${rangoFin}`, ""],
      ["Bolsas vendidas (rango)", bolsasRango],
      ["Ventas (rango)", fmtMoney(ventasRango)],
      ["Cobrado (rango)", fmtMoney(cobradoRango)],
      ["Cobrado hoy", fmtMoney(cobradoHoy)],
      ["Cobrado semana", fmtMoney(cobradoSem)],
      ["Cobrado mes", fmtMoney(cobradoMes)],
      ["Ventas hoy", fmtMoney(ventasHoy)],
      ["Ventas totales", fmtMoney(ventasTotales)],
      ["Cobrado total", fmtMoney(cobradoTotal)],
      ["Deuda total", fmtMoney(deudaTotal)],
      ["Deuda vencida", fmtMoney(deudaVencida)],
      ["Nuevos clientes (mes)", nuevosClientesMes],
      ["Entregas confirmadas hoy", entregadasHoy],
    ];
    rows.push(["", ""], ["Cliente", "Bolsas / Ventas / Pagos / Notas"]);
    porCliente.forEach((x) => {
      rows.push([
        x.cliente.nombre,
        `${x.bolsas} bolsas · ${fmtMoney(x.ventas)} · pagos ${fmtMoney(x.pagos)} · notas ${x.notas.join(", ") || "—"}`,
      ]);
    });
    rows.push(["", ""], ["Vendedor", "Bolsas / Ventas / Pagos"]);
    porVendedor.forEach((v) => {
      rows.push([
        v.vendedorId.slice(0, 8),
        `${v.bolsas} bolsas · ${fmtMoney(v.ventas)} · pagos ${fmtMoney(v.pagos)}`,
      ]);
    });
    if (tipo === "pdf") exportPDF("Reporte general", headers, rows, "novamix-reporte");
    else exportExcel("Reporte", headers, rows, "novamix-reporte");
  };

  return (
    <div className="px-5 py-5 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Análisis</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Reportes</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportar("pdf")} className="h-10 px-3 rounded-xl bg-card border border-border flex items-center gap-1 text-xs font-bold">
            <Download className="h-4 w-4" /> PDF
          </button>
          <button onClick={() => exportar("xlsx")} className="h-10 px-3 rounded-xl bg-card border border-border flex items-center gap-1 text-xs font-bold">
            <Download className="h-4 w-4" /> Excel
          </button>
        </div>
      </div>

      <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-extrabold">Rango de fechas</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={rangoIni} onChange={(e) => setRangoIni(e.target.value)} className="bg-muted border border-border rounded-xl px-3 py-2.5 text-sm" />
          <input type="date" value={rangoFin} onChange={(e) => setRangoFin(e.target.value)} className="bg-muted border border-border rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-primary/10 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Bolsas</p>
            <p className="text-xl font-extrabold text-primary">{bolsasRango}</p>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Ventas</p>
            <p className="text-base font-extrabold">{fmtMoney(ventasRango)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-[10px] text-green-700 font-bold uppercase">Cobrado</p>
            <p className="text-base font-extrabold text-green-700">{fmtMoney(cobradoRango)}</p>
          </div>
        </div>
      </section>

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
        <Stat label="Nuevos clientes" value={String(nuevosClientesMes)} />
        <Stat label="Ventas totales" value={fmtMoney(ventasTotales)} />
        <Stat label="Cobrado total" value={fmtMoney(cobradoTotal)} />
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

      <section>
        <h2 className="font-bold text-lg mb-2">Totales por cliente (rango)</h2>
        {porCliente.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin movimientos en el rango</p>
        ) : (
          <div className="space-y-2">
            {porCliente.sort((a, b) => b.ventas - a.ventas).map((x) => (
              <div key={x.cliente.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <p className="font-bold">{x.cliente.nombre}</p>
                  <p className="font-extrabold">{fmtMoney(x.ventas)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {x.bolsas} bolsas · Pagado {fmtMoney(x.pagos)}
                </p>
                {x.notas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {x.notas.map((n, i) => (
                      <span key={i} className="text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded">#{n}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold text-lg mb-2">Totales por vendedor (rango)</h2>
        {porVendedor.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin movimientos</p>
        ) : (
          <div className="space-y-2">
            {porVendedor.map((v) => (
              <div key={v.vendedorId} className="bg-card border border-border rounded-xl p-4 flex justify-between">
                <div>
                  <p className="font-bold font-mono text-xs">{v.vendedorId === "—" ? "Sin vendedor" : v.vendedorId.slice(0, 8) + "..."}</p>
                  <p className="text-xs text-muted-foreground">{v.bolsas} bolsas · pagos {fmtMoney(v.pagos)}</p>
                </div>
                <p className="font-extrabold">{fmtMoney(v.ventas)}</p>
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