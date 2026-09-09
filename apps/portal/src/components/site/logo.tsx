/**
 * Brand logo for "Fato Nacional" — inline SVG (the optimal logo format:
 * scalable, tiny, crisp). Uses `currentColor`, so it renders dark in the
 * header and white in the footer just by setting `color` (no filters).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`logo${className ? ` ${className}` : ""}`} aria-label="Fato Nacional">
      <svg
        className="logo__svg"
        viewBox="0 0 300 48"
        role="img"
        aria-label="Fato Nacional"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Mark: stylized F */}
        <g fill="currentColor">
          <rect x="6" y="6" width="11" height="38" rx="2.5" />
          <path d="M6 6h30c4 0 5 3 3.4 5.8l-2 3.4c-.8 1.4-2.3 1.8-3.8 1.8H6V6Z" />
          <rect x="6" y="23.5" width="23" height="10" rx="2.5" />
        </g>
        {/* Wordmark */}
        <text
          x="50"
          y="35"
          fill="currentColor"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="37"
          fontWeight="500"
          letterSpacing="-1.5"
        >
          fatonacional
        </text>
      </svg>
    </span>
  );
}
