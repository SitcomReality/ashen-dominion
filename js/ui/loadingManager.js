/**
 * Manages the loading screen and loading progress
 */
export class LoadingManager {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressBar = document.querySelector('.loading-progress');
    }
    
    /**
     * Show the loading screen
     */
    showLoadingScreen() {
        this.loadingScreen.classList.add('active');
    }
    
    /**
     * Hide the loading screen
     */
    hideLoadingScreen() {
        this.loadingScreen.classList.remove('active');
        setTimeout(() => {
            this.loadingScreen.classList.add('hidden');
        }, 500); // Wait for the fade out animation to complete
    }
    
    /**
     * Update the loading progress
     * @param {number} percent - Loading progress percentage (0-100)
     * @param {string} [message] - Optional loading message
     */
    updateProgress(percent, message) {
        // Update the progress bar width
        this.progressBar.style.width = `${percent}%`;
        
        // Log the loading message if provided
        if (message) {
            console.log(`Loading: ${message} (${percent}%)`);
        }
    }
}

