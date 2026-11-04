import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const styles: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary font-semibold disabled:bg-input disabled:text-subtle disabled:opacity-100",
  secondary:
    "bg-input text-text font-medium hover:bg-selected disabled:text-subtle",
  ghost: "text-text hover:bg-selected disabled:opacity-40",
  destructive:
    "bg-destructive text-primary font-semibold hover:opacity-90 disabled:opacity-40",
};

export function Button({
  variant = "secondary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center justify-center rounded-[5px] px-4 text-[12px] focus-visible:ring-1 focus-visible:ring-text ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ToolButton({
  active,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center justify-center rounded-[5px] px-3 text-[12px] font-medium focus-visible:ring-1 focus-visible:ring-text ${
        active ? "bg-selected text-text" : "text-muted hover:text-text"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
