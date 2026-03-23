import { useState, useEffect, useCallback, useRef } from 'react';
import './styles.css';

// Types
interface Position { x: number; y: number; }
interface Particle { id: number; x: number; y: number; vx: number; vy: number; life: number; color: string; }
interface InventoryItem { type: string; count: number; }
interface Block { type: 'dirt' | 'stone' | 'coal' | 'gold' | 'wood' | 'air'; }

// Constants
const GRID_WIDTH = 24;
const GRID_HEIGHT = 16;
const CELL_SIZE = 32;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const MOVE_SPEED = 4;

// Block colors
const BLOCK_COLORS: Record<string, { bg: string; border: string; pattern?: string }> = {
  dirt: { bg: '#5D4037', border: '#3E2723', pattern: '.' },
  stone: { bg: '#616161', border: '#424242', pattern: '#' },
  coal: { bg: '#37474F', border: '#263238', pattern: '*' },
  gold: { bg: '#FFB300', border: '#FF8F00', pattern: '$' },
  wood: { bg: '#6D4C41', border: '#4E342E', pattern: '|' },
  air: { bg: 'transparent', border: 'transparent' },
};

// Generate terrain
const generateTerrain = (): Block[][] => {
  const grid: Block[][] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const row: Block[] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (y < 4) {
        row.push({ type: 'air' });
      } else if (y === 4) {
        row.push({ type: Math.random() > 0.7 ? 'wood' : 'dirt' });
      } else if (y < 8) {
        row.push({ type: Math.random() > 0.1 ? 'dirt' : 'coal' });
      } else if (y < 12) {
        row.push({ type: Math.random() > 0.85 ? 'coal' : 'stone' });
      } else {
        const rand = Math.random();
        if (rand > 0.95) row.push({ type: 'gold' });
        else if (rand > 0.8) row.push({ type: 'coal' });
        else row.push({ type: 'stone' });
      }
    }
    grid.push(row);
  }
  return grid;
};

// Clonk component
const Clonk = ({ x, y, facing, isJumping, isMining }: { x: number; y: number; facing: 1 | -1; isJumping: boolean; isMining: boolean }) => (
  <div
    className="absolute transition-transform duration-75"
    style={{
      left: x,
      top: y,
      width: CELL_SIZE - 4,
      height: CELL_SIZE - 4,
      transform: `scaleX(${facing})`,
    }}
  >
    {/* Body */}
    <div className={`absolute inset-0 bg-amber-600 rounded-sm border-2 border-amber-800 ${isMining ? 'animate-shake' : ''}`}>
      {/* Face */}
      <div className="absolute top-1 left-1 right-1 h-3 bg-amber-200 rounded-sm">
        {/* Eyes */}
        <div className="absolute top-0.5 left-1 w-1.5 h-1.5 bg-zinc-900 rounded-full" />
        <div className="absolute top-0.5 right-1 w-1.5 h-1.5 bg-zinc-900 rounded-full" />
      </div>
      {/* Hard hat */}
      <div className="absolute -top-2 left-0 right-0 h-3 bg-yellow-400 rounded-t-sm border border-yellow-600" />
      {/* Pickaxe when mining */}
      {isMining && (
        <div className="absolute -right-3 top-2 w-4 h-1 bg-stone-500 rotate-45 origin-left animate-swing" />
      )}
    </div>
    {/* Legs */}
    <div className={`absolute bottom-0 left-1 w-2 h-2 bg-amber-700 ${isJumping ? '-rotate-12' : ''}`} />
    <div className={`absolute bottom-0 right-1 w-2 h-2 bg-amber-700 ${isJumping ? 'rotate-12' : ''}`} />
  </div>
);

