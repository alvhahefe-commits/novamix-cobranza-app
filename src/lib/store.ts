import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type CustomerType = "Ferretería" | "Comercial" | "Constructor" | "Particular";
export const CUSTOMER_TYPES: CustomerType[] = ["Ferretería", "Comercial", "Constructor", "Particular"];

// ---------- Roles ----------
export type AppRole = "Administrador" | "Vendedor" | "Chofer";
export const APP_ROLES: AppRole[] = ["Administrador", "Vendedor", "Chofer"];

const ROLE_RANK: Record<AppRole, number> = { Administrador: 1, Vendedor: 2, Chofer: 3 };

export function useUserRole() {
  const auth = useAuth();
  const q = useQuery({
    queryKey: ["user-role", auth.userId],
    enabled: !!auth.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", auth.userId!);
      if (error) throw error;
      const roles = ((data as any[]) ?? []).map((r) => r.role as AppRole);
      if (!roles.length) return "Vendedor" as AppRole;
      roles.sort((a, b) => ROLE_RANK[a] - ROLE_RANK[b]);
      return roles[0];
    },
  });
  const role: AppRole = q.data ?? "Vendedor";
  return {
    role,
    ready: !!q.data || !auth.userId,
    isAdmin: role === "Administrador",
    isVendedor: role === "Vendedor",
    isChofer: role === "Chofer",
    canDelete: role === "Administrador",
    canEditInventory: role === "Administrador",
    canManageUsers: role === "Administrador",
    canRegisterSale: role === "Administrador" || role === "Vendedor",
    canRegisterPayment: role === "Administrador" || role === "Vendedor",
    canUpdateDelivery: true, // todos los roles activos pueden actualizar entregas
  };
}

// ---------- Activity log ----------
export async function logActivity(action: string, entity: string, opts?: { entityId?: string; description?: string; metadata?: Record<string, any> }) {
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const label = u.user?.user_metadata?.name || u.user?.email || null;
    await supabase.from("activity_logs" as any).insert({
      user_id: uid,
      user_label: label,
      action,
      entity,
      entity_id: opts?.entityId ?? null,
      description: opts?.description ?? null,
      metadata: opts?.metadata ?? null,
    });
  } catch (e) {
    console.warn("logActivity", e);
  }
}

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
  categoria?: string;
  stockMinimo?: number;
  actualizado?: number;
};

export type MovimientoStock = {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: "entrada" | "salida" | "ajuste" | "venta";
  cantidad: number;
  stockDespues: number;
  referencia?: string;
  notas?: string;
  fecha: number;
};

export type DB = {
  clientes: Cliente[];
  pagos: Pago[];
  entregas: Entrega[];
  productos: Producto[];
  movimientos: MovimientoStock[];
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
    telefono2: r.phone_secondary ?? "",
    direccion: r.address ?? "",
    notas: r.notes ?? undefined,
    tipo: (r.customer_type as CustomerType) ?? "Particular",
    nit: r.nit ?? "",
    ci: r.ci ?? "",
    notasNegocio: r.business_notes ?? "",
    infoAdicional: r.additional_info ?? "",
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
    fechaPedido: r.order_date ? new Date(r.order_date).getTime() : undefined,
    fechaPago: r.payment_date ? new Date(r.payment_date).getTime() : undefined,
    foto: r.delivery_photo_url ?? undefined,
  };
}
function mapProducto(r: any): Producto {
  return {
    id: r.id,
    nombre: r.name,
    precio: Number(r.price),
    stock: r.stock,
    categoria: r.category ?? "General",
    stockMinimo: r.min_stock ?? 5,
    actualizado: r.updated_at ? new Date(r.updated_at).getTime() : undefined,
  };
}
function mapMovimiento(r: any): MovimientoStock {
  return {
    id: r.id,
    productoId: r.product_id,
    productoNombre: r.product_name,
    tipo: r.kind,
    cantidad: r.quantity,
    stockDespues: r.stock_after,
    referencia: r.reference ?? undefined,
    notas: r.notes ?? undefined,
    fecha: new Date(r.created_at).getTime(),
  };
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
        .order("name", { ascending: true });
      if (error) throw error;
      return data.map(mapProducto);
    },
  });

  const movimientosQ = useQuery({
    queryKey: ["movimientos", userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as any[]).map(mapMovimiento);
    },
  });

  return {
    clientes: clientesQ.data ?? [],
    pagos: pagosQ.data ?? [],
    entregas: entregasQ.data ?? [],
    productos: productosQ.data ?? [],
    movimientos: movimientosQ.data ?? [],
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
  // Bucket is private — store the storage path. Components resolve to a
  // short-lived signed URL on demand via getSignedReceiptUrl().
  return path;
}

