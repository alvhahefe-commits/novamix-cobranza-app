import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useDB, totalDeudaCliente, tieneVencido, fmtMoney } from "@/lib/store";
import { Search, DollarSign, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_app/cobrar")({
  component: Cobrar,
});

function Cobrar() {
  const db = useDB();
  const [q, setQ] = useState("");

  const conDeuda = db.clientes
    .map((c) => ({ c, deuda: totalDeudaCliente(db, c.id), vencido: tieneVencido(db, c.id) }))
    .filter((x) => x.deuda > 0)
    .filter((x) => x.c.nombre.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.vencido) - Number(a.vencido) || b.deuda - a.deuda);

  const totalPorCobrar = conDeuda.reduce((s, x) => s + x.deuda, 0);

  return (
    <div className="px-5 py-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Cobranza rápida</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Cobrar</h1>
      </div>

      <div className="bg-gradient-to-br from-primary to-brand-red-dark text-white rounded-2xl p-5 shadow-[var(--shadow-red)]">
        <p className="text-xs uppercase tracking-wider text-white/80 font-bold">Total por cobrar</p>
        <p className="text-4xl font-extrabold mt-1">{fmtMoney(totalPorCobrar)}</p>
        <p className="text-sm text-white/80 mt-1">{conDeuda.length} cliente(s) con saldo</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full bg-card border border-border rounded-2xl pl-12 pr-4 py-4 text-base focus:outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-3">
        {conDeuda.map(({ c, deuda, vencido }) => {
          const tel = c.telefono.replace(/\D/g, "");
          return (
            <div
              key={c.id}
              className={`rounded-2xl p-4 border-2 ${
                vencido ? "bg-primary/10 border-primary" : "bg-card border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-lg truncate">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">{c.telefono}</p>
                </div>
                <div className="text-right">
                  <p className={`font-extrabold text-xl ${vencido ? "text-primary" : ""}`}>{fmtMoney(deuda)}</p>
                  {vencido && <p className="text-[10px] text-primary font-bold uppercase">Vencido</p>}
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Link
                  to="/pago/$clienteId"
                  params={{ clienteId: c.id }}
                  className="bg-primary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-[var(--shadow-red)] active:scale-[0.98] transition text-base"
                >
                  <DollarSign className="h-5 w-5" /> COBRAR
                </Link>
                {tel && (
                  <a
                    href={`https://wa.me/${tel}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-full px-5 bg-[#25D366] text-white font-bold rounded-xl flex items-center justify-center active:scale-[0.98] transition"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle className="h-6 w-6" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
        {conDeuda.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            ¡Excelente! No hay saldos pendientes
          </div>
        )}
      </div>
    </div>
  );
}
