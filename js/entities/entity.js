// Base Entity class with improved method signatures
class Entity {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
    }
    
    /**
     * Update the entity state
     * @param {Array<Array<number>>} grid - The game grid
     * @returns {boolean} true if the entity changed state, false otherwise
     */
    update(grid) {
        // Base update method to be overridden by subclasses
        console.log(`Entity.update called for ${this.constructor.name} at (${this.x},${this.y})`);
        return false; // Return true if the entity state changed
    }
    
    /**
     * Draw the entity
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     * @param {number} x - The x coordinate to draw at
     * @param {number} y - The y coordinate to draw at
     * @param {number} tileSize - The size of a tile in pixels
     */
    draw(ctx, x, y, tileSize = TILE_SIZE) {
        // Base draw method to be overridden by subclasses
        console.log(`Entity.draw called for ${this.constructor.name} at (${x},${y})`);
    }
    
    /**
     * Helper method to check if a position is within grid bounds
     * @param {number} x - The x coordinate to check
     * @param {number} y - The y coordinate to check
     * @returns {boolean} true if in bounds, false otherwise
     */
    static isInBounds(x, y) {
        return x >= 0 && y >= 0 && x < GRID_WIDTH && y < GRID_HEIGHT;
    }
    
    /**
     * Get string representation of this entity
     * @returns {string} A string representation
     */
    toString() {
        const typeName = Object.keys(ENTITY_TYPES).find(key => ENTITY_TYPES[key] === this.type) || 'UNKNOWN';
        return `${this.constructor.name}(type=${typeName}, x=${this.x}, y=${this.y})`;
    }
}