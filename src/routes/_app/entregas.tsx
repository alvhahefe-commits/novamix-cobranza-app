import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useDB, fmtMoney, fmtDate, useApi, uploadReceiptPhoto, type Entrega } from "@/lib/store";
import { Plus, X, Truck, Check, Clock, Camera } from "lucide-react";
import { PhotoPicker, ImageViewer } from "@/components/PhotoPicker";
import { SignedImage } from "@/components/SignedImage";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/entregas")({
  component: EntregasScreen,
});

const tabs: { key: "Todas" | Entrega["estado"]; label: string }[] = [
  { key: "Todas", label: "Todas" },
  { key: "Pendiente", label: "Pendientes" },
  { key: "En camino", label: "En camino" },
  { key: "Entregado", label: "Entregadas" },
];

function EntregasScreen() {
  const db = useDB();
  const api = useApi();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("Todas");
  const [open, setOpen] = useState(false);
  const [verFoto, setVerFoto] = useState<string | null>(null);
  const [fotoEntrega, setFotoEntrega] = useState<Entrega | null>(null);

  const items = db.entregas
    .filter((e) => tab === "Todas" || e.estado === tab)
    .sort((a, b) => b.fecha - a.fecha);

  return (
    <div className="px-5 py-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Logística</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Entregas</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              tab === t.key ? "bg-brand-black text-white" : "bg-card border border-border text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {items.map((e) => {
          const cliente = db.clientes.find((c) => c.id === e.clienteId);
          return (
            <div key={e.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-bold truncate">{e.producto}</p>
                  <p className="text-xs text-muted-foreground">{cliente?.nombre ?? "—"}</p>
                </div>
                <p className="font-extrabold flex-shrink-0">{fmtMoney(e.monto)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Cant: {e.cantidad} • {fmtDate(e.fecha)}</span>
                <EstadoBadge estado={e.estado} />
              </div>
              {e.foto && (
                <button
                  type="button"
                  onClick={() => setVerFoto(e.foto!)}
                  className="mt-3 block w-full h-32 rounded-lg overflow-hidden border border-border"
                >
                  <SignedImage path={e.foto} alt="Entrega" className="w-full h-full object-cover" />
                </button>
              )}
              {e.estado !== "Entregado" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {e.estado === "Pendiente" && (
                    <button
                      onClick={() => api.updateEntregaEstado(e.id, "En camino").then(() => toast.success("Marcado en camino"))}
                      className="bg-amber-500 text-white py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                    >
                      <Truck className="h-4 w-4" /> En camino
                    </button>
                  )}
                  <button
                    onClick={() => setFotoEntrega(e)}
                    className={`${e.estado === "Pendiente" ? "" : "col-span-2"} bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1`}
                  >
                    <Check className="h-4 w-4" /> Entregado
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && <div className="text-center text-muted-foreground py-10 text-sm">Sin entregas</div>}
      </div>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center shadow-[var(--shadow-red)] active:scale-95 transition z-30"
      >
        <Plus className="h-7 w-7" />
      </button>

      {open && <NuevaEntregaModal onClose={() => setOpen(false)} />}
      {fotoEntrega && (
        <ConfirmarEntregaModal
          entrega={fotoEntrega}
          onClose={() => setFotoEntrega(null)}
        />
      )}
      {verFoto && <ImageViewer src={verFoto} onClose={() => setVerFoto(null)} />}
    </div>
  );
}

function ConfirmarEntregaModal({ entrega, onClose }: { entrega: Entrega; onClose: () => void }) {
  const api = useApi();
  const [foto, setFoto] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    setSaving(true);
    try {
      if (file) {
        const url = await uploadReceiptPhoto(file);
        if (url) await api.updateEntregaFoto(entrega.id, url);
      }
      await api.updateEntregaEstado(entrega.id, "Entregado");
      toast.success("Entrega confirmada");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Error al confirmar");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
      <div className="bg-card w-full max-w-md mx-auto rounded-t-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Confirmar entrega</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground">{entrega.producto} · {fmtMoney(entrega.monto)}</p>
        <PhotoPicker label="Foto de entrega (opcional)" value={foto} onChange={(p, f) => { setFoto(p); setFile(f); }} />
        <button
          onClick={confirm}
          disabled={saving}
          className="w-full bg-green-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
        >
          <Camera className="h-5 w-5" /> {saving ? "GUARDANDO..." : "CONFIRMAR ENTREGA"}
        </button>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: Entrega["estado"] }) {
  const map = {
    Pendiente: { cls: "bg-muted text-muted-foreground", icon: Clock },
    "En camino": { cls: "bg-amber-100 text-amber-800", icon: Truck },
    Entregado: { cls: "bg-green-100 text-green-800", icon: Check },
  } as const;
  const { cls, icon: Icon } = map[estado];
  return (
    <span className={`px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${cls}`}>
      <Icon className="h-3 w-3" /> {estado}
    </span>
  );
}

function NuevaEntregaModal({ onClose }: { onClose: () => void }) {
  const db = useDB();
  const api = useApi();
  const [clienteId, setClienteId] = useState(db.clientes[0]?.id ?? "");
  const [productoId, setProductoId] = useState<string>("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [monto, setMonto] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const in15 = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
  const [fechaPedido, setFechaPedido] = useState(today);
  const [fechaEntrega, setFechaEntrega] = useState(today);
  const [vence, setVence] = useState(in15);

  const onPickProducto = (id: string) => {
    setProductoId(id);
    const p = db.productos.find((x) => x.id === id);
    if (p) {
      setProducto(p.nombre);
      const qty = parseInt(cantidad) || 1;
      setMonto((p.precio * qty).toFixed(2));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseFloat(monto);
    const qty = parseInt(cantidad) || 1;
    if (!clienteId || !producto.trim() || !m) return;
    const prod = productoId ? db.productos.find((x) => x.id === productoId) : null;
    if (prod && prod.stock < qty) {
      toast.error(`Stock insuficiente. Disponible: ${prod.stock}`);
      return;
    }
    try {
      await api.addEntrega({
        clienteId,
        producto: producto.trim(),
        cantidad: qty,
        monto: m,
        estado: "Pendiente",
        fecha: new Date(fechaEntrega).getTime(),
        fechaPedido: new Date(fechaPedido).getTime(),
        fechaVencimiento: vence ? new Date(vence).getTime() : undefined,
      });
      if (prod) {
        try {
          await api.ajustarStock(prod.id, "venta", qty, { referencia: "Entrega" });
        } catch (err: any) {
          toast.error(`Entrega creada, pero stock no actualizado: ${err?.message ?? ""}`);
        }
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
      <div className="bg-card w-full max-w-md mx-auto rounded-t-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Nueva entrega</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Cliente">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary">
              {db.clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          {db.productos.length > 0 && (
            <Field label="Producto del inventario (opcional)">
              <select value={productoId} onChange={(e) => onPickProducto(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary">
                <option value="">— Escribir manualmente —</option>
                {db.productos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} (stock {p.stock})</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Producto">
            <input value={producto} onChange={(e) => setProducto(e.target.value)} placeholder="Descripción del producto" className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad">
              <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary" />
            </Field>
            <Field label="Monto total">
              <input type="number" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha pedido">
              <input type="date" value={fechaPedido} onChange={(e) => setFechaPedido(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary" />
            </Field>
            <Field label="Fecha entrega">
              <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary" />
            </Field>
          </div>
          <Field label="Vence">
            <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary" />
          </Field>
          <button type="submit" className="w-full bg-primary text-white font-bold py-4 rounded-xl mt-2 active:scale-[0.98] transition shadow-[var(--shadow-red)]">REGISTRAR ENTREGA</button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</label>
      {children}
    </div>
  );
}