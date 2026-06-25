"use client";

import { useRef, useState, useEffect } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { ChessboardOptions, PieceDropHandlerArgs, SquareHandlerArgs, PieceRenderObject } from "react-chessboard";

// Inline SVG pieces for the promotion dialog
const PIECE_SVGS: Record<string, string> = {
  wq: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 43 43"><g><path stroke-linecap="round" stroke-linejoin="round" d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 Z" style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linejoin:round"/><path style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linejoin:round" d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 10.5,36 10.5,36 C 9,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 Z"/><path style="fill:none;stroke:#000;stroke-width:1.5;stroke-linejoin:round" d="M 11.5,30 C 15,29 30,29 33.5,30"/><path style="fill:none;stroke:#000;stroke-width:1.5;stroke-linejoin:round" d="M 12,33.5 C 15,32.5 30,32.5 33,33.5"/><circle style="fill:#000;stroke:#000;stroke-width:1.5" cx="6" cy="12" r="2"/><circle style="fill:#000;stroke:#000;stroke-width:1.5" cx="14" cy="9" r="2"/><circle style="fill:#000;stroke:#000;stroke-width:1.5" cx="22.5" cy="8" r="2"/><circle style="fill:#000;stroke:#000;stroke-width:1.5" cx="31" cy="9" r="2"/><circle style="fill:#000;stroke:#000;stroke-width:1.5" cx="39" cy="12" r="2"/></g></svg>`,
  wr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 43 43"><g><polyline points="9,39 36,39" style="stroke:#000;stroke-width:1.5;stroke-linecap:round;fill:none"/><path style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linejoin:round" d="M 12,36 L 12,32 L 33,32 L 33,36 Z"/><path style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linejoin:round" d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 Z"/><path style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linejoin:round;fill-rule:evenodd" d="M 12,35.5 L 12,32 L 33,32 L 33,35.5 Z"/><path style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linejoin:round" d="M 34,14 L 31,17 L 14,17 L 11,14 Z"/><path style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linejoin:round;fill-rule:evenodd" d="M 31,17 L 31,29.5 L 14,29.5 L 14,17 Z"/><path style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linecap:round" d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5 Z"/><path style="fill:none;stroke:#000;stroke-width:1" d="M 11,14 L 34,14"/></g></svg>`,
  wn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 43 43"><g><path style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linejoin:round" d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"/><path style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linejoin:round" d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"/><path style="fill:#000;stroke:#000;stroke-width:0.5" d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z"/><path style="fill:#000;stroke:#000;stroke-width:1.5;stroke-linecap:round" d="M 14.5 15.5 A 1.5 1.5 0 1 1 11.5,15.5 A 1.5 1.5 0 1 1 14.5 15.5 z"/></g></svg>`,
  wb: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 43 43"><g><g style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linejoin:round"><path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.06 9,36 9,36 Z"/><path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 Z"/><path d="M 25 8 A 2.5 2.5 0 1 1 20,8 A 2.5 2.5 0 1 1 25 8 Z"/></g><path style="fill:none;stroke:#000;stroke-width:1.5;stroke-linejoin:round" d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18"/></g></svg>`,
};

type PromotionPiece = "q" | "r" | "n" | "b";

interface PromotionState {
  sourceSquare: Square;
  targetSquare: Square;
  file: string;
  fileIndex: number;
}

const pieceImageStyle = { width: "100%"};

const createPiece = (piece: string) => () => (
  <img src={`/${piece}.svg`} alt={piece} style={pieceImageStyle} />
);

const customPieces: PieceRenderObject = {
  wP: createPiece("wP"),
  wN: createPiece("wN"),
  wB: createPiece("wB"),
  wR: createPiece("wR"),
  wQ: createPiece("wQ"),
  wK: createPiece("wK"),
  bP: createPiece("bP"),
  bN: createPiece("bN"),
  bB: createPiece("bB"),
  bR: createPiece("bR"),
  bQ: createPiece("bQ"),
  bK: createPiece("bK"),
};

function PromotionDialog({
  promotion,
  squareWidth,
  onSelect,
  onCancel,
}: {
  promotion: PromotionState;
  squareWidth: number;
  onSelect: (piece: PromotionPiece) => void;
  onCancel: () => void;
}) {
  const pieces: PromotionPiece[] = ["q", "r", "n", "b"];
  const dialogLeft = promotion.fileIndex * squareWidth;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        onContextMenu={(e) => {
          e.preventDefault();
          onCancel();
        }}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.18)",
          zIndex: 1000,
          borderRadius: 4,
        }}
      />
      {/* Piece picker */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: dialogLeft,
          width: squareWidth,
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          borderRadius: 6,
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.32)",
          border: "1.5px solid #7A9CB1",
        }}
      >
        {pieces.map((piece, i) => {
          const svgKey = `w${piece}`;
          return (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              onContextMenu={(e) => e.preventDefault()}
              title={{ q: "Queen", r: "Rook", n: "Knight", b: "Bishop" }[piece]}
              style={{
                width: squareWidth,
                height: squareWidth,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 6,
                border: "none",
                cursor: "pointer",
                background: i % 2 === 0 ? "#D9E4E8" : "#7A9CB1",
                transition: "filter 0.12s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.filter =
                  "brightness(1.12)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.filter = "none")
              }
            >
              <span
                style={{ width: "100%", height: "100%", display: "block" }}
                dangerouslySetInnerHTML={{ __html: PIECE_SVGS[svgKey] ?? "" }}
              />
            </button>
          );
        })}
      </div>
    </>
  );
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

