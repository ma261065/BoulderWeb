// Base Entity class
class Entity {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
    }
    
    update(grid) {
        // Base update method to be overridden by subclasses
        return false; // Return true if the entity state changed
    }
    
    draw(ctx, x, y) {
        // Base draw method to be overridden by subclasses
    }
    
    // Helper method to check if a position is within grid bounds
    static isInBounds(x, y) {
        return x >= 0 && y >= 0 && x < GRID_WIDTH && y < GRID_HEIGHT;
    }
}