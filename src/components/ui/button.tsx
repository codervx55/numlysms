import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
};

const variants = {
  primary: "bg-[var(--amber)] text-white hover:brightness-110",
  secondary: "bg-[var(--panel-raised)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--amber)]",
  danger: "bg-transparent text-[var(--coral)] border border-[var(--coral)]/40 hover:bg-[var(--coral)]/10",
};

export function Button({ variant = "primary", loading, disabled, className = "", children, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`press-scale inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
