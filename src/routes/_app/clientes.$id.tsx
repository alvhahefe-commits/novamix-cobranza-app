import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useDB, totalDeudaCliente, tieneVencido, fmtMoney, fmtDate } from "@/lib/store";
import { ArrowLeft, MessageCircle, Phone, MapPin, DollarSign, Plus, FileText } from "lucide-react";

export const Route = createFileRoute("/_app/clientes/$id")({
  component: ClienteDetalle,
});

function ClienteDetalle() {
  const { id } = Route.useParams();
  const db = useDB();
  const navigate = useNavigate();
  const cliente = db.clientes.find((c) => c.id === id);
  const [verRecibo, setVerRecibo] = useState<string | null>(null);

  if (!cliente) {
    return (
      <div className="p-5">
        <p>Cliente no encontrado</p>
        <Link to="/clientes" className="text-primary">Volver</Link>
      </div>
    );
  }

  const deuda = totalDeudaCliente(db, cliente.id);
  const vencido = tieneVencido(db, cliente.id);
  const pagos = db.pagos.filter((p) => p.clienteId === cliente.id).sort((a, b) => b.fecha - a.fecha);
  const entregas = db.entregas.filter((e) => e.clienteId === cliente.id).sort((a, b) => b.fecha - a.fecha);
  const totalEntregas = entregas.reduce((s, e) => s + e.monto, 0);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);

  const tel = cliente.telefono.replace(/\D/g, "");

  return (
    <div>
      <div className={`px-5 py-5 text-white ${vencido ? "bg-primary" : "bg-brand-black"}`}>
        <button onClick={() => navigate({ to: "/clientes" })} className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center mb-3">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-extrabold">{cliente.nombre}</h1>
        <div className="mt-1 space-y-1 text-sm text-white/80">
          {cliente.telefono && (
            <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{cliente.telefono}</p>
          )}
          {cliente.direccion && (
            <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{cliente.direccion}</p>
          )}
        </div>

        <div className="mt-5 bg-white/10 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-white/70 font-semibold">Saldo pendiente</p>
          <p className="text-3xl font-extrabold">{fmtMoney(deuda)}</p>
          <div className="flex justify-between text-xs mt-2 text-white/70">
            <span>Total entregado: {fmtMoney(totalEntregas)}</span>
            <span>Pagado: {fmtMoney(totalPagado)}</span>
          </div>
          {vencido && <p className="mt-2 text-xs font-bold uppercase tracking-wider">⚠ Tiene deuda vencida</p>}
        </div>
      </div>

      <div className="px-5 py-4 grid grid-cols-2 gap-3">
        <Link
          to="/pago/$clienteId"
          params={{ clienteId: cliente.id }}
          className="bg-primary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-[var(--shadow-red)] active:scale-[0.98] transition"
        >
          <DollarSign className="h-5 w-5" /> COBRAR
        </Link>
        {tel && (
          <a
            href={`https://wa.me/${tel}`}
            target="_blank"
            rel="noreferrer"
            className="bg-[#25D366] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <MessageCircle className="h-5 w-5" /> WHATSAPP
          </a>
        )}
      </div>

      <div className="px-5 pb-6 space-y-5">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg">Entregas</h2>
            <Link
              to="/entregas"
              className="text-xs text-primary font-semibold flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Nueva
            </Link>
          </div>
          {entregas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin entregas</p>
          ) : (
            <div className="space-y-2">
              {entregas.map((e) => {
                const venc = e.fechaVencimiento && e.fechaVencimiento < Date.now() && deuda > 0;
                return (
                  <div key={e.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{e.producto}</p>
                        <p className="text-xs text-muted-foreground">Cant: {e.cantidad} • {fmtDate(e.fecha)}</p>
                      </div>
                      <p className="font-extrabold">{fmtMoney(e.monto)}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${
                        e.estado === "Entregado" ? "bg-green-100 text-green-700" :
                        e.estado === "En camino" ? "bg-amber-100 text-amber-700" :
                        "bg-muted text-muted-foreground"
                      }`}>{e.estado}</span>
                      {venc && <span className="text-primary font-bold">VENCIDO</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">Historial de pagos</h2>
          {pagos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay pagos</p>
          ) : (
            <div className="space-y-2">
              {pagos.map((p) => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-green-700">{fmtMoney(p.monto)}</p>
                    <p className="text-xs text-muted-foreground">{p.metodo} • {fmtDate(p.fecha)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.reciboFoto && (
                      <button
                        onClick={() => setVerRecibo(p.reciboFoto!)}
                        className="h-10 w-10 rounded-lg overflow-hidden border border-border"
                      >
                        <img src={p.reciboFoto} alt="Recibo" className="h-full w-full object-cover" />
                      </button>
                    )}
                    <Link
                      to="/recibo/$pagoId"
                      params={{ pagoId: p.id }}
                      className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"
                      aria-label="Ver recibo"
                    >
                      <FileText className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {verRecibo && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setVerRecibo(null)}
        >
          <img src={verRecibo} alt="Recibo" className="max-w-full max-h-full rounded-xl" />
          <button
            onClick={() => setVerRecibo(null)}
            className="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/20 text-white flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}