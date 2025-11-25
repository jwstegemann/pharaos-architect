export enum TerrainType {
  SAND = 'SAND',
  WATER = 'WATER',
  GRASS = 'GRASS',
  MOUNTAIN = 'MOUNTAIN',
  ROAD_DIRT = 'ROAD_DIRT',
  ROAD_PAVED = 'ROAD_PAVED',
}

export enum ResourceType {
  STONE_RAW = 'STONE_RAW',
  STONE_BLOCK = 'STONE_BLOCK',
  WOOD = 'WOOD', // Reserved for future
}

export enum BuildingType {
  QUARRY = 'QUARRY',
  STONEMASON = 'STONEMASON',
  WAREHOUSE = 'WAREHOUSE',
  CONSTRUCTION_SITE = 'CONSTRUCTION_SITE',
}

export enum UnitType {
  CARRIER = 'CARRIER', // Human
  DONKEY_CART = 'DONKEY_CART',
  BARGE = 'BARGE', // Boat
}

export enum UnitState {
  IDLE_AT_START = 'IDLE_AT_START',
  LOADING = 'LOADING',
  MOVING_TO_END = 'MOVING_TO_END',
  UNLOADING = 'UNLOADING',
  MOVING_TO_START = 'MOVING_TO_START',
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface Inventory {
  [key: string]: number; // ResourceType -> amount
}

export interface Building {
  id: string;
  type: BuildingType;
  name: string;
  x: number; // Grid X
  y: number; // Grid Y
  width: number;
  height: number;
  inputInventory: Inventory;
  outputInventory: Inventory;
  maxStorage: number;
  // For construction sites
  constructionProgress: number;
  constructionTarget: number;
  requiredResource?: ResourceType;
  // For producers
  productionProgress: number;
}

export interface Connection {
  id: string;
  fromBuildingId: string;
  toBuildingId: string;
  path: Coordinates[]; // Array of grid coordinates
  distance: number;
  terrainSummary: TerrainType[]; // Dominant terrain along path
  allowedUnitTypes: UnitType[];
}

export interface Unit {
  id: string;
  type: UnitType;
  connectionId: string;
  position: number; // 0.0 to 1.0
  state: UnitState;
  inventory: Inventory;
  timer: number; // For loading/unloading delays
}

export interface GameLevel {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TerrainType[][];
  buildings: Building[];
  connections: Connection[];
  initialResources: Inventory;
  maxUnits: number;
}

export interface GameState {
  level: GameLevel;
  units: Unit[];
  resources: Inventory; // Global player resources (money/points)
  isRunning: boolean;
  gameTime: number;
  selectedConnectionId: string | null;
}