// Resolve a stored value (new path or legacy public URL) to a usable URL.
// For private bucket paths, returns a short-lived signed URL.
export async function getSignedReceiptUrl(pathOrUrl: string, expiresIn = 3600): Promise<string | null> {
  if (!pathOrUrl) return null;
  let path = pathOrUrl;
  // Legacy values stored full public URLs; extract the object path.
  const marker = "/receipts/";
  const idx = pathOrUrl.indexOf(marker);
  if (pathOrUrl.startsWith("http") && idx !== -1) {
    path = pathOrUrl.slice(idx + marker.length);
  } else if (pathOrUrl.startsWith("http")) {
    return pathOrUrl;
  }
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, expiresIn);
  if (error) {
    console.warn("signed url", error);
    return null;
  }
  return data.signedUrl;
}

// ---------- Offline queue ----------
type PendingOp =
  | { kind: "addCliente"; payload: ClienteInput; tempId: string }
  | { kind: "updateCliente"; id: string; payload: ClienteInput }
  | { kind: "addPago"; payload: PagoInput; tempId: string }
  | { kind: "addEntrega"; payload: EntregaInput; tempId: string };

type ClienteInput = {
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
};
type PagoInput = {
  clienteId: string;
  monto: number;
  metodo: MetodoPago;
  reciboFoto?: string;
  nota?: string;
  fecha?: number;
};
type EntregaInput = {
  clienteId: string;
  producto: string;
  cantidad: number;
  monto: number;
  estado: Entrega["estado"];
  fechaVencimiento?: number;
  fecha?: number;
  fechaPedido?: number;
  fechaPago?: number;
};

const QUEUE_KEY = "novamix.queue.v1";

