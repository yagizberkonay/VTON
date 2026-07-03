import React from "react";

interface BrutalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function BrutalInput({ label, className = "", ...props }: BrutalInputProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && <label className="font-bold text-lg uppercase">{label}</label>}
      <input
        className={`
          w-full px-4 py-3 text-lg bg-white
          border-3 border-black shadow-brutal
          focus:outline-none focus:bg-accent-yellow/10
          transition-colors duration-200
          placeholder:text-gray-500
          ${className}
        `}
        {...props}
      />
    </div>
  );
}