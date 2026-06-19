
type ButtonProps = {
  children: any
}

export const Button = ({ children }: ButtonProps) => {
  return (
    <button
      className='px-8 py-4 text-2xl bg-blue-500 hover:bg-blue-700 text-white font-bold rounded'>
      {children}
    </button>
  )
}

export default Button
