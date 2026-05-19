import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDB, fmtMoney, fmtDate, totalDeudaCliente } from "@/lib/store";
import { ArrowLeft, Share2, Check } from "lucide-react";

export const Route = createFileRoute("/_app/recibo/$pagoId")({
  component: ReciboScreen,
});

function ReciboScreen() {
  const { pagoId } = Route.useParams();
  const db = useDB();
  const navigate = useNavigate();
  const pago = db.pagos.find((p) => p.id === pagoId);
  const cliente = pago && db.clientes.find((c) => c.id === pago.clienteId);

  if (!pago || !cliente) return <div className="p-5">Recibo no encontrado</div>;

  const saldo = totalDeudaCliente(db, cliente.id);

  const compartir = async () => {
    const txt = `RECIBO NOVAMIX\n#${pago.id.slice(-6).toUpperCase()}\n\nCliente: ${cliente.nombre}\nMonto: ${fmtMoney(pago.monto)}\nMétodo: ${pago.metodo}\nFecha: ${fmtDate(pago.fecha)}\nSaldo restante: ${fmtMoney(saldo)}\n\n¡Gracias por su pago!`;
    if (navigator.share) {
      try { await navigator.share({ text: txt, title: "Recibo NOVAMIX" }); } catch {}
    } else {
      const tel = cliente.telefono.replace(/\D/g, "");
      window.open(`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      <div className="bg-brand-black text-white px-5 py-4 flex items-center justify-between">
        <button onClick={() => navigate({ to: "/clientes/$id", params: { id: cliente.id } })} className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold">Recibo de pago</h1>
        <div className="w-9" />
      </div>

      <div className="p-5">
        <div className="bg-card rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
          <div className="bg-brand-black text-white px-6 py-5 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary flex items-center justify-center font-extrabold text-2xl mb-2">N</div>
            <p className="font-extrabold tracking-tight">NOVAMIX</p>
            <p className="text-xs text-white/60">Comprobante de pago</p>
          </div>

          <div className="px-6 py-6 space-y-4">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-7 w-7 text-green-700" />
              </div>
              <p className="mt-3 text-3xl font-extrabold">{fmtMoney(pago.monto)}</p>
              <p className="text-xs text-muted-foreground">Pago registrado</p>
            </div>

            <div className="border-t border-dashed border-border pt-4 space-y-2 text-sm">
              <Row label="N° de recibo" value={"#" + pago.id.slice(-6).toUpperCase()} />
              <Row label="Cliente" value={cliente.nombre} />
              <Row label="Método" value={pago.metodo} />
              <Row label="Fecha" value={fmtDate(pago.fecha)} />
              <Row label="Saldo restante" value={fmtMoney(saldo)} bold />
              {pago.nota && <Row label="Nota" value={pago.nota} />}
            </div>

            {pago.reciboFoto && (
              <div className="border-t border-border pt-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Foto del recibo</p>
                <SignedImage path={pago.reciboFoto} alt="Recibo" className="w-full rounded-xl" />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={compartir}
          className="mt-5 w-full bg-primary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-[var(--shadow-red)] active:scale-[0.98] transition"
        >
          <Share2 className="h-5 w-5" /> COMPARTIR RECIBO
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-extrabold" : "font-semibold text-right"}>{value}</span>
    </div>
  );
}