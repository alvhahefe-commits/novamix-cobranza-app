import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserRole, APP_ROLES, type AppRole, fmtDate } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ShieldCheck, ScrollText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/usuarios")({
  component: UsuariosPage,
});

type UserRoleRow = { user_id: string; role: AppRole };

function UsuariosPage() {
  const role = useUserRole();
  const qc = useQueryClient();

  const rolesQ = useQuery({
    queryKey: ["all-user-roles"],
    enabled: role.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles" as any).select("user_id, role, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as (UserRoleRow & { created_at: string })[];
    },
  });

  const logsQ = useQuery({
    queryKey: ["activity-logs"],
    enabled: role.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_logs" as any).select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  if (!role.ready) return <div className="p-6 text-sm text-muted-foreground">Cargando...</div>;

  if (!role.isAdmin) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-extrabold">Acceso restringido</h1>
        <p className="text-sm text-muted-foreground">Solo los administradores pueden gestionar usuarios.</p>
        <Link to="/dashboard" className="inline-block bg-primary text-white font-bold px-4 py-2 rounded-xl">Volver</Link>
      </div>
    );
  }

  const grouped = new Map<string, AppRole[]>();
  (rolesQ.data ?? []).forEach((r) => {
    const arr = grouped.get(r.user_id) ?? [];
    arr.push(r.role);
    grouped.set(r.user_id, arr);
  });

  const cambiarRol = async (userId: string, current: AppRole[], nuevo: AppRole) => {
    try {
      // remove old roles and assign new (single primary role per user)
      const { error: e1 } = await supabase.from("user_roles" as any).delete().eq("user_id", userId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("user_roles" as any).insert({ user_id: userId, role: nuevo });
      if (e2) throw e2;
      toast.success("Rol actualizado");
      qc.invalidateQueries({ queryKey: ["all-user-roles"] });
      qc.invalidateQueries({ queryKey: ["user-role"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al actualizar");
    }
  };

  return (
    <div className="px-5 py-5 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Administración</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Usuarios y roles</h1>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-extrabold text-lg">Roles asignados</h2>
        </div>
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([uid, roles]) => {
            const primary = [...roles].sort((a, b) => APP_ROLES.indexOf(a) - APP_ROLES.indexOf(b))[0];
            return (
              <div key={uid} className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground font-mono break-all">{uid}</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {APP_ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => primary !== r && cambiarRol(uid, roles, r)}
                      className={`py-2.5 rounded-lg text-xs font-extrabold border-2 ${primary === r ? "bg-primary text-white border-primary" : "bg-background border-border"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {(rolesQ.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Sin usuarios registrados aún.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <ScrollText className="h-5 w-5 text-primary" />
          <h2 className="font-extrabold text-lg">Actividad reciente</h2>
        </div>
        <div className="space-y-2">
          {(logsQ.data ?? []).map((l: any) => (
            <div key={l.id} className="bg-card border border-border rounded-xl p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-bold capitalize">{l.action} · {l.entity}</span>
                <span className="text-xs text-muted-foreground">{fmtDate(new Date(l.created_at).getTime())}</span>
              </div>
              {l.description && <p className="text-xs text-muted-foreground mt-1">{l.description}</p>}
              {l.user_label && <p className="text-[10px] text-muted-foreground mt-1">por {l.user_label}</p>}
            </div>
          ))}
          {(logsQ.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Sin actividad registrada.</p>
          )}
        </div>
      </section>
    </div>
  );
}