"use client"
type ButtonProps = {
  children: any,
  onclick?: any,
  disabled?: boolean
}

export const Button = ({ children, onclick, disabled = false }: ButtonProps) => {
  return (
    <button
      onClick={onclick}
      disabled={disabled}
      className='px-8 py-4 text-2xl bg-blue-500 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300 text-white font-bold rounded'>
      {children}
    </button>
  )
}

export default Button
