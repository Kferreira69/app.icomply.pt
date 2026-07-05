export function IGuardLogo({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="iGuard — iComply Endpoint Agent"
    >
      {/* iComply shield */}
      <path
        d="M24 4L6 12v10c0 10.5 7.7 20.3 18 22.7C34.3 42.3 42 32.5 42 22V12L24 4z"
        fill="#1e40af"
      />
      <path
        d="M24 4L6 12v10c0 10.5 7.7 20.3 18 22.7C34.3 42.3 42 32.5 42 22V12L24 4z"
        fill="url(#shieldGrad)"
        opacity="0.25"
      />
      {/* Checkmark */}
      <path
        d="M15 23l7 7 11-13"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* iG badge — bottom right */}
      <circle cx="37" cy="37" r="9" fill="#0ea5e9" stroke="white" strokeWidth="2" />
      <text
        x="37"
        y="41"
        textAnchor="middle"
        fill="white"
        fontSize="7.5"
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        iG
      </text>
      <defs>
        <linearGradient id="shieldGrad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
}
