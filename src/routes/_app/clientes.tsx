import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useDB, totalDeudaCliente, tieneVencido, fmtMoney, api } from "@/lib/store";
import { Search, Plus, Phone, X } from "lucide-react";

export const Route = createFileRoute("/_app/clientes")({
  component: Clientes,
});

function Clientes() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtrados = db.clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(q.toLowerCase()) ||
      c.telefono.includes(q) ||
      c.direccion.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="px-5 py-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Cartera</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Clientes</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, teléfono..."
          className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-3.5 text-base focus:outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-2">
        {filtrados.map((c) => {
          const deuda = totalDeudaCliente(db, c.id);
          const vencido = tieneVencido(db, c.id);
          return (
            <Link
              key={c.id}
              to="/clientes/$id"
              params={{ id: c.id }}
              className={`flex items-center justify-between rounded-xl p-4 border active:scale-[0.99] transition ${
                vencido ? "bg-primary/5 border-primary/30" : "bg-card border-border"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                    vencido ? "bg-primary text-white" : "bg-brand-black text-white"
                  }`}
                >
                  {c.nombre.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.telefono}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className={`font-extrabold ${vencido ? "text-primary" : deuda > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                  {fmtMoney(deuda)}
                </p>
                {vencido && <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Vencido</p>}
              </div>
            </Link>
          );
        })}
        {filtrados.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">Sin resultados</div>
        )}
      </div>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center shadow-[var(--shadow-red)] active:scale-95 transition z-30"
        aria-label="Nuevo cliente"
      >
        <Plus className="h-7 w-7" />
      </button>

      {open && <NuevoClienteModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function NuevoClienteModal({ onClose }: { onClose: () => void }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    api.addCliente({ nombre: nombre.trim(), telefono: telefono.trim(), direccion: direccion.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-card w-full max-w-md rounded-t-3xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Nuevo cliente</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input label="Nombre *" value={nombre} onChange={setNombre} placeholder="Nombre completo" />
          <Input label="Teléfono" value={telefono} onChange={setTelefono} placeholder="55 1234 5678" type="tel" icon={<Phone className="h-4 w-4" />} />
          <Input label="Dirección" value={direccion} onChange={setDireccion} placeholder="Calle y número" />
          <button type="submit" className="w-full bg-primary text-white font-bold py-4 rounded-xl text-base mt-2 active:scale-[0.98] transition shadow-[var(--shadow-red)]">
            GUARDAR
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-muted border border-border rounded-xl py-3.5 text-base focus:outline-none focus:border-primary ${icon ? "pl-11 pr-4" : "px-4"}`}
        />
      </div>
    </div>
  );
}