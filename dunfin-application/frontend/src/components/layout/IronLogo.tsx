interface IronLogoProps {
  className?: string;
  size?: number;
}

/** IRON brand mark */
export function IronLogo({ className = "", size = 40 }: IronLogoProps) {
  return (
    <img
      src="/iron-logo.png"
      alt="IRON"
      width={size}
      height={size}
      className={`rounded-xl object-contain ${className}`}
      draggable={false}
    />
  );
}
