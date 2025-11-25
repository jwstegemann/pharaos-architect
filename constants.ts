import { TerrainType, UnitType, BuildingType, ResourceType } from './types';

export const TILE_SIZE = 32; // Smaller tiles for larger map
export const GAME_SPEED = 1;

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.SAND]: '#e6c288',
  [TerrainType.WATER]: '#4fa4b8',
  [TerrainType.GRASS]: '#8ab060',
  [TerrainType.MOUNTAIN]: '#968e85',
  [TerrainType.ROAD_DIRT]: '#c2b280',
  [TerrainType.ROAD_PAVED]: '#a0a0a0',
};

// Speed multiplier based on terrain
export const TERRAIN_SPEED_MODIFIER: Record<TerrainType, number> = {
  [TerrainType.SAND]: 0.5,     // Very slow in sand
  [TerrainType.WATER]: 1.2,     // Boats are fast
  [TerrainType.GRASS]: 0.8,
  [TerrainType.MOUNTAIN]: 0.3,  // Climbing is hard
  [TerrainType.ROAD_DIRT]: 1.2, // Decent
  [TerrainType.ROAD_PAVED]: 2.0, // Highways
};

export const UNIT_CONFIG: Record<UnitType, { speed: number; capacity: number; allowedTerrain: TerrainType[], loadTime: number, icon: string }> = {
  [UnitType.CARRIER]: {
    speed: 0.08,
    capacity: 1,
    allowedTerrain: [TerrainType.SAND, TerrainType.GRASS, TerrainType.ROAD_DIRT, TerrainType.ROAD_PAVED, TerrainType.MOUNTAIN],
    loadTime: 500,
    icon: '🏃'
  },
  [UnitType.DONKEY_CART]: {
    speed: 0.15,
    capacity: 4,
    allowedTerrain: [TerrainType.SAND, TerrainType.GRASS, TerrainType.ROAD_DIRT, TerrainType.ROAD_PAVED],
    loadTime: 1500,
    icon: '🫏'
  },
  [UnitType.BARGE]: {
    speed: 0.12,
    capacity: 15,
    allowedTerrain: [TerrainType.WATER],
    loadTime: 3000,
    icon: '⛵'
  }
};

export const BUILDING_CONFIG: Record<BuildingType, { productionTime: number; inputs: Partial<Record<ResourceType, number>>; outputs: Partial<Record<ResourceType, number>> }> = {
  [BuildingType.QUARRY]: {
    productionTime: 2000,
    inputs: {},
    outputs: { [ResourceType.STONE_RAW]: 1 }
  },
  [BuildingType.STONEMASON]: {
    productionTime: 1500,
    inputs: { [ResourceType.STONE_RAW]: 1 },
    outputs: { [ResourceType.STONE_BLOCK]: 1 }
  },
  [BuildingType.WAREHOUSE]: {
    productionTime: 0,
    inputs: {},
    outputs: {}
  },
  [BuildingType.CONSTRUCTION_SITE]: {
    productionTime: 0,
    inputs: { [ResourceType.STONE_BLOCK]: 1 },
    outputs: {}
  }
};