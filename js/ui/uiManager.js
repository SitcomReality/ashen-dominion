import { InventoryUI } from './interfaces/inventoryUI.js';
import { DialogueUI } from './interfaces/dialogueUI.js';
import { QuestUI } from './interfaces/questUI.js';
import { TradingUI } from './interfaces/tradingUI.js';
import { DevToolsUI } from './interfaces/devToolsUI.js';

/**
 * Manages all UI components and interfaces
 */
export class UIManager {
    constructor(game) {
        this.game = game;
        
        // UI components
        this.inventoryUI = null;
        this.dialogueUI = null;
        this.questUI = null;
        this.tradingUI = null;
        this.devToolsUI = null;
        
        // UI state
        this.activeModal = null;
        
        // Initialize UI interfaces
        this.initInterfaces();
    }
    
    /**
     * Initialize UI interface components
     */
    initInterfaces() {
        this.inventoryUI = new InventoryUI(this);
        this.dialogueUI = new DialogueUI(this);
        this.questUI = new QuestUI(this);
        this.tradingUI = new TradingUI(this);
        this.devToolsUI = new DevToolsUI(this);
        
        // Set up global UI event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners for UI components
     */
    setupEventListeners() {
        // Close buttons for modals
        document.querySelectorAll('.close-modal-btn').forEach(button => {
            button.addEventListener('click', () => {
                this.closeActiveModal();
            });
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeActiveModal();
            }
            
            // Toggle inventory with 'I' key
            if (e.key === 'i' || e.key === 'I') {
                this.toggleInventory();
            }
            
            // Toggle quests with 'J' key
            if (e.key === 'j' || e.key === 'J') {
                this.toggleQuests();
            }
            
            // Toggle dev tools with 'F12' key
            if (e.key === 'F12') {
                this.toggleDevTools();
                e.preventDefault();
            }
        });
    }
    
    /**
     * Initialize the in-game UI
     */
    initGameUI() {
        // Update player stats display
        this.updatePlayerStats();
        
        // Initialize time display
        this.updateTimeDisplay({
            hour: 6,
            minute: 0,
            day: 1,
            season: 'Spring'
        });
        
        // Setup action bar
        this.setupActionBar();
    }
    
    /**
     * Update player stats display
     */
    updatePlayerStats(stats = { health: 100, maxHealth: 100, energy: 80, maxEnergy: 100 }) {
        const healthBar = document.querySelector('.health-value');
        const energyBar = document.querySelector('.energy-value');
        
        const healthPercent = (stats.health / stats.maxHealth) * 100;
        const energyPercent = (stats.energy / stats.maxEnergy) * 100;
        
        healthBar.style.width = `${healthPercent}%`;
        energyBar.style.width = `${energyPercent}%`;
        
        // Update color based on health level
        if (healthPercent < 20) {
            healthBar.style.backgroundColor = '#e74c3c';
        } else if (healthPercent < 50) {
            healthBar.style.backgroundColor = '#e67e22';
        } else {
            healthBar.style.backgroundColor = '#2ecc71';
        }
    }
    
    /**
     * Update time display
     */
    updateTimeDisplay(timeData) {
        const timeText = document.querySelector('.time-text');
        const dayCycle = document.querySelector('.day-cycle');
        const seasonIndicator = document.querySelector('.season-indicator');
        
        // Format time as hours:minutes
        const hours = timeData.hour.toString().padStart(2, '0');
        const minutes = timeData.minute.toString().padStart(2, '0');
        timeText.textContent = `Day ${timeData.day} - ${hours}:${minutes}`;
        
        // Update day/night cycle indicator
        const isDaytime = timeData.hour >= 6 && timeData.hour < 18;
        dayCycle.style.background = isDaytime 
            ? 'linear-gradient(to bottom, #87CEEB, #FFD700)' // Day
            : 'linear-gradient(to bottom, #191970, #483D8B)'; // Night
        
        // Update season indicator color
        let seasonColor;
        switch (timeData.season) {
            case 'Spring':
                seasonColor = '#77dd77'; // Light green
                break;
            case 'Summer':
                seasonColor = '#ffb347'; // Orange
                break;
            case 'Fall':
                seasonColor = '#bc6c25'; // Brown
                break;
            case 'Winter':
                seasonColor = '#a0d2eb'; // Light blue
                break;
            default:
                seasonColor = '#ffffff';
        }
        seasonIndicator.style.backgroundColor = seasonColor;
    }
    
