/**
 * Manages game configuration and saved games
 */
export class ConfigManager {
    constructor() {
        this.config = {
            audio: {
                musicVolume: 70,
                sfxVolume: 80
            },
            graphics: {
                showFPS: false,
                enableWeather: true
            },
            controls: {
                keyBindings: {
                    up: 'w',
                    down: 's',
                    left: 'a',
                    right: 'd',
                    interact: 'e',
                    inventory: 'i',
                    quests: 'j',
                    map: 'm'
                }
            },
            gameplay: {
                difficulty: 'normal',
                tutorialEnabled: true,
                autoSaveInterval: 5
            }
        };
        
        // Saved games
        this.savedGames = [];
    }
    
    /**
     * Load configuration from local storage
     */
    async load() {
        try {
            // Load config
            const savedConfig = localStorage.getItem('isometric_world_config');
            if (savedConfig) {
                this.config = JSON.parse(savedConfig);
            }
            
            // Load saved games list
            const savedGamesList = localStorage.getItem('isometric_world_saved_games');
            if (savedGamesList) {
                this.savedGames = JSON.parse(savedGamesList);
            }
            
            console.log('Configuration loaded');
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    }
    
    /**
     * Save configuration to local storage
     */
    save() {
        try {
            localStorage.setItem('isometric_world_config', JSON.stringify(this.config));
            localStorage.setItem('isometric_world_saved_games', JSON.stringify(this.savedGames));
            console.log('Configuration saved');
        } catch (error) {
            console.error('Error saving configuration:', error);
        }
    }
    
    /**
     * Get configuration options
     * @returns {object} - Configuration options
     */
    getOptions() {
        return this.config;
    }
    
    /**
     * Save configuration options
     * @param {object} options - Configuration options to save
     */
    saveOptions(options) {
        // Merge with existing options
        this.config = this.deepMerge(this.config, options);
        this.save();
    }
    
    /**
     * Get saved games
     * @returns {Array} - List of saved games
     */
    getSavedGames() {
        return this.savedGames;
    }
    
    /**
     * Add a saved game to the list
     * @param {object} saveData - Save data object
     */
    addSavedGame(saveData) {
        // Check if save with same ID already exists
        const existingIndex = this.savedGames.findIndex(save => save.id === saveData.id);
        
        if (existingIndex >= 0) {
            // Update existing save
            this.savedGames[existingIndex] = saveData;
        } else {
            // Add new save
            this.savedGames.push(saveData);
        }
        
        // Sort saves by last played date
        this.savedGames.sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed));
        
        this.save();
    }
    
    /**
     * Delete a saved game
     * @param {string} saveId - ID of save to delete
     * @returns {boolean} - True if save was deleted
     */
    deleteSavedGame(saveId) {
        const initialLength = this.savedGames.length;
        this.savedGames = this.savedGames.filter(save => save.id !== saveId);
        
        // If a save was removed, save the updated list
        if (this.savedGames.length < initialLength) {
            this.save();
            return true;
        }
        
        return false;
    }
    
    /**
     * Deep merge two objects
     * @param {object} target - Target object
     * @param {object} source - Source object
     * @returns {object} - Merged object
     */
    deepMerge(target, source) {
        const output = { ...target };
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }
        
        return output;
    }
    
    /**
     * Check if value is an object
     * @param {any} item - Value to check
     * @returns {boolean} - True if value is an object
     */
    isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }
}

