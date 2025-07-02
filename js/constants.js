// Game constants
const TILE_SIZE = 32;
const GRID_WIDTH = 64;
const GRID_HEIGHT = 32;
const GAME_VERSION = '250702.1536'; // Version number for the game

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
    pickup: 'sounds/pickup.wav',
    boulder: 'sounds/boulder.wav',
    push: 'sounds/push.wav',
    levelComplete: 'sounds/level_complete.wav',
    gameOver: 'sounds/game_over.wav',
    die: 'sounds/die.wav',
};

// Sprite file paths (unchanged)
const SPRITE_PATHS = {
    wall: 'images/Wall.bmp',
    dirt: 'images/Dirt.bmp',
    boulder: 'images/Boulder.bmp',
    diamond: 'images/Diamond.bmp',
    player: 'images/Player.bmp',
    playerl1: 'images/PlayerL1.bmp',
    playerl2: 'images/PlayerL2.bmp',
    playerr1: 'images/PlayerR1.bmp',
    playerr2: 'images/PlayerR2.bmp',
    playeru1: 'images/PlayerU1.bmp',
    playeru2: 'images/PlayerU2.bmp',
    playerd1: 'images/PlayerD1.bmp',
    playerd2: 'images/PlayerD2.bmp',
    playerd2: 'images/PlayerD2.bmp',
    playerpushl: 'images/PlayerPushL.bmp',
    playerpushr: 'images/PlayerPushR.bmp',
    exit: 'images/Exit.bmp'
};

const GAME_SETTINGS = {
    gameUpdateInterval: 85, // Consistent frame rate for all entities and player (5 frames per second)
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