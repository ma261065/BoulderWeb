class Renderer {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
    }
    
    drawGame() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw black background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        console.log(`Drawing ${this.game.levelManager.entityInstances.length} entities`);
        
        // Draw all entities
        for (const entity of this.game.levelManager.entityInstances) {
            const drawX = entity.x * TILE_SIZE;
            const drawY = entity.y * TILE_SIZE;
            entity.draw(this.ctx, drawX, drawY);
        }
    }
    
    drawMessage(message, subMessage, color) {
        // Draw semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw main message
        this.ctx.fillStyle = color || '#FFFFFF';
        this.ctx.font = '40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        // Draw sub-message if provided
        if (subMessage) {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(subMessage, this.canvas.width / 2, this.canvas.height / 2 + 20);
        }
    }
    
    updateUI(level, diamondsCollected, diamondsNeeded, timeLeft) {
        const levelInfo = document.getElementById('level-info');
        const diamondsInfo = document.getElementById('diamonds-info');
        const timeInfo = document.getElementById('time-info');
        
        levelInfo.textContent = `Level: ${level}`;
        diamondsInfo.textContent = `Diamonds: ${diamondsCollected}/${diamondsNeeded}`;
        timeInfo.textContent = `Time: ${timeLeft}`;
    }
}
