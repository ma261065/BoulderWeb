// Game constants
const TILE_SIZE = 40;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;

// Entity type enum
const ENTITY_TYPES = {
    EMPTY: 0,
    WALL: 1,
    DIRT: 2,
    BOULDER: 3,
    DIAMOND: 4,
    PLAYER: 5,
    EXIT: 6
};

// Sound file paths
const SOUND_PATHS = {
    move: 'sounds/move.wav',
    dig: 'sounds/dig.wav',
    diamond: 'sounds/diamond.wav',
    boulder: 'sounds/boulder.wav',
    fall: 'sounds/fall.wav',
    levelComplete: 'sounds/level_complete.wav',
    gameOver: 'sounds/game_over.wav'
};

// Sprite file paths
const SPRITE_PATHS = {
    wall: 'images/wall.bmp',
    dirt: 'images/dirt.bmp',
    boulder: 'images/boulder.bmp',
    diamond: 'images/diamond.bmp',
    player: 'images/player.bmp',
    exit: 'images/exit.bmp'
};

// Game settings
const GAME_SETTINGS = {
    initialTime: 120,
    baseDiamondsNeeded: 5,
    diamondsIncrementPerLevel: 2,
    baseWallCount: 20,
    wallIncrementPerLevel: 5,
    baseBoulderCount: 10,
    boulderIncrementPerLevel: 2,
    extraDiamonds: 5,
    gameUpdateInterval: 100, // milliseconds
    timerUpdateInterval: 1000 // milliseconds
};