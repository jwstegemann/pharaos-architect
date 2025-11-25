import { GameLevel, TerrainType, BuildingType, ResourceType, UnitType, Coordinates } from '../types';

const WIDTH = 25;
const HEIGHT = 18;

// Helper to generate grid
const generateTiles = (): TerrainType[][] => {
  const tiles: TerrainType[][] = [];
  for (let y = 0; y < HEIGHT; y++) {
    const row: TerrainType[] = [];
    for (let x = 0; x < WIDTH; x++) {
        let type = TerrainType.SAND; // Default Desert

        // 1. River System (Main Channel + Split)
        const isMainRiver = x <= 8 && (y >= 8 && y <= 10);
        const isNorthBranch = x > 8 && (y >= 8 - (x-8)/2 && y <= 10 - (x-8)/2); // Flows Up-Right
        const isSouthBranch = x > 8 && (y >= 8 + (x-8)/2 && y <= 10 + (x-8)/2); // Flows Down-Right
        
        if (isMainRiver || isNorthBranch || isSouthBranch) {
            type = TerrainType.WATER;
        }

        // 2. Mountains (Source of Stone)
        if (x < 5 && y > 13) type = TerrainType.MOUNTAIN; // SW
        if (x > 20 && y > 14) type = TerrainType.MOUNTAIN; // SE

        // 3. Vegetation patches
        if (!isMainRiver && !isNorthBranch && !isSouthBranch) {
            // Near water logic
            if ((Math.abs(y - 9) < 4 && x < 8) || (x > 8 && y > 7 && y < 13)) {
               if (Math.random() > 0.7) type = TerrainType.GRASS;
            }
        }

        // 4. Existing Roads (Ruins/Ancient)
        if (type === TerrainType.SAND && y === 15 && x > 4 && x < 15) type = TerrainType.ROAD_DIRT;

        row.push(type);
    }
    tiles.push(row);
  }
  return tiles;
};

// Helper for simple path generation
const createPath = (start: Coordinates, end: Coordinates): Coordinates[] => {
    const path: Coordinates[] = [];
    let curr = { ...start };
    path.push({ ...curr });
    
    // Move X first
    while (curr.x !== end.x) {
        curr.x += curr.x < end.x ? 1 : -1;
        path.push({ ...curr });
    }
    // Then Move Y
    while (curr.y !== end.y) {
        curr.y += curr.y < end.y ? 1 : -1;
        path.push({ ...curr });
    }
    return path;
};

const buildings = [
  // --- SOUTH SIDE (Raw Materials) ---
  {
    id: 'b_quarry_sw',
    type: BuildingType.QUARRY,
    name: 'South Quarry',
    x: 2,
    y: 14,
    width: 2,
    height: 2,
    inputInventory: {},
    outputInventory: {},
    maxStorage: 50,
    productionProgress: 0,
    constructionProgress: 0,
    constructionTarget: 0,
  },
  {
    id: 'b_dock_south',
    type: BuildingType.WAREHOUSE,
    name: 'South Port',
    x: 8,
    y: 11, // Right on the shore (River is y=10 here)
    width: 2,
    height: 1,
    inputInventory: {},
    outputInventory: {},
    maxStorage: 100,
    productionProgress: 0,
    constructionProgress: 0,
    constructionTarget: 0,
  },

  // --- CENTRAL/EAST (Logistics) ---
  {
    id: 'b_hub_central',
    type: BuildingType.WAREHOUSE,
    name: 'Desert Outpost',
    x: 14,
    y: 11, // Between river branches (The Island)
    width: 1,
    height: 1,
    inputInventory: {},
    outputInventory: {},
    maxStorage: 30,
    productionProgress: 0,
    constructionProgress: 0,
    constructionTarget: 0,
  },

  // --- NORTH SIDE (Processing & Construction) ---
  {
    id: 'b_dock_north',
    type: BuildingType.WAREHOUSE,
    name: 'North Port',
    x: 10,
    y: 5, // Shore of North Branch (River is y=6,7 here)
    width: 2,
    height: 1,
    inputInventory: {},
    outputInventory: {},
    maxStorage: 100,
    productionProgress: 0,
    constructionProgress: 0,
    constructionTarget: 0,
  },
  {
    id: 'b_mason_village',
    type: BuildingType.STONEMASON,
    name: 'Mason Village',
    x: 14,
    y: 2,
    width: 2,
    height: 2,
    inputInventory: {},
    outputInventory: {},
    maxStorage: 50,
    productionProgress: 0,
    constructionProgress: 0,
    constructionTarget: 0,
  },
  {
    id: 'b_pyramid',
    type: BuildingType.CONSTRUCTION_SITE,
    name: 'Great Pyramid',
    x: 20,
    y: 2,
    width: 3,
    height: 3,
    inputInventory: {},
    outputInventory: {},
    maxStorage: 200,
    productionProgress: 0,
    constructionProgress: 0,
    constructionTarget: 100,
    requiredResource: ResourceType.STONE_BLOCK
  },
];

