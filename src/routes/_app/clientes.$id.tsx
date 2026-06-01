import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useDB, useApi, useUserRole, totalDeudaCliente, tieneVencido, fmtMoney, fmtDate, CUSTOMER_TYPES, entregasConEstadoPago, type CustomerType, type Cliente } from "@/lib/store";
import { ArrowLeft, MessageCircle, Phone, MapPin, DollarSign, Plus, FileText, Pencil, ShoppingCart, X, Truck, Receipt, Trash2 } from "lucide-react";
import { ImageViewer } from "@/components/PhotoPicker";
import { SignedImage } from "@/components/SignedImage";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clientes/$id")({
  component: ClienteDetalle,
});

function ClienteDetalle() {
  const { id } = Route.useParams();
  const db = useDB();
  const api = useApi();
  const role = useUserRole();
  const navigate = useNavigate();
  const cliente = db.clientes.find((c) => c.id === id);
  const [verRecibo, setVerRecibo] = useState<string | null>(null);
  const [editar, setEditar] = useState(false);
  const [nuevaVenta, setNuevaVenta] = useState(false);
  const [nuevaEntrega, setNuevaEntrega] = useState(false);
  const [verRecibos, setVerRecibos] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
  const entregasEstado = entregasConEstadoPago(db, cliente.id).sort((a, b) => b.entrega.fecha - a.entrega.fecha);
  const entregas = entregasEstado.map((x) => x.entrega);
  const notasPendientes = entregasEstado.filter((x) => x.estado !== "Pagada");
  const notasPagadas = entregasEstado.filter((x) => x.estado === "Pagada");
  const totalEntregas = entregas.reduce((s, e) => s + e.monto, 0);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const recibosConFoto = pagos.filter((p) => p.reciboFoto);

  const tel = cliente.telefono.replace(/\D/g, "");

  return (
    <div>
      <div className={`px-5 py-5 text-white ${vencido ? "bg-primary" : "bg-brand-black"}`}>
        <button onClick={() => navigate({ to: "/clientes" })} className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center mb-3">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-extrabold">{cliente.nombre}</h1>
          {cliente.tipo && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/15 px-2 py-1 rounded-full whitespace-nowrap">{cliente.tipo}</span>
          )}
        </div>
        <div className="mt-1 space-y-1 text-sm text-white/80">
          {cliente.telefono && (
            <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{cliente.telefono}</p>
          )}
          {cliente.telefono2 && (
            <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{cliente.telefono2}</p>
          )}
          {cliente.direccion && (
            <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{cliente.direccion}</p>
          )}
          {(cliente.nit || cliente.ci) && (
            <p className="text-xs text-white/70">
              {cliente.nit && <>NIT: <span className="font-semibold text-white">{cliente.nit}</span></>}
              {cliente.nit && cliente.ci && " · "}
              {cliente.ci && <>CI: <span className="font-semibold text-white">{cliente.ci}</span></>}
            </p>
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
          <DollarSign className="h-5 w-5" /> REGISTRAR PAGO
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

      <div className="px-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => setNuevaVenta(true)}
          className="bg-foreground text-background font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <ShoppingCart className="h-5 w-5" /> NUEVA VENTA
        </button>
        <button
          onClick={() => setNuevaEntrega(true)}
          className="bg-foreground text-background font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <Truck className="h-5 w-5" /> NUEVA ENTREGA
        </button>
      </div>

      <div className="px-5 grid grid-cols-2 gap-3 mt-3">
        <button
          onClick={() => setVerRecibos(true)}
          className="bg-muted text-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 border border-border active:scale-[0.98] transition"
        >
          <Receipt className="h-5 w-5" /> VER RECIBOS
          {recibosConFoto.length > 0 && (
            <span className="ml-1 text-xs bg-primary text-white px-2 py-0.5 rounded-full">{recibosConFoto.length}</span>
          )}
        </button>
        <button
          onClick={() => setEditar(true)}
          className="bg-muted text-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 border border-border active:scale-[0.98] transition"
        >
          <Pencil className="h-5 w-5" /> EDITAR
        </button>
      </div>

      <div className="px-5 pb-6 space-y-5">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg">Notas de entrega</h2>
            <Link
              to="/entregas"
              className="text-xs text-primary font-semibold flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Nueva
            </Link>
          </div>
          {entregasEstado.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin entregas</p>
          ) : (
            <div className="space-y-3">
              {notasPendientes.length > 0 && (
                <div className="bg-primary/5 border border-primary/30 rounded-xl p-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary mb-2">
                    Notas pendientes ({notasPendientes.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {notasPendientes.map((x) => (
                      <span key={x.entrega.id} className="text-[11px] font-bold bg-primary text-white px-2 py-0.5 rounded">
                        #{x.entrega.notaNumero ?? x.entrega.id.slice(-5).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {notasPagadas.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-green-700 mb-2">
                    Notas pagadas ({notasPagadas.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {notasPagadas.map((x) => (
                      <span key={x.entrega.id} className="text-[11px] font-bold bg-green-600 text-white px-2 py-0.5 rounded">
                        #{x.entrega.notaNumero ?? x.entrega.id.slice(-5).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {entregasEstado.map((x) => {
                const e = x.entrega;
                const venc = e.fechaVencimiento && e.fechaVencimiento < Date.now() && x.pendiente > 0;
                return (
                  <div key={e.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {e.notaNumero && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                              Nota #{e.notaNumero}
                            </span>
                          )}
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            x.estado === "Pagada" ? "bg-green-100 text-green-700" :
                            x.estado === "Parcial" ? "bg-amber-100 text-amber-700" :
                            "bg-muted text-muted-foreground"
                          }`}>{x.estado}</span>
                        </div>
                        <p className="font-bold mt-1">{e.producto}</p>
                        <p className="text-xs text-muted-foreground">Cant: {e.cantidad} bolsas • {fmtDate(e.fecha)}</p>
                      </div>
                      <p className="font-extrabold">{fmtMoney(e.monto)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Pagado {fmtMoney(x.pagado)} · Resta <span className={x.pendiente > 0 ? "font-bold text-primary" : "font-bold text-green-700"}>{fmtMoney(x.pendiente)}</span></span>
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
                        <SignedImage path={p.reciboFoto} alt="Recibo" className="h-full w-full object-cover" />
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

      {role.canDelete && (
        <div className="px-5 pb-6">
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full text-xs text-muted-foreground py-3 flex items-center justify-center gap-2 active:text-primary"
          >
            <Trash2 className="h-3.5 w-3.5" /> Eliminar cliente
          </button>
        </div>
      )}

      {verRecibo && <ImageViewer src={verRecibo} onClose={() => setVerRecibo(null)} />}

      {editar && <EditarClienteModal cliente={cliente} onClose={() => setEditar(false)} />}
      {nuevaVenta && <NuevaVentaModal clienteId={cliente.id} onClose={() => setNuevaVenta(false)} />}
      {nuevaEntrega && <NuevaEntregaInline clienteId={cliente.id} onClose={() => setNuevaEntrega(false)} />}
      {verRecibos && (
        <RecibosModal
          pagos={recibosConFoto}
          onClose={() => setVerRecibos(false)}
          onSelect={(url) => { setVerRecibos(false); setVerRecibo(url); }}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar cliente?"
          desc={`Se eliminará "${cliente.nombre}" y todos sus datos asociados. Esta acción no se puede deshacer.`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            try {
              await api.deleteCliente(cliente.id);
              toast.success("Cliente eliminado");
              navigate({ to: "/clientes" });
            } catch (e: any) {
              toast.error(e?.message || "Error al eliminar");
            }
          }}
        />
      )}
    </div>
  );
}

function RecibosModal({
  pagos,
  onClose,
  onSelect,
}: {
  pagos: { id: string; reciboFoto?: string; monto: number; fecha: number }[];
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
      <div className="bg-card w-full max-w-md mx-auto rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Recibos</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        {pagos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sin recibos cargados</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {pagos.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.reciboFoto!)}
                className="rounded-xl overflow-hidden border border-border bg-muted active:scale-95 transition"
              >
                <SignedImage path={p.reciboFoto} alt="Recibo" className="w-full h-32 object-cover" />
                <div className="p-2 text-left">
                  <p className="text-xs font-bold text-green-700">{fmtMoney(p.monto)}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(p.fecha)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  desc,
  onCancel,
  onConfirm,
}: {
  title: string;
  desc: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-5" onClick={onCancel}>
      <div className="bg-card w-full max-w-sm rounded-2xl p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={onCancel} className="bg-muted py-3.5 rounded-xl font-bold">Cancelar</button>
          <button
            onClick={async () => { setBusy(true); await onConfirm(); }}
            disabled={busy}
            className="bg-primary text-white py-3.5 rounded-xl font-bold disabled:opacity-50"
          >
            {busy ? "..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NuevaEntregaInline({ clienteId, onClose }: { clienteId: string; onClose: () => void }) {
  const api = useApi();
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [monto, setMonto] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseFloat(monto);
    if (!producto.trim() || !m) {
      toast.error("Completa producto y monto");
      return;
    }
    setSaving(true);
    try {
      await api.addEntrega({
        clienteId,
        producto: producto.trim(),
        cantidad: parseInt(cantidad) || 1,
        monto: m,
        estado: "Pendiente",
      });
      toast.success("Entrega creada");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Error");
      setSaving(false);
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
          <Field label="Producto *" value={producto} onChange={setProducto} placeholder="Ej. Bolsas 50kg" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad" value={cantidad} onChange={setCantidad} type="number" />
            <Field label="Monto *" value={monto} onChange={setMonto} type="number" placeholder="0.00" />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl text-base mt-2 active:scale-[0.98] transition shadow-[var(--shadow-red)] disabled:opacity-50"
          >
            {saving ? "GUARDANDO..." : "REGISTRAR ENTREGA"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditarClienteModal({
  cliente,
  onClose,
}: {
  cliente: Cliente;
  onClose: () => void;
}) {
  const api = useApi();
  const [nombre, setNombre] = useState(cliente.nombre);
  const [telefono, setTelefono] = useState(cliente.telefono);
  const [telefono2, setTelefono2] = useState(cliente.telefono2 ?? "");
  const [direccion, setDireccion] = useState(cliente.direccion);
  const [notas, setNotas] = useState(cliente.notas ?? "");
  const [tipo, setTipo] = useState<CustomerType>(cliente.tipo ?? "Particular");
  const [nit, setNit] = useState(cliente.nit ?? "");
  const [ci, setCi] = useState(cliente.ci ?? "");
  const [notasNegocio, setNotasNegocio] = useState(cliente.notasNegocio ?? "");
  const [infoAdicional, setInfoAdicional] = useState(cliente.infoAdicional ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      await api.updateCliente(cliente.id, {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        telefono2: telefono2.trim(),
        direccion: direccion.trim(),
        notas: notas.trim() || undefined,
        tipo,
        nit: nit.trim(),
        ci: ci.trim(),
        notasNegocio: notasNegocio.trim(),
        infoAdicional: infoAdicional.trim(),
      });
      toast.success("Cliente actualizado");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-3xl p-6 space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Editar cliente</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Nombre *" value={nombre} onChange={setNombre} />
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tipo</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {CUSTOMER_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`py-2.5 rounded-xl text-sm font-bold border-2 transition ${
                    tipo === t ? "bg-brand-black text-white border-brand-black" : "bg-card border-border"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Field label="Teléfono principal" value={telefono} onChange={setTelefono} type="tel" />
          <Field label="Teléfono secundario" value={telefono2} onChange={setTelefono2} type="tel" />
          <Field label="Dirección" value={direccion} onChange={setDireccion} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="NIT" value={nit} onChange={setNit} />
            <Field label="CI" value={ci} onChange={setCi} />
          </div>
          <Field label="Notas del negocio" value={notasNegocio} onChange={setNotasNegocio} />
          <Field label="Información adicional" value={infoAdicional} onChange={setInfoAdicional} />
          <Field label="Notas" value={notas} onChange={setNotas} />
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl text-base mt-2 active:scale-[0.98] transition shadow-[var(--shadow-red)] disabled:opacity-50"
          >
            {saving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
          </button>
        </form>
      </div>
    </div>
  );
}

function NuevaVentaModal({ clienteId, onClose }: { clienteId: string; onClose: () => void }) {
  const api = useApi();
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [precio, setPrecio] = useState("");
  const [tipoPago, setTipoPago] = useState<"contado" | "credito" | "parcial">("credito");
  const [pagoInicial, setPagoInicial] = useState("");
  const [vence, setVence] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [fechaPedido, setFechaPedido] = useState(today);
  const [fechaEntrega, setFechaEntrega] = useState(today);
  const [fechaPago, setFechaPago] = useState(today);
  const [saving, setSaving] = useState(false);

  const cant = parseInt(cantidad) || 0;
  const pu = parseFloat(precio) || 0;
  const total = cant * pu;
  const inicial = tipoPago === "contado" ? total : tipoPago === "parcial" ? parseFloat(pagoInicial) || 0 : 0;
  const restante = Math.max(0, total - inicial);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto.trim() || !total) {
      toast.error("Completa producto, cantidad y precio");
      return;
    }
    if (tipoPago === "parcial" && inicial <= 0) {
      toast.error("Ingresa el pago inicial");
      return;
    }
    setSaving(true);
    try {
      const entrega = await api.addEntrega({
        clienteId,
        producto: producto.trim(),
        cantidad: cant || 1,
        monto: total,
        estado: "Pendiente",
        fechaVencimiento:
          tipoPago !== "contado" && vence ? new Date(vence).getTime() : undefined,
        fecha: new Date(fechaEntrega).getTime(),
        fechaPedido: new Date(fechaPedido).getTime(),
        fechaPago: tipoPago !== "credito" ? new Date(fechaPago).getTime() : undefined,
      });
      if (inicial > 0) {
        await api.addPago({
          clienteId,
          monto: inicial,
          metodo: "Efectivo",
          nota: `Pago ${tipoPago === "contado" ? "de contado" : "inicial"} venta ${entrega.producto}`,
          fecha: new Date(fechaPago).getTime(),
        });
      }
      toast.success("Venta registrada");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Nueva venta</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Producto *" value={producto} onChange={setProducto} placeholder="Ej. Bolsa 50kg" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cant. bolsas" value={cantidad} onChange={setCantidad} type="number" />
            <Field label="Precio unit. *" value={precio} onChange={setPrecio} type="number" placeholder="0.00" />
          </div>

          <div className="bg-muted rounded-xl p-3 flex justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-extrabold text-lg">{fmtMoney(total)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha pedido" value={fechaPedido} onChange={setFechaPedido} type="date" />
            <Field label="Fecha entrega" value={fechaEntrega} onChange={setFechaEntrega} type="date" />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tipo de pago</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {(["contado", "credito", "parcial"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipoPago(t)}
                  className={`py-3 rounded-xl text-sm font-bold border-2 transition ${
                    tipoPago === t ? "bg-brand-black text-white border-brand-black" : "bg-card border-border"
                  }`}
                >
                  {t === "contado" ? "Contado" : t === "credito" ? "Crédito" : "Parcial"}
                </button>
              ))}
            </div>
          </div>

          {tipoPago === "parcial" && (
            <>
              <Field label="Pago inicial *" value={pagoInicial} onChange={setPagoInicial} type="number" placeholder="0.00" />
              <Field label="Fecha de pago" value={fechaPago} onChange={setFechaPago} type="date" />
            </>
          )}
          {tipoPago === "contado" && (
            <Field label="Fecha de pago" value={fechaPago} onChange={setFechaPago} type="date" />
          )}

          {tipoPago !== "contado" && (
            <>
              <Field label="Vence" value={vence} onChange={setVence} type="date" />
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex justify-between">
                <span className="text-sm">Saldo a deber</span>
                <span className="font-extrabold text-primary">{fmtMoney(restante)}</span>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl text-base mt-2 active:scale-[0.98] transition shadow-[var(--shadow-red)] disabled:opacity-50"
          >
            {saving ? "GUARDANDO..." : "REGISTRAR VENTA"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-primary"
      />
    </div>
  );
}