function readQueue(): PendingOp[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: PendingOp[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}
function enqueue(op: PendingOp) {
  const q = readQueue();
  q.push(op);
  writeQueue(q);
}

export function pendingOpsCount() {
  return readQueue().length;
}

async function execOp(op: PendingOp, userId: string): Promise<boolean> {
  try {
    if (op.kind === "addCliente") {
      const p = op.payload;
      const { error } = await supabase.from("customers").insert({
        user_id: userId,
        full_name: p.nombre,
        phone: p.telefono,
        phone_secondary: p.telefono2 ?? "",
        address: p.direccion,
        notes: p.notas,
        customer_type: p.tipo ?? "Particular",
        nit: p.nit ?? "",
        ci: p.ci ?? "",
        business_notes: p.notasNegocio ?? "",
        additional_info: p.infoAdicional ?? "",
      });
      if (error) throw error;
    } else if (op.kind === "updateCliente") {
      const p = op.payload;
      const { error } = await supabase.from("customers").update({
        full_name: p.nombre,
        phone: p.telefono,
        phone_secondary: p.telefono2 ?? "",
        address: p.direccion,
        notes: p.notas,
        customer_type: p.tipo ?? "Particular",
        nit: p.nit ?? "",
        ci: p.ci ?? "",
        business_notes: p.notasNegocio ?? "",
        additional_info: p.infoAdicional ?? "",
      }).eq("id", op.id);
      if (error) throw error;
    } else if (op.kind === "addPago") {
      const p = op.payload;
      const { error } = await supabase.from("payments").insert({
        user_id: userId,
        customer_id: p.clienteId,
        amount: p.monto,
        method: p.metodo,
        receipt_photo_url: p.reciboFoto,
        notes: p.nota,
        payment_date: p.fecha ? new Date(p.fecha).toISOString() : new Date().toISOString(),
      });
      if (error) throw error;
    } else if (op.kind === "addEntrega") {
      const p = op.payload;
      const { error } = await supabase.from("deliveries").insert({
        user_id: userId,
        customer_id: p.clienteId,
        product: p.producto,
        quantity: p.cantidad,
        total_amount: p.monto,
        status: p.estado,
        delivery_date: p.fecha ? new Date(p.fecha).toISOString() : new Date().toISOString(),
        due_date: p.fechaVencimiento ? new Date(p.fechaVencimiento).toISOString() : null,
        order_date: p.fechaPedido ? new Date(p.fechaPedido).toISOString() : null,
        payment_date: p.fechaPago ? new Date(p.fechaPago).toISOString() : null,
      });
      if (error) throw error;
    }
    return true;
  } catch (e) {
    console.warn("execOp failed", e);
    return false;
  }
}

export async function flushQueue(userId: string | null) {
  if (!userId) return 0;
  const q = readQueue();
  if (!q.length) return 0;
  const remaining: PendingOp[] = [];
  let done = 0;
  for (const op of q) {
    const ok = await execOp(op, userId);
    if (ok) done++;
    else remaining.push(op);
  }
  writeQueue(remaining);
  return done;
}

// ---------- Realtime + Offline sync hook ----------
export function useRealtimeSync() {
  const auth = useAuth();
  const qc = useQueryClient();
  const userId = auth.userId;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`novamix-${userId}`, { config: { private: true } })
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => qc.invalidateQueries({ queryKey: ["clientes"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => qc.invalidateQueries({ queryKey: ["pagos"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => qc.invalidateQueries({ queryKey: ["entregas"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "debts" }, () => qc.invalidateQueries({ queryKey: ["debts"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => qc.invalidateQueries({ queryKey: ["productos"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_movements" }, () => qc.invalidateQueries({ queryKey: ["movimientos"] }))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  useEffect(() => {
    if (!userId) return;
    const tryFlush = async () => {
      const n = await flushQueue(userId);
      if (n > 0) {
        qc.invalidateQueries({ queryKey: ["clientes"] });
        qc.invalidateQueries({ queryKey: ["pagos"] });
        qc.invalidateQueries({ queryKey: ["entregas"] });
      }
    };
    tryFlush();
    const onOnline = () => tryFlush();
    window.addEventListener("online", onOnline);
    const id = window.setInterval(tryFlush, 30000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(id);
    };
  }, [userId, qc]);
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
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
    async addCliente(c: ClienteInput) {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline || !uid) {
        const tempId = `tmp-${Date.now()}`;
        enqueue({ kind: "addCliente", payload: c, tempId });
        invalidate("clientes");
        return { id: tempId, ...c, createdAt: Date.now() } as any;
      }
      const { data, error } = await supabase
        .from("customers")
        .insert({
          user_id: uid,
          full_name: c.nombre,
          phone: c.telefono,
          phone_secondary: c.telefono2 ?? "",
          address: c.direccion,
          notes: c.notas,
          customer_type: c.tipo ?? "Particular",
          nit: c.nit ?? "",
          ci: c.ci ?? "",
          business_notes: c.notasNegocio ?? "",
          additional_info: c.infoAdicional ?? "",
        })
        .select()
        .single();
      if (error) throw error;
      invalidate("clientes");
      await logActivity("crear", "cliente", { entityId: data.id, description: `Nuevo cliente: ${c.nombre}` });
      return mapCliente(data);
    },
    async updateCliente(id: string, c: ClienteInput) {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline) {
        enqueue({ kind: "updateCliente", id, payload: c });
        invalidate("clientes");
        return;
      }
      const { error } = await supabase
        .from("customers")
        .update({
          full_name: c.nombre,
          phone: c.telefono,
          phone_secondary: c.telefono2 ?? "",
          address: c.direccion,
          notes: c.notas,
          customer_type: c.tipo ?? "Particular",
          nit: c.nit ?? "",
          ci: c.ci ?? "",
          business_notes: c.notasNegocio ?? "",
          additional_info: c.infoAdicional ?? "",
        })
        .eq("id", id);
      if (error) throw error;
      invalidate("clientes");
      await logActivity("editar", "cliente", { entityId: id, description: `Editó cliente ${c.nombre}` });
    },
    async deleteCliente(id: string) {
      const cli = (await supabase.from("customers").select("full_name").eq("id", id).maybeSingle()).data as any;
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      await logActivity("eliminar", "cliente", { entityId: id, description: `Eliminó cliente ${cli?.full_name ?? id}` });
      invalidate("clientes");
      invalidate("pagos");
      invalidate("entregas");
    },
    async addPago(p: PagoInput): Promise<Pago> {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline || !uid) {
        const tempId = `tmp-${Date.now()}`;
        enqueue({ kind: "addPago", payload: p, tempId });
        invalidate("pagos");
        return { id: tempId, clienteId: p.clienteId, monto: p.monto, metodo: p.metodo, fecha: p.fecha ?? Date.now(), reciboFoto: p.reciboFoto, nota: p.nota };
      }
      const { data, error } = await supabase
        .from("payments")
        .insert({
          user_id: uid,
          customer_id: p.clienteId,
          amount: p.monto,
          method: p.metodo,
          receipt_photo_url: p.reciboFoto,
          notes: p.nota,
          payment_date: p.fecha ? new Date(p.fecha).toISOString() : new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      invalidate("pagos");
      await logActivity("crear", "pago", { entityId: data.id, description: `Registró pago de ${p.monto}`, metadata: { monto: p.monto, metodo: p.metodo } });
      return mapPago(data);
    },
    async addEntrega(e: EntregaInput) {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline || !uid) {
        const tempId = `tmp-${Date.now()}`;
        enqueue({ kind: "addEntrega", payload: e, tempId });
        invalidate("entregas");
        return {
          id: tempId,
          clienteId: e.clienteId,
          producto: e.producto,
          cantidad: e.cantidad,
          monto: e.monto,
          estado: e.estado,
          fecha: e.fecha ?? Date.now(),
          fechaVencimiento: e.fechaVencimiento,
          fechaPedido: e.fechaPedido,
          fechaPago: e.fechaPago,
        } as Entrega;
      }
      const { data, error } = await supabase
        .from("deliveries")
        .insert({
          user_id: uid,
          customer_id: e.clienteId,
          product: e.producto,
          quantity: e.cantidad,
          total_amount: e.monto,
          status: e.estado,
          delivery_date: e.fecha ? new Date(e.fecha).toISOString() : new Date().toISOString(),
          due_date: e.fechaVencimiento ? new Date(e.fechaVencimiento).toISOString() : null,
          order_date: e.fechaPedido ? new Date(e.fechaPedido).toISOString() : null,
          payment_date: e.fechaPago ? new Date(e.fechaPago).toISOString() : null,
        })
        .select()
        .single();
      if (error) throw error;
      invalidate("entregas");
      await logActivity("crear", "entrega", { entityId: data.id, description: `Registró venta: ${e.producto} x${e.cantidad}`, metadata: { monto: e.monto } });
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

    // ---------- Productos / Inventario ----------
    async addProducto(p: { nombre: string; precio: number; stock: number; categoria?: string; stockMinimo?: number }) {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Sesión expirada");
      const { data, error } = await supabase
        .from("products")
        .insert({
          user_id: uid,
          name: p.nombre,
          price: p.precio,
          stock: p.stock,
          category: p.categoria ?? "General",
          min_stock: p.stockMinimo ?? 5,
        })
        .select()
        .single();
      if (error) throw error;
      if (p.stock > 0) {
        await supabase.from("stock_movements" as any).insert({
          user_id: uid,
          product_id: data.id,
          product_name: p.nombre,
          kind: "entrada",
          quantity: p.stock,
          stock_after: p.stock,
          reference: "Stock inicial",
        });
      }
      invalidate("productos");
      invalidate("movimientos");
      return mapProducto(data);
    },
    async updateProducto(id: string, p: { nombre: string; precio: number; categoria?: string; stockMinimo?: number }) {
      const { error } = await supabase
        .from("products")
        .update({
          name: p.nombre,
          price: p.precio,
          category: p.categoria ?? "General",
          min_stock: p.stockMinimo ?? 5,
        })
        .eq("id", id);
      if (error) throw error;
      invalidate("productos");
    },
    async deleteProducto(id: string) {
      const prod = (await supabase.from("products").select("name").eq("id", id).maybeSingle()).data as any;
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      await logActivity("eliminar", "producto", { entityId: id, description: `Eliminó producto ${prod?.name ?? id}` });
      invalidate("productos");
    },
    async ajustarStock(productoId: string, tipo: "entrada" | "salida" | "ajuste" | "venta", cantidad: number, opts?: { referencia?: string; notas?: string }) {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Sesión expirada");
      const { data: prod, error: e1 } = await supabase.from("products").select("*").eq("id", productoId).single();
      if (e1) throw e1;
      const actual = prod.stock as number;
      let nuevo = actual;
      if (tipo === "entrada") nuevo = actual + cantidad;
      else if (tipo === "salida" || tipo === "venta") nuevo = actual - cantidad;
      else if (tipo === "ajuste") nuevo = cantidad;
      if (nuevo < 0) throw new Error(`Stock insuficiente. Disponible: ${actual}`);
      const { error: e2 } = await supabase.from("products").update({ stock: nuevo }).eq("id", productoId);
      if (e2) throw e2;
      const { error: e3 } = await supabase.from("stock_movements" as any).insert({
        user_id: uid,
        product_id: productoId,
        product_name: prod.name,
        kind: tipo,
        quantity: cantidad,
        stock_after: nuevo,
        reference: opts?.referencia,
        notes: opts?.notas,
      });
      if (e3) throw e3;
      invalidate("productos");
      invalidate("movimientos");
      return nuevo;
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