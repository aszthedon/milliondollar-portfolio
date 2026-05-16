import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export default function Button({
  children,
  variant = "primary",
}: ButtonProps) {
  const baseStyles =
    "rounded-full px-8 py-4 text-sm font-medium transition duration-300 hover:scale-105";

  const variants = {
    primary: "bg-white text-black hover:bg-zinc-200",
    secondary:
      "border border-white/20 text-white hover:bg-white hover:text-black",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]}`}>
      {children}
    </button>
  );
}