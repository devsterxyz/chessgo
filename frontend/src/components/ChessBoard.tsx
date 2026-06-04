import type { Color, PieceSymbol, Square } from "chess.js";
import { useState } from "react";
import { MOVE } from "../screens/Game";

type BoardSquare = {
  square: Square;
  type: PieceSymbol;
  color: Color;
} | null;


const ChessBoard = ({ board, socket }: {board: BoardSquare[][]; socket: WebSocket}) => {
  const [from, setFrom] = useState<null | Square>(null)
  const [to, setTo] = useState<null | Square>(null)

  return (
    <div className="text-black">
      {board.map((row, i) => {
        return (
          <div key={i} className="flex">
            {row.map((square, j) => {
              return <div onClick={()=>{
                if(!from){
                  setFrom(square?.square ?? null);
                }
                else{
                  setTo( square?.square ?? null);
                  socket.send(JSON.stringify({
                    type: MOVE,
                    payload: {
                      from,
                      to
                    }
                  }))
                  console.log("Move sent:", {from, to})
                }
              }} key={j} className={`w-20 h-20 ${(i+j) % 2 === 0 ? 'bg-[#7A9CB1]' : 'bg-[#D9E4E8]'}`}>
                <div className="w-full justify-center flex h-full">
                  <div className="h-full justify-center flex flex-col">
                    {square ? square.type : ''}
                  </div>
                </div>
              </div>
            })}
          </div>
        );
      })}
    </div>
  )
}

export default ChessBoard;
