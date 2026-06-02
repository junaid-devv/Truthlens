type AppLogoProps = {
  size?: number;
  className?: string;
  title?: string;
};

export default function AppLogo({
  size = 24,
  className,
  title,
}: AppLogoProps) {
  const isLabeled = Boolean(title);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={isLabeled ? "img" : "presentation"}
      aria-hidden={isLabeled ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M8 34C12 23 22 16 33 16C43 16 52 21 57 30"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle
        cx="34"
        cy="34"
        r="15"
        stroke="currentColor"
        strokeWidth="4.6"
      />
      <path
        d="M27 34L32 39L41 29"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M45 45L55 55"
        stroke="currentColor"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path
        d="M12 46L21 37"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
