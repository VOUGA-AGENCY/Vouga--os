import Image from "next/image";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
  size?: number;
};

export function BrandMark({ className, priority = false, size = 28 }: BrandMarkProps) {
  return (
    <span aria-hidden="true" className={`theme-aware-mark ${className ?? ""}`}>
      <Image
        alt=""
        className="theme-aware-mark-dark"
        height={size}
        priority={priority}
        src="/vouga-mark-cream.png"
        width={size}
      />
      <Image
        alt=""
        className="theme-aware-mark-light"
        height={size}
        priority={priority}
        src="/vouga-mark.png"
        width={size}
      />
    </span>
  );
}
