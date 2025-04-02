// Enhanced game configuration
class GameConfig {
    static get default() {
        return {
            grid: {
                width: 20,
                height: 15,
                tileSize: 40
            },
            levels: {
                baseWallCount: 20,
                wallIncrementPerLevel: 5,
                baseDiamondsNeeded: 5,
                diamondsIncrementPerLevel: 2,
                extraDiamonds: 5,
                baseBoulderCount: 10,
                boulderIncrementPerLevel: 2
            },
            gameLoop: {
                updateInterval: 100,
                timerInterval: 1000
            },
            player: {
                moveDelay: 150
            },
            time: {
                initialTime: 120
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
class AssetPreloader {
    constructor(config) {
        this.config = config;
        this.sprites = {};
        this.sounds = {};
        this.logger = new GameLogger();
    }

    async preloadSprites() {
        const spritePromises = Object.entries(SPRITE_PATHS).map(([name, path]) => 
            this.loadSprite(name, path)
        );
        return Promise.all(spritePromises);
    }

    async preloadSounds() {
        const soundPromises = Object.entries(SOUND_PATHS).map(([name, path]) => 
            this.loadSound(name, path)
        );
        return Promise.all(soundPromises);
    }

    async loadSprite(name, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.sprites[name] = img;
                this.logger.info(`Sprite loaded: ${name}`);
                resolve(img);
            };
            img.onerror = (error) => {
                this.logger.error(`Failed to load sprite: ${name}`, error);
                
                // Fallback sprite creation
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
                if (name === 'boulder' || name === 'diamond') {
                    ctx.beginPath();
                    ctx.arc(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/2 - 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
                }
                
                this.sprites[name] = canvas;
                resolve(canvas);
            };
            img.src = path;
        });
    }

    async loadSound(name, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(path);
            audio.addEventListener('canplaythrough', () => {
                this.sounds[name] = audio;
                this.logger.info(`Sound loaded: ${name}`);
                resolve(audio);
            });
            audio.addEventListener('error', (error) => {
                this.logger.error(`Failed to load sound: ${name}`, error);
                reject(error);
            });
            audio.load();
        });
    }

    getSprite(name) {
        return this.sprites[name];
    }

    getSound(name) {
        return this.sounds[name];
    }
}

// Export for use in other modules
window.GameConfig = GameConfig;
window.GameLogger = GameLogger;
window.AssetPreloader = AssetPreloader;