"use client";

import type { MouseEventHandler, ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  onclick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

export const Button = ({
  children,
  onclick,
  disabled = false,
}: ButtonProps) => {
  return (
    <button
      onClick={onclick}
      disabled={disabled}
      className="rounded-xl bg-emerald-600 px-7 py-3 text-base font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:shadow-none"
    >
      {children}
    </button>
  );
};

export default Button;
