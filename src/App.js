import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const BOARD_SIZE = 4;

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function getEmptyCells(board) {
  const empty = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) empty.push([r, c]);
    }
  }
  return empty;
}

function addRandomTile(board) {
  const empty = getEmptyCells(board);
  if (empty.length === 0) return board;
  const [r, c] = empty[randomInt(empty.length)];
  const newBoard = board.map(row => row.slice());
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

function rotateBoard(board) {
  // rotate board clockwise
  const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      newBoard[c][BOARD_SIZE - 1 - r] = board[r][c];
    }
  }
  return newBoard;
}

function slideAndMergeRow(row) {
  let filtered = row.filter(x => x !== 0);
  let scoreGained = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      scoreGained += filtered[i];
      filtered[i + 1] = 0;
    }
  }
  filtered = filtered.filter(x => x !== 0);
  while (filtered.length < BOARD_SIZE) filtered.push(0);
  return { newRow: filtered, scoreGained };
}

function move(board, direction) {
  // direction: 'up', 'down', 'left', 'right'
  // rotate board to use slideAndMergeRow for left move
  let rotated = board;
  let rotations = 0;
  if (direction === 'up') rotations = 3;
  else if (direction === 'right') rotations = 2;
  else if (direction === 'down') rotations = 1;

  for (let i = 0; i < rotations; i++) {
    rotated = rotateBoard(rotated);
  }

  let totalScore = 0;
  const newBoard = rotated.map(row => {
    const { newRow, scoreGained } = slideAndMergeRow(row);
    totalScore += scoreGained;
    return newRow;
  });

  for (let i = 0; i < (4 - rotations) % 4; i++) {
    const tempBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        tempBoard[c][BOARD_SIZE - 1 - r] = newBoard[r][c];
      }
    }
    newBoard.splice(0, newBoard.length, ...tempBoard);
  }

  return { newBoard, totalScore };
}

function boardsEqual(b1, b2) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (b1[r][c] !== b2[r][c]) return false;
    }
  }
  return true;
}

function App() {
  const [board, setBoard] = useState(() => {
    const emptyBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    return addRandomTile(addRandomTile(emptyBoard));
  });

  const [score, setScore] = useState(0);

  function handleMove(direction) {
    const { newBoard, totalScore } = move(board, direction);
    if (!boardsEqual(board, newBoard)) {
      const boardWithNewTile = addRandomTile(newBoard);
      setBoard(boardWithNewTile);
      setScore(score + totalScore);
    }
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'ArrowUp') handleMove('up');
      else if (e.key === 'ArrowDown') handleMove('down');
      else if (e.key === 'ArrowLeft') handleMove('left');
      else if (e.key === 'ArrowRight') handleMove('right');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [board]);

  return (
    <div className="app">
      <h1>2048</h1>
      <div className="board">
        {board.map((row, r) => (
          <div key={r} className="row">
            {row.map((cell, c) => (
              <div key={c} className={`cell value-${cell}`}>{cell !== 0 ? cell : ''}</div>
            ))}
          </div>
        ))}
      </div>
      <div className="score">Score: {score}</div>
    </div>
  );
}

export default App;
