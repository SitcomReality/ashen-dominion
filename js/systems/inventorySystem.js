/**
 * Manages inventory, items, equipment, and crafting
 */
export class InventorySystem {
    constructor(engine) {
        this.engine = engine;
        
        // Item templates repository
        this.itemTemplates = new Map();
        
        // Equippable item slots
        this.equipmentSlots = {
            head: { name: "Head", accepts: ["helmet", "hat", "crown"] },
            torso: { name: "Torso", accepts: ["armor", "robe", "shirt"] },
            legs: { name: "Legs", accepts: ["pants", "skirt", "leggings"] },
            feet: { name: "Feet", accepts: ["boots", "shoes", "sandals"] },
            weapon: { name: "Weapon", accepts: ["sword", "axe", "dagger", "wand", "staff", "bow"] },
            offhand: { name: "Off-hand", accepts: ["shield", "spellbook", "torch"] },
            accessory1: { name: "Accessory", accepts: ["ring", "amulet", "talisman"] },
            accessory2: { name: "Accessory", accepts: ["ring", "amulet", "talisman"] }
        };
        
        // Crafting recipes
        this.craftingRecipes = new Map();
        
        // Initialize with base item templates
        this.initializeItemTemplates();
        this.initializeCraftingRecipes();
    }
    
    /**
     * Initialize base item templates
     */
    initializeItemTemplates() {
        // In a real implementation, this would load item templates from a data file
        // For now, just add some basic items directly
        
        // Weapons
        this.registerItemTemplate({
            id: 'wooden_sword',
            name: 'Wooden Sword',
            description: 'A basic sword made of wood.',
            type: 'equipment',
            subtype: 'sword',
            icon: 'sword',
            equipSlot: 'weapon',
            value: 10,
            stackable: false,
            stats: {
                attack: 3
            }
        });
        
        this.registerItemTemplate({
            id: 'iron_sword',
            name: 'Iron Sword',
            description: 'A sturdy iron sword.',
            type: 'equipment',
            subtype: 'sword',
            icon: 'sword',
            equipSlot: 'weapon',
            value: 50,
            stackable: false,
            stats: {
                attack: 7
            }
        });
        
        // Armor
        this.registerItemTemplate({
            id: 'leather_armor',
            name: 'Leather Armor',
            description: 'A set of armor made from tanned leather.',
            type: 'equipment',
            subtype: 'armor',
            icon: 'armor',
            equipSlot: 'torso',
            value: 30,
            stackable: false,
            stats: {
                defense: 5
            }
        });
        
        this.registerItemTemplate({
            id: 'iron_helmet',
            name: 'Iron Helmet',
            description: 'A sturdy iron helmet.',
            type: 'equipment',
            subtype: 'helmet',
            icon: 'helmet',
            equipSlot: 'head',
            value: 40,
            stackable: false,
            stats: {
                defense: 6
            }
        });
        
        // Consumables
        this.registerItemTemplate({
            id: 'health_potion',
            name: 'Health Potion',
            description: 'Restores 20 health when consumed.',
            type: 'consumable',
            subtype: 'potion',
            icon: 'potion',
            value: 15,
            stackable: true,
            maxStack: 10,
            effect: {
                type: 'heal',
                amount: 20
            }
        });
        
        this.registerItemTemplate({
            id: 'energy_potion',
            name: 'Energy Potion',
            description: 'Restores 20 energy when consumed.',
            type: 'consumable',
            subtype: 'potion',
            icon: 'potion',
            value: 15,
            stackable: true,
            maxStack: 10,
            effect: {
                type: 'energy',
                amount: 20
            }
        });
        
        // Materials
        this.registerItemTemplate({
            id: 'wood',
            name: 'Wood',
            description: 'A piece of wood.',
            type: 'material',
            subtype: 'crafting',
            icon: 'material',
            value: 2,
            stackable: true,
            maxStack: 50
        });
        
        this.registerItemTemplate({
            id: 'stone',
            name: 'Stone',
            description: 'A chunk of stone.',
            type: 'material',
            subtype: 'crafting',
            icon: 'material',
            value: 1,
            stackable: true,
            maxStack: 50
        });
    }
    
