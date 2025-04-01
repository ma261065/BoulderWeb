class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.soundToggle = document.getElementById('sound-toggle');
        
        // Initialize sound toggle button
        this.soundToggle.addEventListener('click', () => {
            this.toggleSound();
        });
        
        // Load all sounds
        this.loadSounds();
    }
    
    loadSounds() {
        // Create audio elements for each sound
        for (const [name, path] of Object.entries(SOUND_PATHS)) {
            const audio = new Audio(path);
            audio.preload = 'auto';
            this.sounds[name] = audio;
        }
    }
    
    playSound(name) {
        if (!this.enabled || !this.sounds[name]) return;
        
        // Create a clone to allow overlapping sounds
        const sound = this.sounds[name].cloneNode();
        sound.volume = 0.5; // Set a reasonable volume
        sound.play().catch(e => {
            console.log(`Error playing sound ${name}: ${e}`);
        });
    }
    
    playSoundWithProbability(name, probability = 0.1) {
        if (Math.random() < probability) {
            this.playSound(name);
        }
    }
    
    toggleSound() {
        this.enabled = !this.enabled;
        this.soundToggle.textContent = `Sound: ${this.enabled ? 'ON' : 'OFF'}`;
    }
}