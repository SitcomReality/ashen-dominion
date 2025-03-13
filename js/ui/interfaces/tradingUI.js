/**
 * Handles trading UI functionality
 */
export class TradingUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.tradingModal = document.getElementById('trading-modal');
        this.playerInventoryContainer = document.querySelector('.player-inventory .inventory-grid');
        this.merchantInventoryContainer = document.querySelector('.merchant-inventory .inventory-grid');
        this.playerValue = document.querySelector('.player-value');
        this.merchantValue = document.querySelector('.merchant-value');
        this.tradeButton = document.querySelector('.trade-btn');
        
        // Trading state
        this.currentMerchant = null;
        this.selectedPlayerItems = new Map(); // Map of slot index to quantity
        this.selectedMerchantItems = new Map(); // Map of item id to quantity
        this.playerItemValues = 0;
        this.merchantItemValues = 0;
    }
    
    /**
     * Set up trading with a merchant
     * @param {object} merchantData - The merchant data
     */
    setupTrading(merchantData) {
        this.currentMerchant = merchantData;
        
        // Reset trading state
        this.selectedPlayerItems.clear();
        this.selectedMerchantItems.clear();
        this.playerItemValues = 0;
        this.merchantItemValues = 0;
        
        // Update the UI
        this.updateTradeValues();
        this.renderPlayerInventory();
        this.renderMerchantInventory();
        
        // Set merchant name in modal header
        const modalHeader = this.tradingModal.querySelector('.modal-header h3');
        modalHeader.textContent = `Trading with ${merchantData.name}`;
        
        // Set up trade button
        this.setupTradeButton();
    }
    
    /**
     * Render the player's inventory for trading
     */
    renderPlayerInventory() {
        // Clear existing inventory
        this.playerInventoryContainer.innerHTML = '';
        
        // Get player inventory from game engine
        const playerInventory = this.uiManager.game.engine.getPlayerInventory();
        
        // Create inventory slots for items with value
        let slotIndex = 0;
        playerInventory.items.forEach((item, index) => {
            if (!item || !item.value) return; // Skip empty slots or items with no value
            
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.slotIndex = index;
            
            // Add item to slot
            slot.innerHTML = `
                <div class="item-icon">${this.getItemIcon(item)}</div>
                <div class="item-value">${item.value}</div>
                <div class="item-count">${item.count > 1 ? item.count : ''}</div>
            `;
            slot.title = `${item.name}\n${item.description}\nValue: ${item.value}`;
            slot.classList.add('has-item');
            
            // Check if this item is selected
            if (this.selectedPlayerItems.has(index)) {
                slot.classList.add('selected');
                const selectedCount = this.selectedPlayerItems.get(index);
                
                // Add selected count indicator if more than 1
                if (item.count > 1) {
                    const selectedIndicator = document.createElement('div');
                    selectedIndicator.className = 'selected-count';
                    selectedIndicator.textContent = selectedCount;
                    slot.appendChild(selectedIndicator);
                }
            }
            
            // Add click event
            slot.addEventListener('click', () => {
                this.togglePlayerItemSelection(index);
            });
            
            this.playerInventoryContainer.appendChild(slot);
            slotIndex++;
        });
        
        // Add empty message if no tradeable items
        if (slotIndex === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-inventory';
            emptyMessage.textContent = 'No tradeable items in inventory';
            this.playerInventoryContainer.appendChild(emptyMessage);
        }
    }
    
    /**
     * Render the merchant's inventory for trading
     */
    renderMerchantInventory() {
        // Clear existing inventory
        this.merchantInventoryContainer.innerHTML = '';
        
        // Get merchant inventory
        const merchantInventory = this.currentMerchant.inventory;
        
        // Create inventory slots
        merchantInventory.forEach((item, index) => {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.itemId = item.id;
            slot.dataset.index = index;
            
            // Add item to slot
            slot.innerHTML = `
                <div class="item-icon">${this.getItemIcon(item)}</div>
                <div class="item-value">${item.value}</div>
                <div class="item-count">${item.count > 1 ? item.count : ''}</div>
            `;
            slot.title = `${item.name}\n${item.description}\nValue: ${item.value}`;
            slot.classList.add('has-item');
            
            // Check if this item is selected
            if (this.selectedMerchantItems.has(item.id)) {
                slot.classList.add('selected');
                const selectedCount = this.selectedMerchantItems.get(item.id);
                
                // Add selected count indicator if more than 1
                if (item.count > 1) {
                    const selectedIndicator = document.createElement('div');
                    selectedIndicator.className = 'selected-count';
                    selectedIndicator.textContent = selectedCount;
                    slot.appendChild(selectedIndicator);
                }
            }
            
            // Add click event
            slot.addEventListener('click', () => {
                this.toggleMerchantItemSelection(item.id, index);
            });
            
            this.merchantInventoryContainer.appendChild(slot);
        });
        
        // Add empty message if no items
        if (merchantInventory.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-inventory';
            emptyMessage.textContent = 'Merchant has no items for sale';
            this.merchantInventoryContainer.appendChild(emptyMessage);
        }
    }
    
    /**
     * Toggle selection of a player item
     * @param {number} slotIndex - The inventory slot index
     */
    togglePlayerItemSelection(slotIndex) {
        const playerInventory = this.uiManager.game.engine.getPlayerInventory();
        const item = playerInventory.items[slotIndex];
        
        if (!item) return;
        
        if (this.selectedPlayerItems.has(slotIndex)) {
            // Item is already selected, increase count or deselect
            const currentCount = this.selectedPlayerItems.get(slotIndex);
            
            if (currentCount < item.count) {
                // Increase selected count
                this.selectedPlayerItems.set(slotIndex, currentCount + 1);
                this.playerItemValues += item.value;
            } else {
                // Deselect item
                this.selectedPlayerItems.delete(slotIndex);
                this.playerItemValues -= item.value * currentCount;
            }
        } else {
            // Select item
            this.selectedPlayerItems.set(slotIndex, 1);
            this.playerItemValues += item.value;
        }
        
        // Update UI
        this.updateTradeValues();
        this.renderPlayerInventory();
    }
    
    /**
     * Toggle selection of a merchant item
     * @param {string} itemId - The item ID
     * @param {number} itemIndex - The index in the merchant's inventory
     */
    toggleMerchantItemSelection(itemId, itemIndex) {
        const item = this.currentMerchant.inventory[itemIndex];
        
        if (!item) return;
        
        if (this.selectedMerchantItems.has(itemId)) {
            // Item is already selected, increase count or deselect
            const currentCount = this.selectedMerchantItems.get(itemId);
            
            if (currentCount < item.count) {
                // Increase selected count
                this.selectedMerchantItems.set(itemId, currentCount + 1);
                this.merchantItemValues += item.value;
            } else {
                // Deselect item
                this.selectedMerchantItems.delete(itemId);
                this.merchantItemValues -= item.value * currentCount;
            }
        } else {
            // Select item
            this.selectedMerchantItems.set(itemId, 1);
            this.merchantItemValues += item.value;
        }
        
        // Update UI
        this.updateTradeValues();
        this.renderMerchantInventory();
    }
    
    /**
     * Update the trade value displays
     */
    updateTradeValues() {
        this.playerValue.textContent = this.playerItemValues;
        this.merchantValue.textContent = this.merchantItemValues;
        
        // Update trade button state
        if (this.playerItemValues > 0 || this.merchantItemValues > 0) {
            this.tradeButton.disabled = false;
            
            // Check if player can afford the trade
            if (this.playerItemValues < this.merchantItemValues) {
                this.tradeButton.disabled = true;
                this.tradeButton.title = 'You cannot afford this trade';
            } else {
                this.tradeButton.title = 'Complete the trade';
            }
        } else {
            this.tradeButton.disabled = true;
            this.tradeButton.title = 'Select items to trade';
        }
    }
    
    /**
     * Set up the trade button
     */
    setupTradeButton() {
        // Remove existing event listeners
        const newTradeButton = this.tradeButton.cloneNode(true);
        this.tradeButton.parentNode.replaceChild(newTradeButton, this.tradeButton);
        this.tradeButton = newTradeButton;
        
        // Add click event
        this.tradeButton.addEventListener('click', () => {
            this.executeTrade();
        });
        
        // Initially disable
        this.tradeButton.disabled = true;
        this.tradeButton.title = 'Select items to trade';
    }
    
    /**
     * Execute the trade
     */
    executeTrade() {
        if (this.playerItemValues < this.merchantItemValues) {
            this.uiManager.showNotification('You cannot afford this trade', 'error');
            return;
        }
        
        // Prepare trade data
        const tradeData = {
            playerItems: Array.from(this.selectedPlayerItems.entries()).map(([slotIndex, count]) => ({
                slotIndex,
                count
            })),
            merchantItems: Array.from(this.selectedMerchantItems.entries()).map(([itemId, count]) => ({
                itemId,
                count
            }))
        };
        
        // Execute the trade via game engine
        const result = this.uiManager.game.engine.executeTrade(this.currentMerchant.id, tradeData);
        
        if (result.success) {
            this.uiManager.showNotification('Trade completed successfully', 'success');
            
            // Reset trade
            this.selectedPlayerItems.clear();
            this.selectedMerchantItems.clear();
            this.playerItemValues = 0;
            this.merchantItemValues = 0;
            
            // Update UI
            this.updateTradeValues();
            this.renderPlayerInventory();
            this.renderMerchantInventory();
        } else {
            this.uiManager.showNotification(`Trade failed: ${result.message}`, 'error');
        }
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

