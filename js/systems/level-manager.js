class LevelManager {
    constructor(game) {
        this.game = game;
        this.currentLevel = 1;
        this.entityInstances = [];
        this.player = null;
        this.logger = new GameLogger();
    }
    
    createLevel(level) {
        this.logger.info(`Creating level ${level}...`);
        
        // Reset entity instances
        this.entityInstances = [];
        
        // Create empty grid with walls around the edges
        const grid = this.createBaseGrid();
        
        // Get configuration for this level
        const config = this.game.config;
        const wallCount = this.calculateWallCount(level, config);
        const boulderCount = this.calculateBoulderCount(level, config);
        const diamondsNeeded = this.calculateDiamondsNeeded(level, config);
        
        // Add walls
        this.addWalls(grid, wallCount);
        
        // Add dirt
        this.addDirt(grid);
        
        // Add boulders
        this.addBoulders(grid, boulderCount);
        
        // Add diamonds
        this.addDiamonds(grid, diamondsNeeded);
        
        // Add player
        const playerPosition = this.placePlayer(grid);
        
        // Log level generation details
        this.logger.debug('Level generation details', {
            level,
            wallCount,
            boulderCount,
            diamondsNeeded,
            playerPosition
        });
        
        return {
            grid: grid,
            player: this.player
        };
    }
    
    createBaseGrid() {
        const grid = [];
        const width = this.game.config.get('grid.width');
        const height = this.game.config.get('grid.height');
        
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                    row.push(ENTITY_TYPES.WALL);
                    this.entityInstances.push(new Wall(x, y));
                } else {
                    row.push(ENTITY_TYPES.EMPTY);
                }
            }
            grid.push(row);
        }
        
        return grid;
    }
    
    calculateWallCount(level, config) {
        return config.get('levels.baseWallCount') + 
               level * config.get('levels.wallIncrementPerLevel');
    }
    
    calculateBoulderCount(level, config) {
        return config.get('levels.baseBoulderCount') + 
               level * config.get('levels.boulderIncrementPerLevel');
    }
    
    calculateDiamondsNeeded(level, config) {
        return config.get('levels.baseDiamondsNeeded') + 
               level * config.get('levels.diamondsIncrementPerLevel');
    }
    
    addWalls(grid, wallCount) {
        for (let i = 0; i < wallCount; i++) {
            const x = Math.floor(Math.random() * (grid[0].length - 2)) + 1;
            const y = Math.floor(Math.random() * (grid.length - 2)) + 1;
            
            if (grid[y][x] === ENTITY_TYPES.EMPTY) {
                grid[y][x] = ENTITY_TYPES.WALL;
                this.entityInstances.push(new Wall(x, y));
            }
        }
    }
    
    addDirt(grid) {
        for (let y = 1; y < grid.length - 1; y++) {
            for (let x = 1; x < grid[y].length - 1; x++) {
                if (grid[y][x] === ENTITY_TYPES.EMPTY && Math.random() < 0.4) {
                    grid[y][x] = ENTITY_TYPES.DIRT;
                    this.entityInstances.push(new Dirt(x, y));
                }
            }
        }
    }
    
    addBoulders(grid, boulderCount) {
        for (let i = 0; i < boulderCount; i++) {
            const x = Math.floor(Math.random() * (grid[0].length - 2)) + 1;
            const y = Math.floor(Math.random() * (grid.length - 2)) + 1;
            
            if (grid[y][x] !== ENTITY_TYPES.WALL) {
                grid[y][x] = ENTITY_TYPES.BOULDER;
                this.entityInstances.push(new Boulder(x, y));
            }
        }
    }
    
    addDiamonds(grid, diamondsNeeded) {
        const extraDiamonds = this.game.config.get('levels.extraDiamonds');
        const totalDiamonds = diamondsNeeded + extraDiamonds;
        
        for (let i = 0; i < totalDiamonds; i++) {
            const x = Math.floor(Math.random() * (grid[0].length - 2)) + 1;
            const y = Math.floor(Math.random() * (grid.length - 2)) + 1;
            
            if (grid[y][x] !== ENTITY_TYPES.WALL && grid[y][x] !== ENTITY_TYPES.BOULDER) {
                grid[y][x] = ENTITY_TYPES.DIAMOND;
                this.entityInstances.push(new Diamond(x, y));
            }
        }
    }
    
    placePlayer(grid) {
        let playerPlaced = false;
        let playerPosition = null;
        
        while (!playerPlaced) {
            const x = Math.floor(Math.random() * (grid[0].length - 2)) + 1;
            const y = Math.floor(Math.random() * (grid.length - 2)) + 1;
            
            if (grid[y][x] === ENTITY_TYPES.EMPTY || grid[y][x] === ENTITY_TYPES.DIRT) {
                grid[y][x] = ENTITY_TYPES.PLAYER;
                this.player = new Player(x, y);
                this.entityInstances.push(this.player);
                playerPlaced = true;
                playerPosition = { x, y };
            }
        }
        
        return playerPosition;
    }
    
    createExit(grid) {
        let exitPlaced = false;
        let exitEntity = null;
        
        while (!exitPlaced) {
            const x = Math.floor(Math.random() * (grid[0].length - 2)) + 1;
            const y = Math.floor(Math.random() * (grid.length - 2)) + 1;
            
            if (grid[y][x] === ENTITY_TYPES.EMPTY || grid[y][x] === ENTITY_TYPES.DIRT) {
                grid[y][x] = ENTITY_TYPES.EXIT;
                exitEntity = new Exit(x, y);
                this.entityInstances.push(exitEntity);
                exitPlaced = true;
                
                this.logger.info(`Exit placed at (${x}, ${y})`);
            }
        }
        
        return exitEntity;
    }
    
    nextLevel() {
        this.currentLevel++;
        this.logger.info(`Advancing to level ${this.currentLevel}`);
        return this.currentLevel;
    }
    
    getCurrentLevel() {
        return this.currentLevel;
    }
    
    getMovingEntities() {
        // Find all boulders and diamonds and return them for physics processing
        const movingEntities = this.entityInstances.filter(entity => 
            entity.type === ENTITY_TYPES.BOULDER || entity.type === ENTITY_TYPES.DIAMOND);
        
        // Log count for debugging
        console.log(`Found ${movingEntities.length} moving entities`);
        
        // Ensure we have actual entity objects, not just data
        for (const entity of movingEntities) {
            if (typeof entity.update !== 'function') {
                console.error('Invalid entity found:', entity);
            }
        }
        
        return movingEntities;
    }
    
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
    
    updateEntityPosition(type, oldX, oldY, newX, newY) {
        // First, try to find exact position match
        let entity = this.entityInstances.find(e => 
            e.type === type && e.x === oldX && e.y === oldY);
        
        // If not found, try to find by type and rough position (might help with timing issues)
        if (!entity) {
            entity = this.entityInstances.find(e => 
                e.type === type && 
                Math.abs(e.x - oldX) <= 1 && 
                Math.abs(e.y - oldY) <= 1);
        }
            
        if (entity) {
            console.log(`Updating entity position: type=${type}, (${oldX},${oldY}) -> (${newX},${newY})`);
            
            entity.x = newX;
            entity.y = newY;
            return true;
        }
        
        // If entity wasn't found, create a new one at the destination
        console.warn(`Entity not found for position update, creating new entity: type=${type}, (${oldX},${oldY}) -> (${newX},${newY})`);
        
        let newEntity = null;
        switch (type) {
            case ENTITY_TYPES.BOULDER:
                newEntity = new Boulder(newX, newY);
                break;
            case ENTITY_TYPES.DIAMOND:
                newEntity = new Diamond(newX, newY);
                break;
        }
        
        if (newEntity) {
            this.entityInstances.push(newEntity);
            return true;
        }
        
        return false;
    }
    
    // Debug method to print entity count and details
    debugEntityStatus() {
        const counts = {};
        this.entityInstances.forEach(entity => {
            const typeName = Object.keys(ENTITY_TYPES).find(key => ENTITY_TYPES[key] === entity.type) || 'Unknown';
            counts[typeName] = (counts[typeName] || 0) + 1;
        });
        
        this.logger.info('Entity count', counts);
        this.logger.info(`Total entities: ${this.entityInstances.length}`);
    }
}