interface ChessBoardProps {
  position?: string;
  playerColor?: "white" | "black" | null;
  onMove?: (from: Square, to: Square, promotion?: PromotionPiece) => void;
}

export function ChessBoard({ position, playerColor, onMove }: ChessBoardProps) {
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;

  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moveFrom, setMoveFrom] = useState<Square | "">("");
  const [optionSquares, setOptionSquares] = useState<
    Record<string, React.CSSProperties>
  >({});
  const [promotion, setPromotion] = useState<PromotionState | null>(null);
  const [squareWidth, setSquareWidth] = useState(0);

  useEffect(() => {
    if (!position || position === chessPosition) return;
    try {
      chessGame.load(position);
      setChessPosition(position);
    } catch {
      // ignore invalid external FEN
    }
  }, [position, chessGame, chessPosition]);

  // squares the user has right-clicked to highlight
  const [highlightedSquares, setHighlightedSquares] = useState<
    Record<string, React.CSSProperties>
  >({});

  // Measure square width once the board renders
  useEffect(() => {
    function measure() {
      const sq = document.querySelector<HTMLElement>(
        '[data-column="a"][data-row="1"]'
      );
      if (sq) setSquareWidth(sq.getBoundingClientRect().width);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

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

  // Check if a move to a given square is a pawn promotion
  function isPromotionMove(from: Square, to: Square): boolean {
    const piece = chessGame.get(from);
    if (!piece || piece.type !== "p") return false;
    const toRank = to[1];
    return (
      (piece.color === "w" && toRank === "8") ||
      (piece.color === "b" && toRank === "1")
    );
  }

  function triggerPromotion(from: Square, to: Square) {
    const file = to[0]!;
    const fileIndex = FILES.indexOf(file);
    setPromotion({ sourceSquare: from, targetSquare: to, file, fileIndex });
  }

  function handlePromotionSelect(piece: PromotionPiece) {
    if (!promotion) return;

    if (onMove) {
      try {
        const moveResult = chessGame.move({
          from: promotion.sourceSquare,
          to: promotion.targetSquare,
          promotion: piece,
        });
        if (moveResult) {
          setChessPosition(chessGame.fen());
        }
      } catch {
        // invalid
      }
      onMove(promotion.sourceSquare, promotion.targetSquare, piece);
      setPromotion(null);
      return;
    }

    try {
      chessGame.move({
        from: promotion.sourceSquare,
        to: promotion.targetSquare,
        promotion: piece,
      });
      setChessPosition(chessGame.fen());
    } catch {
      // invalid
    }
    setPromotion(null);
  }

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

    const from = moveFrom as Square;
    clearSelection();

    if (isPromotionMove(from, sq)) {
      triggerPromotion(from, sq);
      return;
    }

    if (onMove) {
      try {
        const moveResult = chessGame.move({ from, to: sq });
        if (moveResult) {
          setChessPosition(chessGame.fen());
        }
      } catch {
        // invalid move
      }
      onMove(from, sq);
      return;
    }

    try {
      chessGame.move({ from, to: sq });
      setChessPosition(chessGame.fen());
    } catch {
      // invalid move
    }
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
    clearSelection();
    if (!targetSquare) return false;
    const from = sourceSquare as Square;
    const to = targetSquare as Square;

    if (isPromotionMove(from, to)) {
      // Validate move exists before showing dialog
      const legalMoves = chessGame.moves({ square: from, verbose: true });
      const isLegal = legalMoves.some((m) => m.to === to);
      if (!isLegal) return false;
      triggerPromotion(from, to);
      return true; // keep piece on board; promotion dialog will finalize
    }

    if (onMove) {
      try {
        const moveResult = chessGame.move({ from, to });
        if (moveResult) {
          setChessPosition(chessGame.fen());
        }
      } catch {
        return false;
      }
      onMove(from, to);
      return true;
    }

    try {
      chessGame.move({ from, to });
      setChessPosition(chessGame.fen());
      return true;
    } catch {
      return false;
    }
  }

  // any left click anywhere on the board (including the start of a piece drag) clears highlights
  function onSquareMouseDown(_args: SquareHandlerArgs, e: React.MouseEvent) {
    if (e.button !== 0) return; // only the left mouse button
    setHighlightedSquares((prev) => (Object.keys(prev).length > 0 ? {} : prev));
  }

  // right-click toggles a highlight color on any square, empty or occupied
  function onSquareRightClick({ square }: SquareHandlerArgs) {
    setHighlightedSquares((prev) => {
      const next = { ...prev };
      if (next[square]) {
        // right-clicking an already-highlighted square clears it
        delete next[square];
      } else {
        next[square] = { backgroundColor: "rgba(188, 52, 52, 0.8)" };
      }
      return next;
    });
  }

  const chessboardOptions: ChessboardOptions = {
    id: "chess-board",
    position: chessPosition,
    boardOrientation: playerColor ?? "white",
    onSquareClick,
    onPieceDrop,
    onSquareRightClick,
    onSquareMouseDown,
    lightSquareStyle: { backgroundColor: "#D9E4E8" },
    darkSquareStyle: { backgroundColor: "#7A9CB1" },
    pieces: customPieces,
    // option-move dots take visual priority over a manual highlight on the same square
    squareStyles: { ...highlightedSquares, ...optionSquares },
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <Chessboard options={chessboardOptions} />
      {promotion && squareWidth > 0 && (
        <PromotionDialog
          promotion={promotion}
          squareWidth={squareWidth}
          onSelect={handlePromotionSelect}
          onCancel={() => setPromotion(null)}
        />
      )}
    </div>
  );
}