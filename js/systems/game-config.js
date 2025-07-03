// Enhanced game configuration
class GameConfig {
    static get default() {
        return {
            grid: {
                width: GRID_WIDTH || 64,
                height: GRID_HEIGHT || 32,
                tileSize: TILE_SIZE || 32
            },
            levels: {
                baseWallCount: GAME_SETTINGS.baseWallCount || 20,
                wallIncrementPerLevel: GAME_SETTINGS.wallIncrementPerLevel || 5,
                baseDiamondsNeeded: GAME_SETTINGS.baseDiamondsNeeded || 5,
                diamondsIncrementPerLevel: GAME_SETTINGS.diamondsIncrementPerLevel || 2,
                extraDiamonds: GAME_SETTINGS.extraDiamonds || 5,
                baseBoulderCount: GAME_SETTINGS.baseBoulderCount || 10,
                boulderIncrementPerLevel: GAME_SETTINGS.boulderIncrementPerLevel || 2
            },
            gameLoop: {
                updateInterval: GAME_SETTINGS.gameUpdateInterval || 250,
                timerInterval: GAME_SETTINGS.timerUpdateInterval || 1000,
                physicsFPS: GAME_SETTINGS.physicsFPS || 4
            },
            player: {
                moveDelay: GAME_SETTINGS.moveDelay || 150
            },
            time: {
                initialTime: GAME_SETTINGS.initialTime || 120
            }
        };
    }

    constructor(customConfig = {}) {
        this.config = this.deepMerge(GameConfig.default, customConfig);
    }

    deepMerge(target, source) {
        const output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target))
                        Object.assign(output, { [key]: source[key] });
                    else
                        output[key] = this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    get(path) {
        return path.split('.').reduce((obj, key) => 
            (obj && obj[key] !== 'undefined') ? obj[key] : undefined, 
            this.config
        );
    }
}

// Logging utility
class GameLogger {
    static levels = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    };

    constructor(level = GameLogger.levels.INFO) {
        this.level = level;
        this.logs = [];
    }

    log(level, message, data = null) {
        if (level <= this.level) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                level: Object.keys(GameLogger.levels)[level],
                message,
                data
            };

            console.log(JSON.stringify(logEntry));
            this.logs.push(logEntry);
        }
    }

    error(message, data = null) {
        this.log(GameLogger.levels.ERROR, message, data);
    }

    warn(message, data = null) {
        this.log(GameLogger.levels.WARN, message, data);
    }

    info(message, data = null) {
        this.log(GameLogger.levels.INFO, message, data);
    }

    debug(message, data = null) {
        this.log(GameLogger.levels.DEBUG, message, data);
    }
}

// Asset Preloader
// Simplified AssetPreloader for Option 2 (all images in SPRITE_PATHS)
class AssetPreloader {
    constructor(config) {
        this.config = config;
        this.sprites = {};
        this.sounds = {};
    }

    async preloadSprites() {
        console.log('Preloading sprites...');
        
        // Load all sprites (including scoreboard images) from SPRITE_PATHS
        const spritePromises = Object.entries(SPRITE_PATHS).map(async ([name, path]) => {
            try {
                const img = new Image();
                img.src = path;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                this.sprites[name] = img;
                console.log(`Loaded sprite: ${name}`);
            } catch (error) {
                console.warn(`Failed to load sprite ${name}: ${error.message}`);
                // Create a fallback colored rectangle
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                
                if (name.startsWith('digit_')) {
                    // Draw the digit as text for fallback
                    ctx.fillStyle = '#00FF00';
                    ctx.font = '24px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(name.replace('digit_', ''), 16, 24);
                } else if (name.startsWith('hdr_')) {
                    // Draw a colored square for headers
                    ctx.fillStyle = '#00FFFF';
                    ctx.fillRect(0, 0, 32, 32);
                    ctx.fillStyle = '#000000';
                    ctx.font = '8px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(name.replace('hdr_', ''), 16, 18);
                } else {
                    // Regular game sprite fallback
                    ctx.fillStyle = this.getFallbackColor(name);
                    ctx.fillRect(0, 0, 32, 32);
                }
                
                this.sprites[name] = canvas;
            }
        });

        await Promise.all(spritePromises);
        console.log('All sprites loaded:', Object.keys(this.sprites));
    }

    async preloadSounds() {
        console.log('Preloading sounds...');
        // Your existing sound loading logic here
        // ...
    }

    getSprite(name) {
        return this.sprites[name] || null;
    }

    // For scoreboard images, just use the regular sprite method
    getScoreboardImage(name) {
        return this.sprites[name] || null;
    }

    getFallbackColor(name) {
        const colors = {
            'wall': '#808080',
            'dirt': '#8B4513',
            'boulder': '#696969',
            'diamond': '#00FFFF',
            'player': '#FFFF00',
            'exit': '#00FF00'
        };
        return colors[name] || '#FF00FF';
    }
}

// Export for use in other modules
window.GameConfig = GameConfig;
window.GameLogger = GameLogger;
window.AssetPreloader = AssetPreloader;