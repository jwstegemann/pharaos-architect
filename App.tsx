import React, { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { GameCanvas } from './components/GameCanvas';
import { UnitType, BuildingType } from './types';
import { UNIT_CONFIG } from './constants';
import { getOracleAdvice } from './services/geminiService';

const App: React.FC = () => {
  const { gameState, togglePause, selectConnection, addUnit } = useGameEngine();
  const [oracleMessage, setOracleMessage] = useState<string>("Ask the High Priest for guidance...");
  const [isOracleLoading, setIsOracleLoading] = useState(false);

  const selectedConn = gameState.selectedConnectionId 
    ? gameState.level.connections.find(c => c.id === gameState.selectedConnectionId)
    : null;

  const startBuilding = selectedConn ? gameState.level.buildings.find(b => b.id === selectedConn.fromBuildingId) : null;
  const endBuilding = selectedConn ? gameState.level.buildings.find(b => b.id === selectedConn.toBuildingId) : null;
  const assignedUnits = selectedConn ? gameState.units.filter(u => u.connectionId === selectedConn.id) : [];

  const handleAskOracle = async () => {
    setIsOracleLoading(true);
    const advice = await getOracleAdvice(gameState);
    setOracleMessage(advice);
    setIsOracleLoading(false);
  };

  const pyramid = gameState.level.buildings.find(b => b.type === BuildingType.CONSTRUCTION_SITE);
  const unitsCount = gameState.units.length;
  const maxUnits = gameState.level.maxUnits;

  return (
    <div className="flex h-screen bg-stone-900 text-stone-200 font-sans overflow-hidden">
      
      {/* LEFT: Game View */}
      <div className="flex-1 relative overflow-auto flex items-center justify-center bg-stone-800/50">
         <div className="p-4 border border-stone-700/50 rounded-xl bg-stone-950 shadow-2xl">
            <GameCanvas gameState={gameState} onConnectionClick={selectConnection} />
         </div>
         
         {/* Top Overlay HUD */}
         <div className="absolute top-4 left-4 flex gap-4">
            <button 
                onClick={togglePause}
                className={`px-6 py-2 rounded-full font-bold shadow-lg transition-colors ${gameState.isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-green-600 hover:bg-green-500'}`}
            >
                {gameState.isRunning ? 'PAUSE ⏸' : 'START ▶'}
            </button>
            <div className="bg-black/50 px-4 py-2 rounded-full text-stone-300 border border-stone-700">
                Time: {Math.floor(gameState.gameTime / 1000)}s
            </div>
            <div className={`px-4 py-2 rounded-full text-stone-300 border border-stone-700 font-bold ${unitsCount >= maxUnits ? 'bg-red-900/50 text-red-200' : 'bg-black/50'}`}>
                Units: {unitsCount} / {maxUnits}
            </div>
         </div>

         {/* Victory Overlay */}
         {pyramid && pyramid.constructionProgress >= pyramid.constructionTarget && (
             <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-in fade-in duration-1000">
                 <h1 className="text-6xl text-yellow-500 font-serif mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">PYRAMID COMPLETE</h1>
                 <p className="text-2xl text-white mb-8">Pharaoh is pleased with your logistics!</p>
                 <button onClick={() => window.location.reload()} className="px-8 py-3 bg-stone-700 hover:bg-stone-600 rounded text-xl">Play Again</button>
             </div>
         )}
      </div>

      {/* RIGHT: Controls & Inspector */}
      <div className="w-96 bg-stone-900 border-l border-stone-700 flex flex-col shadow-xl z-10">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-700 bg-stone-950">
            <h1 className="text-2xl font-serif text-amber-500 tracking-widest">PHARAOH'S ARCHITECT</h1>
            <p className="text-sm text-stone-500 mt-1">Nile Delta • Level 1</p>
            
            {/* Pyramid Progress Bar */}
            {pyramid && (
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>Construction</span>
                        <span>{pyramid.constructionProgress} / {pyramid.constructionTarget}</span>
                    </div>
                    <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-amber-500 h-full transition-all duration-500" 
                            style={{width: `${(pyramid.constructionProgress / pyramid.constructionTarget) * 100}%`}}
                        />
                    </div>
                </div>
            )}
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {!selectedConn && (
                <div className="text-center text-stone-500 italic mt-10">
                    <p className="mb-4">"The stone must flow..."</p>
                    <p className="text-sm">Select a white path on the map to manage its transport units.</p>
                </div>
            )}

            {selectedConn && startBuilding && endBuilding && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    {/* Connection Info */}
                    <div className="bg-stone-800 p-4 rounded-lg border border-stone-700">
                        <h2 className="text-lg font-bold text-stone-300 mb-2 border-b border-stone-700 pb-2">Route Details</h2>
                        <div className="flex items-center justify-between text-sm">
                            <div className="text-center w-1/3">
                                <div className="text-xl mb-1">{startBuilding.type === BuildingType.QUARRY ? '⛏️' : '🏠'}</div>
                                <div className="text-stone-400 text-xs truncate">{startBuilding.name}</div>
                                <div className="text-amber-500 font-bold">{Object.values(startBuilding.outputInventory).reduce((a:number,b:number)=>a+b,0)}</div>
                            </div>
                            <div className="text-stone-500 text-center w-1/3">
                                <div className="text-xs uppercase tracking-widest mb-1">{selectedConn.distance}km</div>
                                <div className="text-xs text-stone-600">➡</div>
                            </div>
                            <div className="text-center w-1/3">
                                <div className="text-xl mb-1">{endBuilding.type === BuildingType.CONSTRUCTION_SITE ? '⚠️' : '🏭'}</div>
                                <div className="text-stone-400 text-xs truncate">{endBuilding.name}</div>
                                <div className="text-amber-500 font-bold">{Object.values(endBuilding.inputInventory).reduce((a:number,b:number)=>a+b,0)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Active Units */}
                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-2">Assigned Units ({assignedUnits.length})</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {assignedUnits.map(u => (
                                <div key={u.id} className="flex items-center justify-between bg-stone-800/50 p-2 rounded px-3 border border-stone-700/50">
                                    <span className="text-xl mr-2">{UNIT_CONFIG[u.type].icon}</span>
                                    <div className="flex-1">
                                        <div className="text-xs text-stone-400 uppercase flex justify-between">
                                            <span>{u.state.split('_')[0]}</span>
                                            <span>{Math.floor(u.position * 100)}%</span>
                                        </div>
                                        <div className="w-full bg-stone-700 h-1 mt-1 rounded-full">
                                            <div className={`h-1 rounded-full ${u.state.includes('MOVING') ? 'bg-amber-500' : 'bg-stone-500'}`} style={{width: `${u.position * 100}%`}}/>
                                        </div>
                                    </div>
                                    <div className="text-xs ml-2 text-stone-400 w-8 text-right">
                                        {Object.values(u.inventory).reduce((a: number,b: number)=>a+b,0)}/{UNIT_CONFIG[u.type].capacity}
                                    </div>
                                </div>
                            ))}
                            {assignedUnits.length === 0 && <p className="text-xs text-stone-600 italic">No units assigned to this route.</p>}
                        </div>
                    </div>

                    {/* Add Unit Buttons */}
                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-2">Recruit Unit</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {selectedConn.allowedUnitTypes.map(type => (
                                <button
                                    key={type}
                                    onClick={() => addUnit(type, selectedConn.id)}
                                    disabled={unitsCount >= maxUnits}
                                    className="flex items-center gap-3 p-3 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 border border-stone-600 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    <span className="text-2xl bg-stone-900 p-2 rounded group-hover:scale-110 transition-transform">{UNIT_CONFIG[type].icon}</span>
                                    <div>
                                        <div className="font-bold text-stone-200 capitalize text-sm">{type.replace('_', ' ')}</div>
                                        <div className="text-xs text-stone-400">
                                            Cap: {UNIT_CONFIG[type].capacity} | Speed: {Math.floor(UNIT_CONFIG[type].speed * 100)}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        {unitsCount >= maxUnits && <p className="text-xs text-red-400 mt-2 text-center">Unit limit reached!</p>}
                    </div>
                </div>
            )}

            {/* Oracle Section */}
            <div className="bg-stone-950 p-4 rounded-xl border border-amber-900/30 mt-auto">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🔮</span>
                    <h3 className="font-serif text-amber-500">High Priest's Advice</h3>
                </div>
                <div className="text-sm text-stone-400 italic mb-4 min-h-[60px]">
                    "{oracleMessage}"
                </div>
                <button 
                    onClick={handleAskOracle}
                    disabled={isOracleLoading}
                    className="w-full py-2 bg-amber-900/50 hover:bg-amber-900/80 text-amber-200 text-xs uppercase tracking-widest rounded border border-amber-800 disabled:opacity-50"
                >
                    {isOracleLoading ? 'Consulting the Gods...' : 'Consult Oracle'}
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default App;