import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useDB, totalDeudaCliente, fmtMoney, api, type Pago } from "@/lib/store";
import { ArrowLeft, Camera, X } from "lucide-react";

export const Route = createFileRoute("/_app/pago/$clienteId")({
  component: PagoScreen,
});

function PagoScreen() {
  const { clienteId } = Route.useParams();
  const db = useDB();
  const navigate = useNavigate();
  const cliente = db.clientes.find((c) => c.id === clienteId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<Pago["metodo"]>("Efectivo");
  const [nota, setNota] = useState("");
  const [foto, setFoto] = useState<string | null>(null);

  if (!cliente) return <div className="p-5">Cliente no encontrado</div>;

  const deudaActual = totalDeudaCliente(db, cliente.id);
  const montoNum = parseFloat(monto) || 0;
  const restante = Math.max(0, deudaActual - montoNum);

  const onFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setFoto(reader.result as string);
    reader.readAsDataURL(f);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (montoNum <= 0) return;
    const pago = api.addPago({
      clienteId: cliente.id,
      monto: montoNum,
      metodo,
      nota: nota || undefined,
      reciboFoto: foto || undefined,
    });
    navigate({ to: "/recibo/$pagoId", params: { pagoId: pago.id } });
  };

  const metodos: Pago["metodo"][] = ["Efectivo", "Transferencia", "Tarjeta", "Otro"];

  return (
    <div className="min-h-screen">
      <div className="bg-brand-black text-white px-5 py-5">
        <button onClick={() => navigate({ to: "/clientes/$id", params: { id: cliente.id } })} className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center mb-3">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">Registrar pago</p>
        <h1 className="text-2xl font-extrabold">{cliente.nombre}</h1>
        <div className="mt-3 flex justify-between text-sm">
          <span className="text-white/70">Deuda actual</span>
          <span className="font-bold">{fmtMoney(deudaActual)}</span>
        </div>
      </div>

      <form onSubmit={submit} className="px-5 py-5 space-y-5">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Monto a cobrar</label>
          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full bg-card border-2 border-border rounded-2xl pl-10 pr-4 py-5 text-3xl font-extrabold focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="bg-muted rounded-xl p-4 flex justify-between">
          <span className="text-sm text-muted-foreground">Saldo restante</span>
          <span className={`font-extrabold ${restante > 0 ? "text-foreground" : "text-green-700"}`}>{fmtMoney(restante)}</span>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Método de pago</label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {metodos.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetodo(m)}
                className={`py-3 rounded-xl font-semibold border-2 transition ${
                  metodo === m ? "bg-brand-black text-white border-brand-black" : "bg-card border-border text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Foto del recibo</label>
          {foto ? (
            <div className="mt-2 relative">
              <img src={foto} alt="Recibo" className="w-full h-48 object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => setFoto(null)}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground active:bg-muted"
            >
              <Camera className="h-7 w-7" />
              <span className="text-sm font-semibold">Subir foto del recibo</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFoto} />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nota (opcional)</label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            className="mt-2 w-full bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          disabled={montoNum <= 0}
          className="w-full bg-primary text-white font-bold py-5 rounded-xl text-lg shadow-[var(--shadow-red)] active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
        >
          REGISTRAR PAGO
        </button>
      </form>
    </div>
  );
}