import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type CustomerType = "Ferretería" | "Comercial" | "Constructor" | "Particular";
export const CUSTOMER_TYPES: CustomerType[] = ["Ferretería", "Comercial", "Constructor", "Particular"];

export type Cliente = {
  id: string;
  nombre: string;
  telefono: string;
  telefono2?: string;
  direccion: string;
  notas?: string;
  tipo?: CustomerType;
  nit?: string;
  ci?: string;
  notasNegocio?: string;
  infoAdicional?: string;
  createdAt: number;
};

export type MetodoPago = "Efectivo" | "Transferencia" | "QR" | "Crédito" | "Mixto" | "Tarjeta" | "Otro";
export const METODOS_PAGO: MetodoPago[] = ["Efectivo", "Transferencia", "QR", "Crédito", "Mixto"];

export type Pago = {
  id: string;
  clienteId: string;
  monto: number;
  metodo: MetodoPago;
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
  fechaPedido?: number;
  fechaPago?: number;
  foto?: string;
};

export type Producto = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
};

export type DB = {
  clientes: Cliente[];
  pagos: Pago[];
  entregas: Entrega[];
  productos: Producto[];
  auth: { user: string | null; userId: string | null };
  loading: boolean;
};

// ---------- Auth hook ----------
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    userId: session?.user?.id ?? null,
    userLabel:
      session?.user?.user_metadata?.name ||
      session?.user?.email?.split("@")[0] ||
      null,
    ready,
  };
}

// ---------- Mappers ----------
function mapCliente(r: any): Cliente {
  return {
    id: r.id,
    nombre: r.full_name,
    telefono: r.phone ?? "",
    direccion: r.address ?? "",
    notas: r.notes ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
  };
}
function mapPago(r: any): Pago {
  return {
    id: r.id,
    clienteId: r.customer_id,
    monto: Number(r.amount),
    metodo: r.method,
    fecha: new Date(r.payment_date).getTime(),
    reciboFoto: r.receipt_photo_url ?? undefined,
    nota: r.notes ?? undefined,
  };
}
function mapEntrega(r: any): Entrega {
  return {
    id: r.id,
    clienteId: r.customer_id,
    producto: r.product,
    cantidad: r.quantity,
    monto: Number(r.total_amount),
    estado: r.status,
    fecha: new Date(r.delivery_date).getTime(),
    fechaVencimiento: r.due_date ? new Date(r.due_date).getTime() : undefined,
    foto: r.delivery_photo_url ?? undefined,
  };
}
function mapProducto(r: any): Producto {
  return { id: r.id, nombre: r.name, precio: Number(r.price), stock: r.stock };
}

// ---------- Data hook ----------
export function useDB(): DB {
  const auth = useAuth();
  const userId = auth.userId;

  const enabled = !!userId;

  const clientesQ = useQuery({
    queryKey: ["clientes", userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapCliente);
    },
  });

  const pagosQ = useQuery({
    queryKey: ["pagos", userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data.map(mapPago);
    },
  });

  const entregasQ = useQuery({
    queryKey: ["entregas", userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*")
        .order("delivery_date", { ascending: false });
      if (error) throw error;
      return data.map(mapEntrega);
    },
  });

  const productosQ = useQuery({
    queryKey: ["productos", userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapProducto);
    },
  });

  return {
    clientes: clientesQ.data ?? [],
    pagos: pagosQ.data ?? [],
    entregas: entregasQ.data ?? [],
    productos: productosQ.data ?? [],
    auth: { user: auth.userLabel, userId },
    loading:
      !auth.ready ||
      clientesQ.isLoading ||
      pagosQ.isLoading ||
      entregasQ.isLoading,
  };
}

// ---------- Storage ----------
export async function uploadReceiptPhoto(file: File): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    console.error("upload", error);
    return null;
  }
  const { data } = supabase.storage.from("receipts").getPublicUrl(path);
  return data.publicUrl;
}

