"use client"
type ButtonProps = {
  children: any,
  onclick?: any 
}

export const Button = ({ children , onclick}: ButtonProps) => {
  return (
    <button
    onClick={onclick}
      className='px-8 py-4 text-2xl bg-blue-500 hover:bg-blue-700 text-white font-bold rounded'>
      {children}
    </button>
  )
}

export default Button
