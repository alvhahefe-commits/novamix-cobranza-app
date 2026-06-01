import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [pass, setPass] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass.length < 6) {
      toast.error("Mínimo 6 caracteres");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada");
    nav({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-brand-black text-white flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-extrabold">Nueva contraseña</h1>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Nueva contraseña"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-base focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary text-white font-bold py-4 rounded-xl disabled:opacity-50"
        >
          {saving ? "..." : "GUARDAR"}
        </button>
      </form>
    </div>
  );
}