class SpriteManager {
    constructor() {
        this.sprites = {};
        this.isLoaded = false;
    }
    
    async loadSprites() {
        const loadPromises = Object.entries(SPRITE_PATHS).map(([name, path]) => 
            this.loadSprite(name, path)
        );
        
        await Promise.allSettled(loadPromises);
        this.isLoaded = true;
        console.log('All sprites loaded');
    }
    
    loadSprite(name, path) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                this.sprites[name] = img;
                resolve();
            };
            
            img.onerror = () => {
                console.warn(`Failed to load sprite: ${name}, using fallback`);
                this.sprites[name] = this.createFallbackSprite(name);
                resolve();
            };
            
            img.src = path;
        });
    }
    
    createFallbackSprite(name) {
        const canvas = document.createElement('canvas');
        canvas.width = TILE_SIZE;
        canvas.height = TILE_SIZE;
        const ctx = canvas.getContext('2d');
        
        const colors = {
            wall: '#555',
            dirt: '#8B4513', 
            boulder: '#AAA',
            diamond: '#00FFFF',
            player: '#FF0000',
            exit: '#00FF00'
        };
        
        ctx.fillStyle = colors[name] || '#FFF';
        
        if (name === 'boulder' || name === 'diamond') {
            ctx.beginPath();
            ctx.arc(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/2 - 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
        }
        
        return canvas;
    }
    
    getSprite(name) {
        return this.sprites[name];
    }
}