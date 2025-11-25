import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Unit, UnitState, UnitType, ResourceType, BuildingType } from '../types';
import { LEVEL_1 } from '../data/level1';
import { UNIT_CONFIG, BUILDING_CONFIG, TERRAIN_SPEED_MODIFIER } from '../constants';

export const useGameEngine = () => {
  const [gameState, setGameState] = useState<GameState>({
    level: JSON.parse(JSON.stringify(LEVEL_1)), // Deep copy to avoid mutation issues
    units: [],
    resources: {},
    isRunning: false,
    gameTime: 0,
    selectedConnectionId: null,
  });

  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number>();

  const tick = useCallback((time: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = time;
    }
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;

    setGameState((prevState) => {
      if (!prevState.isRunning) return prevState;

      const newState = { ...prevState, gameTime: prevState.gameTime + delta };
      const { level, units } = newState;

      // 1. Building Logic (Production)
      level.buildings.forEach(building => {
        const config = BUILDING_CONFIG[building.type];
        
        // Consumer (Pyramid) Logic
        if (building.type === BuildingType.CONSTRUCTION_SITE) {
            const reqRes = building.requiredResource || ResourceType.STONE_BLOCK;
            const hasResource = (building.inputInventory[reqRes] || 0) > 0;
            if (hasResource && building.constructionProgress < building.constructionTarget) {
                 // Consume 1 unit to build
                 if (Math.random() < 0.05) { // Speed up construction slightly for visual feedback
                    building.inputInventory[reqRes]--;
                    building.constructionProgress++;
                 }
            }
        }

        // Warehouse Logic: Pass-through (Input -> Output)
        if (building.type === BuildingType.WAREHOUSE) {
             const currentOutputTotal = (Object.values(building.outputInventory) as number[]).reduce((a, b) => a + b, 0);
             let spaceAvailable = building.maxStorage - currentOutputTotal;

             if (spaceAvailable > 0) {
                 Object.keys(building.inputInventory).forEach(res => {
                     const amount = building.inputInventory[res];
                     if (amount > 0 && spaceAvailable > 0) {
                         const toTransfer = Math.min(amount, spaceAvailable);
                         building.inputInventory[res] -= toTransfer;
                         building.outputInventory[res] = (building.outputInventory[res] || 0) + toTransfer;
                         spaceAvailable -= toTransfer;
                     }
                 });
             }
        }

        // Producer Logic
        if (config.productionTime > 0) {
            // Check inputs
            const canProduce = Object.entries(config.inputs).every(([res, amount]) => (building.inputInventory[res] || 0) >= ((amount as number) || 0));
            // Check outputs capacity
            const outputFull = (Object.values(building.outputInventory) as number[]).reduce((a: number, b: number) => a + b, 0) >= building.maxStorage;
            
            if (canProduce && !outputFull) {
                building.productionProgress += delta;
                if (building.productionProgress >= config.productionTime) {
                    // Consume Inputs
                    Object.entries(config.inputs).forEach(([res, amount]) => {
                        building.inputInventory[res] = (building.inputInventory[res] || 0) - ((amount as number) || 0);
                    });
                    // Produce Outputs
                    Object.entries(config.outputs).forEach(([res, amount]) => {
                        building.outputInventory[res] = (building.outputInventory[res] || 0) + ((amount as number) || 0);
                    });
                    building.productionProgress = 0;
                }
            }
        }
      });

      // 2. Unit Logic
      newState.units = units.map(unit => {
        const connection = level.connections.find(c => c.id === unit.connectionId);
        if (!connection) return unit;

        const startNode = level.buildings.find(b => b.id === connection.fromBuildingId);
        const endNode = level.buildings.find(b => b.id === connection.toBuildingId);
        const config = UNIT_CONFIG[unit.type];

        if (!startNode || !endNode) return unit;

        let newUnit = { ...unit };

        // Terrain modifier (simplified: take average of path or just use connection summary)
        // We'll use the dominant terrain of the connection to scale speed
        const terrainSpeedMod = connection.terrainSummary.reduce((acc, t) => acc + (TERRAIN_SPEED_MODIFIER[t] || 1), 0) / connection.terrainSummary.length;

        switch (unit.state) {
            case UnitState.IDLE_AT_START:
                // Look for resource to pick up
                const availableRes = Object.keys(startNode.outputInventory).find(r => startNode.outputInventory[r] > 0);
                if (availableRes) {
                    newUnit.state = UnitState.LOADING;
                    newUnit.timer = 0;
                }
                break;

            case UnitState.LOADING:
                newUnit.timer += delta;
                if (newUnit.timer >= config.loadTime) {
                    const resToTake = Object.keys(startNode.outputInventory).find(r => startNode.outputInventory[r] > 0);
                    if (resToTake) {
                        const amount = Math.min(config.capacity, startNode.outputInventory[resToTake]);
                        startNode.outputInventory[resToTake] -= amount;
                        newUnit.inventory[resToTake] = (newUnit.inventory[resToTake] || 0) + amount;
                        newUnit.state = UnitState.MOVING_TO_END;
                    } else {
                        newUnit.state = UnitState.IDLE_AT_START;
                    }
                }
                break;

            case UnitState.MOVING_TO_END:
                // Apply terrain modifier to speed
                const moveSpeed = (config.speed * terrainSpeedMod / connection.distance) * (delta / 16); 
                newUnit.position += moveSpeed;
                if (newUnit.position >= 1.0) {
                    newUnit.position = 1.0;
                    newUnit.state = UnitState.UNLOADING;
                    newUnit.timer = 0;
                }
                break;

            case UnitState.UNLOADING:
                newUnit.timer += delta;
                if (newUnit.timer >= config.loadTime) {
                   Object.entries(newUnit.inventory).forEach(([res, amount]) => {
                       endNode.inputInventory[res] = (endNode.inputInventory[res] || 0) + amount;
                   });
                   newUnit.inventory = {};
                   newUnit.state = UnitState.MOVING_TO_START;
                }
                break;

            case UnitState.MOVING_TO_START:
                const returnSpeed = (config.speed * terrainSpeedMod / connection.distance) * (delta / 16); 
                newUnit.position -= returnSpeed;
                if (newUnit.position <= 0.0) {
                    newUnit.position = 0.0;
                    newUnit.state = UnitState.IDLE_AT_START;
                }
                break;
        }

        return newUnit;
      });

      return newState;
    });

    requestRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [tick]);

  const togglePause = () => {
    setGameState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const selectConnection = (id: string | null) => {
    setGameState(prev => ({ ...prev, selectedConnectionId: id }));
  };

  const addUnit = (unitType: UnitType, connectionId: string) => {
    setGameState(prev => {
        if (prev.units.length >= prev.level.maxUnits) return prev; // Unit Cap
        
        const newUnit: Unit = {
            id: `u_${Date.now()}`,
            type: unitType,
            connectionId,
            position: 0,
            state: UnitState.IDLE_AT_START,
            inventory: {},
            timer: 0
        };
        return { ...prev, units: [...prev.units, newUnit] };
    });
  };

  return { gameState, togglePause, selectConnection, addUnit };
};