const connections = [
  // --- ROUTE 1: RIVER CROSSING (Efficient) ---
  
  // 1. Quarry -> South Dock
  {
    id: 'c_q_dock',
    fromBuildingId: 'b_quarry_sw',
    toBuildingId: 'b_dock_south',
    // Path from Right-Side of Quarry to Bottom of Dock
    path: [{x:4, y:15}, {x:6, y:15}, {x:8, y:15}, {x:8, y:12}],
    distance: 6,
    terrainSummary: [TerrainType.SAND],
    allowedUnitTypes: [UnitType.DONKEY_CART]
  },

  // 2. The Crossing (South Dock -> North Dock)
  {
    id: 'c_ferry',
    fromBuildingId: 'b_dock_south',
    toBuildingId: 'b_dock_north',
    // Must go through water. Dock South is at (8,11). Water starts at y=10.
    // Dock North is at (10,5). Water ends at y=6.
    path: [
        {x:9, y:11}, // Boarding
        {x:9, y:10}, // Enter Water
        {x:9, y:8},  // Mid River
        {x:10, y:7}, // Crossing North Branch
        {x:10, y:6}, // Approaching Dock
        {x:11, y:6}  // Unloading
    ],
    distance: 8,
    terrainSummary: [TerrainType.WATER],
    allowedUnitTypes: [UnitType.BARGE]
  },

  // 3. North Dock -> Mason
  {
    id: 'c_dock_mason',
    fromBuildingId: 'b_dock_north',
    toBuildingId: 'b_mason_village',
    path: [{x:11, y:5}, {x:11, y:4}, {x:14, y:4}], // Connect to left side of Mason
    distance: 5,
    terrainSummary: [TerrainType.GRASS],
    allowedUnitTypes: [UnitType.DONKEY_CART, UnitType.CARRIER]
  },

  // --- ROUTE 2: DESERT ISLAND (Challenging) ---

  // 1. South Quarry -> Desert Outpost
  {
    id: 'c_q_hub',
    fromBuildingId: 'b_quarry_sw',
    toBuildingId: 'b_hub_central',
    // Long way around the bottom branch
    path: [
        {x:4, y:15}, {x:10, y:15}, // Along bottom edge
        {x:14, y:15}, {x:14, y:12} // Up to hub
    ],
    distance: 14,
    terrainSummary: [TerrainType.SAND],
    allowedUnitTypes: [UnitType.DONKEY_CART]
  },
  
  // 2. Hub -> Mason (Requires crossing/bridge logic abstractly or just shallow water)
  // Let's pretend there's a land bridge or ford at x=18
  {
    id: 'c_hub_mason',
    fromBuildingId: 'b_hub_central',
    toBuildingId: 'b_mason_village',
    path: [{x:15, y:11}, {x:18, y:11}, {x:18, y:8}, {x:18, y:4}, {x:16, y:4}],
    distance: 10,
    terrainSummary: [TerrainType.SAND],
    allowedUnitTypes: [UnitType.DONKEY_CART]
  },

  // --- FINAL MILE ---
  // Mason -> Pyramid
  {
    id: 'c_mason_pyr',
    fromBuildingId: 'b_mason_village',
    toBuildingId: 'b_pyramid',
    path: [{x:16, y:3}, {x:20, y:3}], // Straight shot
    distance: 4,
    terrainSummary: [TerrainType.ROAD_PAVED],
    allowedUnitTypes: [UnitType.CARRIER]
  }
];

export const LEVEL_1: GameLevel = {
  id: 'egypt_delta',
  name: 'The Nile Delta',
  width: WIDTH,
  height: HEIGHT,
  tiles: generateTiles(),
  buildings,
  connections,
  initialResources: {},
  maxUnits: 15
};