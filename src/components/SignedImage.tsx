import { useEffect, useState } from "react";
import { getSignedReceiptUrl } from "@/lib/store";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  path?: string | null;
  fallback?: React.ReactNode;
};

export function SignedImage({ path, fallback = null, ...rest }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    getSignedReceiptUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  if (!path) return <>{fallback}</>;
  if (!url) return <>{fallback}</>;
  return <img src={url} {...rest} />;
}