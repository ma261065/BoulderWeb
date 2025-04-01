class Game {
    constructor() {
        console.log('Creating new game instance...');
        
        // Game state
        this.grid = [];
        this.player = null;
        this.isGameOver = false;
        this.hasExitAppeared = false;
        this.diamondsCollected = 0;
        this.diamondsNeeded = 10;
        this.timeLeft = GAME_SETTINGS.initialTime;
        
        // Intervals
        this.gameInterval = null;
        this.timerInterval = null;
        
        // Systems - initialize in the correct order
        this.soundManager = new SoundManager();
        this.renderer = new Renderer(this);
        this.levelManager = new LevelManager(this);
        this.inputManager = new InputManager(this);
        
        // Create a global sprite manager
        window.spriteManager = new SpriteManager();
        
        // Load sprites first, then initialize the game
        window.spriteManager.loadSprites(() => {
            console.log('Sprites loaded, initializing game...');
            this.init();
        });
    }
    
    init() {
        console.log('Initializing game...');
        
        // Create the first level
        const levelData = this.levelManager.createLevel(this.levelManager.getCurrentLevel());
        this.grid = levelData.grid;
        this.player = levelData.player;
        
        // Reset game state
        this.diamondsCollected = 0;
        this.hasExitAppeared = false;
        this.timeLeft = GAME_SETTINGS.initialTime;
        this.isGameOver = false;
        
        // Update UI
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
        
        // Draw initial state
        this.renderer.drawGame();
        
        // Start game loop
        this.gameInterval = setInterval(() => this.update(), GAME_SETTINGS.gameUpdateInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), GAME_SETTINGS.timerUpdateInterval);
    }
    
    update() {
        if (this.isGameOver) return;
        
        let somethingChanged = false;
        
        // Process moving entities (boulders and diamonds)
        // Process from bottom to top, right to left for more natural falling behavior
        const movingEntities = this.levelManager.getMovingEntities();
        
        // Sort entities from bottom to top, right to left
        movingEntities.sort((a, b) => {
            if (a.y !== b.y) return b.y - a.y; // Bottom to top
            return b.x - a.x; // Right to left
        });
        
        // Update each entity
        for (const entity of movingEntities) {
            const changed = entity.update(this.grid);
            
            if (changed) {
                somethingChanged = true;
                
                // Check if sound should be played
                if (typeof entity.getFallingSound === 'function') {
                    const soundName = entity.getFallingSound();
                    if (soundName) {
                        this.soundManager.playSoundWithProbability(soundName, 0.1);
                    }
                }
                
                // Check if it falls on player
                if (entity.falling && 
                    this.player && 
                    this.player.y === entity.y && 
                    this.player.x === entity.x) {
                    this.gameOver(false);
                    return;
                }
            }
        }
        
        // Check if exit should appear
        if (!this.hasExitAppeared && this.diamondsCollected >= this.diamondsNeeded) {
            this.levelManager.createExit(this.grid);
            this.hasExitAppeared = true;
            somethingChanged = true;
        }
        
        // Redraw if something changed
        if (somethingChanged) {
            this.renderer.drawGame();
        }
    }
    
    updateTimer() {
        if (this.isGameOver) return;
        
        this.timeLeft--;
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
        
        if (this.timeLeft <= 0) {
            this.gameOver(false);
        }
    }
    
    collectDiamond() {
        this.diamondsCollected++;
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
    }
    
    setDiamondsNeeded(count) {
        this.diamondsNeeded = count;
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
    }
    
    levelComplete() {
        // Stop game intervals
        clearInterval(this.gameInterval);
        clearInterval(this.timerInterval);
        
        // Show level complete message
        this.renderer.drawMessage(
            'Level Complete!', 
            `Starting Level ${this.levelManager.getCurrentLevel() + 1} in 3 seconds...`
        );
        
        // Play level complete sound
        this.soundManager.playSound('levelComplete');
        
        // Start new level after delay
        setTimeout(() => {
            const nextLevel = this.levelManager.nextLevel();
            const levelData = this.levelManager.createLevel(nextLevel);
            
            this.grid = levelData.grid;
            this.player = levelData.player;
            
            // Reset game state
            this.diamondsCollected = 0;
            this.hasExitAppeared = false;
            this.timeLeft = GAME_SETTINGS.initialTime;
            
            // Update UI
            this.renderer.updateUI(
                this.levelManager.getCurrentLevel(),
                this.diamondsCollected,
                this.diamondsNeeded,
                this.timeLeft
            );
            
            // Draw initial state
            this.renderer.drawGame();
            
            // Start game loop
            this.gameInterval = setInterval(() => this.update(), GAME_SETTINGS.gameUpdateInterval);
            this.timerInterval = setInterval(() => this.updateTimer(), GAME_SETTINGS.timerUpdateInterval);
        }, 3000);
    }
    
    gameOver(won) {
        this.isGameOver = true;
        
        // Stop game intervals
        clearInterval(this.gameInterval);
        clearInterval(this.timerInterval);
        
        // Play game over sound
        this.soundManager.playSound('gameOver');
        
        // Show game over message
        this.renderer.drawMessage(
            won ? 'You Win!' : 'Game Over',
            'Press Enter to restart',
            won ? '#00FF00' : '#FF0000'
        );
    }
    
    restart() {
        const levelData = this.levelManager.createLevel(this.levelManager.getCurrentLevel());
        this.grid = levelData.grid;
        this.player = levelData.player;
        
        // Reset game state
        this.isGameOver = false;
        this.diamondsCollected = 0;
        this.hasExitAppeared = false;
        this.timeLeft = GAME_SETTINGS.initialTime;
        
        // Update UI
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
        
        // Draw initial state
        this.renderer.drawGame();
        
        // Start game loop
        this.gameInterval = setInterval(() => this.update(), GAME_SETTINGS.gameUpdateInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), GAME_SETTINGS.timerUpdateInterval);
    }
}
