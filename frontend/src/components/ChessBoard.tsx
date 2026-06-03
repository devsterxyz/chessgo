import type { Color, PieceSymbol, Square } from "chess.js";

export const ChessBoard = ({ board }: { board: ({
  square: Square;
  type: PieceSymbol;
  color: Color;
}) }) => {
  return (
    <div className="text-white">
      {board.map((row, i) => {
        return (
          <div key={i} className="flex">
            {row.map((square, j) => {
              return <div key={j} className={`w-12 h-12 ${square ? 'bg-green-500' : 'bg-green-300'}`}>
                {square ? square.type : ''}
              </div>
            })}
          </div>
        );
      })}
    </div>
  )
}

