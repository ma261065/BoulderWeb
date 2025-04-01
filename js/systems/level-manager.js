class LevelManager {
    constructor(game) {
        this.game = game;
        this.currentLevel = 1;
        this.entityInstances = [];
        this.player = null;
    }
    
    createLevel(level) {
        console.log(`Creating level ${level}...`);
        
        // Reset entity instances
        this.entityInstances = [];
        
        // Create empty grid with walls around the edges
        const grid = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            const row = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (x === 0 || y === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1) {
                    row.push(ENTITY_TYPES.WALL);
                    this.entityInstances.push(new Wall(x, y));
                } else {
                    row.push(ENTITY_TYPES.EMPTY);
                }
            }
            grid.push(row);
        }
        
        // Add walls (more for higher levels)
        const wallCount = GAME_SETTINGS.baseWallCount + level * GAME_SETTINGS.wallIncrementPerLevel;
        for (let i = 0; i < wallCount; i++) {
            const x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
            const y = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
            if (grid[y][x] === ENTITY_TYPES.EMPTY) {
                grid[y][x] = ENTITY_TYPES.WALL;
                this.entityInstances.push(new Wall(x, y));
            }
        }
        
        // Add dirt
        for (let y = 1; y < GRID_HEIGHT - 1; y++) {
            for (let x = 1; x < GRID_WIDTH - 1; x++) {
                if (grid[y][x] === ENTITY_TYPES.EMPTY && Math.random() < 0.4) {
                    grid[y][x] = ENTITY_TYPES.DIRT;
                    this.entityInstances.push(new Dirt(x, y));
                }
            }
        }
        
        // Add boulders
        const boulderCount = GAME_SETTINGS.baseBoulderCount + level * GAME_SETTINGS.boulderIncrementPerLevel;
        for (let i = 0; i < boulderCount; i++) {
            const x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
            const y = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
            if (grid[y][x] !== ENTITY_TYPES.WALL) {
                grid[y][x] = ENTITY_TYPES.BOULDER;
                this.entityInstances.push(new Boulder(x, y));
            }
        }
        
        // Set diamonds needed for this level
        const diamondsNeeded = GAME_SETTINGS.baseDiamondsNeeded + level * GAME_SETTINGS.diamondsIncrementPerLevel;
        this.game.setDiamondsNeeded(diamondsNeeded);
        
        // Add diamonds (diamondsNeeded + extra for good measure)
        for (let i = 0; i < diamondsNeeded + GAME_SETTINGS.extraDiamonds; i++) {
            const x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
            const y = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
            if (grid[y][x] !== ENTITY_TYPES.WALL && grid[y][x] !== ENTITY_TYPES.BOULDER) {
                grid[y][x] = ENTITY_TYPES.DIAMOND;
                this.entityInstances.push(new Diamond(x, y));
            }
        }
        
        // Add player
        let playerPlaced = false;
        while (!playerPlaced) {
            const x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
            const y = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
            if (grid[y][x] === ENTITY_TYPES.EMPTY || grid[y][x] === ENTITY_TYPES.DIRT) {
                grid[y][x] = ENTITY_TYPES.PLAYER;
                this.player = new Player(x, y);
                this.entityInstances.push(this.player);
                playerPlaced = true;
            }
        }
        
        return {
            grid: grid,
            player: this.player
        };
    }
    
    createExit(grid) {
        let exitPlaced = false;
        let exitEntity = null;
        
        while (!exitPlaced) {
            const x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
            const y = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
            if (grid[y][x] === ENTITY_TYPES.EMPTY || grid[y][x] === ENTITY_TYPES.DIRT) {
                grid[y][x] = ENTITY_TYPES.EXIT;
                exitEntity = new Exit(x, y);
                this.entityInstances.push(exitEntity);
                exitPlaced = true;
            }
        }
        
        return exitEntity;
    }
    
    nextLevel() {
        this.currentLevel++;
        return this.currentLevel;
    }
    
    getCurrentLevel() {
        return this.currentLevel;
    }
    
    getMovingEntities() {
        return this.entityInstances.filter(entity => 
            entity.type === ENTITY_TYPES.BOULDER || entity.type === ENTITY_TYPES.DIAMOND);
    }
    
    // Remove an entity at a specific position
    removeEntityAtPosition(x, y) {
        const index = this.entityInstances.findIndex(entity => 
            entity.x === x && entity.y === y && 
            (entity.type === ENTITY_TYPES.DIRT || entity.type === ENTITY_TYPES.DIAMOND));
            
        if (index !== -1) {
            this.entityInstances.splice(index, 1);
            return true;
        }
        return false;
    }
    
    // Update the position of an entity (e.g., pushing a boulder)
    updateEntityPosition(type, oldX, oldY, newX, newY) {
        const entity = this.entityInstances.find(e => 
            e.type === type && e.x === oldX && e.y === oldY);
            
        if (entity) {
            entity.x = newX;
            entity.y = newY;
            return true;
        }
        return false;
    }
}