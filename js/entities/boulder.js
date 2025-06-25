class Boulder extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.BOULDER);
        this.falling = false;
        this.rolling = false;
        this.justLanded = false; // Flag for when boulder just stopped falling
        this.justStartedRolling = false; // Flag for when boulder just started rolling
    }
    
    update(grid) {
        // Reset sound flags
        this.justLanded = false;
        this.justStartedRolling = false;
        
        // Store previous states
        const wasFalling = this.falling;
        const wasRolling = this.rolling;
        
        console.log(`Boulder at (${this.x}, ${this.y}) update start: wasFalling=${wasFalling}, wasRolling=${wasRolling}`);
        
        // Reset current state flags
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
            console.log(`Boulder at (${this.x}, ${this.y}) is falling`);
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
                console.log(`Boulder at (${this.x}, ${this.y}) is rolling left`);
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
                console.log(`Boulder at (${this.x}, ${this.y}) is rolling right`);
            } else {
                console.log(`Boulder at (${this.x}, ${this.y}) cannot roll - blocked`);
            }
        } else {
            console.log(`Boulder at (${this.x}, ${this.y}) cannot move - no empty space below`);
        }
        
        // Set sound flags based on state changes
        if (wasFalling && !this.falling) {
            this.justLanded = true; // Boulder stopped falling = impact sound
            console.log(`Boulder at (${this.x}, ${this.y}) JUST LANDED! Setting justLanded=true`);
        }
        
        if (!wasRolling && this.rolling) {
            this.justStartedRolling = true; // Boulder started rolling = rolling sound
            console.log(`Boulder at (${this.x}, ${this.y}) JUST STARTED ROLLING! Setting justStartedRolling=true`);
        }
        
        console.log(`Boulder at (${this.x}, ${this.y}) update end: falling=${this.falling}, rolling=${this.rolling}, justLanded=${this.justLanded}, justStartedRolling=${this.justStartedRolling}`);
        
        return moved;
    }
    
    draw(ctx, x, y, tileSize = TILE_SIZE) {
        // Use the sprite if available
        if (window.spriteManager && window.spriteManager.getSprite('boulder')) {
            ctx.drawImage(window.spriteManager.getSprite('boulder'), x, y, tileSize, tileSize);
        } else {
            // Fallback to drawing a circle
            ctx.fillStyle = '#AAA';
            ctx.beginPath();
            ctx.arc(x + tileSize/2, y + tileSize/2, tileSize/2 - 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // FIXED: Use flags set during update() to determine sounds with debug logging
    getFallingSound() {
        let sound = null;
        
        if (this.justLanded) {
            sound = 'fall';
            console.log(`Boulder at (${this.x}, ${this.y}) just landed - playing fall sound`);
        } else if (this.justStartedRolling) {
            sound = 'boulder';
            console.log(`Boulder at (${this.x}, ${this.y}) just started rolling - playing boulder sound`);
        }
        
        // Debug: Log when no sound is played
        if (!sound && (this.falling || this.rolling)) {
            console.log(`Boulder at (${this.x}, ${this.y}) is moving but no sound: falling=${this.falling}, rolling=${this.rolling}, justLanded=${this.justLanded}, justStartedRolling=${this.justStartedRolling}`);
        }
        
        return sound;
    }
    
    // ADDED: Method to check if boulder just stopped moving
    justStopped() {
        return this.justLanded;
    }
    
    // ADDED: Method to check if boulder just started moving
    justStartedMoving() {
        return this.justStartedRolling;
    }
}