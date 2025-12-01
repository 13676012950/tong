import React, { useState, useEffect, useRef } from 'react';

const SNAKE_ROWS = 20;
const SNAKE_COLS = 20;
const INITIAL_SPEED = 180; // ms

const DIRS = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

function randomCell(exclude) {
  const taken = new Set(exclude.map(([r, c]) => `${r},${c}`));
  while (true) {
    const r = Math.floor(Math.random() * SNAKE_ROWS);
    const c = Math.floor(Math.random() * SNAKE_COLS);
    const key = `${r},${c}`;
    if (!taken.has(key)) return [r, c];
  }
}

export default function SnakeGame({ onBack }) {
  const [snake, setSnake] = useState(() => {
    const midR = Math.floor(SNAKE_ROWS / 2);
    const midC = Math.floor(SNAKE_COLS / 2);
    return [
      [midR, midC + 1],
      [midR, midC],
      [midR, midC - 1],
    ];
  });
  const [dir, setDir] = useState('right');
  const dirRef = useRef(dir);
  const [food, setFood] = useState(() => randomCell([]));
  const [speed] = useState(INITIAL_SPEED);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'playing' | 'over'

  dirRef.current = dir;

  function resetGame() {
    const midR = Math.floor(SNAKE_ROWS / 2);
    const midC = Math.floor(SNAKE_COLS / 2);
    const startSnake = [
      [midR, midC + 1],
      [midR, midC],
      [midR, midC - 1],
    ];
    setSnake(startSnake);
    setDir('right');
    dirRef.current = 'right';
    setFood(randomCell(startSnake));
    setScore(0);
    setStatus('idle');
  }

  useEffect(() => {
    function handleKey(e) {
      if (status === 'over') return;
      const key = e.key;
      const lower = key.toLowerCase();

      if (lower === 'w' || key === 'ArrowUp') {
        if (dirRef.current !== 'down') setDir('up');
      } else if (lower === 's' || key === 'ArrowDown') {
        if (dirRef.current !== 'up') setDir('down');
      } else if (lower === 'a' || key === 'ArrowLeft') {
        if (dirRef.current !== 'right') setDir('left');
      } else if (lower === 'd' || key === 'ArrowRight') {
        if (dirRef.current !== 'left') setDir('right');
      } else if (lower === ' ') {
        // 空格开始/暂停
        if (status === 'idle') setStatus('playing');
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [status]);

  useEffect(() => {
    if (status !== 'playing') return;

    const interval = setInterval(() => {
      setSnake(prevSnake => {
        const currentDir = dirRef.current;
        const { dr, dc } = DIRS[currentDir];
        const [headR, headC] = prevSnake[0];
        const newHead = [headR + dr, headC + dc];
        const [nr, nc] = newHead;

        // 撞墙
        if (nr < 0 || nr >= SNAKE_ROWS || nc < 0 || nc >= SNAKE_COLS) {
          setStatus('over');
          return prevSnake;
        }

        // 撞自己
        const body = prevSnake.map(([r, c]) => `${r},${c}`);
        if (body.includes(`${nr},${nc}`)) {
          setStatus('over');
          return prevSnake;
        }

        let newSnake;
        if (nr === food[0] && nc === food[1]) {
          // 吃食物：加长
          newSnake = [newHead, ...prevSnake];
          setScore(s => {
            const newScore = s + 10;
            try {
              const stored = window.localStorage.getItem('bestScoreSnake');
              const parsed = parseInt(stored, 10);
              const best = Number.isNaN(parsed) ? 0 : parsed;
              if (newScore > best) {
                window.localStorage.setItem('bestScoreSnake', String(newScore));
              }
              window.localStorage.setItem('lastScoreSnake', String(newScore));
            } catch (e) {
              // ignore storage errors
            }
            return newScore;
          });
          setFood(randomCell(newSnake));
        } else {
          // 正常移动
          newSnake = [newHead, ...prevSnake.slice(0, prevSnake.length - 1)];
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [food, speed, status]);

  function renderCell(r, c) {
    const key = `${r},${c}`;
    const snakePositions = new Map();
    snake.forEach(([sr, sc], idx) => {
      snakePositions.set(`${sr},${sc}`, idx);
    });

    const isSnake = snakePositions.has(key);
    const index = snakePositions.get(key);
    const isHead = isSnake && index === 0;
    const isFood = food[0] === r && food[1] === c;

    let className = 'snake-cell';
    if (isSnake) className += ' snake-cell--body';
    if (isHead) className += ' snake-cell--head';
    if (isFood) className += ' snake-cell--food';

    return <div key={key} className={className} />;
  }

  return (
    <div className="snake-container">
      <div className="snake-header">
        <h1>贪吃蛇</h1>
        <div className="snake-controls">
          <div className="snake-score">分数：{score}</div>
          <div className="snake-buttons">
            <button onClick={() => setStatus('playing')}>开始/继续</button>
            <button onClick={resetGame} className="secondary">重置</button>
            <button onClick={onBack} className="secondary">返回主界面</button>
          </div>
        </div>
      </div>

      <div className="snake-board">
        {Array.from({ length: SNAKE_ROWS }).map((_, r) => (
          <div key={r} className="snake-row">
            {Array.from({ length: SNAKE_COLS }).map((_, c) => renderCell(r, c))}
          </div>
        ))}
      </div>

      <div className="snake-tip">
        使用方向键或 WASD 控制方向，空格开始游戏。
      </div>

      {status === 'over' && (
        <div className="snake-overlay">
          <div className="snake-overlay-content">
            <h2>游戏结束</h2>
            <p>你撞到墙或自己的身体了。</p>
            <div className="snake-overlay-buttons">
              <button onClick={resetGame}>再试一次</button>
              <button onClick={onBack} className="secondary">返回主界面</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
