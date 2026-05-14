import { useEffect, useState } from "react";

export type Cliente = {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  notas?: string;
  createdAt: number;
};

export type Pago = {
  id: string;
  clienteId: string;
  monto: number;
  metodo: "Efectivo" | "Transferencia" | "Tarjeta" | "Otro";
  fecha: number;
  reciboFoto?: string;
  nota?: string;
};

export type Entrega = {
  id: string;
  clienteId: string;
  producto: string;
  cantidad: number;
  monto: number;
  estado: "Pendiente" | "En camino" | "Entregado";
  fecha: number;
  fechaVencimiento?: number;
};

type DB = {
  clientes: Cliente[];
  pagos: Pago[];
  entregas: Entrega[];
  auth: { user: string | null };
};

const KEY = "novamix_db_v1";

function seed(): DB {
  const now = Date.now();
  const day = 86400000;
  const c = (id: string, nombre: string, tel: string, dir: string): Cliente => ({
    id,
    nombre,
    telefono: tel,
    direccion: dir,
    createdAt: now,
  });
  return {
    clientes: [
      c("c1", "María González", "5215512345678", "Av. Reforma 123, CDMX"),
      c("c2", "Carlos Hernández", "5215598765432", "Calle Juárez 45, GDL"),
      c("c3", "Lucía Martínez", "5215511223344", "Insurgentes 890, MTY"),
      c("c4", "Jorge Ramírez", "5215544556677", "Av. Universidad 12, CDMX"),
    ],
    entregas: [
      { id: "e1", clienteId: "c1", producto: "Pintura Premium 20L", cantidad: 2, monto: 1800, estado: "Entregado", fecha: now - 10 * day, fechaVencimiento: now - 3 * day },
      { id: "e2", clienteId: "c2", producto: "Cemento gris 50kg", cantidad: 10, monto: 2500, estado: "En camino", fecha: now - day, fechaVencimiento: now + 7 * day },
      { id: "e3", clienteId: "c3", producto: "Barniz transparente", cantidad: 4, monto: 950, estado: "Pendiente", fecha: now, fechaVencimiento: now + 5 * day },
      { id: "e4", clienteId: "c4", producto: "Tubería PVC", cantidad: 8, monto: 1200, estado: "Entregado", fecha: now - 20 * day, fechaVencimiento: now - 10 * day },
    ],
    pagos: [
      { id: "p1", clienteId: "c1", monto: 800, metodo: "Efectivo", fecha: now - 5 * day },
      { id: "p2", clienteId: "c4", monto: 600, metodo: "Transferencia", fecha: now - 8 * day },
    ],
    auth: { user: null },
  };
}

function load(): DB {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as DB;
  } catch {
    return seed();
  }
}

let _db: DB | null = null;
const listeners = new Set<() => void>();

function getDB(): DB {
  if (!_db) _db = load();
  return _db;
}

function save() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(_db));
  }
  listeners.forEach((l) => l());
}

export function useDB() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    if (!_db) {
      _db = load();
      setTick((t) => t + 1);
    }
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return getDB();
}

export const api = {
  login(user: string) {
    getDB().auth.user = user;
    save();
  },
  logout() {
    getDB().auth.user = null;
    save();
  },
  addCliente(c: Omit<Cliente, "id" | "createdAt">) {
    const nuevo: Cliente = { ...c, id: "c" + Date.now(), createdAt: Date.now() };
    getDB().clientes.unshift(nuevo);
    save();
    return nuevo;
  },
  addPago(p: Omit<Pago, "id" | "fecha"> & { fecha?: number }) {
    const nuevo: Pago = { ...p, id: "p" + Date.now(), fecha: p.fecha ?? Date.now() };
    getDB().pagos.unshift(nuevo);
    save();
    return nuevo;
  },
  addEntrega(e: Omit<Entrega, "id" | "fecha"> & { fecha?: number }) {
    const nuevo: Entrega = { ...e, id: "e" + Date.now(), fecha: e.fecha ?? Date.now() };
    getDB().entregas.unshift(nuevo);
    save();
    return nuevo;
  },
  updateEntregaEstado(id: string, estado: Entrega["estado"]) {
    const en = getDB().entregas.find((x) => x.id === id);
    if (en) {
      en.estado = estado;
      save();
    }
  },
};

export function totalDeudaCliente(db: DB, clienteId: string) {
  const total = db.entregas.filter((e) => e.clienteId === clienteId).reduce((s, e) => s + e.monto, 0);
  const pagado = db.pagos.filter((p) => p.clienteId === clienteId).reduce((s, p) => s + p.monto, 0);
  return Math.max(0, total - pagado);
}

export function tieneVencido(db: DB, clienteId: string) {
  const now = Date.now();
  const entregasVencidas = db.entregas.filter(
    (e) => e.clienteId === clienteId && e.fechaVencimiento && e.fechaVencimiento < now,
  );
  if (entregasVencidas.length === 0) return false;
  return totalDeudaCliente(db, clienteId) > 0;
}

export function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

export function fmtDate(t: number) {
  return new Date(t).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}