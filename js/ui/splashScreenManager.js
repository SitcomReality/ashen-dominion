/**
 * Manages the splash screen and menu navigation
 */
export class SplashScreenManager {
    constructor(game) {
        this.game = game;
        this.splashScreen = document.getElementById('splash-screen');
        this.newGameScreen = document.getElementById('new-game-screen');
        this.loadGameScreen = document.getElementById('load-game-screen');
        this.optionsScreen = document.getElementById('options-screen');
        
        // Initialize options screen values
        this.initOptionsValues();
    }
    
    /**
     * Shows the main splash screen
     */
    showSplashScreen() {
        this.hideAllScreens();
        this.splashScreen.classList.remove('hidden');
    }
    
    /**
     * Shows the new game screen for character creation
     */
    showNewGameScreen() {
        this.hideAllScreens();
        
        // Generate a random seed if none is set
        if (!document.getElementById('world-seed').value) {
            document.getElementById('world-seed').value = Math.floor(Math.random() * 1000000).toString();
        }
        
        this.newGameScreen.classList.remove('hidden');
    }
    
    /**
     * Shows the load game screen
     */
    showLoadGameScreen() {
        this.hideAllScreens();
        this.loadGameScreen.classList.remove('hidden');
        
        // Load saved games
        this.loadSavedGames();
    }
    
    /**
     * Shows the options screen
     */
    showOptionsScreen() {
        this.hideAllScreens();
        this.optionsScreen.classList.remove('hidden');
    }
    
    /**
     * Hides all menu screens
     */
    hideAllScreens() {
        this.splashScreen.classList.add('hidden');
        this.newGameScreen.classList.add('hidden');
        this.loadGameScreen.classList.add('hidden');
        this.optionsScreen.classList.add('hidden');
    }
    
    /**
     * Loads saved games and displays them
     */
    loadSavedGames() {
        const savedGamesList = document.querySelector('.saved-games-list');
        savedGamesList.innerHTML = '';
        
        // Try to get saved games from local storage
        const savedGames = this.game.configManager.getSavedGames();
        
        if (savedGames.length === 0) {
            savedGamesList.innerHTML = '<p>No saved games found.</p>';
            document.getElementById('load-selected-btn').disabled = true;
            return;
        }
        
        // Enable the load button
        document.getElementById('load-selected-btn').disabled = false;
        
        // Create a list item for each saved game
        savedGames.forEach(save => {
            const saveItem = document.createElement('div');
            saveItem.className = 'saved-game-item';
            saveItem.dataset.saveId = save.id;
            
            const lastPlayed = new Date(save.lastPlayed).toLocaleString();
            
            saveItem.innerHTML = `
                <h3>${save.characterName}</h3>
                <p>World: ${save.worldName}</p>
                <p>Last played: ${lastPlayed}</p>
                <p>Play time: ${this.formatPlayTime(save.playTime)}</p>
            `;
            
            saveItem.addEventListener('click', () => {
                // Remove selected class from all items
                document.querySelectorAll('.saved-game-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Add selected class to clicked item
                saveItem.classList.add('selected');
            });
            
            savedGamesList.appendChild(saveItem);
        });
    }
    
    /**
     * Formats play time in seconds to a readable format
     * @param {number} seconds - Play time in seconds
     * @returns {string} Formatted play time
     */
    formatPlayTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
    
    /**
     * Initialize options screen with current config values
     */
    initOptionsValues() {
        const options = this.game.configManager.getOptions();
        
        // Set audio values
        document.getElementById('music-volume').value = options.audio.musicVolume;
        document.getElementById('sfx-volume').value = options.audio.sfxVolume;
        
        // Update value displays
        document.querySelector('#music-volume + .slider-value').textContent = 
            `${options.audio.musicVolume}%`;
        document.querySelector('#sfx-volume + .slider-value').textContent = 
            `${options.audio.sfxVolume}%`;
        
        // Set graphics options
        document.getElementById('show-fps').checked = options.graphics.showFPS;
        document.getElementById('enable-weather').checked = options.graphics.enableWeather;
        
        // Add event listeners for updating displayed values
        document.getElementById('music-volume').addEventListener('input', (e) => {
            document.querySelector('#music-volume + .slider-value').textContent = `${e.target.value}%`;
        });
        
        document.getElementById('sfx-volume').addEventListener('input', (e) => {
            document.querySelector('#sfx-volume + .slider-value').textContent = `${e.target.value}%`;
        });
    }
}

