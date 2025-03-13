/**
 * Handles user input and controls
 */
export class InputHandler {
    constructor(engine) {
        this.engine = engine;
        
        // Input state
        this.keys = {};
        this.mousePosition = { x: 0, y: 0 };
        this.mouseWorldPosition = { x: 0, y: 0 };
        this.mouseButtons = { left: false, middle: false, right: false };
        this.wheelDelta = 0;
        
        // Key bindings
        this.keyBindings = {
            up: 'w',
            down: 's',
            left: 'a',
            right: 'd',
            interact: 'e',
            attack: ' ', // Space
            inventory: 'i',
            quests: 'j',
            characterInfo: 'c',
            map: 'm',
            sprint: 'shift',
            devTools: 'F12'
        };
        
        // Touch input for mobile
        this.touchStartPosition = null;
        this.touchCurrentPosition = null;
        this.touchJoystickCenter = null;
        this.touchJoystickRadius = 50;
        this.touchJoystickVector = { x: 0, y: 0 };
        
        // Movement state
        this.movementVector = { x: 0, y: 0 };
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up input event listeners
     */
    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mouse events
        const canvas = this.engine.canvas;
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('wheel', (e) => this.handleMouseWheel(e));
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Window focus events
        window.addEventListener('blur', () => this.handleWindowBlur());
        window.addEventListener('focus', () => this.handleWindowFocus());
    }
    
    /**
     * Handle key down event
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        if (!event || !event.key) return;
        
        // Store key state
        this.keys[event.key.toLowerCase()] = true;
        
        // Prevent default for movement keys to avoid scrolling
        if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(event.key.toLowerCase())) {
            event.preventDefault();
        }
        
        // Check for special key combinations
        if (event.key === 'F12') {
            // Toggle dev tools
            if (this.engine.game && this.engine.game.uiManager) {
                this.engine.game.uiManager.toggleDevTools();
            }
        }
    }
    
    /**
     * Handle key up event
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyUp(event) {
        // Clear key state
        if (!event || !event.key) return;
        
        this.keys[event.key.toLowerCase()] = false;
        
        // Prevent default for movement keys
        if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(event.key.toLowerCase())) {
            event.preventDefault();
        }
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        const canvas = this.engine.canvas;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate mouse position relative to canvas
        this.mousePosition.x = event.clientX - rect.left;
        this.mousePosition.y = event.clientY - rect.top;
        
        // Convert screen position to world position
        this.updateMouseWorldPosition();
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
        event.preventDefault();
        
        // Store button state
        switch (event.button) {
            case 0: // Left button
                this.mouseButtons.left = true;
                break;
            case 1: // Middle button
                this.mouseButtons.middle = true;
                break;
            case 2: // Right button
                this.mouseButtons.right = true;
                break;
        }
        
        // Update mouse world position
        this.handleMouseMove(event);
        
        // Process click in world
        this.processWorldClick(event.button);
    }
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseUp(event) {
        // Clear button state
        switch (event.button) {
            case 0: // Left button
                this.mouseButtons.left = false;
                break;
            case 1: // Middle button
                this.mouseButtons.middle = false;
                break;
            case 2: // Right button
                this.mouseButtons.right = false;
                break;
        }
    }
    
    /**
     * Handle mouse wheel event
     * @param {WheelEvent} event - Mouse wheel event
     */
    handleMouseWheel(event) {
        this.wheelDelta = Math.sign(event.deltaY);
        
        // Apply zoom change
        const zoomSpeed = 0.1;
        if (this.wheelDelta < 0) {
            // Zoom in
            this.engine.renderSystem.zoomIn(zoomSpeed);
        } else {
            // Zoom out
            this.engine.renderSystem.zoomOut(zoomSpeed);
        }
        
        // Reset wheel delta after handling
        setTimeout(() => {
            this.wheelDelta = 0;
        }, 50);
    }
    
    /**
     * Handle touch start event
     * @param {TouchEvent} event - Touch event
     */
    handleTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const canvas = this.engine.canvas;
            const rect = canvas.getBoundingClientRect();
            
            // Store touch start position
            this.touchStartPosition = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            
            this.touchCurrentPosition = { ...this.touchStartPosition };
            
