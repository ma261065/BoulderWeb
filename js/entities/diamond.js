class Diamond extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.DIAMOND);
        this.falling = false;
        this.rolling = false;
        this.justLanded = false; // ADD: Flag for when diamond just stopped falling
    }
    
    update(grid) {
        // Reset sound flags
        this.justLanded = false;
        
        // Store previous state
        const wasFalling = this.falling;
        
        // Reset state flags
        this.falling = false;
        this.rolling = false;
        
        let moved = false;
        
        // Check if there's empty space below - ONE TILE MOVEMENT ONLY
        if (Entity.isInBounds(this.x, this.y + 1) && grid[this.y + 1][this.x] === ENTITY_TYPES.EMPTY) {
            // Mark the current position as empty
            grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
            
            // Move down ONE tile
            this.y++;
            
            // Update the new position on the grid
            grid[this.y][this.x] = this.type;
            
            this.falling = true;
            moved = true;
        } 
        // Check if it can roll off another boulder or diamond - ONE TILE MOVEMENT ONLY
        else if (Entity.isInBounds(this.x, this.y + 1) && 
                (grid[this.y + 1][this.x] === ENTITY_TYPES.BOULDER || grid[this.y + 1][this.x] === ENTITY_TYPES.DIAMOND)) {
            
            // Try to roll left
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
                
                this.rolling = true;
                moved = true;
            }
            // Try to roll right
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
                
                this.rolling = true;
                moved = true;
            }
        }
        
        // ADDED: Set sound flag when diamond stops falling
        if (wasFalling && !this.falling) {
            this.justLanded = true; // Diamond stopped falling = landing sound
            console.log(`Diamond at (${this.x}, ${this.y}) JUST LANDED! Setting justLanded=true`);
        }
        
        return moved;
    }
    
    draw(ctx, x, y, tileSize = TILE_SIZE) {
        // Use the sprite if available
        if (window.spriteManager && window.spriteManager.getSprite('diamond')) {
            ctx.drawImage(window.spriteManager.getSprite('diamond'), x, y, tileSize, tileSize);
        } else {
            // Fallback to drawing a circle
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.arc(x + tileSize/2, y + tileSize/2, tileSize/2 - 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // FIXED: Rename to getLandingSound() and use justLanded flag
    getLandingSound() {
        if (this.justLanded) {
            console.log(`Diamond at (${this.x}, ${this.y}) just landed - playing diamond sound`);
            return 'diamond'; // diamond.wav when diamond lands
        }
        
        return null; // Silent when rolling or not moving
    }
}