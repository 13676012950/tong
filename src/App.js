import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import SnakeGame from './SnakeGame';
import TetrisGame from './TetrisGame';

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

function addRandomTileWithInfo(board) {
  const empty = getEmptyCells(board);
  if (empty.length === 0) return { board, spawned: null };
  const [r, c] = empty[randomInt(empty.length)];
  const newBoard = board.map(row => row.slice());
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return { board: newBoard, spawned: [r, c] };
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
  const mergedPositions = new Array(BOARD_SIZE).fill(false);
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      scoreGained += filtered[i];
      filtered[i + 1] = 0;
      mergedPositions[i] = true;
    }
  }
  filtered = filtered.filter(x => x !== 0);
  while (filtered.length < BOARD_SIZE) filtered.push(0);
  return { newRow: filtered, scoreGained, mergedPositions };
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
  let mergedFlags = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
  const newBoard = rotated.map((row, rowIndex) => {
    const { newRow, scoreGained, mergedPositions } = slideAndMergeRow(row);
    totalScore += scoreGained;
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (mergedPositions[c]) {
        mergedFlags[rowIndex][c] = true;
      }
    }
    return newRow;
  });

  for (let i = 0; i < (4 - rotations) % 4; i++) {
    const tempBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    const tempMerged = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        tempBoard[c][BOARD_SIZE - 1 - r] = newBoard[r][c];
        tempMerged[c][BOARD_SIZE - 1 - r] = mergedFlags[r][c];
      }
    }
    newBoard.splice(0, newBoard.length, ...tempBoard);
    mergedFlags = tempMerged;
  }

  return { newBoard, totalScore, mergedFlags };
}

function boardsEqual(b1, b2) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (b1[r][c] !== b2[r][c]) return false;
    }
  }
  return true;
}

function has2048(board) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 2048) return true;
    }
  }
  return false;
}

function hasAnyMove(board) {
  // 还有空格就一定还能走
  if (getEmptyCells(board).length > 0) return true;

  // 检查相邻是否有相等的格子
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = board[r][c];
      if (r + 1 < BOARD_SIZE && board[r + 1][c] === v) return true;
      if (c + 1 < BOARD_SIZE && board[r][c + 1] === v) return true;
    }
  }
  return false;
}

