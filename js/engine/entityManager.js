/**
 * Manages all entities in the game world
 */
export class EntityManager {
    constructor(engine) {
        this.engine = engine;
        this.entities = new Map();
        this.entityTemplates = new Map();
        this.nextEntityId = 1;
    }
    
    /**
     * Initialize entity manager
     */
    initialize() {
        // Load entity templates
        this.loadEntityTemplates();
    }
    
    /**
     * Load entity templates
     */
    loadEntityTemplates() {
        // In a real implementation, this would load from data files
        // For now, we'll define some basic templates directly
        
        // Character template (base for NPCs and player)
        this.entityTemplates.set('character', {
            components: {
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                collider: { width: 0.8, height: 0.8, offset: { x: 0, y: 0 } },
                stats: {
                    health: 100,
                    maxHealth: 100,
                    energy: 100,
                    maxEnergy: 100,
                    strength: 10,
                    dexterity: 10,
                    intelligence: 10,
                    vitality: 10
                },
                inventory: {
                    size: 20,
                    items: []
                },
                equipment: {
                    head: null,
                    torso: null,
                    legs: null,
                    feet: null,
                    weapon: null,
                    accessory: null
                }
            }
        });
        
        // Player template
        this.entityTemplates.set('player', {
            parent: 'character',
            components: {
                stats: {
                    health: 120,
                    maxHealth: 120,
                    strength: 12,
                    vitality: 12
                },
                inventory: {
                    size: 30
                },
                player: {
                    experience: 0,
                    level: 1,
                    skillPoints: 0
                }
            }
        });
        
        // NPC template
        this.entityTemplates.set('npc', {
            parent: 'character',
            components: {
                brain: {
                    currentState: 'idle',
                    currentGoal: null,
                    needs: {
                        hunger: 0.0,
                        rest: 0.0,
                        social: 0.0
                    },
                    memories: [],
                    routine: {
                        schedule: {}
                    }
                },
                dialogue: {
                    dialogueTree: {}
                }
            }
        });
        
        // Item template
        this.entityTemplates.set('item', {
            components: {
                position: { x: 0, y: 0 },
                collider: { width: 0.5, height: 0.5, offset: { x: 0, y: 0 } },
                item: {
                    name: 'Item',
                    description: 'An item',
                    type: 'misc',
                    icon: 'misc',
                    value: 0,
                    stackable: false,
                    maxStack: 1
                }
            }
        });
    }
    
    /**
     * Create a new entity from a template
     * @param {string} templateName - Name of the template
     * @param {object} overrides - Properties to override template defaults
     * @returns {object} - The created entity
     */
    createEntityFromTemplate(templateName, overrides = {}) {
        // Get the template
        const template = this.entityTemplates.get(templateName);
        if (!template) {
            console.error(`Template ${templateName} not found`);
            return null;
        }
        
        // Create entity with unique ID
        const entityId = `${templateName}_${this.nextEntityId++}`;
        const entity = { id: entityId, type: templateName };
        
        // Apply parent template if exists
        if (template.parent) {
            const parentTemplate = this.entityTemplates.get(template.parent);
            if (parentTemplate) {
                this.applyTemplateToEntity(entity, parentTemplate);
            }
        }
        
        // Apply this template
        this.applyTemplateToEntity(entity, template);
        
        // Apply overrides
        this.applyOverridesToEntity(entity, overrides);
        
        // Add to entity list
        this.entities.set(entityId, entity);
        
        return entity;
    }
    
    /**
     * Apply a template to an entity
     * @param {object} entity - The entity to apply to
     * @param {object} template - The template to apply
     */
    applyTemplateToEntity(entity, template) {
        if (!template.components) return;
        
        // Apply each component from the template
        Object.entries(template.components).forEach(([compName, compData]) => {
            // If component already exists on entity, merge data
            if (entity[compName]) {
                entity[compName] = this.deepMerge(entity[compName], compData);
            } else {
                // Otherwise, copy component data
                entity[compName] = this.deepCopy(compData);
            }
        });
    }
    
