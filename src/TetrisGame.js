import React, { useState, useEffect, useRef } from 'react';

const T_ROWS = 20;
const T_COLS = 10;
const TICK = 500; // ms

const SHAPES = {
  I: {
    color: '#4fc3f7',
    blocks: [
      [0, -1], [0, 0], [0, 1], [0, 2],
    ],
  },
  O: {
    color: '#ffeb3b',
    blocks: [
      [0, 0], [0, 1], [1, 0], [1, 1],
    ],
  },
  T: {
    color: '#ba68c8',
    blocks: [
      [0, -1], [0, 0], [0, 1], [1, 0],
    ],
  },
  L: {
    color: '#ffb74d',
    blocks: [
      [0, -1], [0, 0], [0, 1], [1, -1],
    ],
  },
  J: {
    color: '#64b5f6',
    blocks: [
      [0, -1], [0, 0], [0, 1], [1, 1],
    ],
  },
  S: {
    color: '#81c784',
    blocks: [
      [0, 0], [0, 1], [1, -1], [1, 0],
    ],
  },
  Z: {
    color: '#e57373',
    blocks: [
      [0, -1], [0, 0], [1, 0], [1, 1],
    ],
  },
};

const SHAPE_KEYS = Object.keys(SHAPES);

function randomShape() {
  const key = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
  return { type: key, ...SHAPES[key] };
}

function rotateOffsets(blocks) {
  // 90deg rotation: (r, c) -> (-c, r)
  return blocks.map(([r, c]) => [-c, r]);
}

function createEmptyBoard() {
  return Array(T_ROWS).fill(null).map(() => Array(T_COLS).fill(null));
}

function inBounds(r, c) {
  return r >= 0 && r < T_ROWS && c >= 0 && c < T_COLS;
}

function canPlace(board, shape, pos, offsets = shape.blocks) {
  const [baseR, baseC] = pos;
  for (const [dr, dc] of offsets) {
    const r = baseR + dr;
    const c = baseC + dc;
    if (!inBounds(r, c)) return false;
    if (board[r][c]) return false;
  }
  return true;
}

export default function TetrisGame({ onBack }) {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [current, setCurrent] = useState(null); // { type, color, blocks }
  const [pos, setPos] = useState([0, 4]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'playing' | 'over'
  const tickRef = useRef(null);

  function spawnNewPiece(targetBoard = board) {
    const shape = randomShape();
    const startPos = [0, 4];
    if (!canPlace(targetBoard, shape, startPos)) {
      setStatus('over');
      return;
    }
    setCurrent(shape);
    setPos(startPos);
  }

  function resetGame() {
    const empty = createEmptyBoard();
    setBoard(empty);
    setScore(0);
    setStatus('idle');
    setCurrent(null);
    setPos([0, 4]);
    spawnNewPiece(empty);
  }

  useEffect(() => {
    if (!current) {
      spawnNewPiece();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (status === 'over') return;
      if (status === 'idle' && (e.key === ' ' || e.key === 'ArrowDown')) {
        setStatus('playing');
      }
      if (status !== 'playing') return;

      if (!current) return;

      const key = e.key;
      const lower = key.toLowerCase();

      if (key === 'ArrowLeft' || lower === 'a') {
        movePiece(0, -1);
      } else if (key === 'ArrowRight' || lower === 'd') {
        movePiece(0, 1);
      } else if (key === 'ArrowDown' || lower === 's') {
        movePiece(1, 0);
      } else if (key === 'ArrowUp' || lower === 'w') {
        rotatePiece();
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  function movePiece(dr, dc) {
    if (!current) return;
    setPos(([r, c]) => {
      const newPos = [r + dr, c + dc];
      if (canPlace(board, current, newPos)) return newPos;
      if (dr === 1 && dc === 0) {
        // 向下移动失败：落地
        lockPiece();
      }
      return [r, c];
    });
  }

  function rotatePiece() {
    if (!current) return;
    const rotated = rotateOffsets(current.blocks);
    if (canPlace(board, current, pos, rotated)) {
      setCurrent(prev => ({ ...prev, blocks: rotated }));
    }
  }

  function lockPiece() {
    if (!current) return;
    setBoard(prev => {
      const newBoard = prev.map(row => row.slice());
      const [baseR, baseC] = pos;
      for (const [dr, dc] of current.blocks) {
        const r = baseR + dr;
        const c = baseC + dc;
        if (inBounds(r, c)) {
          newBoard[r][c] = current.color;
        }
      }

      // 清行
      let cleared = 0;
      for (let r = T_ROWS - 1; r >= 0; r--) {
        if (newBoard[r].every(cell => cell)) {
          newBoard.splice(r, 1);
          newBoard.unshift(Array(T_COLS).fill(null));
          cleared++;
          r++; // 重新检查这一行
        }
      }
      if (cleared > 0) {
        setScore(s => {
          const newScore = s + cleared * 100;
          try {
            const stored = window.localStorage.getItem('bestScoreTetris');
            const parsed = parseInt(stored, 10);
            const best = Number.isNaN(parsed) ? 0 : parsed;
            if (newScore > best) {
              window.localStorage.setItem('bestScoreTetris', String(newScore));
            }
            window.localStorage.setItem('lastScoreTetris', String(newScore));
          } catch (e) {
            // ignore storage errors
          }
          return newScore;
        });
      }

      // 生成新方块
      setTimeout(() => {
        spawnNewPiece(newBoard);
      }, 0);

      return newBoard;
    });
  }

  useEffect(() => {
    if (status !== 'playing') return;

    tickRef.current = setInterval(() => {
      movePiece(1, 0);
    }, TICK);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, current, pos, board]);

  function renderBoard() {
    const temp = board.map(row => row.slice());
    if (current) {
      const [baseR, baseC] = pos;
      for (const [dr, dc] of current.blocks) {
        const r = baseR + dr;
        const c = baseC + dc;
        if (inBounds(r, c)) temp[r][c] = current.color;
      }
    }

    return (
      <div className="tetris-board">
        {temp.map((row, r) => (
          <div key={r} className="tetris-row">
            {row.map((cell, c) => (
              <div
                key={c}
                className="tetris-cell"
                style={{ background: cell || 'transparent' }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="tetris-container">
      <div className="tetris-header">
        <h1>俄罗斯方块</h1>
        <div className="tetris-controls">
          <div className="tetris-score">分数：{score}</div>
          <div className="tetris-buttons">
            <button onClick={() => setStatus('playing')}>开始/继续</button>
            <button onClick={resetGame} className="secondary">重置</button>
            <button onClick={onBack} className="secondary">返回主界面</button>
          </div>
        </div>
      </div>

      {renderBoard()}

      <div className="tetris-tip">
        使用方向键或 WASD 左右移动、旋转，上/下控制方向，空格或向下键开始游戏。
      </div>

      {status === 'over' && (
        <div className="tetris-overlay">
          <div className="tetris-overlay-content">
            <h2>游戏结束</h2>
            <p>方块堆到了顶端。</p>
            <div className="tetris-overlay-buttons">
              <button onClick={resetGame}>再试一次</button>
              <button onClick={onBack} className="secondary">返回主界面</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
