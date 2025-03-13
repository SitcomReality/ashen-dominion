/**
 * Handles inventory UI functionality
 */
export class InventoryUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.inventoryContainer = document.querySelector('#inventory-modal .inventory-grid');
        this.equipmentContainer = document.querySelector('#inventory-modal .equipment-slots');
        this.statsContainer = document.querySelector('#inventory-modal .character-stats');
    }
    
    /**
     * Update the inventory display
     */
    update() {
        this.renderInventory();
        this.renderEquipment();
        this.renderStats();
        this.setupEventListeners();
    }
    
    /**
     * Render the player's inventory
     */
    renderInventory() {
        // Clear existing inventory
        this.inventoryContainer.innerHTML = '';
        
        // Get player inventory from game engine
        const playerInventory = this.uiManager.game.engine.getPlayerInventory();
        const inventorySize = playerInventory.size;
        
        // Create inventory slots
        for (let i = 0; i < inventorySize; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.slotIndex = i;
            
            // If there's an item in this slot, show it
            if (playerInventory.items[i]) {
                const item = playerInventory.items[i];
                slot.innerHTML = `
                    <div class="item-icon">${this.getItemIcon(item)}</div>
                    <div class="item-count">${item.count > 1 ? item.count : ''}</div>
                `;
                slot.title = `${item.name}\n${item.description}`;
                slot.classList.add('has-item');
                slot.dataset.itemId = item.id;
            }
            
            this.inventoryContainer.appendChild(slot);
        }
    }
    
    /**
     * Render the player's equipped items
     */
    renderEquipment() {
        // Clear existing equipment
        this.equipmentContainer.innerHTML = '';
        
        // Get player equipped items from game engine
        const playerEquipment = this.uiManager.game.engine.getPlayerEquipment();
        
        // Create equipment slots
        const slots = [
            { id: 'head', name: 'Head' },
            { id: 'torso', name: 'Torso' },
            { id: 'legs', name: 'Legs' },
            { id: 'feet', name: 'Feet' },
            { id: 'weapon', name: 'Weapon' },
            { id: 'accessory', name: 'Accessory' }
        ];
        
        slots.forEach(slotInfo => {
            const slot = document.createElement('div');
            slot.className = 'equipment-slot';
            slot.dataset.slotType = slotInfo.id;
            
            // Add slot label
            const label = document.createElement('div');
            label.className = 'slot-label';
            label.textContent = slotInfo.name;
            slot.appendChild(label);
            
            // If there's an item equipped in this slot, show it
            if (playerEquipment[slotInfo.id]) {
                const item = playerEquipment[slotInfo.id];
                const itemIcon = document.createElement('div');
                itemIcon.className = 'item-icon';
                itemIcon.innerHTML = this.getItemIcon(item);
                slot.appendChild(itemIcon);
                slot.title = `${item.name}\n${item.description}`;
                slot.classList.add('has-item');
                slot.dataset.itemId = item.id;
            }
            
            this.equipmentContainer.appendChild(slot);
        });
    }
    
    /**
     * Render the player's stats
     */
    renderStats() {
        // Get player stats from game engine
        const playerStats = this.uiManager.game.engine.getPlayerStats();
        
        // Clear existing stats
        this.statsContainer.innerHTML = '';
        
        // Create stats display
        const statsHTML = `
            <h3>Character Stats</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-name">Strength:</span>
                    <span class="stat-value">${playerStats.strength}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-name">Dexterity:</span>
                    <span class="stat-value">${playerStats.dexterity}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-name">Intelligence:</span>
                    <span class="stat-value">${playerStats.intelligence}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-name">Vitality:</span>
                    <span class="stat-value">${playerStats.vitality}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-name">Defense:</span>
                    <span class="stat-value">${playerStats.defense}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-name">Attack:</span>
                    <span class="stat-value">${playerStats.attack}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-name">Max Health:</span>
                    <span class="stat-value">${playerStats.maxHealth}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-name">Max Energy:</span>
                    <span class="stat-value">${playerStats.maxEnergy}</span>
                </div>
            </div>
        `;
        
        this.statsContainer.innerHTML = statsHTML;
    }
    
    /**
     * Set up event listeners for inventory interaction
     */
    setupEventListeners() {
        // Inventory slot click
        const inventorySlots = document.querySelectorAll('.inventory-slot');
        inventorySlots.forEach(slot => {
            slot.addEventListener('click', () => {
                const slotIndex = parseInt(slot.dataset.slotIndex);
                if (slot.classList.contains('has-item')) {
                    this.handleItemClick(slotIndex);
                }
            });
        });
        
        // Equipment slot click
        const equipmentSlots = document.querySelectorAll('.equipment-slot');
        equipmentSlots.forEach(slot => {
            slot.addEventListener('click', () => {
                const slotType = slot.dataset.slotType;
                if (slot.classList.contains('has-item')) {
                    this.handleEquipmentClick(slotType);
                }
            });
        });
    }
    
    /**
     * Handle click on an inventory item
     * @param {number} slotIndex - The index of the clicked inventory slot
     */
    handleItemClick(slotIndex) {
        // Get the item from the game engine
        const inventory = this.uiManager.game.engine.getPlayerInventory();
        const item = inventory.items[slotIndex];
        
        if (!item) return;
        
        // Show item context menu
        this.showItemContextMenu(slotIndex, item);
    }
    
    /**
     * Handle click on an equipped item
     * @param {string} slotType - The type of equipment slot
     */
    handleEquipmentClick(slotType) {
        // Get the item from the game engine
        const equipment = this.uiManager.game.engine.getPlayerEquipment();
        const item = equipment[slotType];
        
        if (!item) return;
        
        // Unequip the item
        this.uiManager.game.engine.unequipItem(slotType);
        
        // Update the inventory display
        this.update();
        
        // Show notification
        this.uiManager.showNotification(`Unequipped ${item.name}`, 'info');
    }
    
    /**
     * Show context menu for an inventory item
     * @param {number} slotIndex - The index of the inventory slot
     * @param {object} item - The item in the slot
     */
    showItemContextMenu(slotIndex, item) {
        // Remove any existing context menus
        document.querySelectorAll('.item-context-menu').forEach(menu => {
            menu.remove();
        });
        
        // Create context menu
        const contextMenu = document.createElement('div');
        contextMenu.className = 'item-context-menu';
        
        // Add menu options
        let menuOptions = [];
        
        if (item.type === 'equipment') {
            menuOptions.push({
                text: 'Equip',
                action: () => {
                    this.uiManager.game.engine.equipItem(slotIndex);
                    this.update();
                    this.uiManager.showNotification(`Equipped ${item.name}`, 'info');
                }
            });
        }
        
        if (item.type === 'consumable') {
            menuOptions.push({
                text: 'Use',
                action: () => {
                    this.uiManager.game.engine.useItem(slotIndex);
                    this.update();
                    this.uiManager.showNotification(`Used ${item.name}`, 'info');
                }
            });
        }
        
        menuOptions.push({
            text: 'Drop',
            action: () => {
                this.uiManager.game.engine.dropItem(slotIndex);
                this.update();
                this.uiManager.showNotification(`Dropped ${item.name}`, 'info');
            }
        });
        
        // Add options to menu
        menuOptions.forEach(option => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = option.text;
            menuItem.addEventListener('click', () => {
                option.action();
                contextMenu.remove();
            });
            contextMenu.appendChild(menuItem);
        });
        
        // Position the context menu
        const slot = document.querySelector(`.inventory-slot[data-slot-index="${slotIndex}"]`);
        const rect = slot.getBoundingClientRect();
        
        contextMenu.style.top = `${rect.top + rect.height}px`;
        contextMenu.style.left = `${rect.left}px`;
        
        // Add to document
        document.body.appendChild(contextMenu);
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target) && !slot.contains(e.target)) {
                contextMenu.remove();
            }
        });
    }
    
    /**
     * Get an icon representation for an item
     * @param {object} item - The item to get an icon for
     * @returns {string} HTML representation of the item icon
     */
    getItemIcon(item) {
        // For a real implementation, this would use actual icons or sprites
        // For now, we'll use emoji as placeholders
        const iconMap = {
            'sword': '⚔️',
            'shield': '🛡️',
            'helmet': '🪖',
            'armor': '👕',
            'pants': '👖',
            'boots': '👢',
            'potion': '🧪',
            'food': '🍎',
            'material': '📦',
            'accessory': '💍',
            'tool': '🔨'
        };
        
        return iconMap[item.icon] || '❓';
    }
}

