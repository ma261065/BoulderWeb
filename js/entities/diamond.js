class Diamond extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.DIAMOND);
        this.falling = false;
        this.rolling = false;
    }
    
    update(grid) {
        // Reset state flags
        this.falling = false;
        this.rolling = false;
        
        // Check if there's empty space below
        if (Entity.isInBounds(this.x, this.y + 1) && grid[this.y + 1][this.x] === ENTITY_TYPES.EMPTY) {
            // Mark the current position as empty
            grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
            
            // Move down
            this.y++;
            
            // Update the new position on the grid
            grid[this.y][this.x] = this.type;
            
            this.falling = true;
            return true;
        } 
        // Check if it can roll off another boulder or diamond
        else if (Entity.isInBounds(this.x, this.y + 1) && 
                (grid[this.y + 1][this.x] === ENTITY_TYPES.BOULDER || grid[this.y + 1][this.x] === ENTITY_TYPES.DIAMOND)) {
            
            // Try to roll left
            if (Entity.isInBounds(this.x - 1, this.y) && 
                Entity.isInBounds(this.x - 1, this.y + 1) && 
                grid[this.y][this.x - 1] === ENTITY_TYPES.EMPTY && 
                grid[this.y + 1][this.x - 1] === ENTITY_TYPES.EMPTY) {
                
                // Mark the current position as empty
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                
                // Move left
                this.x--;
                
                // Update the new position on the grid
                grid[this.y][this.x] = this.type;
                
                this.rolling = true;
                return true;
            }
            
            // Try to roll right
            if (Entity.isInBounds(this.x + 1, this.y) && 
                Entity.isInBounds(this.x + 1, this.y + 1) && 
                grid[this.y][this.x + 1] === ENTITY_TYPES.EMPTY && 
                grid[this.y + 1][this.x + 1] === ENTITY_TYPES.EMPTY) {
                
                // Mark the current position as empty
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                
                // Move right
                this.x++;
                
                // Update the new position on the grid
                grid[this.y][this.x] = this.type;
                
                this.rolling = true;
                return true;
            }
        }
        
        return false;
    }
    
    draw(ctx, x, y) {
        // Use the sprite if available
        if (window.spriteManager && window.spriteManager.getSprite('diamond')) {
            ctx.drawImage(window.spriteManager.getSprite('diamond'), x, y, TILE_SIZE, TILE_SIZE);
        } else {
            // Fallback to drawing a circle
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, TILE_SIZE/2 - 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    getFallingSound() {
        if (this.falling) {
            return 'fall';
        } else if (this.rolling) {
            return 'boulder';
        }
        return null;
    }
}