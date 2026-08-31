import Image from "next/image";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
  size?: number;
};

export function BrandMark({ className, priority = false, size = 28 }: BrandMarkProps) {
  return (
    <span aria-hidden="true" className={`vouga-mark ${className ?? ""}`}>
      <Image
        alt=""
        className="vouga-mark-image"
        height={size}
        priority={priority}
        src="/vouga-mark.png"
        width={size}
      />
    </span>
  );
}
