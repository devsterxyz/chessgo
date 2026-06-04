import type { Color, PieceSymbol, Square } from "chess.js";
import { useState } from "react";
import { MOVE } from "../screens/Game";


type BoardSquare = {
  square: Square;
  type: PieceSymbol;
  color: Color;
} | null;


const ChessBoard = ({ chess, board, socket, setBoard }: {
    board: BoardSquare[][] 
    socket: WebSocket
    setBoard: any
    chess: any
  }) => {
  const [from, setFrom] = useState<null | Square>(null)
  const [to, setTo] = useState<null | Square>(null)

  return (
    <div className="text-black">
      {board.map((row, i) => {
        return (
          <div key={i} className="flex">
            {row.map((square, j) => {
              const squareRepresentation = String.fromCharCode(97 + (j % 8)) + "" + (8 - i) as Square
              return <div onClick={()=>{
                if(!from){
                  setFrom(squareRepresentation);
                }
                else{
                  socket.send(JSON.stringify({
                    type: MOVE,
                    payload: {
                      move: {
                        from,
                        to: squareRepresentation
                      },
                    }
                  }))
                  setFrom(null)
                  chess.move({
                    from,
                    to: squareRepresentation
                  })
                  setBoard(chess.board())
                  console.log("Move sent:", {from, to: squareRepresentation})
                }
              }} key={j} className={`w-20 h-20 ${(i+j) % 2 === 0 ? 'bg-[#D9E4E8]' : 'bg-[#7A9CB1]'}`}>
                <div className="w-full justify-center flex h-full">
                  <div className="h-full justify-center flex flex-col">
                    {square? <img className="w-15" src={`/${square?.color === "b" ? square?.type : `${square?.type?.toUpperCase()} copy`}.svg`} /> : null}
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
