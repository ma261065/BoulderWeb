class Diamond extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.DIAMOND);
        this.falling = false;
        this.justLanded = false;
        this.fallStarted = false; // Track if this diamond has started falling
    }
    
    update(grid) {
        // Reset sound flag
        this.justLanded = false;
        const wasFalling = this.falling;
        this.falling = false;
        
        let moved = false;
        
        // Check if we can fall straight down - ONE TILE MOVEMENT ONLY
        if (Entity.isInBounds(this.x, this.y + 1)) {
            const belowType = grid[this.y + 1][this.x];
            
            // Determine if we can fall
            let canFall = false;
            
            if (belowType === ENTITY_TYPES.EMPTY) {
                // Always fall into empty space
                canFall = true;
            } else if (belowType === ENTITY_TYPES.PLAYER) {
                // Only fall into player space if we were already falling
                // This prevents "instant death" when player moves under stationary diamond
                canFall = this.fallStarted;
            }
            
            if (canFall) {
                // Mark the current position as empty
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                
                // Move down ONE tile
                this.y++;
                
                // Update the new position on the grid
                grid[this.y][this.x] = this.type;
                
                this.falling = true;
                this.fallStarted = true; // Mark that this diamond has started falling
                moved = true;
            }
        }
        
        // If we can't fall, check if we can roll off something (boulder or diamond)
        if (!moved && Entity.isInBounds(this.x, this.y + 1) && 
            (grid[this.y + 1][this.x] === ENTITY_TYPES.BOULDER || 
             grid[this.y + 1][this.x] === ENTITY_TYPES.DIAMOND)) {
            
            // Try rolling left first
            if (Entity.isInBounds(this.x - 1, this.y) && 
                Entity.isInBounds(this.x - 1, this.y + 1) && 
                grid[this.y][this.x - 1] === ENTITY_TYPES.EMPTY && 
                grid[this.y + 1][this.x - 1] === ENTITY_TYPES.EMPTY) {
                
                // Mark the current position as empty
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                
                // Move left ONE tile
                this.x--;
                
                // Update the new position on the grid
                grid[this.y][this.x] = this.type;
                
                this.fallStarted = true; // Rolling also counts as starting to fall
                moved = true;
            }
            // Try rolling right
            else if (Entity.isInBounds(this.x + 1, this.y) && 
                    Entity.isInBounds(this.x + 1, this.y + 1) && 
                    grid[this.y][this.x + 1] === ENTITY_TYPES.EMPTY && 
                    grid[this.y + 1][this.x + 1] === ENTITY_TYPES.EMPTY) {
                
                // Mark the current position as empty
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                
                // Move right ONE tile
                this.x++;
                
                // Update the new position on the grid
                grid[this.y][this.x] = this.type;
                
                this.fallStarted = true; // Rolling also counts as starting to fall
                moved = true;
            }
        }
        
        // IMPORTANT: Reset fallStarted if diamond is now resting on solid support
        if (!moved && Entity.isInBounds(this.x, this.y + 1)) {
            const belowType = grid[this.y + 1][this.x];
            if (belowType === ENTITY_TYPES.WALL || 
                belowType === ENTITY_TYPES.DIRT || 
                belowType === ENTITY_TYPES.BOULDER || 
                belowType === ENTITY_TYPES.DIAMOND) {
                // Diamond is supported by something solid - reset fallStarted
                this.fallStarted = false;
            }
        }
        
        // Check if we just stopped falling (for sound)
        if (wasFalling && !this.falling) {
            this.justLanded = true;
        }
        
        return moved;
    }
    
    draw(ctx, x, y, tileSize = TILE_SIZE) {
        // Use the sprite if available
        if (window.spriteManager && window.spriteManager.getSprite('diamond')) {
            ctx.drawImage(window.spriteManager.getSprite('diamond'), x, y, tileSize, tileSize);
        } else {
            // Fallback to drawing a diamond shape
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.arc(x + tileSize/2, y + tileSize/2, tileSize/2 - 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    getLandingSound() {
        return this.justLanded ? 'diamond' : null;
    }
}