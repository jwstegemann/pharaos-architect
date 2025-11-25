import React, { useRef, useEffect } from 'react';
import { GameState, TerrainType, BuildingType, ResourceType, UnitType } from '../types';
import { TILE_SIZE, TERRAIN_COLORS, UNIT_CONFIG } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  onConnectionClick: (id: string) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, onConnectionClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { level, units, gameTime } = gameState;

    // Clear background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Map Tiles
    level.tiles.forEach((row, y) => {
      row.forEach((tile, x) => {
        ctx.fillStyle = TERRAIN_COLORS[tile];
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Simple texture details
        if (tile === TerrainType.MOUNTAIN) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.moveTo(x * TILE_SIZE + 4, y * TILE_SIZE + TILE_SIZE);
            ctx.lineTo(x * TILE_SIZE + 16, y * TILE_SIZE + 4);
            ctx.lineTo(x * TILE_SIZE + 28, y * TILE_SIZE + TILE_SIZE);
            ctx.fill();
        }
        if (tile === TerrainType.WATER) {
            // Animated water glint
            const phase = (gameTime * 0.001 + x * 0.5 + y * 0.3) % (Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.sin(phase) * 0.1})`;
            ctx.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 8, 12, 2);
            ctx.fillRect(x * TILE_SIZE + 16, y * TILE_SIZE + 20, 8, 2);
        }
      });
    });

    // 2. Draw Connections (Paths)
    level.connections.forEach(conn => {
        const isSelected = gameState.selectedConnectionId === conn.id;
        const isWaterRoute = conn.allowedUnitTypes.includes(UnitType.BARGE);
        
        ctx.lineWidth = isSelected ? 4 : 3;
        
        if (isWaterRoute) {
            // Dashed line for water routes
            ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(100, 200, 255, 0.6)';
            ctx.setLineDash([5, 5]);
        } else {
            // Solid line for roads
            ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(90, 70, 50, 0.5)';
            ctx.setLineDash([]);
        }

        ctx.beginPath();
        if (conn.path.length > 0) {
            const startX = conn.path[0].x * TILE_SIZE + TILE_SIZE / 2;
            const startY = conn.path[0].y * TILE_SIZE + TILE_SIZE / 2;
            ctx.moveTo(startX, startY);
            for (let i = 1; i < conn.path.length; i++) {
                ctx.lineTo(conn.path[i].x * TILE_SIZE + TILE_SIZE / 2, conn.path[i].y * TILE_SIZE + TILE_SIZE / 2);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset
    });

    // 3. Draw Buildings
    level.buildings.forEach(b => {
        const bx = b.x * TILE_SIZE;
        const by = b.y * TILE_SIZE;
        const bw = b.width * TILE_SIZE;
        const bh = b.height * TILE_SIZE;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(bx + 4, by + 4, bw, bh);

        // Building Body
        if (b.type === BuildingType.CONSTRUCTION_SITE) {
            ctx.fillStyle = '#d4b483';
            ctx.fillRect(bx, by, bw, bh);
            const layers = Math.floor((b.constructionProgress / b.constructionTarget) * 4);
            ctx.fillStyle = '#e6c288';
            for(let i=0; i<layers; i++) {
                const inset = (i + 1) * 6;
                if (bw - inset*2 > 0) ctx.fillRect(bx + inset, by + inset, bw - inset*2, bh - inset*2);
            }
        } else if (b.type === BuildingType.QUARRY) {
            ctx.fillStyle = '#555';
            ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = '#333'; 
            ctx.fillRect(bx + 4, by + 4, bw - 8, bh - 8);
        } else if (b.type === BuildingType.WAREHOUSE) {
            // Visual diff for Dock vs Caravan Post based on shape
            if (b.width === 2) {
                 // DOCK
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(bx, by, bw, bh);
                ctx.fillStyle = '#a0522d'; 
                // Planks texture
                for(let i=0; i<bw; i+=8) ctx.fillRect(bx+i, by, 1, bh);
            } else {
                // HUB
                ctx.fillStyle = '#b8860b';
                ctx.fillRect(bx, by, bw, bh);
                ctx.fillStyle = '#f0e68c'; // Tent color
                ctx.beginPath();
                ctx.moveTo(bx + bw/2, by);
                ctx.lineTo(bx + bw, by + bh);
                ctx.lineTo(bx, by + bh);
                ctx.fill();
            }
        } else {
            // Mason
            ctx.fillStyle = '#a0522d';
            ctx.fillRect(bx, by, bw, bh);
            // Tools/Roof
            ctx.fillStyle = '#800000';
            ctx.fillRect(bx + 4, by + 4, bw - 8, bh/2);
        }

        // Inventory Dot
        const totalItems = (Object.values(b.outputInventory) as number[]).reduce((a, b) => a + b, 0) + (Object.values(b.inputInventory) as number[]).reduce((a, b) => a + b, 0);
        if (totalItems > 0) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(bx + bw - 6, by + 6, 4, 0, Math.PI*2);
            ctx.fill();
        }
    });

    // 4. Draw Units
    units.forEach(u => {
        const conn = level.connections.find(c => c.id === u.connectionId);
        if (!conn || conn.path.length < 2) return;

        const totalSegments = conn.path.length - 1;
        const segmentLength = 1 / totalSegments;
        const currentSegmentIndex = Math.floor(u.position / segmentLength);
        const nextSegmentIndex = Math.min(currentSegmentIndex + 1, totalSegments);
        const segmentProgress = (u.position - (currentSegmentIndex * segmentLength)) / segmentLength;

        const p1 = conn.path[currentSegmentIndex];
        const p2 = conn.path[nextSegmentIndex];

        if (!p1 || !p2) return;

        const pixelX = (p1.x + (p2.x - p1.x) * segmentProgress) * TILE_SIZE + TILE_SIZE / 2;
        const pixelY = (p1.y + (p2.y - p1.y) * segmentProgress) * TILE_SIZE + TILE_SIZE / 2;

        const config = UNIT_CONFIG[u.type];
        ctx.font = '16px Arial'; // Smaller font for units
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.save();
        ctx.translate(pixelX, pixelY);
        // Flip direction for return trip
        if (u.state === 'MOVING_TO_START') ctx.scale(-1, 1);
        
        // Draw Unit Icon
        ctx.fillStyle = '#000';
        ctx.fillText(config.icon, 0, 0);
        
        // Carrying Indicator
        const inventory = Object.entries(u.inventory);
        if (inventory.length > 0) {
            const [res, amount] = inventory.find(([k,v]) => (v as number) > 0) || [];
            if (res && amount) {
                if (res === ResourceType.STONE_RAW) {
                     ctx.fillStyle = '#666';
                     ctx.beginPath();
                     ctx.arc(0, -10, 3, 0, Math.PI*2);
                     ctx.fill();
                } else if (res === ResourceType.STONE_BLOCK) {
                     ctx.fillStyle = '#eee';
                     ctx.fillRect(-3, -13, 6, 6);
                }
            }
        }
        ctx.restore();
    });

  }, [gameState]);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);

    // Click tolerance (adjacent tiles) improved for better UX
    const clickedConn = gameState.level.connections.find(c => 
        c.path.some(p => Math.abs(p.x - gridX) < 1.5 && Math.abs(p.y - gridY) < 1.5)
    );

    if (clickedConn) {
        onConnectionClick(clickedConn.id);
    } else {
        onConnectionClick('');
    }
  };

  return (
    <canvas 
        ref={canvasRef} 
        width={gameState.level.width * TILE_SIZE} 
        height={gameState.level.height * TILE_SIZE}
        onClick={handleClick}
        className="cursor-pointer shadow-2xl rounded-lg bg-stone-900 border border-stone-800"
    />
  );
};