    /**
     * Setup action bar with initial actions
     */
    setupActionBar() {
        const actionBar = document.getElementById('action-bar');
        
        // Clear existing content
        actionBar.innerHTML = '';
        
        // Add initial action buttons
        const actions = [
            { id: 'inventory-btn', icon: '📦', tooltip: 'Inventory (I)' },
            { id: 'quests-btn', icon: '📜', tooltip: 'Quests (J)' },
            { id: 'interact-btn', icon: '👋', tooltip: 'Interact (E)' },
            { id: 'map-btn', icon: '🗺️', tooltip: 'Map (M)' }
        ];
        
        actions.forEach(action => {
            const button = document.createElement('button');
            button.id = action.id;
            button.className = 'action-button';
            button.innerHTML = action.icon;
            button.title = action.tooltip;
            
            actionBar.appendChild(button);
        });
        
        // Add event listeners
        document.getElementById('inventory-btn').addEventListener('click', () => {
            this.toggleInventory();
        });
        
        document.getElementById('quests-btn').addEventListener('click', () => {
            this.toggleQuests();
        });
    }
    
    /**
     * Show a notification message
     * @param {string} message - The notification message
     * @param {string} [type='info'] - The notification type (info, success, warning, error)
     * @param {number} [duration=3000] - How long to show the notification in milliseconds
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notificationArea = document.getElementById('notification-area');
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to notification area
        notificationArea.appendChild(notification);
        
        // Add visible class after a short delay (for animation)
        setTimeout(() => {
            notification.classList.add('visible');
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.classList.remove('visible');
            
            // Remove from DOM after fade out animation
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
    }
    
    /**
     * Toggle inventory modal
     */
    toggleInventory() {
        const inventoryModal = document.getElementById('inventory-modal');
        
        if (inventoryModal.classList.contains('hidden')) {
            this.closeActiveModal();
            inventoryModal.classList.remove('hidden');
            this.activeModal = 'inventory';
            this.inventoryUI.update();
        } else {
            inventoryModal.classList.add('hidden');
            this.activeModal = null;
        }
    }
    
    /**
     * Toggle quests modal
     */
    toggleQuests() {
        const questModal = document.getElementById('quest-modal');
        
        if (questModal.classList.contains('hidden')) {
            this.closeActiveModal();
            questModal.classList.remove('hidden');
            this.activeModal = 'quests';
            this.questUI.update();
        } else {
            questModal.classList.add('hidden');
            this.activeModal = null;
        }
    }
    
    /**
     * Show dialogue modal with dialogue options
     * @param {object} dialogueData - Dialogue data
     */
    showDialogue(dialogueData) {
        this.closeActiveModal();
        
        const dialogueModal = document.getElementById('dialogue-modal');
        dialogueModal.classList.remove('hidden');
        this.activeModal = 'dialogue';
        
        this.dialogueUI.showDialogue(dialogueData);
    }
    
    /**
     * Show trading interface with a merchant
     * @param {object} merchantData - Merchant data
     */
    showTrading(merchantData) {
        this.closeActiveModal();
        
        const tradingModal = document.getElementById('trading-modal');
        tradingModal.classList.remove('hidden');
        this.activeModal = 'trading';
        
        this.tradingUI.setupTrading(merchantData);
    }
    
    /**
     * Toggle dev tools panel
     */
    toggleDevTools() {
        const devTools = document.getElementById('dev-tools');
        
        if (devTools.classList.contains('hidden')) {
            devTools.classList.remove('hidden');
            this.devToolsUI.update();
        } else {
            devTools.classList.add('hidden');
        }
    }
    
    /**
     * Close the currently active modal
     */
    closeActiveModal() {
        if (!this.activeModal) return;
        
        switch (this.activeModal) {
            case 'inventory':
                document.getElementById('inventory-modal').classList.add('hidden');
                break;
            case 'dialogue':
                document.getElementById('dialogue-modal').classList.add('hidden');
                break;
            case 'quests':
                document.getElementById('quest-modal').classList.add('hidden');
                break;
            case 'trading':
                document.getElementById('trading-modal').classList.add('hidden');
                break;
        }
        
        this.activeModal = null;
    }
}

