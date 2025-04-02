// Updated Renderer class with fixed vertical handling

class Renderer {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Fixed tile size - never changes
        this.TILE_SIZE = 32;
        
        // Viewport dimensions (will be calculated based on canvas display size)
        this.viewport = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        
        // Ensure crisp pixel rendering
        this.ctx.imageSmoothingEnabled = false;
        
        // Set up resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Handle initial sizing
        this.handleResize();
    }
    
    handleResize() {
        // Get the container size
        const container = document.getElementById('game-container');
        const containerRect = container.getBoundingClientRect();
        
        // Calculate available space (accounting for info panel, etc.)
        // Subtract some space for other elements to prevent scrollbars
        const availableWidth = containerRect.width;
        const availableHeight = window.innerHeight - 150; // Space for header, info panel, etc.
        
        // Calculate how many tiles can fit in the available space
        const tilesWide = Math.floor(availableWidth / this.TILE_SIZE);
        const tilesHigh = Math.floor(availableHeight / this.TILE_SIZE);
        
        // Set canvas size to exactly fit these tiles (no partial tiles)
        this.canvas.width = tilesWide * this.TILE_SIZE;
        this.canvas.height = tilesHigh * this.TILE_SIZE;
        
        // Update viewport dimensions
        this.viewport.width = Math.min(tilesWide, GRID_WIDTH);
        this.viewport.height = Math.min(tilesHigh, GRID_HEIGHT);
        
        // Center viewport on player if possible
        if (this.game && this.game.player) {
            this.centerViewportOnPlayer();
        }
        
        console.log(`Available space: ${availableWidth}x${availableHeight}`);
        console.log(`Canvas size: ${this.canvas.width}x${this.canvas.height}`);
        console.log(`Viewport: ${this.viewport.width}x${this.viewport.height} tiles`);
        
        // Redraw the game with the new viewport
        this.drawGame();
    }
    
    centerViewportOnPlayer() {
        if (!this.game || !this.game.player) return;
        
        // Center viewport on player position
        this.viewport.x = Math.floor(this.game.player.x - this.viewport.width / 2);
        this.viewport.y = Math.floor(this.game.player.y - this.viewport.height / 2);
        
        // Clamp to grid boundaries
        this.viewport.x = Math.max(0, Math.min(GRID_WIDTH - this.viewport.width, this.viewport.x));
        this.viewport.y = Math.max(0, Math.min(GRID_HEIGHT - this.viewport.height, this.viewport.y));
    }
    
    updateViewportPosition() {
        if (!this.game || !this.game.player) return false;
        
        const playerX = this.game.player.x;
        const playerY = this.game.player.y;
        
        // Only update if we're not showing the full grid
        if (this.viewport.width < GRID_WIDTH || this.viewport.height < GRID_HEIGHT) {
            // Define margins (20% of viewport size)
            const marginX = Math.max(1, Math.floor(this.viewport.width * 0.2));
            const marginY = Math.max(1, Math.floor(this.viewport.height * 0.2));
            
            let changed = false;
            
            // Scroll viewport if player is too close to the edge
            if (playerX < this.viewport.x + marginX) {
                this.viewport.x = Math.max(0, playerX - marginX);
                changed = true;
            } else if (playerX >= this.viewport.x + this.viewport.width - marginX) {
                this.viewport.x = Math.min(
                    GRID_WIDTH - this.viewport.width, 
                    playerX + marginX - this.viewport.width
                );
                changed = true;
            }
            
            if (playerY < this.viewport.y + marginY) {
                this.viewport.y = Math.max(0, playerY - marginY);
                changed = true;
            } else if (playerY >= this.viewport.y + this.viewport.height - marginY) {
                this.viewport.y = Math.min(
                    GRID_HEIGHT - this.viewport.height, 
                    playerY + marginY - this.viewport.height
                );
                changed = true;
            }
            
            return changed;
        }
        
        return false;
    }
    
    drawGame() {
        // Ensure grid and viewport are available
        if (!this.game || !this.game.grid || this.game.grid.length === 0 || !this.viewport) {
            console.warn('Cannot draw game: grid or viewport not available');
            return;
        }
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw black background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate offset to center the visible part of the grid
        const gameWidth = this.viewport.width * this.TILE_SIZE;
        const gameHeight = this.viewport.height * this.TILE_SIZE;
        const offsetX = Math.floor((this.canvas.width - gameWidth) / 2);
        const offsetY = Math.floor((this.canvas.height - gameHeight) / 2);
        
        // Draw each visible tile
        for (let y = 0; y < this.viewport.height; y++) {
            for (let x = 0; x < this.viewport.width; x++) {
                // Convert viewport coordinates to grid coordinates
                const gridX = x + this.viewport.x;
                const gridY = y + this.viewport.y;
                
                // Skip if outside grid boundaries
                if (gridX < 0 || gridY < 0 || gridX >= GRID_WIDTH || gridY >= GRID_HEIGHT) {
                    continue;
                }
                
                // Skip if grid position doesn't exist (safety check)
                if (!this.game.grid[gridY] || typeof this.game.grid[gridY][gridX] === 'undefined') {
                    continue;
                }
                
                // Get tile type from grid
                const tileType = this.game.grid[gridY][gridX];
                
                // Calculate drawing position
                const drawX = x * this.TILE_SIZE + offsetX;
                const drawY = y * this.TILE_SIZE + offsetY;
                
                // Draw based on tile type
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
        
        // Draw mini-map if not showing entire grid
        if (this.viewport.width < GRID_WIDTH || this.viewport.height < GRID_HEIGHT) {
            this.drawMiniMap();
        }
    }
    
    drawMiniMap() {
        // Skip if canvas is too small for a meaningful mini-map
        if (this.canvas.width < 200 || this.canvas.height < 200) return;
        
        // Mini-map settings
        const mapSize = Math.min(100, Math.min(this.canvas.width, this.canvas.height) * 0.2);
        const padding = 10;
        const mapX = this.canvas.width - mapSize - padding;
        const mapY = this.canvas.height - mapSize - padding;
        
        // Calculate scaling
        const scaleX = mapSize / GRID_WIDTH;
        const scaleY = mapSize / GRID_HEIGHT;
        
        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(mapX, mapY, mapSize, mapSize);
        
        // Draw grid outline
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(mapX, mapY, mapSize, mapSize);
        
        // Draw viewport rectangle
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            mapX + this.viewport.x * scaleX,
            mapY + this.viewport.y * scaleY,
            this.viewport.width * scaleX,
            this.viewport.height * scaleY
        );
        
        // Draw player position
        if (this.game && this.game.player) {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.beginPath();
            this.ctx.arc(
                mapX + this.game.player.x * scaleX,
                mapY + this.game.player.y * scaleY,
                3, 0, Math.PI * 2
            );
            this.ctx.fill();
        }
    }
    
    // Drawing methods - all use the fixed tile size
    
    drawWall(x, y) {
        if (window.spriteManager && window.spriteManager.getSprite('wall')) {
            this.ctx.drawImage(window.spriteManager.getSprite('wall'), x, y, this.TILE_SIZE, this.TILE_SIZE);
        } else {
            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(x, y, this.TILE_SIZE, this.TILE_SIZE);
        }
    }
    
    drawDirt(x, y) {
        if (window.spriteManager && window.spriteManager.getSprite('dirt')) {
            this.ctx.drawImage(window.spriteManager.getSprite('dirt'), x, y, this.TILE_SIZE, this.TILE_SIZE);
        } else {
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(x + 2, y + 2, this.TILE_SIZE - 4, this.TILE_SIZE - 4);
        }
    }
    
    drawBoulder(x, y) {
        if (window.spriteManager && window.spriteManager.getSprite('boulder')) {
            this.ctx.drawImage(window.spriteManager.getSprite('boulder'), x, y, this.TILE_SIZE, this.TILE_SIZE);
        } else {
            this.ctx.fillStyle = '#AAA';
            this.ctx.beginPath();
            this.ctx.arc(x + this.TILE_SIZE/2, y + this.TILE_SIZE/2, this.TILE_SIZE/2 - 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawDiamond(x, y) {
        if (window.spriteManager && window.spriteManager.getSprite('diamond')) {
            this.ctx.drawImage(window.spriteManager.getSprite('diamond'), x, y, this.TILE_SIZE, this.TILE_SIZE);
        } else {
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.beginPath();
            this.ctx.arc(x + this.TILE_SIZE/2, y + this.TILE_SIZE/2, this.TILE_SIZE/2 - 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawPlayer(x, y) {
        if (window.spriteManager && window.spriteManager.getSprite('player')) {
            this.ctx.drawImage(window.spriteManager.getSprite('player'), x, y, this.TILE_SIZE, this.TILE_SIZE);
        } else {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillRect(x, y, this.TILE_SIZE, this.TILE_SIZE);
        }
    }
    
    drawExit(x, y) {
        if (window.spriteManager && window.spriteManager.getSprite('exit')) {
            this.ctx.drawImage(window.spriteManager.getSprite('exit'), x, y, this.TILE_SIZE, this.TILE_SIZE);
        } else {
            this.ctx.fillStyle = '#00FF00';
            this.ctx.fillRect(x, y, this.TILE_SIZE, this.TILE_SIZE);
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