import type { Color, PieceSymbol, Square } from "chess.js";

type BoardSquare = {
  square: Square;
  type: PieceSymbol;
  color: Color;
} | null;

type ChessBoardProps = {
  board: BoardSquare[][];
};

const ChessBoard = ({ board }: ChessBoardProps) => {
  return (
    <div className="text-black">
      {board.map((row, i) => {
        return (
          <div key={i} className="flex">
            {row.map((square, j) => {
              return <div key={j} className={`w-20 h-20 ${(i+j) % 2 === 0 ? 'bg-[#7A9CB1]' : 'bg-[#D9E4E8]'}`}>
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
