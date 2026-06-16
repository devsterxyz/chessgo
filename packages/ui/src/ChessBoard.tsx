"use client";

import { useRef, useState } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { ChessboardOptions, PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";

export function ChessBoard() {
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;

  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moveFrom, setMoveFrom] = useState<Square | "">("");
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  function getMoveOptions(square: Square): boolean {
    const moves = chessGame.moves({ square, verbose: true });

    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    for (const move of moves) {
      const isCapture =
        chessGame.get(move.to as Square) &&
        chessGame.get(move.to as Square)?.color !== chessGame.get(square)?.color;

      newSquares[move.to] = {
        background: isCapture
          ? "radial-gradient(circle, rgba(0,0,0,.15) 80%, transparent 80%)"
          : "radial-gradient(circle, rgba(0,0,0,.25) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    }

    newSquares[square] = { background: "rgba(255, 255, 0, 0.4)" };
    setOptionSquares(newSquares);
    return true;
  }

  function clearSelection() {
    setMoveFrom("");
    setOptionSquares({});
  }

  // click to move
  function onSquareClick({ square }: SquareHandlerArgs) {
    const sq = square as Square;
    const piece = chessGame.get(sq);

    if (!moveFrom) {
      if (!piece || piece.color !== chessGame.turn()) return;
      const hasMoves = getMoveOptions(sq);
      if (hasMoves) setMoveFrom(sq);
      return;
    }

    if (moveFrom === sq) {
      clearSelection();
      return;
    }

    const moves = chessGame.moves({ square: moveFrom, verbose: true });
    const isValidTarget = moves.some((m) => m.to === sq);

    if (!isValidTarget) {
      if (piece && piece.color === chessGame.turn()) {
        const hasMoves = getMoveOptions(sq);
        if (hasMoves) setMoveFrom(sq);
        else clearSelection();
      } else {
        clearSelection();
      }
      return;
    }

    try {
      chessGame.move({ from: moveFrom, to: sq, promotion: "q" });
      setChessPosition(chessGame.fen());
    } catch {
      // invalid move
    }

    clearSelection();
  }

  // --- DRAG AND DROP ---
  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
    clearSelection();
    if (!targetSquare) return false;

    try {
      chessGame.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      setChessPosition(chessGame.fen());
      return true;
    } catch {
      return false;
    }
  }

  const chessboardOptions: ChessboardOptions = {
    id: "chess-board",
    position: chessPosition,
    onSquareClick,
    onPieceDrop,
    lightSquareStyle: { backgroundColor: "#D9E4E8" },
    darkSquareStyle: { backgroundColor: "#7A9CB1" },
    squareStyles: optionSquares,
  };

  return <Chessboard options={chessboardOptions} />;
}