import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { getSignedReceiptUrl } from "@/lib/store";

type Props = {
  value: string | null;
  onChange: (preview: string | null, file: File | null) => void;
  label?: string;
};

export function PhotoPicker({ value, onChange, label = "Foto del recibo" }: Props) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string, f);
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</label>
      {value ? (
        <div className="mt-2 relative">
          <img src={value} alt={label} className="w-full max-h-72 object-cover rounded-xl border border-border" />
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className="absolute top-2 right-2 h-9 w-9 rounded-full bg-black/70 text-white flex items-center justify-center"
            aria-label="Quitar foto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => camRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-1.5 text-muted-foreground active:bg-muted"
          >
            <Camera className="h-6 w-6" />
            <span className="text-xs font-bold uppercase tracking-wide">Cámara</span>
          </button>
          <button
            type="button"
            onClick={() => galRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-1.5 text-muted-foreground active:bg-muted"
          >
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs font-bold uppercase tracking-wide">Galería</span>
          </button>
        </div>
      )}
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={handle} />
    </div>
  );
}

export function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [resolved, setResolved] = useState<string | null>(
    src.startsWith("http") || src.startsWith("data:") ? src : null,
  );
  useEffect(() => {
    if (src.startsWith("data:")) {
      setResolved(src);
      return;
    }
    let cancelled = false;
    getSignedReceiptUrl(src).then((u) => {
      if (!cancelled) setResolved(u);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-3 animate-in fade-in"
      onClick={onClose}
    >
      {resolved && <img src={resolved} alt="Vista" className="max-w-full max-h-full rounded-xl" />}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-11 w-11 rounded-full bg-white/15 text-white flex items-center justify-center backdrop-blur"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}