// ---------- Mutations API ----------
export function useApi() {
  const qc = useQueryClient();
  const invalidate = (k: string) => qc.invalidateQueries({ queryKey: [k] });

  return {
    async login(email: string, password: string) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signup(email: string, password: string, name?: string) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: name ? { name } : undefined,
        },
      });
      if (error) throw error;
    },
    async logout() {
      await supabase.auth.signOut();
      qc.clear();
    },
    async addCliente(c: { nombre: string; telefono: string; direccion: string; notas?: string }) {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sin sesión");
      const { data, error } = await supabase
        .from("customers")
        .insert({
          user_id: u.user.id,
          full_name: c.nombre,
          phone: c.telefono,
          address: c.direccion,
          notes: c.notas,
        })
        .select()
        .single();
      if (error) throw error;
      invalidate("clientes");
      return mapCliente(data);
    },
    async updateCliente(id: string, c: { nombre: string; telefono: string; direccion: string; notas?: string }) {
      const { error } = await supabase
        .from("customers")
        .update({
          full_name: c.nombre,
          phone: c.telefono,
          address: c.direccion,
          notes: c.notas,
        })
        .eq("id", id);
      if (error) throw error;
      invalidate("clientes");
    },
    async deleteCliente(id: string) {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      invalidate("clientes");
      invalidate("pagos");
      invalidate("entregas");
    },
    async addPago(p: {
      clienteId: string;
      monto: number;
      metodo: Pago["metodo"];
      reciboFoto?: string;
      nota?: string;
    }): Promise<Pago> {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sin sesión");
      const { data, error } = await supabase
        .from("payments")
        .insert({
          user_id: u.user.id,
          customer_id: p.clienteId,
          amount: p.monto,
          method: p.metodo,
          receipt_photo_url: p.reciboFoto,
          notes: p.nota,
        })
        .select()
        .single();
      if (error) throw error;
      invalidate("pagos");
      return mapPago(data);
    },
    async addEntrega(e: {
      clienteId: string;
      producto: string;
      cantidad: number;
      monto: number;
      estado: Entrega["estado"];
      fechaVencimiento?: number;
    }) {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sin sesión");
      const { data, error } = await supabase
        .from("deliveries")
        .insert({
          user_id: u.user.id,
          customer_id: e.clienteId,
          product: e.producto,
          quantity: e.cantidad,
          total_amount: e.monto,
          status: e.estado,
          due_date: e.fechaVencimiento ? new Date(e.fechaVencimiento).toISOString() : null,
        })
        .select()
        .single();
      if (error) throw error;
      invalidate("entregas");
      return mapEntrega(data);
    },
    async updateEntregaEstado(id: string, estado: Entrega["estado"]) {
      const { error } = await supabase.from("deliveries").update({ status: estado }).eq("id", id);
      if (error) throw error;
      invalidate("entregas");
    },
    async updateEntregaFoto(id: string, url: string) {
      const { error } = await supabase.from("deliveries").update({ delivery_photo_url: url }).eq("id", id);
      if (error) throw error;
      invalidate("entregas");
    },
  };
}

// ---------- Selectors ----------
export function totalDeudaCliente(db: DB, clienteId: string) {
  const total = db.entregas.filter((e) => e.clienteId === clienteId).reduce((s, e) => s + e.monto, 0);
  const pagado = db.pagos.filter((p) => p.clienteId === clienteId).reduce((s, p) => s + p.monto, 0);
  return Math.max(0, total - pagado);
}

export function tieneVencido(db: DB, clienteId: string) {
  const now = Date.now();
  const vencidas = db.entregas.filter(
    (e) => e.clienteId === clienteId && e.fechaVencimiento && e.fechaVencimiento < now,
  );
  if (vencidas.length === 0) return false;
  return totalDeudaCliente(db, clienteId) > 0;
}

export function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

export function fmtDate(t: number) {
  return new Date(t).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}