// Block component
const BlockCell = ({ block, x, y, onMine }: { block: Block; x: number; y: number; onMine: (x: number, y: number) => void }) => {
  if (block.type === 'air') return null;
  const colors = BLOCK_COLORS[block.type];

  return (
    <div
      className="absolute cursor-crosshair hover:brightness-125 transition-all active:scale-95 select-none"
      style={{
        left: x * CELL_SIZE,
        top: y * CELL_SIZE,
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: colors.bg,
        borderRight: `3px solid ${colors.border}`,
        borderBottom: `3px solid ${colors.border}`,
        borderLeft: `1px solid rgba(255,255,255,0.1)`,
        borderTop: `1px solid rgba(255,255,255,0.1)`,
      }}
      onClick={() => onMine(x, y)}
    >
      <span className="absolute inset-0 flex items-center justify-center text-xs opacity-30 font-mono">
        {colors.pattern}
      </span>
    </div>
  );
};

// Particle component
const ParticleEffect = ({ particles }: { particles: Particle[] }) => (
  <>
    {particles.map(p => (
      <div
        key={p.id}
        className="absolute w-2 h-2 rounded-sm pointer-events-none"
        style={{
          left: p.x,
          top: p.y,
          backgroundColor: p.color,
          opacity: p.life / 30,
          transform: `scale(${p.life / 30})`,
        }}
      />
    ))}
  </>
);

// Inventory component
const Inventory = ({ items }: { items: InventoryItem[] }) => (
  <div className="flex gap-2 p-3 bg-stone-900/90 rounded-lg border-2 border-stone-700 backdrop-blur-sm">
    {items.map((item, i) => (
      <div key={i} className="relative w-10 h-10 md:w-12 md:h-12 rounded border-2 border-stone-600 flex items-center justify-center"
        style={{ backgroundColor: BLOCK_COLORS[item.type]?.bg || '#333' }}>
        <span className="absolute -bottom-1 -right-1 bg-stone-800 text-xs px-1 rounded text-amber-400 font-mono">
          {item.count}
        </span>
      </div>
    ))}
    {items.length === 0 && (
      <span className="text-stone-500 text-sm font-mono">Empty - click blocks to mine!</span>
    )}
  </div>
);

// Controls hint
const Controls = () => (
  <div className="text-stone-400 text-xs md:text-sm font-mono space-y-1 p-3 bg-stone-900/80 rounded-lg border border-stone-700">
    <p><span className="text-amber-400">WASD</span> or <span className="text-amber-400">Arrows</span> — Move</p>
    <p><span className="text-amber-400">Click blocks</span> — Mine</p>
    <p><span className="text-amber-400">Space</span> — Jump</p>
  </div>
);

// Mobile Controls
const MobileControls = ({ onMove, onJump }: { onMove: (dir: 'left' | 'right' | null) => void; onJump: () => void }) => (
  <div className="md:hidden fixed bottom-20 left-0 right-0 flex justify-between px-4 pointer-events-none">
    <div className="flex gap-2 pointer-events-auto">
      <button
        className="w-14 h-14 bg-stone-800/90 border-2 border-stone-600 rounded-lg active:bg-stone-700 flex items-center justify-center text-2xl text-amber-400"
        onTouchStart={() => onMove('left')}
        onTouchEnd={() => onMove(null)}
      >
        ←
      </button>
      <button
        className="w-14 h-14 bg-stone-800/90 border-2 border-stone-600 rounded-lg active:bg-stone-700 flex items-center justify-center text-2xl text-amber-400"
        onTouchStart={() => onMove('right')}
        onTouchEnd={() => onMove(null)}
      >
        →
      </button>
    </div>
    <button
      className="w-14 h-14 bg-amber-600/90 border-2 border-amber-800 rounded-lg active:bg-amber-500 flex items-center justify-center text-2xl text-white pointer-events-auto"
      onTouchStart={onJump}
    >
      ↑
    </button>
  </div>
);

