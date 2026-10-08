type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      height={size}
      viewBox="0 0 40 40"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#4F46E5" height="40" rx="15" width="40" />
      <path
        d="M11 10 C28 10 29 16 20 20 C11 24 12 30 29 30"
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.5"
      />
      <circle cx="11" cy="10" fill="#FFFFFF" r="2.6" />
      <circle cx="29" cy="30" fill="#FFFFFF" r="2.6" />
    </svg>
  );
}
