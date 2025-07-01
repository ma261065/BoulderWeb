class Diamond extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.DIAMOND);
        this.falling = false;
        this.justLanded = false;
    }
    
    update(grid) {
        // Reset sound flag
        this.justLanded = false;
        const wasFalling = this.falling;
        this.falling = false;
        
        let moved = false;
        
        // Check if we can fall straight down - ONE TILE MOVEMENT ONLY
        if (Entity.isInBounds(this.x, this.y + 1) && 
            grid[this.y + 1][this.x] === ENTITY_TYPES.EMPTY) {
            
            // Mark the current position as empty
            grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
            
            // Move down ONE tile
            this.y++;
            
            // Update the new position on the grid
            grid[this.y][this.x] = this.type;
            
            this.falling = true;
            moved = true;
        }
        // Check if we can roll off something (boulder or diamond) - ONE TILE MOVEMENT ONLY
        else if (Entity.isInBounds(this.x, this.y + 1) && 
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
                
                moved = true;
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