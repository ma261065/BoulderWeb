class Player extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.PLAYER);
    }
    
    update(grid) {
        // Player is controlled by user input, not by automatic updates
        return false;
    }
    
    draw(ctx, x, y) {
        // Use the sprite if available
        if (window.spriteManager && window.spriteManager.getSprite('player')) {
            ctx.drawImage(window.spriteManager.getSprite('player'), x, y, TILE_SIZE, TILE_SIZE);
        } else {
            // Fallback to drawing a rectangle with smaller margins
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        }
    }
    
    tryMove(grid, dx, dy, soundManager, game) {
        const newX = this.x + dx;
        const newY = this.y + dy;
        
        // Check bounds
        if (!Entity.isInBounds(newX, newY)) {
            return false;
        }
        
        const destType = grid[newY][newX];
        
        // Check destination type
        if (destType === ENTITY_TYPES.WALL) {
            return false;
        }
        
        if (destType === ENTITY_TYPES.BOULDER) {
            // Check if boulder can be pushed
            const pushDestX = newX + dx;
            
            // Can only push if:
            // 1. The destination is in bounds
            // 2. The destination is empty (not a wall, not another boulder, etc.)
            if (Entity.isInBounds(pushDestX, newY) && grid[newY][pushDestX] === ENTITY_TYPES.EMPTY) {
                // Move the boulder
                grid[newY][pushDestX] = ENTITY_TYPES.BOULDER;
                grid[newY][newX] = ENTITY_TYPES.EMPTY;
                soundManager.playSound('boulder');
                
                // Now move the player
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                this.x = newX;
                this.y = newY;
                grid[this.y][this.x] = this.type;
                
                // Update entity instances in level manager to reflect the pushed boulder
                game.levelManager.updateEntityPosition(ENTITY_TYPES.BOULDER, newX, newY, pushDestX, newY);
                
                return true;
            }
            // If cannot push the boulder, the move is invalid
            return false;
        }
        
        // Play appropriate sound based on destination
        if (destType === ENTITY_TYPES.EMPTY) {
            soundManager.playSound('move');
        } else if (destType === ENTITY_TYPES.DIRT) {
            soundManager.playSound('dig');
            // The grid is the source of truth - just update it
            // The entity list will be synchronized in the game update
        } else if (destType === ENTITY_TYPES.DIAMOND) {
            soundManager.playSound('diamond');
            game.collectDiamond();
            // The grid is the source of truth - just update it
            // The entity list will be synchronized in the game update
        } else if (destType === ENTITY_TYPES.EXIT) {
            soundManager.playSound('levelComplete');
            game.levelComplete();
            return true;
        }
        
        // Update grid - this is the source of truth
        grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
        this.x = newX;
        this.y = newY;
        grid[this.y][this.x] = this.type;
        
        // Force immediate entity sync to avoid visual glitches
        game.syncEntitiesWithGrid();
        
        return true;
    }
}