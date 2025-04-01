class SpriteManager {
    constructor() {
        console.log('Initializing sprite manager...');
        this.sprites = {};
        this.loaded = false;
        this.isLoaded = false; // Used to check if sprites are loaded
        this.totalSprites = Object.keys(SPRITE_PATHS).length;
        this.loadedSprites = 0;
        
        // Load sprites
        this.loadSprites(() => {
            console.log('All sprites loaded.');
            this.isLoaded = true;
        });
    }
    
    loadSprites(callback) {
        console.log('Loading sprites...');
        
        // Load each sprite
        for (const [name, path] of Object.entries(SPRITE_PATHS)) {
            const img = new Image();
            
            img.onload = () => {
                this.loadedSprites++;
                console.log(`Loaded sprite: ${name} (${this.loadedSprites}/${this.totalSprites})`);
                
                if (this.loadedSprites === this.totalSprites) {
                    console.log('All sprites loaded!');
                    this.loaded = true;
                    this.isLoaded = true;
                    if (callback) callback();
                }
            };
            
            img.onerror = () => {
                console.error(`Failed to load sprite: ${name} from ${path}`);
                // Create a fallback colored rectangle
                const canvas = document.createElement('canvas');
                canvas.width = TILE_SIZE;
                canvas.height = TILE_SIZE;
                const ctx = canvas.getContext('2d');
                
                // Different colors for different entity types
                let color;
                switch (name) {
                    case 'wall': color = '#555'; break;
                    case 'dirt': color = '#8B4513'; break;
                    case 'boulder': color = '#AAA'; break;
                    case 'diamond': color = '#00FFFF'; break;
                    case 'player': color = '#FF0000'; break;
                    case 'exit': color = '#00FF00'; break;
                    default: color = '#FFF';
                }
                
                ctx.fillStyle = color;
                
                // Boulders and diamonds are circles, others are rectangles
                // Use smaller margins for smaller tile size
                if (name === 'boulder' || name === 'diamond') {
                    ctx.beginPath();
                    ctx.arc(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/2 - 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
                }
                
                this.sprites[name] = canvas;
                this.loadedSprites++;
                
                if (this.loadedSprites === this.totalSprites) {
                    console.log('All sprites loaded (some with fallbacks)!');
                    this.loaded = true;
                    this.isLoaded = true;
                    if (callback) callback();
                }
            };
            
            img.src = path;
            this.sprites[name] = img;
            console.log(`Started loading sprite: ${name} from ${path}`);
        }
    }
    
    getSprite(name) {
        return this.sprites[name];
    }
}