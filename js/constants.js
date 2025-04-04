// Game constants
const TILE_SIZE = 32;
const GRID_WIDTH = 64;
const GRID_HEIGHT = 32;

// Entity type enum (unchanged)
const ENTITY_TYPES = {
    EMPTY: 0,
    WALL: 1,
    DIRT: 2,
    BOULDER: 3,
    DIAMOND: 4,
    PLAYER: 5,
    EXIT: 6
};

// Sound file paths (unchanged)
const SOUND_PATHS = {
    move: 'sounds/move.wav',
    dig: 'sounds/dig.wav',
    diamond: 'sounds/diamond.wav',
    boulder: 'sounds/boulder.wav',
    fall: 'sounds/fall.wav',
    levelComplete: 'sounds/level_complete.wav',
    gameOver: 'sounds/game_over.wav'
};

// Sprite file paths (unchanged)
const SPRITE_PATHS = {
    wall: 'images/wall.bmp',
    dirt: 'images/dirt.bmp',
    boulder: 'images/boulder.bmp',
    diamond: 'images/diamond.bmp',
    player: 'images/player.bmp',
    exit: 'images/exit.bmp'
};

const GAME_SETTINGS = {
    gameUpdateInterval: 200, // Consistent frame rate for all entities and player (5 frames per second)
    timerUpdateInterval: 1000, // The one second level timer
    initialTime: 30,
    baseDiamondsNeeded: 10,
    diamondsIncrementPerLevel: 3,
    baseWallCount: 50,
    wallIncrementPerLevel: 10,
    baseBoulderCount: 20,
    boulderIncrementPerLevel: 4,
    extraDiamonds: 10,
};