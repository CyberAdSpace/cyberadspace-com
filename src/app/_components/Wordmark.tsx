export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 40"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="CyberAdSpace"
    >
      <defs>
        <linearGradient id="wm-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffb84d" />
          <stop offset="1" stopColor="#55d6ff" />
        </linearGradient>
      </defs>
      <path
        d="M4 8 L14 8 L20 4 L30 12 L40 6 L54 10"
        stroke="url(#wm-g)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="square"
      />
      <path
        d="M4 20 L18 20 L26 16 L36 22 L48 18 L60 22"
        stroke="url(#wm-g)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="square"
      />
      <path
        d="M4 32 L12 32 L22 28 L34 34 L44 30 L58 32"
        stroke="url(#wm-g)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="square"
      />
      <text
        x="72"
        y="18"
        fill="#f5f6fa"
        fontFamily="Space Grotesk, sans-serif"
        fontSize="14"
        fontWeight="700"
        letterSpacing="0.02em"
      >
        CYBERADSPACE
      </text>
      <text
        x="72"
        y="32"
        fill="#9aa3b8"
        fontFamily="JetBrains Mono, monospace"
        fontSize="8"
        letterSpacing="0.42em"
      >
        M A R K E T P L A C E
      </text>
    </svg>
  );
}