function App() {
  function createEmptyBoard() {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
  }

  function createStartingBoard() {
    const first = addRandomTileWithInfo(createEmptyBoard()).board;
    const second = addRandomTileWithInfo(first).board;
    return second;
  }

  const [activeGame, setActiveGame] = useState('menu'); // 'menu' | '2048' | 'snake' | 'tetris'

  const [board, setBoard] = useState(() => createStartingBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try {
      const stored = window.localStorage.getItem('bestScore2048');
      const parsed = parseInt(stored, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    } catch (e) {
      return 0;
    }
  });
  const [started, setStarted] = useState(false);
  const [mergedMap, setMergedMap] = useState(() =>
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false))
  );
  const [newTileMap, setNewTileMap] = useState(() =>
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false))
  );
  const [lastDirection, setLastDirection] = useState(null);
  const [gameStatus, setGameStatus] = useState('idle'); // 'idle' | 'playing' | 'won' | 'lost'
  const animationTimeoutRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  function resetGame() {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    setBoard(createStartingBoard());
    setScore(0);
    setMergedMap(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)));
    setNewTileMap(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)));
    setLastDirection(null);
    setGameStatus('playing');
    setStarted(true);
    setActiveGame('2048');
  }

  function returnToStartScreen() {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    setBoard(createStartingBoard());
    setScore(0);
    setMergedMap(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)));
    setNewTileMap(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)));
    setLastDirection(null);
    setGameStatus('idle');
    setStarted(false);
    setActiveGame('menu');
  }

  function handleMove(direction) {
    if (activeGame !== '2048') return;
    if (gameStatus === 'won' || gameStatus === 'lost') {
      // 结束状态下不再响应操作
      return;
    }
    if (animationTimeoutRef.current) {
      // 简单节流：动画期间忽略新的按键
      return;
    }

    if (!started) {
      setStarted(true);
      if (gameStatus === 'idle') {
        setGameStatus('playing');
      }
    }

    setLastDirection(direction);

    const { newBoard, totalScore, mergedFlags } = move(board, direction);
    if (!boardsEqual(board, newBoard)) {
      const { board: boardWithNewTile, spawned } = addRandomTileWithInfo(newBoard);
      const newScore = score + totalScore;
      setBoard(boardWithNewTile);
      setScore(newScore);
      setMergedMap(mergedFlags);

      if (spawned) {
        const [sr, sc] = spawned;
        const nextNewTileMap = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
        nextNewTileMap[sr][sc] = true;
        setNewTileMap(nextNewTileMap);
      } else {
        setNewTileMap(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)));
      }

      if (has2048(boardWithNewTile)) {
        setGameStatus('won');
      } else if (!hasAnyMove(boardWithNewTile)) {
        setGameStatus('lost');
      }

      if (newScore > bestScore) {
        setBestScore(newScore);
        try {
          window.localStorage.setItem('bestScore2048', String(newScore));
        } catch (e) {
          // ignore storage errors
        }
      }
      try {
        window.localStorage.setItem('lastScore2048', String(newScore));
      } catch (e) {
        // ignore storage errors
      }

      animationTimeoutRef.current = setTimeout(() => {
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
          animationTimeoutRef.current = null;
        }
      }, 220);
    } else {
      // 没有移动，清空上一次的合并标记
      setMergedMap(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)));
      setNewTileMap(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)));
    }
  }

  function applyCheatNearWin() {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    const cheatBoard = createEmptyBoard();
    // 构造一个下一步就能合成 2048 的局面
    cheatBoard[0][0] = 1024;
    cheatBoard[0][1] = 1024;
    cheatBoard[0][2] = 128;
    cheatBoard[0][3] = 64;
    cheatBoard[1][0] = 64;
    cheatBoard[1][1] = 32;
    cheatBoard[1][2] = 32;
    cheatBoard[1][3] = 16;
    cheatBoard[2][0] = 16;
    cheatBoard[2][1] = 8;
    cheatBoard[2][2] = 8;
    cheatBoard[2][3] = 4;
    cheatBoard[3][0] = 4;
    cheatBoard[3][1] = 2;
    cheatBoard[3][2] = 2;
    cheatBoard[3][3] = 0;

    setBoard(cheatBoard);
    setScore(5000);
    setMergedMap(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)));
    setNewTileMap(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)));
    setLastDirection(null);
    setGameStatus('playing');
    setStarted(true);
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.repeat) return; // 按住键不连续触发
      const key = e.key;
      const lower = key.toLowerCase();

      if (activeGame === '2048') {
        if (key === 'ArrowUp' || lower === 'w') handleMove('up');
        else if (key === 'ArrowDown' || lower === 's') handleMove('down');
        else if (key === 'ArrowLeft' || lower === 'a') handleMove('left');
        else if (key === 'ArrowRight' || lower === 'd') handleMove('right');
        else if (lower === 'i') applyCheatNearWin();
      }
      // 预留：snake / tetris 的键盘控制
    }
    function onTouchStart(e) {
      if (activeGame !== '2048') return;
      if (!e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    }

    function onTouchEnd(e) {
      if (activeGame !== '2048') return;
      const touch = e.changedTouches && e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const threshold = 30; // 最小滑动距离
      if (absX < threshold && absY < threshold) return;

      if (absX > absY) {
        // 水平滑动
        if (dx > 0) handleMove('right');
        else handleMove('left');
      } else {
        // 垂直滑动
        if (dy > 0) handleMove('down');
        else handleMove('up');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
    // 这里我们显式控制依赖项，避免 react-hooks/exhaustive-deps 误报
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, score, bestScore, started, gameStatus, activeGame]);

  function render2048View() {
    return (
      <>
        <div className="header">
          <div className="title-row">
            <h1>2048</h1>
            <div className="scores">
              <div className="score-box">
                <div className="label">SCORE</div>
                <div className="value">{score}</div>
              </div>
              <div className="score-box">
                <div className="label">BEST</div>
                <div className="value">{bestScore}</div>
              </div>
            </div>
          </div>
          <div className="controls">
            <>
              <button onClick={resetGame}>再玩一局</button>
              <button className="secondary" onClick={returnToStartScreen}>回到主界面</button>
            </>
          </div>
        </div>

        {gameStatus === 'won' && (
          <div className="overlay overlay-win">
            <div className="overlay-content">
              <h2>胜利！🎉</h2>
              <p>你合成了 2048！</p>
              <div className="overlay-buttons">
                <button onClick={resetGame}>再玩一局</button>
                <button className="secondary" onClick={returnToStartScreen}>回到主界面</button>
              </div>
            </div>
          </div>
        )}
        {gameStatus === 'lost' && (
          <div className="overlay overlay-lose">
            <div className="overlay-content">
              <h2>游戏结束</h2>
              <p>已经没有可以移动的方块了。</p>
              <div className="overlay-buttons">
                <button onClick={resetGame}>再试一次</button>
                <button className="secondary" onClick={returnToStartScreen}>回到主界面</button>
              </div>
            </div>
          </div>
        )}
        <div className="board">
          {board.map((row, r) => (
            <div key={r} className="row">
              {row.map((cell, c) => (
                <div
                  key={c}
                  className={`cell value-${cell} ${
                    // 所有参与本次移动的非 0 格子：滑动 + 轻微缩放
                    cell !== 0 && animationTimeoutRef.current
                      ? 'cell-animating'
                      : ''
                  } ${
                    cell !== 0 && animationTimeoutRef.current && lastDirection
                      ? `cell-slide-${lastDirection}`
                      : ''
                  } ${
                    // 合成产生的新格子：额外做合成动画（在当前偏移位置缩放 + 提亮）
                    mergedMap[r][c]
                      ? 'cell-merged'
                      : ''
                  } ${
                    // 新刷出来的方块：额外线条提示
                    newTileMap[r][c]
                      ? 'cell-new'
                      : ''
                  }`.trim()}
                >
                  {cell !== 0 ? cell : ''}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="touch-controls">
          <div className="touch-row">
            <button onClick={() => handleMove('up')}>↑</button>
          </div>
          <div className="touch-row">
            <button onClick={() => handleMove('left')}>←</button>
            <button onClick={() => handleMove('down')}>↓</button>
            <button onClick={() => handleMove('right')}>→</button>
          </div>
        </div>
      </>
    );
  }

  function renderMenuView() {
    let best2048 = 0;
    let bestSnake = 0;
    let bestTetris = 0;
    let last2048 = 0;
    let lastSnake = 0;
    let lastTetris = 0;
    try {
      const b2048 = parseInt(window.localStorage.getItem('bestScore2048'), 10);
      const bSnake = parseInt(window.localStorage.getItem('bestScoreSnake'), 10);
      const bTetris = parseInt(window.localStorage.getItem('bestScoreTetris'), 10);
      const l2048 = parseInt(window.localStorage.getItem('lastScore2048'), 10);
      const lSnake = parseInt(window.localStorage.getItem('lastScoreSnake'), 10);
      const lTetris = parseInt(window.localStorage.getItem('lastScoreTetris'), 10);
      best2048 = Number.isNaN(b2048) ? 0 : b2048;
      bestSnake = Number.isNaN(bSnake) ? 0 : bSnake;
      bestTetris = Number.isNaN(bTetris) ? 0 : bTetris;
      last2048 = Number.isNaN(l2048) ? 0 : l2048;
      lastSnake = Number.isNaN(lSnake) ? 0 : lSnake;
      lastTetris = Number.isNaN(lTetris) ? 0 : lTetris;
    } catch (e) {
      // ignore storage errors
    }

    return (
      <div className="menu">
        <h1 className="menu-title">小游戏合集</h1>
        <p className="menu-subtitle">请选择一个游戏开始</p>
        <div className="menu-buttons">
          <button onClick={() => setActiveGame('2048')}>2048</button>
          <button onClick={() => setActiveGame('snake')}>贪吃蛇</button>
          <button onClick={() => setActiveGame('tetris')}>俄罗斯方块</button>
        </div>
        <div className="menu-note">
          <div className="note-label">游戏备忘录</div>
          <textarea
            className="note-textarea"
            placeholder="在这里写下你的操作说明、测试记录或想法..."
          />
        </div>

        <div className="menu-scoreboard">
          <div className="scoreboard-title">积分榜</div>
          <div className="scoreboard-header">
            <span className="scoreboard-game">游戏</span>
            <span className="scoreboard-col">本次分数</span>
            <span className="scoreboard-col">历史最高</span>
          </div>
          <div className="scoreboard-row">
            <span className="scoreboard-game">2048</span>
            <span className="scoreboard-value">{last2048}</span>
            <span className="scoreboard-value">{best2048}</span>
          </div>
          <div className="scoreboard-row">
            <span className="scoreboard-game">贪吃蛇</span>
            <span className="scoreboard-value">{lastSnake}</span>
            <span className="scoreboard-value">{bestSnake}</span>
          </div>
          <div className="scoreboard-row">
            <span className="scoreboard-game">俄罗斯方块</span>
            <span className="scoreboard-value">{lastTetris}</span>
            <span className="scoreboard-value">{bestTetris}</span>
          </div>
        </div>
      </div>
    );
  }

  function renderSnakePlaceholder() {
    return <SnakeGame onBack={() => setActiveGame('menu')} />;
  }

  function renderTetrisPlaceholder() {
    return <TetrisGame onBack={() => setActiveGame('menu')} />;
  }

  return (
    <div className="app">
      {activeGame === 'menu' && renderMenuView()}
      {activeGame === '2048' && render2048View()}
      {activeGame === 'snake' && renderSnakePlaceholder()}
      {activeGame === 'tetris' && renderTetrisPlaceholder()}
    </div>
  );
}

export default App;