export default function App() {
  const [terrain, setTerrain] = useState<Block[][]>(() => generateTerrain());
  const [pos, setPos] = useState<Position>({ x: GRID_WIDTH / 2 * CELL_SIZE, y: 2 * CELL_SIZE });
  const [velocity, setVelocity] = useState<Position>({ x: 0, y: 0 });
  const [facing, setFacing] = useState<1 | -1>(1);
  const [isGrounded, setIsGrounded] = useState(false);
  const [isMining, setIsMining] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [score, setScore] = useState(0);
  const keysRef = useRef<Set<string>>(new Set());
  const mobileDir = useRef<'left' | 'right' | null>(null);
  const particleId = useRef(0);

  // Check collision
  const checkCollision = useCallback((x: number, y: number): boolean => {
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);
    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) return true;
    return terrain[gridY]?.[gridX]?.type !== 'air';
  }, [terrain]);

  // Mine block
  const mineBlock = useCallback((gridX: number, gridY: number) => {
    const block = terrain[gridY]?.[gridX];
    if (!block || block.type === 'air') return;

    setIsMining(true);
    setTimeout(() => setIsMining(false), 200);

    // Add particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      newParticles.push({
        id: particleId.current++,
        x: gridX * CELL_SIZE + CELL_SIZE / 2,
        y: gridY * CELL_SIZE + CELL_SIZE / 2,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        life: 30,
        color: BLOCK_COLORS[block.type].bg,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);

    // Update inventory
    setInventory(prev => {
      const existing = prev.find(i => i.type === block.type);
      if (existing) {
        return prev.map(i => i.type === block.type ? { ...i, count: i.count + 1 } : i);
      }
      return [...prev, { type: block.type, count: 1 }];
    });

    // Score
    const points: Record<string, number> = { dirt: 1, stone: 2, coal: 5, gold: 20, wood: 2 };
    setScore(prev => prev + (points[block.type] || 1));

    // Remove block
    setTerrain(prev => {
      const newTerrain = prev.map(row => [...row]);
      newTerrain[gridY][gridX] = { type: 'air' };
      return newTerrain;
    });
  }, [terrain]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === ' ') e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    const gameLoop = setInterval(() => {
      const keys = keysRef.current;
      let vx = 0;

      if (keys.has('a') || keys.has('arrowleft') || mobileDir.current === 'left') {
        vx = -MOVE_SPEED;
        setFacing(-1);
      }
      if (keys.has('d') || keys.has('arrowright') || mobileDir.current === 'right') {
        vx = MOVE_SPEED;
        setFacing(1);
      }

      setVelocity(prev => {
        let newVy = prev.y + GRAVITY;

        if ((keys.has(' ') || keys.has('w') || keys.has('arrowup')) && isGrounded) {
          newVy = JUMP_FORCE;
        }

        return { x: vx, y: newVy };
      });

      setPos(prev => {
        let newX = prev.x + vx;
        let newY = prev.y + velocity.y;

        // Horizontal collision
        const playerLeft = newX + 2;
        const playerRight = newX + CELL_SIZE - 6;
        const playerTop = prev.y + 2;
        const playerBottom = prev.y + CELL_SIZE - 4;

        if (checkCollision(playerLeft, playerTop) || checkCollision(playerLeft, playerBottom)) {
          newX = Math.ceil(playerLeft / CELL_SIZE) * CELL_SIZE - 2;
        }
        if (checkCollision(playerRight, playerTop) || checkCollision(playerRight, playerBottom)) {
          newX = Math.floor(playerRight / CELL_SIZE) * CELL_SIZE - CELL_SIZE + 6;
        }

        // Vertical collision
        const checkLeft = newX + 4;
        const checkRight = newX + CELL_SIZE - 8;

        if (velocity.y > 0) {
          const checkY = newY + CELL_SIZE - 4;
          if (checkCollision(checkLeft, checkY) || checkCollision(checkRight, checkY)) {
            newY = Math.floor(checkY / CELL_SIZE) * CELL_SIZE - CELL_SIZE + 4;
            setVelocity(v => ({ ...v, y: 0 }));
            setIsGrounded(true);
          } else {
            setIsGrounded(false);
          }
        } else if (velocity.y < 0) {
          const checkY = newY + 2;
          if (checkCollision(checkLeft, checkY) || checkCollision(checkRight, checkY)) {
            newY = Math.ceil(checkY / CELL_SIZE) * CELL_SIZE - 2;
            setVelocity(v => ({ ...v, y: 0 }));
          }
        }

        // Bounds
        newX = Math.max(0, Math.min(newX, (GRID_WIDTH - 1) * CELL_SIZE));
        newY = Math.max(0, Math.min(newY, (GRID_HEIGHT - 1) * CELL_SIZE));

        return { x: newX, y: newY };
      });

      // Update particles
      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.3,
          life: p.life - 1,
        }))
        .filter(p => p.life > 0)
      );
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [velocity, isGrounded, checkCollision]);

  const handleJump = useCallback(() => {
    if (isGrounded) {
      setVelocity(v => ({ ...v, y: JUMP_FORCE }));
      setIsGrounded(false);
    }
  }, [isGrounded]);

  const handleMobileMove = useCallback((dir: 'left' | 'right' | null) => {
    mobileDir.current = dir;
    if (dir === 'left') setFacing(-1);
    else if (dir === 'right') setFacing(1);
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Sky gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-sky-900 via-amber-900/20 to-stone-950 pointer-events-none" />

      {/* Scan lines overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-5 bg-scanlines" />

      {/* Header */}
      <header className="relative z-10 p-3 md:p-4 flex flex-wrap justify-between items-center gap-2 border-b-2 border-stone-800 bg-stone-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-600 rounded border-2 border-amber-800 flex items-center justify-center">
            <span className="text-xs md:text-sm">⛏</span>
          </div>
          <h1 className="font-display text-xl md:text-3xl text-amber-400 tracking-wider">CLONK CLONE</h1>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="text-amber-400 font-mono text-sm md:text-lg">
            SCORE: <span className="text-white">{score.toString().padStart(6, '0')}</span>
          </div>
          <button
            onClick={() => {
              setTerrain(generateTerrain());
              setPos({ x: GRID_WIDTH / 2 * CELL_SIZE, y: 2 * CELL_SIZE });
              setVelocity({ x: 0, y: 0 });
              setInventory([]);
              setScore(0);
            }}
            className="px-3 py-1 md:px-4 md:py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded border-2 border-stone-600 font-mono text-xs md:text-sm transition-colors"
          >
            NEW GAME
          </button>
        </div>
      </header>

      {/* Main game area */}
      <main className="relative flex-1 flex flex-col lg:flex-row gap-4 p-3 md:p-6 overflow-hidden">
        {/* Game canvas */}
        <div className="flex-1 flex items-start justify-center overflow-auto">
          <div
            className="relative bg-stone-900 rounded-lg border-4 border-stone-700 shadow-2xl overflow-hidden"
            style={{
              width: GRID_WIDTH * CELL_SIZE,
              height: GRID_HEIGHT * CELL_SIZE,
              minWidth: GRID_WIDTH * CELL_SIZE,
            }}
          >
            {/* Terrain */}
            {terrain.map((row, y) =>
              row.map((block, x) => (
                <BlockCell key={`${x}-${y}`} block={block} x={x} y={y} onMine={mineBlock} />
              ))
            )}

            {/* Particles */}
            <ParticleEffect particles={particles} />

            {/* Player */}
            <Clonk x={pos.x} y={pos.y} facing={facing} isJumping={!isGrounded} isMining={isMining} />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:w-64 space-y-4">
          <div className="hidden md:block">
            <Controls />
          </div>
          <div>
            <h3 className="text-stone-400 font-mono text-sm mb-2">INVENTORY</h3>
            <Inventory items={inventory} />
          </div>
        </aside>
      </main>

      {/* Mobile controls */}
      <MobileControls onMove={handleMobileMove} onJump={handleJump} />

      {/* Footer */}
      <footer className="relative z-10 p-3 text-center border-t border-stone-800/50">
        <p className="text-stone-600 text-xs font-mono">
          Requested by @web-user · Built by @clonkbot
        </p>
      </footer>
    </div>
  );
}
