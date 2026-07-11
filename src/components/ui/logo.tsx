type LogoProps = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
};

const SIZES = {
  sm: { box: 24, bar: 3, text: "text-sm" },
  md: { box: 32, bar: 4, text: "text-lg" },
  lg: { box: 44, bar: 5, text: "text-2xl" },
};

/**
 * Original mark — three ascending bars (signal reception) with a small dot
 * standing in for an incoming message. Deliberately not a stylized letter or
 * anything resembling another product's icon; the bars also double as a
 * loading/hover animation via .logo-mark / .logo-bar in globals.css.
 */
export function Logo({ size = "md", showWordmark = true, className = "" }: LogoProps) {
  const s = SIZES[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="logo-mark relative shrink-0 rounded-[28%] flex items-end justify-center gap-[3px] p-[22%]"
        style={{
          width: s.box,
          height: s.box,
          background: "linear-gradient(155deg, #6366f1 0%, #4338ca 100%)",
        }}
      >
        {[0.45, 0.7, 1].map((h, i) => (
          <span
            key={i}
            className="logo-bar rounded-full bg-white/95"
            style={{
              width: s.bar,
              height: `${h * 100}%`,
              transformOrigin: "bottom",
            }}
          />
        ))}
        <span
          className="absolute rounded-full bg-white"
          style={{
            width: s.bar * 1.4,
            height: s.bar * 1.4,
            top: "12%",
            right: "12%",
          }}
        />
      </div>

      {showWordmark && (
        <span className={`font-semibold tracking-tight ${s.text}`}>
          <span style={{ color: "var(--text-primary)" }}>Numly</span>
          <span style={{ color: "var(--amber)" }}>sms</span>
        </span>
      )}
    </div>
  );
}
