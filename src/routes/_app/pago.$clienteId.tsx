import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useDB, totalDeudaCliente, fmtMoney, useApi, uploadReceiptPhoto, METODOS_PAGO, entregasConEstadoPago, type MetodoPago } from "@/lib/store";
import { ArrowLeft } from "lucide-react";
import { PhotoPicker } from "@/components/PhotoPicker";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pago/$clienteId")({
  component: PagoScreen,
});

function PagoScreen() {
  const { clienteId } = Route.useParams();
  const db = useDB();
  const api = useApi();
  const navigate = useNavigate();
  const cliente = db.clientes.find((c) => c.id === clienteId);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago>("Efectivo");
  const [nota, setNota] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [entregaId, setEntregaId] = useState<string>("");

  if (!cliente) return <div className="p-5">Cliente no encontrado</div>;

  const deudaActual = totalDeudaCliente(db, cliente.id);
  const pendientes = entregasConEstadoPago(db, cliente.id).filter((x) => x.pendiente > 0);
  const montoNum = parseFloat(monto) || 0;
  const restante = Math.max(0, deudaActual - montoNum);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoNum <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    setSaving(true);
    try {
      let reciboUrl: string | undefined;
      if (fotoFile) {
        const url = await uploadReceiptPhoto(fotoFile);
        reciboUrl = url ?? undefined;
      }
      const pago = await api.addPago({
        clienteId: cliente.id,
        monto: montoNum,
        metodo,
        nota: nota || undefined,
        reciboFoto: reciboUrl,
        fecha: new Date(fecha).getTime(),
        entregaId: entregaId || undefined,
      });
      toast.success("Pago registrado");
      navigate({ to: "/recibo/$pagoId", params: { pagoId: pago.id } });
    } catch (err: any) {
      toast.error(err?.message || "Error al registrar pago");
      setSaving(false);
    }
  };

  const metodos = METODOS_PAGO;

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
          <div className="grid grid-cols-3 gap-2 mt-2">
            {metodos.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetodo(m)}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition ${
                  metodo === m ? "bg-brand-black text-white border-brand-black" : "bg-card border-border text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Fecha de pago</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-2 w-full bg-card border-2 border-border rounded-xl px-4 py-4 text-base font-semibold focus:outline-none focus:border-primary"
          />
        </div>

        <PhotoPicker
          value={foto}
          onChange={(preview, file) => {
            setFoto(preview);
            setFotoFile(file);
          }}
        />

        {pendientes.length > 0 && (
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Asignar a nota de entrega (opcional)</label>
            <select
              value={entregaId}
              onChange={(e) => setEntregaId(e.target.value)}
              className="mt-2 w-full bg-card border-2 border-border rounded-xl px-4 py-4 text-base font-semibold focus:outline-none focus:border-primary"
            >
              <option value="">Distribuir automáticamente (FIFO)</option>
              {pendientes.map((x) => (
                <option key={x.entrega.id} value={x.entrega.id}>
                  Nota #{x.entrega.notaNumero ?? x.entrega.id.slice(-5).toUpperCase()} — Resta {fmtMoney(x.pendiente)}
                </option>
              ))}
            </select>
          </div>
        )}

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
          disabled={montoNum <= 0 || saving}
          className="w-full bg-primary text-white font-bold py-5 rounded-xl text-lg shadow-[var(--shadow-red)] active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
        >
          {saving ? "GUARDANDO..." : "REGISTRAR PAGO"}
        </button>
      </form>
    </div>
  );
}