    /**
     * Apply overrides to an entity
     * @param {object} entity - The entity to apply to
     * @param {object} overrides - The overrides to apply
     */
    applyOverridesToEntity(entity, overrides) {
        // Apply each override property
        Object.entries(overrides).forEach(([propPath, value]) => {
            // Handle dotted path notation (e.g. "stats.health")
            const pathParts = propPath.split('.');
            
            let target = entity;
            for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
                if (!target[part]) {
                    target[part] = {};
                }
                target = target[part];
            }
            
            target[pathParts[pathParts.length - 1]] = value;
        });
    }
    
    /**
     * Create the player entity
     * @param {string} name - Player name
     * @returns {object} - Player entity
     */
    createPlayer(name) {
        const player = this.createEntityFromTemplate('player', {
            name: name,
            'position.x': 0,
            'position.y': 0
        });
        
        // Initialize inventory and equipment using inventory system
        if (this.engine.inventorySystem) {
            player.inventory = this.engine.inventorySystem.createInventory(30);
            player.equipment = this.engine.inventorySystem.createEquipment();
            
            // Add starting items
            const woodenSword = this.engine.inventorySystem.getItemTemplate('wooden_sword');
            const healthPotion = this.engine.inventorySystem.getItemTemplate('health_potion');
            
            if (woodenSword) {
                this.engine.inventorySystem.addItemToInventory(player.inventory, 'wooden_sword', 1);
            }
            
            if (healthPotion) {
                this.engine.inventorySystem.addItemToInventory(player.inventory, 'health_potion', 3);
            }
        } else {
            // Fallback if inventory system is not available
            player.inventory = this.createInventory(30);
            player.equipment = this.createEquipment();
        }
        
        return player;
    }
    
    /**
     * Create an NPC entity
     * @param {string} type - NPC type (e.g. 'villager', 'merchant')
     * @param {string} name - NPC name
     * @param {object} position - Position coordinates
     * @returns {object} - NPC entity
     */
    createNPC(type, name, position) {
        const npc = this.createEntityFromTemplate('npc', {
            name: name,
            'position.x': position.x,
            'position.y': position.y,
            'brain.type': type
        });
        
        // Set up routine based on NPC type
        switch (type) {
            case 'villager':
                this.setupVillagerRoutine(npc);
                break;
            case 'merchant':
                this.setupMerchantRoutine(npc);
                // Add merchant inventory
                this.generateMerchantInventory(npc);
                break;
            case 'guard':
                this.setupGuardRoutine(npc);
                break;
        }
        
        return npc;
    }
    
    /**
     * Add an item to an entity's inventory
     * @param {object} entity - The entity
     * @param {string} itemId - Item ID
     * @param {number} count - Item count
     * @returns {boolean} - True if item was added successfully
     */
    addItemToEntity(entity, itemId, count = 1) {
        if (!entity.inventory) return false;
        
        // Get item template
        const itemTemplate = this.getItemTemplate(itemId);
        if (!itemTemplate) return false;
        
        // Check if item is stackable and already exists in inventory
        if (itemTemplate.stackable) {
            // Look for existing stack
            for (let i = 0; i < entity.inventory.items.length; i++) {
                const item = entity.inventory.items[i];
                if (item && item.id === itemId) {
                    // Add to existing stack
                    item.count += count;
                    return true;
                }
            }
        }
        
        // Find empty slot
        let emptySlot = -1;
        for (let i = 0; i < entity.inventory.size; i++) {
            if (!entity.inventory.items[i]) {
                emptySlot = i;
                break;
            }
        }
        
        // If no empty slot, return false
        if (emptySlot === -1) return false;
        
        // Create item instance
        const itemInstance = {
            ...this.deepCopy(itemTemplate),
            count: count
        };
        
        // Add to inventory
        entity.inventory.items[emptySlot] = itemInstance;
        
        return true;
    }
    
    /**
     * Get an item template
     * @param {string} itemId - Item ID
     * @returns {object|null} - Item template or null if not found
     */
    getItemTemplate(itemId) {
        // In a real implementation, this would look up from a data file
        // For now, we'll return some hardcoded templates
        const itemTemplates = {
            wooden_sword: {
                id: 'wooden_sword',
                name: 'Wooden Sword',
                description: 'A basic wooden sword',
                type: 'weapon',
                subtype: 'sword',
                icon: 'sword',
                value: 10,
                stackable: false,
                stats: {
                    damage: 5,
                    speed: 1.2
                },
                equipSlot: 'weapon'
            },
            health_potion: {
                id: 'health_potion',
                name: 'Health Potion',
                description: 'Restores 20 health',
                type: 'consumable',
                subtype: 'potion',
                icon: 'potion',
                value: 5,
                stackable: true,
                maxStack: 10,
                effect: {
                    type: 'heal',
                    amount: 20
                }
            }
        };
        
        return itemTemplates[itemId] || null;
    }
    
    /**
     * Set up a villager daily routine
     * @param {object} npc - The NPC entity
     */
    setupVillagerRoutine(npc) {
        npc.brain.routine.schedule = {
            '06:00': { action: 'wake_up', location: 'home' },
            '07:00': { action: 'eat_breakfast', location: 'home' },
            '08:00': { action: 'work', location: 'field' },
            '12:00': { action: 'eat_lunch', location: 'home' },
            '13:00': { action: 'work', location: 'field' },
            '18:00': { action: 'eat_dinner', location: 'home' },
            '20:00': { action: 'socialize', location: 'tavern' },
            '22:00': { action: 'sleep', location: 'home' }
        };
    }
    
    /**
     * Set up a merchant daily routine
     * @param {object} npc - The NPC entity
     */
    setupMerchantRoutine(npc) {
        npc.brain.routine.schedule = {
            '05:00': { action: 'wake_up', location: 'home' },
            '06:00': { action: 'prepare_shop', location: 'shop' },
            '08:00': { action: 'open_shop', location: 'shop' },
            '12:00': { action: 'eat_lunch', location: 'shop' },
            '18:00': { action: 'close_shop', location: 'shop' },
            '19:00': { action: 'eat_dinner', location: 'home' },
            '21:00': { action: 'sleep', location: 'home' }
        };
    }
    
    /**
     * Set up a guard daily routine
     * @param {object} npc - The NPC entity
     */
    setupGuardRoutine(npc) {
        npc.brain.routine.schedule = {
            '06:00': { action: 'wake_up', location: 'barracks' },
            '07:00': { action: 'eat_breakfast', location: 'barracks' },
            '08:00': { action: 'patrol', location: 'north_gate' },
            '12:00': { action: 'eat_lunch', location: 'barracks' },
            '13:00': { action: 'patrol', location: 'south_gate' },
            '18:00': { action: 'eat_dinner', location: 'barracks' },
            '19:00': { action: 'patrol', location: 'village_square' },
            '22:00': { action: 'sleep', location: 'barracks' }
        };
    }
    
    /**
     * Generate merchant inventory
     * @param {object} npc - The NPC entity
     */
    generateMerchantInventory(npc) {
        // In a real implementation, this would generate appropriate items for the merchant type
        // For now, just add some basic items
        this.addItemToEntity(npc, 'wooden_sword', 2);
        this.addItemToEntity(npc, 'health_potion', 10);
    }
    
    /**
     * Get an entity by ID
     * @param {string} entityId - Entity ID
     * @returns {object|null} - Entity or null if not found
     */
    getEntity(entityId) {
        return this.entities.get(entityId) || null;
    }
    
    /**
     * Get all entities
     * @returns {Array} - Array of entities
     */
    getAllEntities() {
        return Array.from(this.entities.values());
    }
    
    /**
     * Get entities by type
     * @param {string} type - Entity type
     * @returns {Array} - Array of matching entities
     */
    getEntitiesByType(type) {
        return Array.from(this.entities.values()).filter(entity => entity.type === type);
    }
    
    /**
     * Get entities in radius
     * @param {object} position - Center position
     * @param {number} radius - Radius
     * @returns {Array} - Array of entities in radius
     */
    getEntitiesInRadius(position, radius) {
        return Array.from(this.entities.values()).filter(entity => {
            if (!entity.position) return false;
            
            const dx = entity.position.x - position.x;
            const dy = entity.position.y - position.y;
            const distSq = dx * dx + dy * dy;
            
            return distSq <= radius * radius;
        });
    }
    
    /**
     * Remove an entity
     * @param {string} entityId - Entity ID
     * @returns {boolean} - True if entity was removed
     */
    removeEntity(entityId) {
        return this.entities.delete(entityId);
    }
    
    /**
     * Update all entities
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update each entity
        this.entities.forEach(entity => {
            // Update position based on velocity
            if (entity.position && entity.velocity) {
                entity.position.x += entity.velocity.x * deltaTime;
                entity.position.y += entity.velocity.y * deltaTime;
            }
            
            // Other entity-specific updates would go here
        });
    }
    
    /**
     * Create inventory
     * @param {number} size - Inventory size
     */
    createInventory(size) {
        return {
            size: size,
            items: new Array(size)
        }
    }
    
    /**
     * Create equipment
     */
    createEquipment() {
        return {
            head: null,
            torso: null,
            legs: null,
            feet: null,
            weapon: null,
            accessory: null
        }
    }
    
    /**
     * Deep copy an object
     * @param {object} obj - Object to copy
     * @returns {object} - Deep copy of object
     */
    deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
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