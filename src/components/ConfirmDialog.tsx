import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  requireText,
  onConfirm,
  onClose,
  danger = true,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requireText?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  danger?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  if (!open) return null;
  const blocked = !!requireText && typed.trim().toUpperCase() !== requireText.toUpperCase();

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4 animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${danger ? "bg-primary/15 text-primary" : "bg-muted"}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-extrabold leading-tight">{title}</h3>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        {requireText && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Escribe <span className="font-extrabold text-foreground">{requireText}</span> para confirmar.
            </p>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border-2 border-border bg-background font-bold focus:border-primary outline-none"
            />
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} disabled={busy} className="flex-1 h-12 rounded-xl bg-muted font-bold">
            {cancelLabel}
          </button>
          <button
            disabled={busy || blocked}
            onClick={async () => {
              try {
                setBusy(true);
                await onConfirm();
                onClose();
              } finally {
                setBusy(false);
              }
            }}
            className={`flex-1 h-12 rounded-xl font-extrabold text-white ${danger ? "bg-primary" : "bg-brand-black"} disabled:opacity-50`}
          >
            {busy ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}