    /**
     * Initialize basic crafting recipes
     */
    initializeCraftingRecipes() {
        // In a real implementation, this would load crafting recipes from a data file
        // For now, just add some basic recipes directly
        
        this.registerCraftingRecipe({
            id: 'wooden_sword_recipe',
            name: 'Wooden Sword',
            result: {
                itemId: 'wooden_sword',
                count: 1
            },
            ingredients: [
                { itemId: 'wood', count: 3 }
            ]
        });
        
        this.registerCraftingRecipe({
            id: 'health_potion_recipe',
            name: 'Health Potion',
            result: {
                itemId: 'health_potion',
                count: 1
            },
            ingredients: [
                { itemId: 'wood', count: 1 },
                { itemId: 'herb', count: 2 }
            ]
        });
    }
    
    /**
     * Register an item template
     * @param {object} template - Item template data
     */
    registerItemTemplate(template) {
        this.itemTemplates.set(template.id, template);
    }
    
    /**
     * Get an item template by ID
     * @param {string} id - Item template ID
     * @returns {object|null} - Item template or null if not found
     */
    getItemTemplate(id) {
        return this.itemTemplates.get(id) || null;
    }
    
    /**
     * Register a crafting recipe
     * @param {object} recipe - Crafting recipe data
     */
    registerCraftingRecipe(recipe) {
        this.craftingRecipes.set(recipe.id, recipe);
    }
    
    /**
     * Get all crafting recipes
     * @returns {Array} - Array of crafting recipes
     */
    getAllRecipes() {
        return Array.from(this.craftingRecipes.values());
    }
    
    /**
     * Create a new inventory
     * @param {number} size - Inventory size
     * @returns {object} - New inventory object
     */
    createInventory(size = 20) {
        return {
            size: size,
            items: new Array(size).fill(null),
            gold: 0
        };
    }
    
    /**
     * Create a new equipment container
     * @returns {object} - New equipment object
     */
    createEquipment() {
        const equipment = {};
        
        // Initialize all equipment slots to null
        Object.keys(this.equipmentSlots).forEach(slot => {
            equipment[slot] = null;
        });
        
        return equipment;
    }
    
    /**
     * Add an item to an inventory
     * @param {object} inventory - Inventory object
     * @param {string} itemId - Item template ID
     * @param {number} count - Number of items to add
     * @returns {boolean} - True if item was added successfully
     */
    addItemToInventory(inventory, itemId, count = 1) {
        const template = this.getItemTemplate(itemId);
        if (!template) return false;
        
        const item = this.createItemInstance(template, count);
        
        // Try to add to existing stack if stackable
        if (item.stackable) {
            for (let i = 0; i < inventory.size; i++) {
                const slotItem = inventory.items[i];
                
                if (slotItem && slotItem.id === item.id && slotItem.count < slotItem.maxStack) {
                    // Can add to this stack
                    const spaceInStack = slotItem.maxStack - slotItem.count;
                    
                    if (spaceInStack > 0) {
                        // How many items we can move
                        const amountToMove = Math.min(count, spaceInStack);
                        
                        // Move items
                        slotItem.count += amountToMove;
                        count -= amountToMove;
                        
                        // If all items were added, return success
                        if (count <= 0) {
                            return true;
                        }
                    }
                }
            }
        }
        
        // If we still have items to add or item is not stackable, find empty slots
        if (count > 0) {
            // For non-stackable items, we need one slot per item
            const slotsNeeded = item.stackable ? 1 : count;
            let slotsFound = 0;
            
            // Find empty slots
            for (let i = 0; i < inventory.size; i++) {
                if (inventory.items[i] === null) {
                    slotsFound++;
                    
                    if (slotsFound === slotsNeeded) {
                        break;
                    }
                }
            }
            
            // Check if we have enough slots
            if (slotsFound < slotsNeeded) {
                console.log('Not enough inventory space');
                return false;
            }
            
            // Add items to empty slots
            if (item.stackable) {
                // For stackable items, find the first empty slot
                for (let i = 0; i < inventory.size; i++) {
                    if (inventory.items[i] === null) {
                        // Create new item with remaining count
                        const newItem = this.createItemInstance(template, count);
                        inventory.items[i] = newItem;
                        break;
                    }
                }
            } else {
                // For non-stackable items, we need one slot per item
                let remaining = count;
                for (let i = 0; i < inventory.size && remaining > 0; i++) {
                    if (inventory.items[i] === null) {
                        // Create new item with count 1
                        const newItem = this.createItemInstance(template, 1);
                        inventory.items[i] = newItem;
                        remaining--;
                    }
                }
            }
            
            return true;
        }
        
        return true;
    }
    
