import Link from "next/link";
import { Shield } from "lucide-react";

type BrandMarkProps = {
  href?: string;
  compact?: boolean;
};

function BrandMarkContent({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <span className={`brand-mark__badge${compact ? " compact" : ""}`}>
        <Shield size={compact ? 18 : 22} strokeWidth={2.4} />
      </span>
      <span className="brand-mark__copy">
        <span className="brand-mark__title">TruthLens</span>
        <span className="brand-mark__meta">Deepfake Detection</span>
      </span>
    </>
  );
}

export default function BrandMark({ href, compact = false }: BrandMarkProps) {
  if (href) {
    return (
      <Link href={href} className={`brand-mark${compact ? " compact" : ""}`}>
        <BrandMarkContent compact={compact} />
      </Link>
    );
  }

  return (
    <div className={`brand-mark${compact ? " compact" : ""}`}>
      <BrandMarkContent compact={compact} />
    </div>
  );
}
