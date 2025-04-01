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
        
        // First, draw from the grid directly (this ensures accurate representation)
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const tileType = this.game.grid[y][x];
                const drawX = x * TILE_SIZE;
                const drawY = y * TILE_SIZE;
                
                // Draw based on grid value
                switch (tileType) {
                    case ENTITY_TYPES.WALL:
                        this.drawWall(drawX, drawY);
                        break;
                    case ENTITY_TYPES.DIRT:
                        this.drawDirt(drawX, drawY);
                        break;
                    case ENTITY_TYPES.BOULDER:
                        this.drawBoulder(drawX, drawY);
                        break;
                    case ENTITY_TYPES.DIAMOND:
                        this.drawDiamond(drawX, drawY);
                        break;
                    case ENTITY_TYPES.PLAYER:
                        this.drawPlayer(drawX, drawY);
                        break;
                    case ENTITY_TYPES.EXIT:
                        this.drawExit(drawX, drawY);
                        break;
                }
            }
        }
    }
    
    drawWall(x, y) {
        if (window.spriteManager && window.spriteManager.getSprite('wall')) {
            this.ctx.drawImage(window.spriteManager.getSprite('wall'), x, y, TILE_SIZE, TILE_SIZE);
        } else {
            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        }
    }
    
    drawDirt(x, y) {
        if (window.spriteManager && window.spriteManager.getSprite('dirt')) {
            this.ctx.drawImage(window.spriteManager.getSprite('dirt'), x, y, TILE_SIZE, TILE_SIZE);
        } else {
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        }
    }
    
    drawBoulder(x, y) {
        if (window.spriteManager && window.spriteManager.getSprite('boulder')) {
            this.ctx.drawImage(window.spriteManager.getSprite('boulder'), x, y, TILE_SIZE, TILE_SIZE);
        } else {
            this.ctx.fillStyle = '#AAA';
            this.ctx.beginPath();
            this.ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, TILE_SIZE/2 - 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawDiamond(x, y) {
        if (window.spriteManager && window.spriteManager.getSprite('diamond')) {
            this.ctx.drawImage(window.spriteManager.getSprite('diamond'), x, y, TILE_SIZE, TILE_SIZE);
        } else {
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.beginPath();
            this.ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, TILE_SIZE/2 - 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawPlayer(x, y) {
        if (window.spriteManager && window.spriteManager.getSprite('player')) {
            this.ctx.drawImage(window.spriteManager.getSprite('player'), x, y, TILE_SIZE, TILE_SIZE);
        } else {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        }
    }
    
    drawExit(x, y) {
        if (window.spriteManager && window.spriteManager.getSprite('exit')) {
            this.ctx.drawImage(window.spriteManager.getSprite('exit'), x, y, TILE_SIZE, TILE_SIZE);
        } else {
            this.ctx.fillStyle = '#00FF00';
            this.ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
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