    /**
     * Remove an item from an inventory
     * @param {object} inventory - Inventory object
     * @param {string} itemId - Item template ID
     * @param {number} count - Number of items to remove
     * @returns {boolean} - True if items were removed successfully
     */
    removeItemFromInventory(inventory, itemId, count = 1) {
        let remainingToRemove = count;
        
        // First pass: remove from stacks
        for (let i = 0; i < inventory.size && remainingToRemove > 0; i++) {
            const item = inventory.items[i];
            
            if (item && item.id === itemId) {
                if (item.count <= remainingToRemove) {
                    // Remove entire stack
                    remainingToRemove -= item.count;
                    inventory.items[i] = null;
                } else {
                    // Remove partial stack
                    item.count -= remainingToRemove;
                    remainingToRemove = 0;
                }
            }
        }
        
        return remainingToRemove === 0;
    }
    
    /**
     * Count items in an inventory
     * @param {object} inventory - Inventory object
     * @param {string} itemId - Item template ID
     * @returns {number} - Total count of items
     */
    countItemsInInventory(inventory, itemId) {
        let count = 0;
        
        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.items[i];
            
            if (item && item.id === itemId) {
                count += item.count;
            }
        }
        
        return count;
    }
    
    /**
     * Check if inventory has enough of an item
     * @param {object} inventory - Inventory object
     * @param {string} itemId - Item template ID
     * @param {number} count - Required count
     * @returns {boolean} - True if inventory has enough
     */
    hasEnoughItems(inventory, itemId, count) {
        return this.countItemsInInventory(inventory, itemId) >= count;
    }
    
    /**
     * Check if inventory has space for an item
     * @param {object} inventory - Inventory object
     * @param {string} itemId - Item template ID
     * @param {number} count - Number of items to add
     * @returns {boolean} - True if there's enough space
     */
    hasSpaceForItem(inventory, itemId, count) {
        const template = this.getItemTemplate(itemId);
        if (!template) return false;
        
        // Create a temporary item instance
        const item = this.createItemInstance(template, count);
        
        // For stackable items, check existing stacks first
        let remainingCount = count;
        
        if (item.stackable) {
            for (let i = 0; i < inventory.size; i++) {
                const slotItem = inventory.items[i];
                
                if (slotItem && slotItem.id === item.id && slotItem.count < slotItem.maxStack) {
                    // Can add to this stack
                    const spaceInStack = slotItem.maxStack - slotItem.count;
                    remainingCount -= spaceInStack;
                    
                    // If all items fit in existing stacks, return true
                    if (remainingCount <= 0) {
                        return true;
                    }
                }
            }
        }
        
        // Count empty slots
        let emptySlots = 0;
        for (let i = 0; i < inventory.size; i++) {
            if (inventory.items[i] === null) {
                emptySlots++;
            }
        }
        
        // Calculate slots needed
        const slotsNeeded = item.stackable 
            ? Math.ceil(remainingCount / item.maxStack)
            : remainingCount;
        
        return emptySlots >= slotsNeeded;
    }
    
    /**
     * Move an item within inventory
     * @param {object} inventory - Inventory object
     * @param {number} fromSlot - Source slot index
     * @param {number} toSlot - Destination slot index
     * @returns {boolean} - True if item was moved successfully
     */
    moveItem(inventory, fromSlot, toSlot) {
        if (fromSlot < 0 || fromSlot >= inventory.size || 
            toSlot < 0 || toSlot >= inventory.size) {
            return false;
        }
        
        const fromItem = inventory.items[fromSlot];
        const toItem = inventory.items[toSlot];
        
        // If source slot is empty, nothing to move
        if (fromItem === null) {
            return false;
        }
        
        // If destination is empty, simple move
        if (toItem === null) {
            inventory.items[toSlot] = fromItem;
            inventory.items[fromSlot] = null;
            return true;
        }
        
        // If both slots have the same stackable item
        if (fromItem.id === toItem.id && fromItem.stackable && toItem.stackable) {
            // Try to stack
            const spaceInToStack = toItem.maxStack - toItem.count;
            
            if (spaceInToStack > 0) {
                // How many items we can move
                const amountToMove = Math.min(fromItem.count, spaceInToStack);
                
                // Move items
                toItem.count += amountToMove;
                fromItem.count -= amountToMove;
                
                // If from slot is now empty, remove it
                if (fromItem.count <= 0) {
                    inventory.items[fromSlot] = null;
                }
                
                return true;
            }
        }
        
        // If we get here, either different items or can't stack - swap slots
        inventory.items[toSlot] = fromItem;
        inventory.items[fromSlot] = toItem;
        return true;
    }
    
    /**
     * Split a stack of items
     * @param {object} inventory - Inventory object
     * @param {number} fromSlot - Source slot index
     * @param {number} toSlot - Destination slot index
     * @param {number} amount - Amount to split
     * @returns {boolean} - True if stack was split successfully
     */
    splitStack(inventory, fromSlot, toSlot, amount) {
        if (fromSlot < 0 || fromSlot >= inventory.size || 
            toSlot < 0 || toSlot >= inventory.size) {
            return false;
        }
        
        const fromItem = inventory.items[fromSlot];
        const toItem = inventory.items[toSlot];
        
        // Check if valid operation
        if (fromItem === null || !fromItem.stackable || fromItem.count <= 1) {
            return false;
        }
        
        // Check amount
        if (amount <= 0 || amount >= fromItem.count) {
            return false;
        }
        
        // If destination slot is not empty and not the same item, can't split
        if (toItem !== null && toItem.id !== fromItem.id) {
            return false;
        }
        
        // If destination slot has the same item, add to stack
        if (toItem !== null) {
            // Check if there's room in the destination stack
            const spaceInToStack = toItem.maxStack - toItem.count;
            
            if (spaceInToStack <= 0) {
                return false;
            }
            
            // How many we can actually move
            const amountToMove = Math.min(amount, spaceInToStack);
            
            // Move items
            toItem.count += amountToMove;
            fromItem.count -= amountToMove;
            
            return true;
        } else {
            // Destination slot is empty, create a new stack
            const newItem = { ...fromItem, count: amount };
            inventory.items[toSlot] = newItem;
            fromItem.count -= amount;
            
            return true;
        }
    }
    
    /**
     * Equip an item from inventory
     * @param {object} inventory - Inventory object
     * @param {object} equipment - Equipment object
     * @param {number} slot - Inventory slot index
     * @returns {boolean} - True if item was equipped successfully
     */
    equipItem(inventory, equipment, slot) {
        if (slot < 0 || slot >= inventory.size) {
            return false;
        }
        
        const item = inventory.items[slot];
        
        // Check if item exists and is equippable
        if (item === null || item.type !== 'equipment' || !item.equipSlot) {
            return false;
        }
        
        // Get the target equipment slot
        const equipSlot = item.equipSlot;
        
        // Check if valid equipment slot
        if (!equipment[equipSlot]) {
            return false;
        }
        
        // Unequip current item in that slot if any
        const currentItem = equipment[equipSlot];
        if (currentItem) {
            // Check if we have inventory space for the current item
            if (!this.hasSpaceForItem(inventory, currentItem.id, 1)) {
                return false;
            }
            
            // Remove item from equipment slot
            equipment[equipSlot] = null;
            
            // Add to inventory
            this.addItemToInventory(inventory, currentItem.id, 1);
        }
        
        // Equip new item
        equipment[equipSlot] = { ...item, count: 1 };
        
        // Remove item from inventory
        inventory.items[slot] = null;
        
        return true;
    }
    
    /**
     * Unequip an item
     * @param {object} inventory - Inventory object
     * @param {object} equipment - Equipment object
     * @param {string} equipSlot - Equipment slot to unequip
     * @returns {boolean} - True if item was unequipped successfully
     */
    unequipItem(inventory, equipment, equipSlot) {
        if (!equipment[equipSlot]) {
            return false;
        }
        
        // Get item
        const item = equipment[equipSlot];
        
        // Check if slot has an item
        if (item === null) {
            return false;
        }
        
        // Check if inventory has space
        if (!this.hasSpaceForItem(inventory, item.id, 1)) {
            return false;
        }
        
        // Remove from equipment
        equipment[equipSlot] = null;
        
        // Add to inventory
        this.addItemToInventory(inventory, item.id, 1);
        
        return true;
    }
    
    /**
     * Use a consumable item
     * @param {object} inventory - Inventory object
     * @param {number} slot - Inventory slot index
     * @param {object} entity - Entity using the item
     * @returns {boolean} - True if item was used successfully
     */
    useItem(inventory, slot, entity) {
        if (slot < 0 || slot >= inventory.size) {
            return false;
        }
        
        const item = inventory.items[slot];
        
        // Check if item exists and is usable
        if (item === null || item.type !== 'consumable' || !item.effect) {
            return false;
        }
        
        // Apply item effect
        const success = this.applyItemEffect(item, entity);
        
        // If successfully used, reduce count or remove item
        if (success) {
            item.count--;
            
            if (item.count <= 0) {
                inventory.items[slot] = null;
            }
        }
        
        return success;
    }
    
    /**
     * Apply an item's effect to an entity
     * @param {object} item - Item object
     * @param {object} entity - Target entity
     * @returns {boolean} - True if effect was applied successfully
     */
    applyItemEffect(item, entity) {
        if (!item.effect || !entity) {
            return false;
        }
        
        // Apply effect based on type
        switch (item.effect.type) {
            case 'heal':
                // Heal health
                if (entity.stats) {
                    entity.stats.health = Math.min(
                        entity.stats.health + item.effect.amount, 
                        entity.stats.maxHealth
                    );
                    return true;
                }
                break;
                
            case 'energy':
                // Restore energy
                if (entity.stats) {
                    entity.stats.energy = Math.min(
                        entity.stats.energy + item.effect.amount, 
                        entity.stats.maxEnergy
                    );
                    return true;
                }
                break;
                
            case 'buff':
                // Apply temporary stat buff
                if (entity.stats && item.effect.stat && item.effect.duration) {
                    // In a real implementation, we'd add a temporary buff
                    // to the entity's stats system
                    return true;
                }
                break;
                
            default:
                console.log(`Unknown effect type: ${item.effect.type}`);
                return false;
        }
        
        return false;
    }
    
    /**
     * Create a new item instance from a template
     * @param {object} template - Item template
     * @param {number} count - Item count
     * @returns {object} - New item instance
     */
    createItemInstance(template, count = 1) {
        // Create a shallow copy of the template
        const item = { ...template };
        
        // Set count
        item.count = count;
        
        return item;
    }
    
    /**
     * Craft an item
     * @param {object} inventory - Inventory object
     * @param {string} recipeId - Crafting recipe ID
     * @returns {boolean} - True if crafting was successful
     */
    craftItem(inventory, recipeId) {
        const recipe = this.craftingRecipes.get(recipeId);
        if (!recipe) {
            console.error(`Recipe not found: ${recipeId}`);
            return false;
        }
        
        // Check if we have all ingredients
        for (const ingredient of recipe.ingredients) {
            if (!this.hasEnoughItems(inventory, ingredient.itemId, ingredient.count)) {
                console.log(`Not enough ${ingredient.itemId} to craft ${recipe.name}`);
                return false;
            }
        }
        
        // Check if we have space for the result
        if (!this.hasSpaceForItem(inventory, recipe.result.itemId, recipe.result.count)) {
            console.log(`Not enough inventory space to craft ${recipe.name}`);
            return false;
        }
        
        // Remove ingredients
        for (const ingredient of recipe.ingredients) {
            this.removeItemFromInventory(inventory, ingredient.itemId, ingredient.count);
        }
        
        // Add result
        this.addItemToInventory(inventory, recipe.result.itemId, recipe.result.count);
        
        return true;
    }
    
    /**
     * Get all available crafting recipes for an inventory
     * @param {object} inventory - Inventory object
     * @returns {Array} - Array of available recipes
     */
    getAvailableRecipes(inventory) {
        const recipes = Array.from(this.craftingRecipes.values());
        
        return recipes.filter(recipe => {
            // Check if we have all ingredients
            for (const ingredient of recipe.ingredients) {
                if (!this.hasEnoughItems(inventory, ingredient.itemId, ingredient.count)) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    /**
     * Serialize inventory for saving
     * @param {object} inventory - Inventory object
     * @returns {object} - Serialized inventory data
     */
    serializeInventory(inventory) {
        if (!inventory) return null;
        
        // Create a simplified version of the inventory
        return {
            size: inventory.size,
            gold: inventory.gold || 0,
            items: inventory.items.map(item => {
                if (!item) return null;
                
                // Only save essential item data, the rest comes from template
                return {
                    id: item.id,
                    count: item.count
                };
            })
        };
    }
    
    /**
     * Deserialize inventory from saved data
     * @param {object} inventory - Target inventory object
     * @param {object} data - Serialized inventory data
     */
    deserializeInventory(inventory, data) {
        if (!inventory || !data) return;
        
        // Set inventory size and gold
        inventory.size = data.size;
        inventory.gold = data.gold || 0;
        
        // Clear existing items
        inventory.items = new Array(inventory.size).fill(null);
        
        // Restore items
        if (data.items) {
            data.items.forEach((itemData, slot) => {
                if (!itemData) return;
                
                // Get item template
                const template = this.getItemTemplate(itemData.id);
                if (!template) return;
                
                // Create item instance
                const item = this.createItemInstance(template, itemData.count);
                
                // Add to inventory
                inventory.items[slot] = item;
            });
        }
    }
    
    /**
     * Serialize equipment for saving
     * @param {object} equipment - Equipment object
     * @returns {object} - Serialized equipment data
     */
    serializeEquipment(equipment) {
        if (!equipment) return null;
        
        const serialized = {};
        
        // Serialize each equipment slot
        Object.entries(equipment).forEach(([slot, item]) => {
            if (!item) {
                serialized[slot] = null;
            } else {
                // Only save essential item data
                serialized[slot] = {
                    id: item.id
                };
            }
        });
        
        return serialized;
    }
    
    /**
     * Deserialize equipment from saved data
     * @param {object} equipment - Target equipment object
     * @param {object} data - Serialized equipment data
     */
    deserializeEquipment(equipment, data) {
        if (!equipment || !data) return;
        
        // Clear existing equipment
        Object.keys(equipment).forEach(slot => {
            equipment[slot] = null;
        });
        
        // Restore equipment
        Object.entries(data).forEach(([slot, itemData]) => {
            if (!itemData) return;
            
            // Get item template
            const template = this.getItemTemplate(itemData.id);
            if (!template) return;
            
            // Create item instance
            const item = this.createItemInstance(template, 1);
            
            // Equip item
            equipment[slot] = item;
        });
    }
}