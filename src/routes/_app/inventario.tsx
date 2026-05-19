import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useDB, useApi, useUserRole, fmtMoney, fmtDate, type Producto } from "@/lib/store";
import { Package, Plus, AlertTriangle, TrendingUp, TrendingDown, X, Pencil, Trash2, History, Download } from "lucide-react";
import { toast } from "sonner";
import { exportExcel, exportPDF } from "@/lib/exports";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_app/inventario")({
  component: Inventario,
});

function Inventario() {
  const db = useDB();
  const api = useApi();
  const role = useUserRole();
  const [tab, setTab] = useState<"productos" | "movimientos">("productos");
  const [openNuevo, setOpenNuevo] = useState(false);
  const [editar, setEditar] = useState<Producto | null>(null);
  const [mover, setMover] = useState<Producto | null>(null);
  const [borrar, setBorrar] = useState<Producto | null>(null);
  const [q, setQ] = useState("");

  const productosFiltrados = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return db.productos;
    return db.productos.filter(
      (p) => p.nombre.toLowerCase().includes(t) || (p.categoria ?? "").toLowerCase().includes(t),
    );
  }, [db.productos, q]);

  const totalProductos = db.productos.length;
  const bajoStock = db.productos.filter((p) => p.stock <= (p.stockMinimo ?? 5));
  const valorInventario = db.productos.reduce((s, p) => s + p.precio * p.stock, 0);

  const ventasPorProducto = useMemo(() => {
    const map = new Map<string, number>();
    db.entregas.forEach((e) => map.set(e.producto, (map.get(e.producto) ?? 0) + e.cantidad));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [db.entregas]);

  const exportar = (tipo: "pdf" | "xlsx") => {
    const headers = ["Producto", "Categoría", "Stock", "Mín.", "Precio", "Valor"];
    const rows = db.productos.map((p) => [
      p.nombre,
      p.categoria ?? "—",
      p.stock,
      p.stockMinimo ?? 0,
      p.precio.toFixed(2),
      (p.precio * p.stock).toFixed(2),
    ]);
    if (tipo === "pdf") exportPDF("Inventario", headers, rows, "novamix-inventario");
    else exportExcel("Inventario", headers, rows, "novamix-inventario");
  };

  return (
    <div className="px-5 py-5 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Almacén</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Inventario</h1>
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

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Package} label="Productos" value={String(totalProductos)} />
        <Stat icon={AlertTriangle} label="Bajo stock" value={String(bajoStock.length)} danger={bajoStock.length > 0} />
        <div className="col-span-2 bg-gradient-to-br from-primary to-brand-red-dark text-white rounded-2xl p-5 shadow-[var(--shadow-red)]">
          <p className="text-xs uppercase tracking-wider text-white/80 font-bold">Valor de inventario</p>
          <p className="text-3xl font-extrabold mt-1">{fmtMoney(valorInventario)}</p>
        </div>
      </div>

      {bajoStock.length > 0 && (
        <div className="bg-primary/10 border-2 border-primary rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <p className="font-extrabold text-primary">Alerta de stock bajo</p>
          </div>
          <div className="space-y-1.5">
            {bajoStock.slice(0, 5).map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="font-bold">{p.nombre}</span>
                <span className="text-primary font-extrabold">{p.stock} / mín {p.stockMinimo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ventasPorProducto.length > 0 && (
        <div>
          <h2 className="font-extrabold text-lg mb-2">Más vendidos</h2>
          <div className="space-y-2">
            {ventasPorProducto.map(([nombre, qty], i) => (
              <div key={nombre} className="flex justify-between items-center bg-card border border-border rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center font-extrabold text-xs">{i + 1}</span>
                  <span className="font-bold">{nombre}</span>
                </div>
                <span className="font-extrabold">{qty} u.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b border-border">
        {(["productos", "movimientos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-bold capitalize border-b-2 ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {t === "productos" ? "Productos" : "Historial"}
          </button>
        ))}
      </div>

      {tab === "productos" ? (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:border-primary"
          />
          <div className="space-y-2">
            {productosFiltrados.map((p) => {
              const bajo = p.stock <= (p.stockMinimo ?? 5);
              return (
                <div key={p.id} className={`rounded-2xl p-4 border ${bajo ? "bg-primary/5 border-primary/40" : "bg-card border-border"}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold truncate">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">{p.categoria} · {fmtMoney(p.precio)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-extrabold ${bajo ? "text-primary" : ""}`}>{p.stock}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Stock</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button onClick={() => setMover(p)} className="bg-brand-black text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" /> Movimiento
                    </button>
                    <button onClick={() => setEditar(p)} className="bg-muted py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
                        api.deleteProducto(p.id).then(() => toast.success("Producto eliminado")).catch((e) => toast.error(e.message));
                      }}
                      className="bg-muted text-primary py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Borrar
                    </button>
                  </div>
                </div>
              );
            })}
            {productosFiltrados.length === 0 && <div className="text-center text-muted-foreground py-10 text-sm">Sin productos</div>}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {db.movimientos.length === 0 && <div className="text-center text-muted-foreground py-10 text-sm">Sin movimientos</div>}
          {db.movimientos.map((m) => {
            const isIn = m.tipo === "entrada";
            const isOut = m.tipo === "salida" || m.tipo === "venta";
            const Icon = isIn ? TrendingUp : isOut ? TrendingDown : History;
            return (
              <div key={m.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isIn ? "bg-green-100 text-green-700" : isOut ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{m.productoNombre}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{m.tipo} · {fmtDate(m.fecha)}{m.referencia ? ` · ${m.referencia}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className={`font-extrabold ${isIn ? "text-green-700" : isOut ? "text-primary" : ""}`}>{isOut ? "-" : isIn ? "+" : "="}{m.cantidad}</p>
                  <p className="text-[10px] text-muted-foreground">→ {m.stockDespues}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpenNuevo(true)}
        className="fixed bottom-24 right-5 h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center shadow-[var(--shadow-red)] active:scale-95 transition z-30"
      >
        <Plus className="h-7 w-7" />
      </button>

      {openNuevo && <ProductoModal onClose={() => setOpenNuevo(false)} />}
      {editar && <ProductoModal producto={editar} onClose={() => setEditar(null)} />}
      {mover && <MovimientoModal producto={mover} onClose={() => setMover(null)} />}
    </div>
  );
}

function Stat({ icon: Icon, label, value, danger }: { icon: any; label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${danger ? "bg-primary/5 border-primary/30" : "bg-card border-border"}`}>
      <Icon className={`h-5 w-5 ${danger ? "text-primary" : "text-primary"}`} />
      <p className={`text-2xl font-extrabold mt-2 ${danger ? "text-primary" : ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground font-bold uppercase">{label}</p>
    </div>
  );
}

function ProductoModal({ producto, onClose }: { producto?: Producto; onClose: () => void }) {
  const api = useApi();
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [categoria, setCategoria] = useState(producto?.categoria ?? "General");
  const [precio, setPrecio] = useState(String(producto?.precio ?? ""));
  const [stock, setStock] = useState(String(producto?.stock ?? "0"));
  const [stockMin, setStockMin] = useState(String(producto?.stockMinimo ?? "5"));
  const [saving, setSaving] = useState(false);
  const editing = !!producto;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.updateProducto(producto!.id, {
          nombre: nombre.trim(),
          precio: parseFloat(precio) || 0,
          categoria: categoria.trim() || "General",
          stockMinimo: parseInt(stockMin) || 0,
        });
        toast.success("Producto actualizado");
      } else {
        await api.addProducto({
          nombre: nombre.trim(),
          precio: parseFloat(precio) || 0,
          stock: parseInt(stock) || 0,
          categoria: categoria.trim() || "General",
          stockMinimo: parseInt(stockMin) || 0,
        });
        toast.success("Producto creado");
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Error");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
      <div className="bg-card w-full max-w-md mx-auto rounded-t-3xl p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{editing ? "Editar producto" : "Nuevo producto"}</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input label="Nombre" value={nombre} onChange={setNombre} />
          <Input label="Categoría" value={categoria} onChange={setCategoria} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Precio" value={precio} onChange={setPrecio} type="number" />
            <Input label="Stock mínimo" value={stockMin} onChange={setStockMin} type="number" />
          </div>
          {!editing && <Input label="Stock inicial" value={stock} onChange={setStock} type="number" />}
          <button disabled={saving} type="submit" className="w-full bg-primary text-white font-bold py-4 rounded-xl mt-2 disabled:opacity-50">
            {saving ? "GUARDANDO..." : editing ? "ACTUALIZAR" : "CREAR PRODUCTO"}
          </button>
        </form>
      </div>
    </div>
  );
}

function MovimientoModal({ producto, onClose }: { producto: Producto; onClose: () => void }) {
  const api = useApi();
  const [tipo, setTipo] = useState<"entrada" | "salida" | "ajuste">("entrada");
  const [cantidad, setCantidad] = useState("1");
  const [ref, setRef] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = parseInt(cantidad);
    if (!c || c < 0) return;
    setSaving(true);
    try {
      await api.ajustarStock(producto.id, tipo, c, { referencia: ref || undefined });
      toast.success("Movimiento registrado");
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
          <h2 className="text-xl font-extrabold">Movimiento de stock</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground">{producto.nombre} · Stock actual: <b>{producto.stock}</b></p>
        <div className="grid grid-cols-3 gap-2">
          {(["entrada", "salida", "ajuste"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`py-3 rounded-xl text-sm font-bold capitalize ${tipo === t ? "bg-primary text-white" : "bg-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input label={tipo === "ajuste" ? "Nuevo stock total" : "Cantidad"} value={cantidad} onChange={setCantidad} type="number" />
          <Input label="Referencia (opcional)" value={ref} onChange={setRef} />
          <button disabled={saving} type="submit" className="w-full bg-primary text-white font-bold py-4 rounded-xl disabled:opacity-50">
            {saving ? "GUARDANDO..." : "REGISTRAR"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary"
      />
    </div>
  );
}