            // Set up virtual joystick
            if (touch.clientX < window.innerWidth / 2) {
                // Left side of screen = movement joystick
                this.touchJoystickCenter = { ...this.touchStartPosition };
                this.touchJoystickVector = { x: 0, y: 0 };
            } else {
                // Right side of screen = action (simulate mouse click)
                this.mousePosition.x = touch.clientX - rect.left;
                this.mousePosition.y = touch.clientY - rect.top;
                this.updateMouseWorldPosition();
                this.mouseButtons.left = true;
                this.processWorldClick(0); // Simulate left click
            }
        }
    }
    
    /**
     * Handle touch move event
     * @param {TouchEvent} event - Touch event
     */
    handleTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const canvas = this.engine.canvas;
            const rect = canvas.getBoundingClientRect();
            
            // Update current touch position
            this.touchCurrentPosition = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            
            // Update joystick if active
            if (this.touchJoystickCenter) {
                // Calculate joystick vector
                let dx = this.touchCurrentPosition.x - this.touchJoystickCenter.x;
                let dy = this.touchCurrentPosition.y - this.touchJoystickCenter.y;
                
                // Calculate distance from center
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Clamp to joystick radius
                if (distance > this.touchJoystickRadius) {
                    dx = dx / distance * this.touchJoystickRadius;
                    dy = dy / distance * this.touchJoystickRadius;
                }
                
                // Normalize to -1 to 1 range
                this.touchJoystickVector.x = dx / this.touchJoystickRadius;
                this.touchJoystickVector.y = dy / this.touchJoystickRadius;
            }
        }
    }
    
    /**
     * Handle touch end event
     * @param {TouchEvent} event - Touch event
     */
    handleTouchEnd(event) {
        event.preventDefault();
        
        // Reset touch state
        this.touchStartPosition = null;
        this.touchCurrentPosition = null;
        
        // Reset joystick
        if (this.touchJoystickCenter) {
            this.touchJoystickCenter = null;
            this.touchJoystickVector = { x: 0, y: 0 };
        }
        
        // Reset mouse button state if it was a right-side touch
        this.mouseButtons.left = false;
    }
    
    /**
     * Handle window blur event (when window loses focus)
     */
    handleWindowBlur() {
        // Reset all input states when window loses focus
        this.keys = {};
        this.mouseButtons = { left: false, middle: false, right: false };
        this.wheelDelta = 0;
        this.touchJoystickVector = { x: 0, y: 0 };
        this.movementVector = { x: 0, y: 0 };
    }
    
    /**
     * Handle window focus event (when window gains focus)
     */
    handleWindowFocus() {
        // Nothing to do here for now
    }
    
    /**
     * Update mouse world position based on screen position
     */
    updateMouseWorldPosition() {
        // Convert screen position to world position
        // This requires the camera/renderer to do the conversion
        if (this.engine.renderSystem) {
            const worldPos = this.engine.renderSystem.screenToWorldPosition(
                this.mousePosition.x,
                this.mousePosition.y
            );
            
            this.mouseWorldPosition.x = worldPos.x;
            this.mouseWorldPosition.y = worldPos.y;
        }
    }
    
    /**
     * Process a click in the world
     * @param {number} button - Mouse button (0=left, 1=middle, 2=right)
     */
    processWorldClick(button) {
        // Check if UI handled the click
        if (this.engine.game.uiManager && this.engine.game.uiManager.activeModal) {
            // UI is active, don't process world click
            return;
        }
        
        switch (button) {
            case 0: // Left click
                // Find entity under cursor
                const entity = this.findEntityUnderCursor();
                
                if (entity) {
                    // Handle entity interaction
                    this.interactWithEntity(entity);
                } else {
                    // Move to location if nothing clicked
                    if (this.engine.player) {
                        // Set player destination
                        // In a real implementation, this would use pathfinding
                    }
                }
                break;
                
            case 2: // Right click
                // Show context menu or perform alternative action
                break;
        }
    }
    
    /**
     * Find entity under cursor
     * @returns {object|null} - Entity under cursor or null if none
     */
    findEntityUnderCursor() {
        // In a real implementation, this would check all entities against mouse world position
        // For now, return null
        return null;
    }
    
    /**
     * Interact with an entity
     * @param {object} entity - Entity to interact with
     */
    interactWithEntity(entity) {
        // Handle interaction based on entity type
        switch (entity.type) {
            case 'npc':
                // Talk to NPC
                // In a real implementation, this would open dialogue
                break;
                
            case 'item':
                // Pick up item
                // In a real implementation, this would add item to inventory
                break;
                
            case 'resource':
                // Gather resource
                // In a real implementation, this would start resource gathering
                break;
                
            case 'container':
                // Open container
                // In a real implementation, this would show container contents
                break;
                
            case 'interactable':
                // Interact with object
                // In a real implementation, this would trigger the interaction
                break;
        }
    }
    
    /**
     * Update input state
     */
    update() {
        // Update movement vector based on keys
        this.updateMovementVector();
        
        // Apply movement to player if controlled
        this.applyPlayerMovement();
        
        // Check for other input actions
        this.checkInputActions();
    }
    
    /**
     * Update movement vector based on current input
     */
    updateMovementVector() {
        // Reset movement vector
        this.movementVector.x = 0;
        this.movementVector.y = 0;
        
        // Check keyboard input
        if (this.keys[this.keyBindings.up]) {
            this.movementVector.y -= 1;
        }
        if (this.keys[this.keyBindings.down]) {
            this.movementVector.y += 1;
        }
        if (this.keys[this.keyBindings.left]) {
            this.movementVector.x -= 1;
        }
        if (this.keys[this.keyBindings.right]) {
            this.movementVector.x += 1;
        }
        
        // Add touch joystick input if available
        if (this.touchJoystickVector.x !== 0 || this.touchJoystickVector.y !== 0) {
            this.movementVector.x += this.touchJoystickVector.x;
            this.movementVector.y += this.touchJoystickVector.y;
        }
        
        // Normalize vector if moving diagonally
        const length = Math.sqrt(
            this.movementVector.x * this.movementVector.x + 
            this.movementVector.y * this.movementVector.y
        );
        
        if (length > 1) {
            this.movementVector.x /= length;
            this.movementVector.y /= length;
        }
        
        // Apply sprint modifier
        if (this.keys[this.keyBindings.sprint]) {
            this.movementVector.x *= 1.5;
            this.movementVector.y *= 1.5;
        }
    }
    
    /**
     * Apply movement to player entity
     */
    applyPlayerMovement() {
        if (!this.engine.player) return;
        
        // In a real implementation, this would set the player's velocity
        // or target position for the physics system to handle
        if (this.movementVector.x !== 0 || this.movementVector.y !== 0) {
            // Request player movement
            this.engine.player.velocity = {
                x: this.movementVector.x * this.engine.player.movementSpeed,
                y: this.movementVector.y * this.engine.player.movementSpeed
            };
        } else {
            // Stop player movement
            this.engine.player.velocity = { x: 0, y: 0 };
        }
    }
    
    /**
     * Check for other input actions
     */
    checkInputActions() {
        // Check for inventory toggle
        if (this.isKeyJustPressed(this.keyBindings.inventory)) {
            if (this.engine.game.uiManager) {
                this.engine.game.uiManager.toggleInventory();
            }
        }
        
        // Check for quest log toggle
        if (this.isKeyJustPressed(this.keyBindings.quests)) {
            if (this.engine.game.uiManager) {
                this.engine.game.uiManager.toggleQuests();
            }
        }
        
        // Check for map toggle
        if (this.isKeyJustPressed(this.keyBindings.map)) {
            if (this.engine.game.uiManager) {
                // Toggle map
            }
        }
        
        // Check for interact key
        if (this.isKeyJustPressed(this.keyBindings.interact)) {
            this.tryInteractionWithNearest();
        }
    }
    
    /**
     * Try to interact with nearest interactable entity
     */
    tryInteractionWithNearest() {
        if (!this.engine.player) return;
        
        // In a real implementation, this would find the nearest interactable entity
        // and trigger its interaction
    }
    
    /**
     * Check if a key was just pressed this frame
     * @param {string} key - Key to check
     * @returns {boolean} - True if key was just pressed
     */
    isKeyJustPressed(key) {
        // This is a simplified version
        // In a real implementation, we'd track previous frame's key state
        // and compare with current frame
        
        // For now, just return false to avoid processing the same key every frame
        return false;
    }
    
    /**
     * Get current mouse position in screen coordinates
     * @returns {object} - Mouse position {x, y}
     */
    getMouseScreenPosition() {
        return { ...this.mousePosition };
    }
    
    /**
     * Get current mouse position in world coordinates
     * @returns {object} - Mouse world position {x, y}
     */
    getMouseWorldPosition() {
        return { ...this.mouseWorldPosition };
    }
    
    /**
     * Get current movement vector
     * @returns {object} - Movement vector {x, y}
     */
    getMovementVector() {
        return { ...this.movementVector };
    }
}