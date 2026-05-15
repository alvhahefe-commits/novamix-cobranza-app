import { createFileRoute, Link } from "@tanstack/react-router";
import { useDB, totalDeudaCliente, tieneVencido, fmtMoney, fmtDate } from "@/lib/store";
import { AlertTriangle, MessageCircle, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_app/morosos")({
  component: Morosos,
});

function Morosos() {
  const db = useDB();
  const now = Date.now();

  const morosos = db.clientes
    .filter((c) => tieneVencido(db, c.id))
    .map((c) => {
      const deuda = totalDeudaCliente(db, c.id);
      const entregasVencidas = db.entregas
        .filter((e) => e.clienteId === c.id && e.fechaVencimiento && e.fechaVencimiento < now);
      const masVieja = entregasVencidas.reduce(
        (min, e) => (e.fechaVencimiento! < min ? e.fechaVencimiento! : min),
        Number.POSITIVE_INFINITY,
      );
      const dias = Math.floor((now - masVieja) / 86400000);
      return { c, deuda, dias };
    })
    .sort((a, b) => b.dias - a.dias);

  const totalVencido = morosos.reduce((s, m) => s + m.deuda, 0);

  return (
    <div className="px-5 py-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Cuentas vencidas</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Morosos</h1>
      </div>

      <div className="bg-primary text-white rounded-2xl p-5 shadow-[var(--shadow-red)] flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-white/80 font-bold">Deuda vencida</p>
          <p className="text-3xl font-extrabold">{fmtMoney(totalVencido)}</p>
          <p className="text-xs text-white/80">{morosos.length} cliente(s) moroso(s)</p>
        </div>
      </div>

      <div className="space-y-3">
        {morosos.map(({ c, deuda, dias }) => {
          const tel = c.telefono.replace(/\D/g, "");
          return (
            <div key={c.id} className="bg-primary/10 border-2 border-primary rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-lg truncate">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.telefono}</p>
                  <p className="text-xs text-primary font-bold mt-1 uppercase">
                    {dias} día(s) de atraso
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-[11px] text-muted-foreground">Adeuda</p>
                  <p className="font-extrabold text-2xl text-primary">{fmtMoney(deuda)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/pago/$clienteId"
                  params={{ clienteId: c.id }}
                  className="bg-primary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-[var(--shadow-red)] active:scale-[0.98] transition"
                >
                  <DollarSign className="h-5 w-5" /> COBRAR
                </Link>
                {tel ? (
                  <a
                    href={`https://wa.me/${tel}?text=${encodeURIComponent(`Hola ${c.nombre}, le recordamos que tiene un saldo pendiente de ${fmtMoney(deuda)}. ¡Gracias!`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-[#25D366] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition"
                  >
                    <MessageCircle className="h-5 w-5" /> RECORDAR
                  </a>
                ) : (
                  <Link
                    to="/clientes/$id"
                    params={{ id: c.id }}
                    className="bg-card border border-border font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                  >
                    Ver
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {morosos.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            ¡Sin morosos! Todo al corriente
          </div>
        )}
      </div>
    </div>
  );
}
