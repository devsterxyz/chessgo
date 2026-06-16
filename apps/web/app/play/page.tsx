import { ChessBoard } from "@repo/ui/ChessBoard";

export default function Play(){
  return(
    <div>
      <div className="w-full max-w-[500px]">
        <ChessBoard />
      </div>
    </div>
  )
}