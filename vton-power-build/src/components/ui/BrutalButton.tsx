import React from "react";

interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "yellow" | "red" | "blue" | "white";
  fullWidth?: boolean;
}

export default function BrutalButton({ 
  children, 
  variant = "yellow", 
  fullWidth = false, 
  className = "", 
  ...props 
}: BrutalButtonProps) {
  
  // Renge göre arkaplan sınıfını belirliyoruz
  const colorClass = {
    yellow: "bg-accent-yellow",
    red: "bg-accent-red text-white",
    blue: "bg-accent-blue text-white",
    white: "bg-white",
  }[variant];

  return (
    <button
      className={`
        ${colorClass} 
        ${fullWidth ? "w-full" : ""}
        px-6 py-3 text-lg font-bold uppercase tracking-wider
        border-3 border-black shadow-brutal
        transition-all duration-200 ease-in-out
        active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}