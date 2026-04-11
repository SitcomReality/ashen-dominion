/**
 * Handles rendering the game world and UI
 */
export class RenderSystem {
    constructor(engine) {
        this.engine = engine;
        this.canvas = engine.canvas;
        this.ctx = engine.ctx;
        
        // Camera properties
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            targetZoom: 1,
            zoomSpeed: 5,
            minZoom: 0.5,
            maxZoom: 2.0,
            width: this.canvas.width,
            height: this.canvas.height,
            shake: {
                active: false,
                intensity: 0,
                duration: 0,
                timer: 0
            }
        };
        
        // Rendering layers
        this.layers = {
            background: 0,
            terrain: 1,
            shadows: 2,
            structures: 3,
            objects: 4,
            characters: 5,
            effects: 6,
            ui: 7
        };
        
        // Sprite cache
        this.sprites = new Map();
        
        // Isometric projection properties
        this.isometric = {
            tileWidth: 64,
            tileHeight: 32,
            tileDepth: 16
        };
        
        // Debug rendering options
        this.debug = {
            showColliders: false,
            showGrid: false,
            showEntityNames: false,
            showPath: false
        };
        
        // Lighting system
        this.lighting = {
            enabled: true,
            ambientLight: 0.5,
            dayNightCycle: true,
            lightSources: []
        };
        
        // Weather effects
        this.weatherEffects = {
            rainDrops: [],
            snowflakes: [],
            clouds: [],
            lightning: {
                active: false,
                intensity: 0
            }
        };
        
        // Post-processing effects
        this.postProcessing = {
            enabled: true,
            blur: 0,
            vignette: 0.3,
            chromaticAberration: 0
        };
        
        // Performance metrics
        this.metrics = {
            fps: 0,
            frameTime: 0,
            entitiesRendered: 0,
            drawCalls: 0
        };
    }
    
    /**
     * Initialize the render system
     */
    initialize() {
        // Set up initial camera position
        this.resetCamera();
        
        // Load any necessary graphics or shaders
        this.loadAssets();
        
        console.log('Render system initialized');
    }
    
    /**
     * Load rendering assets
     */
    loadAssets() {
        // In a real implementation, this would load sprites, textures, etc.
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        // Update camera dimensions
        this.camera.width = this.canvas.width;
        this.camera.height = this.canvas.height;
    }
    
    /**
     * Focus camera on a specific position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    focusCamera(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }
    
    /**
     * Follow entity with camera
     * @param {object} entity - Entity to focus on
     */
    followEntity(entity) {
        if (!entity || !entity.position) return;
        
        // For player, center the view on player
        if (entity === this.engine.player) {
            // Ensure camera stays centered on player
            this.camera.x = entity.position.x;
            this.camera.y = entity.position.y;
            return;
        }
        
        // Smoothly move camera towards other entities
        const smoothFactor = 0.1;
        this.camera.x += (entity.position.x - this.camera.x) * smoothFactor;
        this.camera.y += (entity.position.y - this.camera.y) * smoothFactor;
    }
    
    /**
     * Zoom camera in
     * @param {number} amount - Amount to zoom in
     */
    zoomIn(amount = 0.1) {
        this.camera.targetZoom = Math.min(this.camera.targetZoom + amount, this.camera.maxZoom);
    }
    
    /**
     * Zoom camera out
     * @param {number} amount - Amount to zoom out
     */
    zoomOut(amount = 0.1) {
        this.camera.targetZoom = Math.max(this.camera.targetZoom - amount, this.camera.minZoom);
    }
    
    /**
     * Set camera zoom level
     * @param {number} zoom - Zoom level
     */
    setZoom(zoom) {
        this.camera.targetZoom = Math.max(
            this.camera.minZoom,
            Math.min(zoom, this.camera.maxZoom)
        );
    }
    
    /**
     * Apply camera shake effect
     * @param {number} intensity - Shake intensity
     * @param {number} duration - Shake duration in seconds
     */
    shakeCamera(intensity, duration) {
        this.camera.shake.active = true;
        this.camera.shake.intensity = intensity;
        this.camera.shake.duration = duration;
        this.camera.shake.timer = duration;
    }
    
    /**
     * Update camera shake effect
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateCameraShake(deltaTime) {
        if (!this.camera.shake.active) return;
        
        // Update shake timer
        this.camera.shake.timer -= deltaTime;
        
        if (this.camera.shake.timer <= 0) {
            // Shake finished
            this.camera.shake.active = false;
            this.camera.shake.intensity = 0;
        }
        
        // Calculate shake offset
        const remainingFactor = this.camera.shake.timer / this.camera.shake.duration;
        const intensity = this.camera.shake.intensity * remainingFactor;
        
        // Apply random shake offset
        this.camera.shakeOffsetX = (Math.random() * 2 - 1) * intensity;
        this.camera.shakeOffsetY = (Math.random() * 2 - 1) * intensity;
    }
    
    /**
     * Update zoom smoothly
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateZoom(deltaTime) {
        if (this.camera.zoom !== this.camera.targetZoom) {
            // Smooth zoom transition
            const zoomDiff = this.camera.targetZoom - this.camera.zoom;
            this.camera.zoom += zoomDiff * this.camera.zoomSpeed * deltaTime;
            
            // Snap to target if very close
            if (Math.abs(zoomDiff) < 0.001) {
                this.camera.zoom = this.camera.targetZoom;
            }
        }
    }
    
    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {object} - World coordinates {x, y}
     */
    screenToWorldPosition(screenX, screenY) {
        // Calculate world coordinates
        const canvasCenter = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };
        
        // Apply camera zoom
        const zoomedX = (screenX - canvasCenter.x) / this.camera.zoom;
        const zoomedY = (screenY - canvasCenter.y) / this.camera.zoom;
        
        // Convert from isometric to cartesian
        const cartX = (zoomedX / this.isometric.tileWidth + zoomedY / this.isometric.tileHeight) / 2;
        const cartY = (zoomedY / this.isometric.tileHeight - zoomedX / this.isometric.tileWidth) / 2;
        
        // Add camera offset
        return {
            x: cartX + this.camera.x,
            y: cartY + this.camera.y
        };
    }
    
    /**
     * Convert world coordinates to screen coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} worldZ - World Z coordinate (height)
     * @returns {object} - Screen coordinates {x, y}
     */
    worldToScreenPosition(worldX, worldY, worldZ = 0) {
        // Calculate offset from camera
        const offsetX = worldX - this.camera.x;
        const offsetY = worldY - this.camera.y;
        
        // Convert from cartesian to isometric
        const isoX = (offsetX - offsetY) * this.isometric.tileWidth / 2;
        const isoY = (offsetX + offsetY) * this.isometric.tileHeight / 2;
        
        // Apply height (Z) offset
        const isoZ = worldZ * this.isometric.tileDepth;
        
        // Apply camera zoom and canvas center
        const canvasCenter = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };
        
        // Apply camera shake
        const shakeX = this.camera.shake.active ? this.camera.shakeOffsetX : 0;
        const shakeY = this.camera.shake.active ? this.camera.shakeOffsetY : 0;
        
        return {
            x: canvasCenter.x + isoX * this.camera.zoom + shakeX,
            y: canvasCenter.y + (isoY - isoZ) * this.camera.zoom + shakeY
        };
    }
    
    /**
     * Render the game world
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    render(ctx) {
        // Start measuring performance
        const startTime = performance.now();
        this.metrics.drawCalls = 0;
        this.metrics.entitiesRendered = 0;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update camera
        this.updateZoom(1/60); // Assuming 60 FPS for smooth zoom
        this.updateCameraShake(1/60);
        
        // Follow player if exists
        if (this.engine.player) {
            this.followEntity(this.engine.player);
        }
        
        // Render world
        this.renderBackground(ctx);
        this.renderTerrain(ctx);
        this.renderEntities(ctx);
        this.renderEffects(ctx);
        
        // Render debug information if enabled
        if (this.debug.showGrid) this.renderGrid(ctx);
        if (this.debug.showColliders) this.renderColliders(ctx);
        
        // Update performance metrics
        const endTime = performance.now();
        this.metrics.frameTime = endTime - startTime;
        this.metrics.fps = 1000 / this.metrics.frameTime;
    }
    
    /**
     * Render the background (sky, distant features)
     */
    renderBackground(ctx) {
        // Get time of day for sky color
        const timeData = this.engine.timeManager?.getCurrentTime();
        const isDaytime = timeData?.isDaytime ?? true;
        
        // Get weather for sky effects
        const currentWeather = this.engine.weatherSystem?.getCurrentWeather() ?? 'clear';
        
        // Render sky gradient
        const skyGradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height * 0.5);
        
        if (isDaytime) {
            switch (currentWeather) {
                case 'clear':
                    skyGradient.addColorStop(0, '#87CEEB'); // Sky blue
                    skyGradient.addColorStop(1, '#E0F7FF'); // Lighter blue
                    break;
                case 'cloudy':
                    skyGradient.addColorStop(0, '#A5C9E0'); // Cloudy blue
                    skyGradient.addColorStop(1, '#D6E9F5'); // Light gray-blue
                    break;
                case 'rain':
                    skyGradient.addColorStop(0, '#708090'); // Slate gray
                    skyGradient.addColorStop(1, '#A9B9C7'); // Lighter gray
                    break;
                case 'storm':
                    skyGradient.addColorStop(0, '#4A4A4A'); // Dark gray
                    skyGradient.addColorStop(1, '#7B7B7B'); // Medium gray
                    break;
                case 'snow':
                    skyGradient.addColorStop(0, '#E6E6FA'); // Lavender
                    skyGradient.addColorStop(1, '#FFFFFF'); // White
                    break;
                default:
                    skyGradient.addColorStop(0, '#87CEEB');
                    skyGradient.addColorStop(1, '#E0F7FF');
            }
        } else {
            // Night sky
            skyGradient.addColorStop(0, '#0C1445'); // Dark blue
            skyGradient.addColorStop(1, '#243165'); // Medium blue
        }
        
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height * 0.5);
        this.metrics.drawCalls++;
        
        // Render distant features (mountains, etc.)
        // This would depend on the world generator
    }
    
    /**
     * Render the terrain (ground tiles)
     */
    renderTerrain(ctx) {
        // Get current region
        const currentRegion = this.engine.worldManager?.getCurrentRegion();
        if (!currentRegion) return;
        
        // Calculate visible tiles range
        const screenToWorld = (x, y) => this.screenToWorldPosition(x, y);
        const topLeft = screenToWorld(0, 0);
        const bottomRight = screenToWorld(this.canvas.width, this.canvas.height);
        
        // Expand range to ensure offscreen tiles are rendered
        const expandAmount = 5; // Tiles to expand in each direction
        const minX = Math.floor(topLeft.x) - expandAmount;
        const minY = Math.floor(topLeft.y) - expandAmount;
        const maxX = Math.ceil(bottomRight.x) + expandAmount;
        const maxY = Math.ceil(bottomRight.y) + expandAmount;
        
        // Render terrain tiles
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                this.renderTerrainTile(ctx, x, y);
            }
        }
    }
    
    /**
     * Render a single terrain tile
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     */
    renderTerrainTile(ctx, x, y) {
        // Get tile type based on world position
        const tileType = this.getTileType(x, y);
        
        // Get screen position for tile
        const screenPos = this.worldToScreenPosition(x, y);
        
        // Render tile
        const tileWidth = this.isometric.tileWidth * this.camera.zoom;
        const tileHeight = this.isometric.tileHeight * this.camera.zoom;
        
        // Set tile color based on type
        let fillColor = '#7CBA35'; // Default green color
        
        switch (tileType) {
            case 'marble':
                fillColor = '#E0E0E0';
                break;
            case 'tech_floor':
                fillColor = '#A5C8E1';
                break;
            case 'concrete':
                fillColor = '#A0A0A0';
                break;
            case 'tile':
                fillColor = '#D9BC9A';
                break;
            case 'metal':
                fillColor = '#8A9DB5';
                break;
            case 'carpet':
                fillColor = '#9370DB';
                break;
            case 'grate':
                fillColor = '#505050';
                break;
            default:
                fillColor = '#D0D0D0';
        }
        
        // Draw isometric tile
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - tileHeight / 2);
        ctx.lineTo(screenPos.x + tileWidth / 2, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + tileHeight / 2);
        ctx.lineTo(screenPos.x - tileWidth / 2, screenPos.y);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        
        // Draw tile pattern
        if (tileType) {
            ctx.save();
            
            // Clip to tile shape
            ctx.beginPath();
            ctx.moveTo(screenPos.x, screenPos.y - tileHeight / 2);
            ctx.lineTo(screenPos.x + tileWidth / 2, screenPos.y);
            ctx.lineTo(screenPos.x, screenPos.y + tileHeight / 2);
            ctx.lineTo(screenPos.x - tileWidth / 2, screenPos.y);
            ctx.closePath();
            ctx.clip();
            
            // Draw pattern based on type
            ctx.strokeStyle = this.adjustBrightness(fillColor, -20);
            ctx.lineWidth = 1;
            
            switch (tileType) {
                case 'marble':
                    // Draw checkerboard pattern
                    if ((x + y) % 2 === 0) {
                        ctx.fillStyle = this.adjustBrightness(fillColor, 10);
                        ctx.fillRect(
                            screenPos.x - tileWidth/2,
                            screenPos.y - tileHeight/2,
                            tileWidth,
                            tileHeight
                        );
                    }
                    break;
                case 'tech_floor':
                    // Draw grid lines
                    ctx.beginPath();
                    ctx.moveTo(screenPos.x - tileWidth/2, screenPos.y);
                    ctx.lineTo(screenPos.x + tileWidth/2, screenPos.y);
                    ctx.moveTo(screenPos.x, screenPos.y - tileHeight/2);
                    ctx.lineTo(screenPos.x, screenPos.y + tileHeight/2);
                    ctx.stroke();
                    break;
                case 'concrete':
                    // Draw grid lines
                    ctx.beginPath();
                    const lineSpacing = tileHeight / 4;
                    for (let i = -2; i <= 2; i++) {
                        ctx.moveTo(screenPos.x - tileWidth/2, screenPos.y + i * lineSpacing);
                        ctx.lineTo(screenPos.x + tileWidth/2, screenPos.y + i * lineSpacing);
                    }
                    ctx.stroke();
                    break;
                case 'tile':
                    // Draw dot pattern
                    const dotSize = 1.5;
                    for (let dotX = -1; dotX <= 1; dotX++) {
                        for (let dotY = -1; dotY <= 1; dotY++) {
                            ctx.beginPath();
                            ctx.arc(
                                screenPos.x + dotX * (tileWidth/4),
                                screenPos.y + dotY * (tileHeight/4),
                                dotSize,
                                0,
                                Math.PI * 2
                            );
                            ctx.fillStyle = this.adjustBrightness(fillColor, -15);
                            ctx.fill();
                        }
                    }
                    break;
                case 'metal':
                    // Draw cross pattern
                    ctx.beginPath();
                    ctx.moveTo(screenPos.x - tileWidth/2, screenPos.y - tileHeight/2);
                    ctx.lineTo(screenPos.x + tileWidth/2, screenPos.y + tileHeight/2);
                    ctx.moveTo(screenPos.x + tileWidth/2, screenPos.y - tileHeight/2);
                    ctx.lineTo(screenPos.x - tileWidth/2, screenPos.y + tileHeight/2);
                    ctx.stroke();
                    break;
            }
            
            ctx.restore();
        }
        
        // Add tile border for definition
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        this.metrics.drawCalls += 2;
    }
    
    /**
     * Render entities
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderEntities(ctx) {
        // Get all entities
        const entities = this.engine.entityManager?.getAllEntities() || [];
        
        // Sort entities by Y position for proper isometric rendering
        const sortedEntities = [...entities].sort((a, b) => {
            // Sort by layer first
            const layerA = a.renderLayer || this.layers.characters;
            const layerB = b.renderLayer || this.layers.characters;
            
            if (layerA !== layerB) {
                return layerA - layerB;
            }
            
            // Then sort by Y position for proper overlap
            return a.position.y - b.position.y;
        });
        
        // Render each entity
        for (const entity of sortedEntities) {
            this.renderEntity(ctx, entity);
            this.metrics.entitiesRendered++;
        }
    }
    
    /**
     * Render a single entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     */
    renderEntity(ctx, entity) {
        if (!entity.position) return;
        
        // Get screen position
        const screenPos = this.worldToScreenPosition(
            entity.position.x, 
            entity.position.y,
            entity.height || 0
        );
        
        // Check if entity is visible on screen
        if (this.isOffscreen(screenPos)) return;
        
        // Render entity based on type
        switch (entity.type) {
            case 'player':
                this.renderPlayerEntity(ctx, entity, screenPos);
                break;
            case 'npc':
                this.renderNPCEntity(ctx, entity, screenPos);
                break;
            case 'item':
                this.renderItemEntity(ctx, entity, screenPos);
                break;
            case 'structure':
                this.renderStructureEntity(ctx, entity, screenPos);
                break;
            case 'resource':
                this.renderResourceEntity(ctx, entity, screenPos);
                break;
            default:
                this.renderDefaultEntity(ctx, entity, screenPos);
        }
        
        // Render entity name if debug option is enabled
        if (this.debug.showEntityNames && entity.name) {
            this.renderEntityName(ctx, entity, screenPos);
        }
    }
    
    /**
     * Render player entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderPlayerEntity(ctx, entity, screenPos) {
        // In a real implementation, this would render the player sprite
        // For now, just draw a colorful circle
        
        const size = 20 * this.camera.zoom;
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            screenPos.x, 
            screenPos.y + size * 0.1, 
            size * 0.6, 
            size * 0.3, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw player
        ctx.fillStyle = '#E74C3C'; // Red
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y - size * 0.5, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#C0392B';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        this.metrics.drawCalls += 2;
    }
    
    /**
     * Render NPC entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderNPCEntity(ctx, entity, screenPos) {
        // In a real implementation, this would render the NPC sprite
        // For now, just draw a colorful circle with different colors for NPC types
        
        const size = 16 * this.camera.zoom;
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            screenPos.x, 
            screenPos.y + size * 0.1, 
            size * 0.6, 
            size * 0.3, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Set color based on NPC type
        let fillColor = '#3498DB'; // Default blue
        let strokeColor = '#2980B9';
        
        if (entity.brain && entity.brain.type) {
            switch (entity.brain.type) {
                case 'villager':
                    fillColor = '#3498DB'; // Blue
                    strokeColor = '#2980B9';
                    break;
                case 'merchant':
                    fillColor = '#9B59B6'; // Purple
                    strokeColor = '#8E44AD';
                    break;
                case 'guard':
                    fillColor = '#7F8C8D'; // Gray
                    strokeColor = '#6C7A89';
                    break;
                case 'enemy':
                    fillColor = '#E74C3C'; // Red
                    strokeColor = '#C0392B';
                    break;
            }
        }
        
        // Draw NPC
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y - size * 0.5, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        this.metrics.drawCalls += 2;
    }
    
    /**
     * Render item entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderItemEntity(ctx, entity, screenPos) {
        // In a real implementation, this would render the item sprite
        // For now, just draw a simple shape
        
        const size = 10 * this.camera.zoom;
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            screenPos.x, 
            screenPos.y + size * 0.1, 
            size * 0.6, 
            size * 0.3, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw item - rotated square
        ctx.fillStyle = '#F1C40F'; // Yellow
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y - size * 0.5);
        ctx.rotate(Math.PI / 4); // 45 degrees
        ctx.fillRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
        ctx.restore();
        
        this.metrics.drawCalls += 2;
    }
    
    /**
     * Render structure entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderStructureEntity(ctx, entity, screenPos) {
        // Determine structure style based on type
        let fillColor = '#95A5A6'; // Default concrete color
        let strokeColor = '#7F8C8D';
        
        if (entity.type === 'structure') {
            switch (entity.storeType || entity.subType || entity.type) {
                case 'kiosk':
                    fillColor = '#3498DB'; // Blue for info kiosks
                    strokeColor = '#2980B9';
                    break;
                case 'shop':
                case 'store':
                    fillColor = '#16A085'; // Teal for general stores
                    strokeColor = '#1ABC9C';
                    break;
                case 'electronics':
                    fillColor = '#9B59B6'; // Purple for electronics
                    strokeColor = '#8E44AD';
                    break;
                case 'food':
                    fillColor = '#F1C40F'; // Yellow for food
                    strokeColor = '#F39C12';
                    break;
                case 'fashion':
                    fillColor = '#E74C3C'; // Red for fashion
                    strokeColor = '#C0392B';
                    break;
                case 'faction_hub':
                    fillColor = '#34495E'; // Dark blue for faction areas
                    strokeColor = '#2C3E50';
                    break;
                case 'rest_area':
                    fillColor = '#27AE60'; // Green for rest areas
                    strokeColor = '#2ECC71';
                    break;
            }
        }

        const width = (entity.width || 2) * this.isometric.tileWidth * this.camera.zoom;
        const height = (entity.height || 2) * this.isometric.tileHeight * this.camera.zoom;
        const buildingHeight = (entity.buildingHeight || 2) * this.isometric.tileDepth * this.camera.zoom;
        
        // Draw structure base
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - height / 2);
        ctx.lineTo(screenPos.x + width / 2, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + height / 2);
        ctx.lineTo(screenPos.x - width / 2, screenPos.y);
        ctx.closePath();
        ctx.fill();
        
        // Draw structure walls with slightly lighter color
        const lighterFill = this.lightenColor(fillColor, 20);
        ctx.fillStyle = lighterFill;
        
        // Front wall (isometric trapezoid)
        ctx.beginPath();
        ctx.moveTo(screenPos.x - width / 2, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + height / 2);
        ctx.lineTo(screenPos.x, screenPos.y + height / 2 - buildingHeight);
        ctx.lineTo(screenPos.x - width / 2, screenPos.y - buildingHeight);
        ctx.closePath();
        ctx.fill();
        
        // Side wall (isometric trapezoid) with even lighter color for contrast
        const lighterFill2 = this.lightenColor(fillColor, 40);
        ctx.fillStyle = lighterFill2;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y + height / 2);
        ctx.lineTo(screenPos.x + width / 2, screenPos.y);
        ctx.lineTo(screenPos.x + width / 2, screenPos.y - buildingHeight);
        ctx.lineTo(screenPos.x, screenPos.y + height / 2 - buildingHeight);
        ctx.closePath();
        ctx.fill();
        
        // Roof 
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - buildingHeight - height / 2);
        ctx.lineTo(screenPos.x + width / 2, screenPos.y - buildingHeight);
        ctx.lineTo(screenPos.x, screenPos.y - buildingHeight + height / 2);
        ctx.lineTo(screenPos.x - width / 2, screenPos.y - buildingHeight);
        ctx.closePath();
        ctx.fill();
        
        this.metrics.drawCalls += 4;
    }
    
    /**
     * Render visual effects (particles, weather, etc.)
     */
    renderEffects(ctx) {
        // Get current weather
        const currentWeather = this.engine.weatherSystem?.getCurrentWeather() || 'clear';
        
        // Render weather effects
        switch (currentWeather) {
            case 'rain':
                this.renderRain(ctx);
                break;
            case 'snow':
                this.renderSnow(ctx);
                break;
            case 'storm':
                this.renderRain(ctx);
                this.renderLightning(ctx);
                break;
        }
        
        // Render any active particles or effects
        this.renderParticles(ctx);
    }
    
    /**
     * Render rain effect
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderRain(ctx) {
        // In a real implementation, this would render rain particles
        // For now, just draw some simple lines
        
        ctx.strokeStyle = 'rgba(200, 200, 255, 0.7)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const length = 10 + Math.random() * 10;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - length, y + length);
            ctx.stroke();
        }
        
        this.metrics.drawCalls++;
    }
    
    /**
     * Render snow effect
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderSnow(ctx) {
        // In a real implementation, this would render snow particles
        // For now, just draw some simple circles
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const size = 1 + Math.random() * 2;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        this.metrics.drawCalls++;
    }
    
    /**
     * Render lightning effect
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderLightning(ctx) {
        // Check if we have an active lightning effect from weather system
        const lightningActive = this.engine.weatherSystem?.lightningActive || false;
        const lightningIntensity = this.engine.weatherSystem?.lightningIntensity || 0;
        
        // If there's an active lightning effect, flash the screen
        if (lightningActive && lightningIntensity > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${lightningIntensity * 0.3})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.metrics.drawCalls++;
        }
    }
    
    /**
     * Render particles
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderParticles(ctx) {
        // In a real implementation, this would render various particle effects
        // For now, just a placeholder
    }
    
    /**
     * Render debugging grid
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderGrid(ctx) {
        // Get visible grid range
        const screenToWorld = (x, y) => this.screenToWorldPosition(x, y);
        const topLeft = screenToWorld(0, 0);
        const bottomRight = screenToWorld(this.canvas.width, this.canvas.height);
        
        // Expand range to ensure offscreen tiles are rendered
        const expandAmount = 5; // Tiles to expand in each direction
        const minX = Math.floor(topLeft.x) - expandAmount;
        const minY = Math.floor(topLeft.y) - expandAmount;
        const maxX = Math.ceil(bottomRight.x) + expandAmount;
        const maxY = Math.ceil(bottomRight.y) + expandAmount;
        
        // Draw vertical grid lines
        for (let x = minX; x <= maxX; x++) {
            const startPos = this.worldToScreenPosition(x, minY);
            const endPos = this.worldToScreenPosition(x, maxY);
            
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(endPos.x, endPos.y);
            ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = minY; y <= maxY; y++) {
            const startPos = this.worldToScreenPosition(minX, y);
            const endPos = this.worldToScreenPosition(maxX, y);
            
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(endPos.x, endPos.y);
            ctx.stroke();
        }
        
        this.metrics.drawCalls += (maxX - minX + 1) + (maxY - minY + 1);
    }
    
    /**
     * Render entity colliders for debugging
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderColliders(ctx) {
        // Get all entities with colliders
        const entities = this.engine.entityManager?.getAllEntities().filter(e => e.collider) || [];
        
        // Sort entities by layer first
        const sortedEntities = [...entities].sort((a, b) => {
            // Sort by layer
            const layerA = a.collisionLayer || this.layers.characters;
            const layerB = b.collisionLayer || this.layers.characters;
            
            if (layerA !== layerB) {
                return layerA - layerB;
            }
            
            // Then sort by Y position
            return a.position.y - b.position.y;
        });
        
        // Draw each collider
        for (const entity of sortedEntities) {
            const screenPos = this.worldToScreenPosition(entity.position.x, entity.position.y);
            
            // Check if entity is visible on screen
            if (this.isOffscreen(screenPos)) continue;
            
            const width = (entity.collider.width || 1) * this.isometric.tileWidth * this.camera.zoom;
            const height = (entity.collider.height || 1) * this.isometric.tileHeight * this.camera.zoom;
            
            // Apply collider offset if specified
            const offsetX = entity.collider.offset?.x || 0;
            const offsetY = entity.collider.offset?.y || 0;
            
            // Draw isometric collider
            ctx.beginPath();
            ctx.moveTo(screenPos.x + offsetX, screenPos.y + offsetY - height / 2);
            ctx.lineTo(screenPos.x + offsetX + width / 2, screenPos.y + offsetY);
            ctx.lineTo(screenPos.x + offsetX, screenPos.y + offsetY + height / 2);
            ctx.lineTo(screenPos.x + offsetX - width / 2, screenPos.y + offsetY);
            ctx.closePath();
            ctx.stroke();
        }
    }
    
    /**
     * Check if a screen position is off screen
     * @param {object} screenPos - Screen position {x, y}
     * @returns {boolean} - True if position is off screen
     */
    isOffscreen(screenPos) {
        const padding = 100; // Extra padding to account for entity size
        
        return (
            screenPos.x < -padding ||
            screenPos.y < -padding ||
            screenPos.x > this.canvas.width + padding ||
            screenPos.y > this.canvas.height + padding
        );
    }
    
    /**
     * Get current render metrics
     * @returns {object} - Render metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    
    /**
     * Set debug rendering options
     * @param {object} options - Debug options to set
     */
    setDebugOptions(options) {
        this.debug = { ...this.debug, ...options };
    }
    
    /**
     * Lighten a color
     * @param {string} hex - Hex color string
     * @param {number} percent - Amount to lighten (0-100)
     * @returns {string} - Lightened color
     */
    lightenColor(hex, percent) {
        // Convert hex to RGB
        let r = parseInt(hex.substr(1, 2), 16);
        let g = parseInt(hex.substr(3, 2), 16);
        let b = parseInt(hex.substr(5, 2), 16);
        
        // Lighten
        r = Math.min(255, Math.floor(r * (1 + percent / 100)));
        g = Math.min(255, Math.floor(g * (1 + percent / 100)));
        b = Math.min(255, Math.floor(b * (1 + percent / 100)));
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
// ... existing code ...

/**
 * Handles player input and controls
 */
export class InputHandler {
    constructor(engine) {
        this.engine = engine;
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
     * Set up event listeners
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
        
        // Key press event listeners
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
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
        
        // Update mouse world position
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
        
        // Store touch start position
        this.touchStartPosition = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
        
        this.touchCurrentPosition = { ...this.touchStartPosition };
        
        // Set up virtual joystick
        if (event.touches[0].clientX < window.innerWidth / 2) {
            // Left side of screen = movement joystick
            this.touchJoystickCenter = { ...this.touchStartPosition };
            this.touchJoystickVector = { x: 0, y: 0 };
        } else {
            // Right side of screen = action (simulate mouse click)
            this.engine.player.position.x = this.engine.player.position.x;
            this.engine.player.position.y = this.engine.player.position.y;
            this.engine.player.velocity = { x: 0, y: 0 };
        }
    }
    
    /**
     * Handle touch move event
     * @param {TouchEvent} event - Touch event
     */
    handleTouchMove(event) {
        event.preventDefault();
        
        // Update current touch position
        this.touchCurrentPosition = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
        
        // Update joystick if active
        if (this.touchJoystickCenter) {
            // Calculate joystick vector
            const dx = this.touchCurrentPosition.x - this.touchJoystickCenter.x;
            const dy = this.touchCurrentPosition.y - this.touchJoystickCenter.y;
            
            // Normalize joystick vector
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
                this.touchJoystickVector.x = dx / length;
                this.touchJoystickVector.y = dy / length;
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
        
        // Set player destination
        // In a real implementation, this would use pathfinding
        // to smoothly move towards the destination
    }
    
    /**
     * Check for other input actions
     */
    checkInputActions() {
        // Check for inventory toggle
        if (this.isKeyJustPressed(this.keyBindings.inventory)) {
            if (this.engine.game && this.engine.game.uiManager) {
                this.engine.game.uiManager.toggleInventory();
            }
        }
        
        // Check for quest log toggle
        if (this.isKeyJustPressed(this.keyBindings.quests)) {
            if (this.engine.game && this.engine.game.uiManager) {
                this.engine.game.uiManager.toggleQuests();
            }
        }
        
        // Check for map toggle
        if (this.isKeyJustPressed(this.keyBindings.map)) {
            // Toggle map
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
        
        // Find nearest interactable entity
        // In a real implementation, this would use the physics system or pathfinding
        // to find the nearest interactable entity
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

/**
 * Manages the game world and its regions, including terrain, resources, and structures
 */
export class WorldManager {
    constructor(engine) {
        this.engine = engine;
        this.regions = new Map();
        this.activatedRegions = new Set();
        this.currentRegion = null;
        this.worldData = null;
        this.chunkSize = 16; // Size of each chunk in world units
        this.visibleChunks = 3; // Number of chunks visible in each direction
    }
    
    /**
     * Initialize the world with a given seed
     * @param {string} seed - Seed for world generation
     */
    initialize(seed) {
        // Generate the world using WorldGenerator
        this.worldData = this.engine.game.worldGenerator.generateWorld(seed);
        console.log(`World initialized with seed: ${seed}`);
        
        // Set initial player position
        if (this.worldData.playerStart) {
            this.activateRegionAtPosition(this.worldData.playerStart.x, this.worldData.playerStart.y);
        } else {
            // Default starting position if none specified
            this.activateRegionAtPosition(0, 0);
        }
    }
    
    /**
     * Activate region at the given position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    activateRegionAtPosition(x, y) {
        const regionId = this.getRegionIdForPosition(x, y);
        
        if (regionId) {
            this.activateRegion(regionId);
        }
    }
    
    /**
     * Get region ID for a specific world position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {string|null} - Region ID or null if outside world bounds
     */
    getRegionIdForPosition(x, y) {
        if (!this.worldData) return null;
        
        // Find the region that contains the position
        for (const region of this.worldData.regions) {
            if (x >= region.x && x < region.x + region.width &&
                y >= region.y && y < region.y + region.height) {
                return region.id;
            }
        }
        
        return null;
    }
    
    /**
     * Activate a specific region and surrounding regions
     * @param {string} regionId - ID of the region to activate
     */
    activateRegion(regionId) {
        if (!this.worldData) return;
        
        // Find the region in world data
        const region = this.worldData.regions.find(r => r.id === regionId);
        if (!region) return;
        
        this.currentRegion = region;
        
        // Activate this region and surrounding regions
        this.activateRegionAndSurroundings(region);
        
        // Deactivate regions that are now too far away
        this.deactivateDistantRegions(region);
    }
    
    /**
     * Activate a region and its surrounding regions
     * @param {object} centerRegion - The central region to activate around
     */
    activateRegionAndSurroundings(centerRegion) {
        // First, activate the center region
        this.activatedRegions.add(centerRegion.id);
        
        // If the region is not already loaded, load it
        if (!this.regions.has(centerRegion.id)) {
            this.loadRegion(centerRegion);
        }
        
        // Activate surrounding regions
        const regionSize = centerRegion.width;
        const surroundingOffsets = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];
        
        for (const [xOffset, yOffset] of surroundingOffsets) {
            const rx = Math.floor(centerRegion.x / regionSize) + xOffset;
            const ry = Math.floor(centerRegion.y / regionSize) + yOffset;
            const neighborId = `r${rx}_${ry}`;
            
            // Find the neighbor region
            const neighbor = this.worldData.regions.find(r => r.id === neighborId);
            
            if (neighbor) {
                this.activatedRegions.add(neighbor.id);
                
                // If the region is not already loaded, load it
                if (!this.regions.has(neighbor.id)) {
                    this.loadRegion(neighbor);
                }
            }
        }
    }
    
    /**
     * Deactivate regions that are too far from the given center region
     * @param {object} centerRegion - The center region to measure distance from
     */
    deactivateDistantRegions(centerRegion) {
        const regionSize = centerRegion.width;
        const centerRx = Math.floor(centerRegion.x / regionSize);
        const centerRy = Math.floor(centerRegion.y / regionSize);
        const maxDistance = 2; // Maximum distance in regions
        
        // Check each activated region
        for (const regionId of this.activatedRegions) {
            // Parse region coordinates from ID
            const match = regionId.match(/r(\d+)_(\d+)/);
            if (match) {
                const rx = parseInt(match[1]);
                const ry = parseInt(match[2]);
                
                // Calculate Manhattan distance
                const distance = Math.abs(rx - centerRx) + Math.abs(ry - centerRy);
                
                // If too far, deactivate
                if (distance > maxDistance) {
                    this.deactivateRegion(regionId);
                }
            }
        }
    }
    
    /**
     * Load a region into memory
     * @param {object} region - Region data
     */
    loadRegion(region) {
        console.log(`Loading region ${region.id} (${region.biome})`);
        
        // Create entities for all resources, structures, and NPCs in the region
        this.createRegionEntities(region);
        
        // Store the region
        this.regions.set(region.id, region);
    }
    
    /**
     * Create entities for a region's contents
     * @param {object} region - Region data
     */
    createRegionEntities(region) {
        // Create entities for resources
        if (region.resources) {
            region.resources.forEach(resource => {
                const worldX = region.x + region.width * resource.x;
                const worldY = region.y + region.height * resource.y;
                
                // Create resource entity via EntityManager
                // this.engine.entityManager.createResourceNode({
                //     type: resource.type,
                //     amount: resource.amount,
                //     position: { x: worldX, y: worldY }
                // });
            });
        }
        
        // Find structures in this region
        const structures = this.findStructuresInRegion(region);
        structures.forEach(structure => {
            // Create structure entity
            // this.engine.entityManager.createStructure({
            //     type: structure.type,
            //     name: structure.name,
            //     position: { x: structure.x, y: structure.y },
            //     width: structure.width,
            //     height: structure.height
            // });
        });
        
        // Spawn NPCs for this region
        this.spawnRegionNPCs(region);
    }
    
    /**
     * Find structures located in a region
     * @param {object} region - Region data
     * @returns {Array} - Array of structures in the region
     */
    findStructuresInRegion(region) {
        if (!this.worldData) return [];
        
        // Find villages that have structures in this region
        const structures = [];
        
        // Check all villages
        for (const village of this.worldData.villages || []) {
            for (const building of village.buildings || []) {
                // Check if the building is in this region
                if (building.x >= region.x && building.x < region.x + region.width &&
                    building.y >= region.y && building.y < region.y + region.height) {
                    structures.push(building);
                }
            }
        }
        
        // Add dungeons and other structures
        // To be implemented...
        
        return structures;
    }
    
    /**
     * Spawn NPCs for a region
     * @param {object} region - Region data
     */
    spawnRegionNPCs(region) {
        // Find villages in this region
        const villages = this.worldData.villages.filter(village => 
            village.regionId === region.id
        );
        
        // Spawn village NPCs
        villages.forEach(village => {
            // Determine number of NPCs based on village size
            const npcCount = village.size * 3 + 2; // Small: 5, Medium: 8, Large: 11
            
            // Create NPCs
            for (let i = 0; i < npcCount; i++) {
                const npcType = this.determineNPCType(i, village);
                const npcName = this.generateNPCName();
                
                // Position NPC near village buildings
                const building = village.buildings[i % village.buildings.length];
                const offsetX = (Math.random() - 0.5) * 10;
                const offsetY = (Math.random() - 0.5) * 10;
                
                const npcPosition = {
                    x: building.x + offsetX,
                    y: building.y + offsetY
                };
                
                // Create NPC via EntityManager
                // const npc = this.engine.entityManager.createNPC(
                //     npcType,
                //     npcName,
                //     npcPosition
                // );
                
                // Add NPC to village data
                // village.npcs.push(npc.id);
            }
        });
        
        // Spawn wilderness NPCs based on biome
        this.spawnWildernessNPCs(region);
    }
    
    /**
     * Determine NPC type based on index and village
     * @param {number} index - Index of NPC
     * @param {object} village - Village data
     * @returns {string} - NPC type
     */
    determineNPCType(index, village) {
        // First few NPCs are special roles
        if (index === 0) return 'villager'; // Elder/Mayor
        if (index === 1) return 'merchant'; // Shopkeeper
        if (index === 2) return 'guard'; // Guard captain
        
        // Rest are random, weighted by village size
        const types = ['villager', 'farmer', 'guard', 'craftsman'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    /**
     * Generate a random NPC name
     * @returns {string} - Generated name
     */
    generateNPCName() {
        const prefixes = ['John', 'Emma', 'Aiden', 'Sophia', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Isabella'];
        const suffixes = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        
        return `${prefix} ${suffix}`;
    }
    
    /**
     * Spawn wilderness NPCs (animals, monsters) based on region biome
     * @param {object} region - Region data
     */
    spawnWildernessNPCs(region) {
        // To be implemented: Generate appropriate wildlife based on biome
    }
    
    /**
     * Regenerate a specific region
     * @param {string} regionId - ID of region to regenerate
     * @returns {boolean} - True if region was regenerated
     */
    regenerateRegion(regionId) {
        if (!this.worldData) return false;
        
        // Find the region
        const regionIndex = this.worldData.regions.findIndex(r => r.id === regionId);
        if (regionIndex === -1) return false;
        
        console.log(`Regenerating region ${regionId}`);
        
        // Get the original region data
        const originalRegion = this.worldData.regions[regionIndex];
        
        // Remove all entities in this region
        // To be implemented
        
        // Generate new resources for the region
        const biome = this.engine.game.worldGenerator.biomes.find(b => b.name === originalRegion.biome);
        if (biome) {
            originalRegion.resources = this.engine.game.worldGenerator.generateRegionResources(biome);
        }
        
        // Update the region in the world data
        this.worldData.regions[regionIndex] = originalRegion;
        
        // If region is currently loaded, reload it
        if (this.regions.has(regionId)) {
            this.regions.delete(regionId);
            this.loadRegion(originalRegion);
        }
        
        return true;
    }
    
    /**
     * Get data about the current region
     * @returns {object|null} - Current region data or null if no region is active
     */
    getCurrentRegion() {
        return this.currentRegion;
    }
    
    /**
     * Get a list of all activated regions
     * @returns {Array} - Array of region IDs
     */
    getActivatedRegions() {
        return Array.from(this.activatedRegions);
    }
    
    /**
     * Get entities in the current region
     * @returns {Array} - Array of entities in the current region
     */
    getEntitiesInCurrentRegion() {
        if (!this.currentRegion) return [];
        
        // To be implemented: when entities have a regionId property
        return [];
    }
    
    /**
     * Update the world manager
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (!this.engine.player || !this.worldData) return;
        
        // Use player velocity to move the world in the opposite direction
        const player = this.engine.player;
        if (player.velocity && (player.velocity.x !== 0 || player.velocity.y !== 0)) {
            // Calculate isometric movement direction
            // For isometric view, when player moves in one direction,
            // the world should move in the opposite direction
            const worldVelocityX = -player.velocity.x;
            const worldVelocityY = -player.velocity.y;
            
            // When the player moves, move the camera/world position
            if (this.engine.renderSystem) {
                this.engine.renderSystem.camera.x += worldVelocityX * deltaTime;
                this.engine.renderSystem.camera.y += worldVelocityY * deltaTime;
            }
        }
        
        // Update time-of-day based world effects
        this.updateWorldEffects(deltaTime);
    }
    
    /**
     * Update time-of-day and weather based world effects
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateWorldEffects(deltaTime) {
        // To be implemented: update lighting, ambient sounds, etc. based on time and weather
    }
    
    /**
     * Regenerate a specific region
     * @param {string} regionId - ID of region to regenerate
     * @returns {boolean} - True if region was regenerated
     */
    regenerateRegion(regionId) {
        // Implementation details would go here
        
        return true;
    }
}

/**
 * Handles player inventory and equipment
 */
export class InventorySystem {
    constructor(engine) {
        this.engine = engine;
        this.itemTemplates = new Map();
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
     * Register an item template
     * @param {object} template - Item template data
     */
    registerItemTemplate(template) {
        // Store the template in the item templates
        this.itemTemplates.set(template.id, template);
    }
    
    /**
     * Get an item template by ID
     * @param {string} itemId - Item template ID
     * @returns {object|null} - Item template or null if not found
     */
    getItemTemplate(itemId) {
        return this.itemTemplates.get(itemId) || null;
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
        };
    }
    
    /**
     * Add an item to an inventory
     * @param {object} inventory - Inventory object
     * @param {string} itemId - Item template ID
     * @param {number} count - Item count
     * @returns {boolean} - True if item was added successfully
     */
    addItemToInventory(inventory, itemId, count = 1) {
        // Get item template
        const itemTemplate = this.getItemTemplate(itemId);
        if (!itemTemplate) return false;
        
        // Check if item is stackable and already exists in inventory
        if (itemTemplate.stackable) {
            // Look for existing stack
            for (let i = 0; i < inventory.size; i++) {
                const item = inventory.items[i];
                if (item && item.id === itemId) {
                    // Add to existing stack
                    item.count += count;
                    return true;
                }
            }
        }
        
        // Find empty slot
        let emptySlot = -1;
        for (let i = 0; i < inventory.size; i++) {
            if (!inventory.items[i]) {
                emptySlot = i;
                break;
            }
        }
        
        // If no empty slot, return false
        if (emptySlot === -1) return false;
        
        // Create item instance
        const itemInstance = {
            ...itemTemplate,
            count: count
        };
        
        // Add to inventory
        inventory.items[emptySlot] = itemInstance;
        
        return true;
    }
    
    /**
     * Remove an item from an inventory
     * @param {object} inventory - Inventory object
     * @param {string} itemId - Item template ID
     * @param {number} count - Item count
     * @returns {boolean} - True if item was removed successfully
     */
    removeItemFromInventory(inventory, itemId, count = 1) {
        let remainingToRemove = count;
        
        // For stackable items, try to remove from existing stack
        for (let i = 0; i < inventory.size && remainingToRemove > 0; i++) {
            const item = inventory.items[i];
            if (item && item.id === itemId) {
                // Remove from existing stack
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
        // Check existing stack
        if (this.getItemTemplate(itemId).stackable) {
            for (let i = 0; i < inventory.size; i++) {
                const item = inventory.items[i];
                if (item && item.id === itemId) {
                    // Add to existing stack
                    return this.getItemTemplate(itemId).stackable;
                }
            }
        }
        
        // Check for empty slots
        let emptySlots = 0;
        for (let i = 0; i < inventory.size; i++) {
            if (!inventory.items[i]) {
                emptySlots++;
            }
        }
        
        // Calculate slots needed
        const slotsNeeded = count > 0 ? Math.ceil(count / this.getItemTemplate(itemId).stackable) : 1;
        
        return emptySlots >= slotsNeeded;
    }
    
    /**
     * Equip an item from inventory
     * @param {object} inventory - Inventory object
     * @param {object} equipment - Equipment object
     * @param {number} slot - Inventory slot index
     */
    equipItem(inventory, equipment, slot) {
        // Get item
        const item = inventory.items[slot];
        
        // Check if item exists and is equippable
        if (!item || item.type !== 'equipment' || !item.equipSlot) {
            return false;
        }
        
        // Unequip current item in that slot if any
        const currentItem = equipment[item.equipSlot];
        if (currentItem) {
            // Remove item from equipment slot
            equipment[item.equipSlot] = null;
            
            // Add to inventory
            this.addItemToInventory(inventory, currentItem.id, 1);
        }
        
        // Equip new item
        equipment[item.equipSlot] = item;
        
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
        // Check if slot has an item
        if (!equipment[equipSlot]) {
            return false;
        }
        
        // Remove from equipment
        const item = equipment[equipSlot];
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
        // Get item
        const item = inventory.items[slot];
        
        // Check if item exists and is usable
        if (!item || item.type !== 'consumable' || !item.effect) {
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
     * Generate quests for a specific story thread
     * @param {string} threadId - Story thread ID
     * @returns {Array} - Array of quests in the thread
     */
    generateQuestsForThread(threadId) {
        // To be implemented: Generate quests dynamically based on story thread
    }
    
    /**
     * Initialize item templates
     */
    initializeItemTemplates() {
        // In a real implementation, this would load from data files
        // For now, we'll define some basic templates directly
        
        // Weapons
        this.registerItemTemplate({
            id: 'wooden_sword',
            name: 'Wooden Sword',
            description: 'A basic wooden sword.',
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
            description: 'Restores 20 health.',
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
        });
        
        this.registerItemTemplate({
            id: 'energy_potion',
            name: 'Energy Potion',
            description: 'Restores 20 energy.',
            type: 'consumable',
            subtype: 'potion',
            icon: 'potion',
            value: 5,
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
        
        // Initialize crafting recipes
        this.initializeCraftingRecipes();
    }
    
    /**
     * Initialize crafting recipes
     */
    initializeCraftingRecipes() {
        // In a real implementation, this would load from data files
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
     * Register a crafting recipe
     * @param {object} recipe - Crafting recipe data
     */
    registerCraftingRecipe(recipe) {
        // Store the recipe in the crafting recipes
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
     * Get a crafting recipe by ID
     * @param {string} recipeId - Crafting recipe ID
     * @returns {object|null} - Crafting recipe or null if not found
     */
    getRecipe(recipeId) {
        return this.craftingRecipes.get(recipeId) || null;
    }
    
    /**
     * Craft an item
     * @param {object} inventory - Inventory object
     * @param {string} recipeId - Crafting recipe ID
     * @returns {boolean} - True if crafting was successful
     */
    craftItem(inventory, recipeId) {
        // Get crafting recipe
        const recipe = this.getRecipe(recipeId);
        if (!recipe) {
            console.error(`Recipe ${recipeId} not found`);
            return false;
        }
        
        // Check if we have all ingredients
        for (const ingredient of recipe.ingredients) {
            if (!this.hasEnoughItems(inventory, ingredient.itemId, ingredient.count)) {
                console.log(`Not enough ${ingredient.itemId} to craft ${recipe.result.itemId}`);
                return false;
            }
        }
        
        // Remove ingredients
        for (const ingredient of recipe.ingredients) {
            this.removeItemFromInventory(inventory, ingredient.itemId, ingredient.count);
        }
        
        // Add result
        this.addItemToInventory(inventory, recipe.result.itemId, recipe.result.count);
        
        return true;
    }
}

/**
 * Handles game time and day/night cycle
 */
export class TimeManager {
    constructor(engine) {
        this.engine = engine;
        
        // Time constants
        this.SECONDS_PER_MINUTE = 60;
        this.MINUTES_PER_HOUR = 60;
        this.HOURS_PER_DAY = 24;
        this.DAYS_PER_SEASON = 30;
        this.SEASONS_PER_YEAR = 4;
        
        // Time scale - how fast in-game time passes compared to real time
        // E.g. 60 means 1 real second = 1 in-game minute
        this.timeScale = 60;
        
        // Current time
        this.minute = 0;
        this.hour = 6;  // Start at 6 AM
        this.day = 1;
        this.season = 0; // 0 = Spring, 1 = Summer, 2 = Fall, 3 = Winter
        this.year = 1;
        
        // Time accumulator
        this.accumulator = 0;
        
        // Listeners for time events
        this.timeListeners = [];
    }

    /**
     * Initialize the time manager
     */
    initialize() {
        // Set initial time
        this.setTime(6, 0, 1, 0, 1);
        
        // Notify about the time change
        this.notifyTimeChanged();
    }
    
    /**
     * Update game time
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Accumulate real time
        this.accumulator += deltaTime * this.timeScale;
        
        // Calculate how many in-game minutes have passed
        const minutesPassed = Math.floor(this.accumulator / this.SECONDS_PER_MINUTE);
        
        if (minutesPassed > 0) {
            // Remove used time from accumulator
            this.accumulator -= minutesPassed * this.SECONDS_PER_MINUTE;
            
            // Advance time by calculated minutes
            this.advanceMinutes(minutesPassed);
        }
    }
    
    /**
     * Advance time by a number of minutes
     * @param {number} minutes - Minutes to advance
     */
    advanceMinutes(minutes) {
        // Store previous hour to detect hour changes
        const previousHour = this.hour;
        
        // Add minutes
        this.minute += minutes;
        
        // Handle minute overflow
        if (this.minute >= this.MINUTES_PER_HOUR) {
            const hoursToAdd = Math.floor(this.minute / this.MINUTES_PER_HOUR);
            this.minute %= this.MINUTES_PER_HOUR;
            this.hour += hoursToAdd;
            
            // Handle hour overflow
            if (this.hour >= this.HOURS_PER_DAY) {
                const daysToAdd = Math.floor(this.hour / this.HOURS_PER_DAY);
                this.hour %= this.HOURS_PER_DAY;
                this.day += daysToAdd;
                
                // Handle day overflow
                if (this.day > this.worldData.width) {
                    console.log("Day overflow, setting to world width");
                    this.day = this.worldData.width;
                }
            }
        }
        
        // Check for specific time events
        this.checkTimeEvents();
        
        // Trigger time update events
        this.notifyTimeChanged();
    }
    
    /**
     * Check for specific time events
     * @param {number} hour - Current hour
     */
    checkTimeEvents() {
        // Check for time-specific events
        if (this.hour === this.timeEvents.sunrise && this.minute === 0) {
            this.notifyTimeEvent('sunrise');
        } else if (this.hour === this.timeEvents.noon && this.minute === 0) {
            this.notifyTimeEvent('noon');
        } else if (this.hour === this.timeEvents.sunset && this.minute === 0) {
            this.notifyTimeEvent('sunset');
        } else if (this.hour === this.timeEvents.midnight && this.minute === 0) {
            this.notifyTimeEvent('midnight');
        }
    }
    
    /**
     * Notify listeners about time change
     */
    notifyTimeChanged() {
        // Trigger time update events
        this.timeListeners.forEach(listener => {
            listener(this.getCurrentTime());
        });
    }
    
    /**
     * Trigger a specific time event
     * @param {string} eventName - Event name
     */
    notifyTimeEvent(eventName) {
        console.log(`Time event triggered: ${eventName}`);
        
        // Execute event effects
        if (eventName === 'sunrise') {
            // Sunrise effect
            this.engine.renderSystem.setSkyColor('#87CEEB');
        } else if (eventName === 'noon') {
            // Noon effect
            this.engine.renderSystem.setSkyColor('#F1C40F');
        } else if (eventName === 'sunset') {
            // Sunset effect
            this.engine.renderSystem.setSkyColor('#708090');
        } else if (eventName === 'midnight') {
            // Midnight effect
            this.engine.renderSystem.setSkyColor('#243165');
        }
        
        // Notify about the time event
        this.timeListeners.forEach(listener => {
            listener(this.getCurrentTime());
        });
    }
    
    /**
     * Get the current time
     * @returns {object} - Current time object
     */
    getCurrentTime() {
        return {
            minute: this.minute,
            hour: this.hour,
            day: this.day,
            season: this.seasonNames[this.season],
            year: this.year,
            isDaytime: this.isDaytime(),
            totalMinutes: this.getTotalMinutes()
        };
    }
    
    /**
     * Get formatted time string
     * @returns {string} - Formatted time (e.g. "Day 1 - Spring - 06:00")
     */
    getFormattedTime() {
        const hourStr = this.hour.toString().padStart(2, '0');
        const minuteStr = this.minute.toString().padStart(2, '0');
        
        return `Day ${this.day} - ${this.seasonNames[this.season]} - ${hourStr}:${minuteStr}`;
    }
    
    /**
     * Check if it's currently daytime
     * @returns {boolean} - True if it's daytime (between sunrise and sunset)
     */
    isDaytime() {
        return this.hour >= this.timeEvents.sunrise && this.hour < this.timeEvents.sunset;
    }
    
    /**
     * Get total minutes since game start
     * @returns {number} - Total minutes
     */
    getTotalMinutes() {
        return (((this.year - 1) * this.SEASONS_PER_YEAR + this.season) * this.DAYS_PER_SEASON + 
                (this.day - 1)) * this.HOURS_PER_DAY + 
                this.hour * this.MINUTES_PER_HOUR + 
                this.minute);
    }
    
    /**
     * Advance time by a number of hours
     * @param {number} hours - Hours to advance
     */
    advanceTime(hours) {
        this.hour += hours;
        
        // Check for day overflow
        if (this.hour >= this.HOURS_PER_DAY) {
            const daysToAdd = Math.floor(this.hour / this.HOURS_PER_DAY);
            this.hour %= this.HOURS_PER_DAY;
            this.day += daysToAdd;
        }
        
        // Notify about the time change
        this.notifyTimeChanged();
    }
    
    /**
     * Set weather
     * @param {string} weatherType - Weather type
     */
    setWeather(weatherType) {
        this.engine.weatherSystem.setWeather(weatherType);
    }
    
    /**
     * Get all time listeners
     * @returns {Array} - Array of time listeners
     */
    getAllListeners() {
        return Array.from(this.timeListeners);
    }
    
    /**
     * Add a time listener
     * @param {function} callback - Callback function
     * @param {string} eventType - Event type (optional)
     */
    addListener(callback, eventType = 'timeChanged') {
        this.timeListeners.push({ callback, eventType });
    }
    
    /**
     * Remove a time listener
     * @param {function} callback - Callback function to remove
     */
    removeListener(callback) {
        this.timeListeners = this.timeListeners.filter(listener => listener.callback !== callback);
    }
    
    /**
     * Set debug option
     * @param {string} option - Option name
     * @param {boolean} value - Option value
     */
    setDebugOption(option, value) {
        if (option in this.debugOptions) {
            this.debugOptions[option] = value;
        }
    }
    
    /**
     * Toggle god mode
     * @returns {boolean} - New god mode state
     */
    toggleGodMode() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
    
    /**
     * Clear engine cache
     */
    clearCache() {
        console.log('Engine cache cleared');
    }
    
    /**
     * Teleport player to position
     * @param {object} position - Target position {x, y}
     */
    teleportPlayerTo(position) {
        if (this.engine.player) {
            this.engine.player.position = { ...position };
        }
    }
    
    /**
     * Update entity stats
     * @param {string} entityId - Entity ID
     * @param {object} newStats - New stats
     */
    updateEntityStats(entityId, newStats) {
        console.log(`Updated stats for entity ${entityId}`, newStats);
    }
    
    /**
     * Remove entity from game
     * @param {string} entityId - Entity ID
     * @returns {boolean} - True if entity was removed
     */
    removeEntity(entityId) {
        console.log(`Removed entity ${entityId}`);
        return true;
    }
    
    /**
     * Advance game time
     * @param {number} hours - Hours to advance
     */
    advanceTime(hours) {
        this.advanceTime(hours);
    }
    
    /**
     * Set weather
     * @param {string} weatherType - Weather type
     */
    setWeather(weatherType) {
        this.engine.weatherSystem.setWeather(weatherType);
    }
    
    /**
     * Spawn a random NPC
     * @returns {string} - ID of spawned NPC
     */
    spawnRandomNPC() {
        console.log('Spawned random NPC');
        return 'npc' + Math.floor(Math.random() * 1000).toString();
    }
    
    /**
     * Regenerate a specific region
     * @param {string} regionId - ID of region to regenerate
     * @returns {boolean} - True if region was regenerated
     */
    regenerateRegion(regionId) {
        console.log(`Regenerated region ${regionId}`);
        return true;
    }
    
    /**
     * Add a random quest
     */
    addRandomQuest() {
        console.log('Added random quest');
    }
    
    /**
     * Advance main story
     */
    advanceMainStory() {
        this.engine.storyManager.advanceMainStory();
    }
    
    /**
     * Reset story progress
     */
    resetStoryProgress() {
        this.engine.storyManager.resetProgress();
    }
    
    /**
     * Set a story flag
     * @param {string} flag - Flag name
     * @param {any} value - Flag value
     */
    setStoryFlag(flag, value) {
        this.engine.storyManager.setFlag(flag, value);
    }
}

/**
 * Handles game audio including music, sound effects, and ambient sounds
 */
export class SoundManager {
    constructor(engine) {
        this.engine = engine;
        this.audioContext = null;
        
        // Sound volume levels
        this.masterVolume = 1.0;
        this.musicVolume = 0.7;
        this.sfxVolume = 0.8;
        this.ambientVolume = 0.5;
        this.uiVolume = 0.6;
        
        // Sound collections
        this.sounds = new Map();
        this.music = new Map();
        this.ambient = new Map();
        
        // Currently playing sounds
        this.playingSounds = new Map();
        
        // Background music
        this.currentMusic = null;
        this.nextMusic = null;
        this.musicFading = false;
        this.musicFadeTime = 2; // seconds
        this.musicCrossfadeProgress = 0;
        
        // Ambient sounds
        this.currentAmbient = [];
        this.weatherSounds = new Map();
        
        // Audio file extensions to try (in order of preference)
        this.audioExtensions = ['ogg', 'mp3', 'wav'];
        
        // Initialize sound system
        this.initialize();
    }
    
    /**
     * Initialize the sound system
     */
    initialize() {
        try {
            // Create audio context
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Create volume nodes
            this.masterGain = this.audioContext.createGain();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            this.ambientGain = this.audioContext.createGain();
            this.uiGain = this.audioContext.createGain();
            
            // Connect volume nodes
            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            this.ambientGain.connect(this.masterGain);
            this.uiGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            // Set initial volumes
            this.updateVolumes();
            
            // Register sound assets
            this.registerSounds();
            
            console.log('Sound manager initialized');
        } catch (error) {
            console.error('Error initializing sound system:', error);
        }
    }
    
    /**
     * Register a sound effect
     * @param {string} id - Sound ID
     * @param {object} path - Path to sound file (without extension)
     * @param {boolean} variations - Whether the sound has variations
     */
    registerSound(id, path, variations = false) {
        this.sounds.set(id, {
            path,
            loaded: false,
            buffer: null,
            variations
        });
    }
    
    /**
     * Register a music track
     * @param {string} id - Music ID
     * @param {string} path - Path to music file (without extension)
     */
    registerMusic(id, path) {
        this.music.set(id, {
            path,
            loaded: false,
            buffer: null
        });
    }
    
    /**
     * Register an ambient sound
     * @param {string} id - Ambient sound ID
     * @param {string} path - Path to ambient sound file (without extension)
     */
    registerAmbient(id, path) {
        this.ambient.set(id, {
            path,
            loaded: false,
            buffer: null
        });
    }
    
    /**
     * Update sound volumes
     */
    updateVolumes() {
        this.masterGain.gain.value = this.masterVolume;
        this.musicGain.gain.value = this.musicVolume;
        this.sfxGain.gain.value = this.sfxVolume;
        this.ambientGain.gain.value = this.ambientVolume;
        this.uiGain.gain.value = this.uiVolume;
    }
    
    /**
     * Play a sound
     * @param {string} id - Sound ID
     * @param {object} options - Playback options
     * @returns {string|null} - Sound instance ID or null if failed
     */
    playSound(id, options = {}) {
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Load sound if not loaded
            if (!this.sounds.get(id).loaded) {
                this.loadSoundById(id, 'sound');
            }
            
            // Create source
            const source = this.audioContext.createBufferSource();
            
            // If sound has variations, adjust pitch slightly
            if (this.sounds.get(id).variations) {
                // Random pitch between 0.9 and 1.1
                source.playbackRate.value = 0.9 + Math.random() * 0.2;
            }
            
            // Set volume
            const volume = options.volume !== undefined ? options.volume : 1.0;
            source.gain = this.sfxGain;
            source.gain.value = volume;
            
            // Connect to appropriate output based on category
            if (options.category === 'ui') {
                source.connect(this.uiGain);
            } else {
                source.connect(this.sfxGain);
            }
            
            // Set loop
            source.loop = options.loop !== undefined ? options.loop : true;
            
            // Generate unique ID for this sound instance
            const instanceId = `sound_${id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            
            // Store sound instance
            this.playingSounds.set(instanceId, {
                source,
                gainNode: this.sfxGain,
                id,
                options
            });
            
            // Start playback
            source.start();
            
            return instanceId;
        } catch (error) {
            console.error(`Error playing sound ${id}:`, error);
            return null;
        }
    }
    
    /**
     * Stop a sound
     * @param {string} instanceId - Sound instance ID
     * @param {number} fadeOutTime - Fade out time in seconds (0 for immediate stop)
     */
    stopSound(instanceId, fadeOutTime = 0) {
        const sound = this.playingSounds.get(instanceId);
        if (!sound) return;
        
        // Fade out
        if (fadeOutTime > 0) {
            // Update gain node to fade out
            sound.gainNode.gain = sound.gainNode.gain.value;
            sound.gainNode.gain.linearRampToValueAtTime(fadeOutTime, 0);
        }
        
        // Stop immediately
        sound.source.stop();
        
        // Remove from playing sounds
        this.playingSounds.delete(instanceId);
    }
    
    /**
     * Play music
     * @param {string} id - Music ID
     * @param {object} options - Playback options
     * @returns {boolean} - True if music was played successfully
     */
    playMusic(id, options = {}) {
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Load music if not loaded
            if (!this.music.get(id).loaded) {
                this.loadSoundById(id, 'music');
            }
            
            // Create source
            const source = this.audioContext.createBufferSource();
            source.buffer = this.music.get(id).buffer;
            
            // Set volume
            const volume = options.volume !== undefined ? options.volume : 1.0;
            source.gain = this.musicGain;
            source.gain.value = volume;
            
            // Connect to music output
            source.connect(this.musicGain);
            
            // Set loop
            source.loop = true;
            
            // Generate unique ID for this music instance
            const instanceId = `music_${id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            
            // Store music instance
            this.playingSounds.set(instanceId, {
                source,
                gainNode: this.musicGain,
                id,
                options
            });
            
            // Start playback
            source.start();
            
            return true;
        } catch (error) {
            console.error(`Error playing music ${id}:`, error);
            return false;
        }
    }
    
    /**
     * Stop current music
     * @param {number} fadeOutTime - Fade out time in seconds (0 for immediate stop)
     */
    stopMusic(fadeOutTime = 0) {
        if (!this.currentMusic) return;
        
        // Fade out
        if (fadeOutTime > 0) {
            // Update gain node to fade out
            this.musicGain.gain.value = this.musicGain.gain.value;
            this.musicGain.gain.linearRampToValueAtTime(fadeOutTime, 0);
        }
        
        // Stop immediately
        this.currentMusic.source.stop();
        
        // Remove from playing sounds
        this.playingSounds.delete(`music_${this.currentMusic.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
        
        this.currentMusic = null;
    }
    
    /**
     * Play ambient sound
     * @param {string} id - Ambient sound ID
     * @param {object} options - Playback options
     * @returns {string|null} - Sound instance ID or null if failed
     */
    playAmbient(id, options = {}) {
        try {
            // Load ambient sound if not loaded
            if (!this.ambient.get(id).loaded) {
                this.loadSoundById(id, 'ambient');
            }
            
            // Create source
            const source = this.audioContext.createBufferSource();
            source.buffer = this.ambient.get(id).buffer;
            
            // Set volume
            const volume = options.volume !== undefined ? options.volume : 1.0;
            source.gain = this.ambientGain;
            source.gain.value = volume;
            
            // Connect to ambient output
            source.connect(this.ambientGain);
            
            // Set loop
            source.loop = true;
            
            // Generate unique ID for this ambient instance
            const instanceId = `ambient_${id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            
            // Store ambient instance
            this.playingSounds.set(instanceId, {
                source,
                gainNode: this.ambientGain,
                id,
                options
            });
            
            // Start playback
            source.start();
            
            return instanceId;
        } catch (error) {
            console.error(`Error playing ambient sound ${id}:`, error);
            return null;
        }
    }
    
    /**
     * Update weather ambient sounds
     * @param {string} weatherType - Weather type
     */
    updateWeatherAmbient(weatherType) {
        // Get ambient sound for this weather
        const ambientId = this.weatherSounds.get(weatherType);
        if (!ambientId) return;
        
        // Play new ambient sound
        this.playAmbient(ambientId, {
            volume: 1.0
        });
        
        // Add ambient sound to current ambient list
        this.currentAmbient.push(ambientId);
    }
    
    /**
     * Update sound manager
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Check for time-of-day based music changes
        this.updateTimeBasedAudio();
        
        // Update ambient sounds
        this.updateAmbientSounds();
        
        // Check for weather changes
        this.checkWeatherChange(deltaTime);
        
        // Update sound effects
        this.updateSoundEffects();
    }
    
    /**
     * Update time-of-day based audio
     */
    updateTimeBasedAudio() {
        // Get current time data
        const timeData = this.engine.timeManager?.getCurrentTime();
        if (!timeData) return;
        
        // Adjust ambient volume based on time of day
        if (timeData.isDaytime !== this.lastIsDaytime) {
            this.lastIsDaytime = timeData.isDaytime;
            
            // Adjust ambient volume based on time of day
            if (timeData.isDaytime) {
                this.ambientGain.gain.value = 0.5;
            } else {
                this.ambientGain.gain.value = 0.1;
            }
        }
    }
    
    /**
     * Update ambient sounds
     */
    updateAmbientSounds() {
        // Update ambient sound volumes
        this.ambientGain.gain.value = this.ambientVolume;
    }
    
    /**
     * Check for weather changes
     * @param {number} deltaTime - Time since last update in seconds
     */
    checkWeatherChange(deltaTime) {
        // In a real implementation, this would be tied to the time system triggering events
        // For now, we'll just use a simple timer
    }
    
    /**
     * Update sound effects
     */
    updateSoundEffects() {
        // In a real implementation, this would update sound effects based on game state
        // For now, just a placeholder
    }
    
    /**
     * Get current audio state
     * @returns {object} - Audio state information
     */
    getAudioState() {
        return {
            contextState: this.audioContext?.state || 'closed',
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            ambientVolume: this.ambientVolume,
            currentMusic: this.currentMusic?.id || null,
            activeAmbient: this.currentAmbient,
            playingSounds: this.playingSounds.size
        };
    }
    
    /**
     * Set master volume
     * @param {number} volume - Volume level (0-1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }
    
    /**
     * Set music volume
     * @param {number} volume - Volume level (0-1)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }
    
    /**
     * Set sound effects volume
     * @param {number} volume - Volume level (0-1)
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }
    
    /**
     * Set ambient sound volume
     * @param {number} volume - Volume level (0-1)
     */
    setAmbientVolume(volume) {
        this.ambientVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }
    
    /**
     * Set UI sound volume
     * @param {number} volume - Volume level (0-1)
     */
    setUIVolume(volume) {
        this.uiVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }
    
    /**
     * Pause all audio
     */
    pause() {
        if (this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
    }
    
    /**
     * Resume all audio
     */
    resume() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    /**
     * Get current audio settings
     * @returns {object} - Audio settings
     */
    getAudioSettings() {
        return {
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            ambientVolume: this.ambientVolume,
            uiVolume: this.uiVolume
        };
    }
}

/**
 * Manages player character data including stats, skills, and equipment
 */
export class CharacterManager {
    constructor(player) {
        this.player = player;
        this.stats = player.stats;
        this.skills = player.skills;
        this.equipment = player.equipment;
        this.inventory = player.inventory;
    }
    
    /**
     * Get player stats
     * @returns {object} - Player stats
     */
    getStats() {
        return this.stats;
    }
    
    /**
     * Get player skills
     * @returns {Array} - Player skills
     */
    getSkills() {
        return this.skills;
    }
    
    /**
     * Get player equipment
     * @returns {object} - Player equipment
     */
    getEquipment() {
        return this.equipment;
    }
    
    /**
     * Get player inventory
     * @returns {object} - Player inventory
     */
    getInventory() {
        return this.inventory;
    }
    
    /**
     * Update player stats
     * @param {object} newStats - New player stats
     */
    updateStats(newStats) {
        this.stats = newStats;
    }
    
    /**
     * Update player skills
     * @param {Array} newSkills - New player skills
     */
    updateSkills(newSkills) {
        this.skills = newSkills;
    }
    
    /**
     * Update player equipment
     * @param {object} newEquipment - New player equipment
     */
    updateEquipment(newEquipment) {
        this.equipment = newEquipment;
    }
    
    /**
     * Update player inventory
     * @param {object} newInventory - New player inventory
     */
    updateInventory(newInventory) {
        this.inventory = newInventory;
    }
    
    /**
     * Add a skill to the player
     * @param {string} skillId - Skill ID
     */
    addSkill(skillId) {
        this.skills.push(skillId);
    }
    
    /**
     * Remove a skill from the player
     * @param {string} skillId - Skill ID
     */
    removeSkill(skillId) {
        this.skills = this.skills.filter(skill => skill !== skillId);
    }
    
    /**
     * Add an item to the player's inventory
     * @param {string} itemId - Item ID
     * @param {number} count - Item count
     */
    addItemToInventory(itemId, count) {
        // In a real implementation, this would use the inventory system
        // For now, just add the item to the player's inventory
        this.inventory.items.push({
            id: itemId,
            name: 'Item',
            description: 'An item',
            type: 'item',
            count: count
        });
    }
    
    /**
     * Remove an item from the player's inventory
     * @param {string} itemId - Item ID
     * @param {number} count - Item count
     */
    removeItemFromInventory(itemId, count) {
        // In a real implementation, this would use the inventory system
        // For now, just remove the item from the player's inventory
        this.inventory.items = this.inventory.items.filter(item => item.id !== itemId);
    }
    
    /**
     * Equip an item
     * @param {string} itemId - Item ID
     */
    equipItem(itemId) {
        // In a real implementation, this would use the equipment system
        // For now, just equip the item
        this.equipment[itemId] = {
            id: itemId,
            name: 'Item',
            description: 'An item',
            type: 'equipment',
            slot: 'head'
        };
    }
    
    /**
     * Unequip an item
     * @param {string} itemId - Item ID
     */
    unequipItem(itemId) {
        // In a real implementation, this would use the equipment system
        // For now, just unequip the item
        this.equipment[itemId] = null;
    }
}

/**
 * Handles player interaction with NPCs
 */
export class NPCInteractionManager {
    constructor(engine) {
        this.engine = engine;
        this.npcs = new Map();
        this.dialogues = new Map();
        
        // Initialize NPCs
        this.initializeNPCs();
    }
    
    /**
     * Initialize NPCs
     */
    initializeNPCs() {
        // In a real implementation, this would load from data files
        // For now, just add some basic NPCs directly
        
        // Add an NPC
        this.npcs.set('npc1', {
            id: 'npc1',
            name: 'Village Elder',
            description: 'The village elder',
            position: { x: 10, y: 5 },
            dialogue: {
                initial: {
                    text: 'Hello, how are you?',
                    type: 'greeting'
                }
            }
        });
    }
    
    /**
     * Show NPC dialogue
     * @param {string} npcId - NPC ID
     * @param {object} dialogue - Dialogue content
     */
    showDialogue(npcId, dialogue) {
        // In a real implementation, this would use the UI to display the dialogue
        // For now, just log the dialogue
        console.log(`Showing dialogue for NPC ${npcId}: ${dialogue.text}`);
    }
    
    /**
     * Handle NPC interaction
     * @param {string} npcId - NPC ID
     * @param {object} interactionType - Interaction type (e.g. talk, trade)
     */
    handleInteraction(npcId, interactionType) {
        // In a real implementation, this would handle different interaction types
        // For now, just log the interaction
        console.log(`Handling interaction with NPC ${npcId}: ${interactionType}`);
    }
}

/**
 * Handles player trading with NPCs
 */
export class TradingManager {
    constructor(engine) {
        this.engine = engine;
        this.npcs = new Map();
        
        // Initialize NPCs
        this.initializeNPCs();
    }
    
    /**
     * Initialize NPCs
     */
    initializeNPCs() {
        // In a real implementation, this would load from data files
        // For now, just add some basic NPCs directly
        
        // Add an NPC
        this.npcs.set('npc1', {
            id: 'npc1',
            name: 'Village Merchant',
            description: 'The village merchant',
            position: { x: 8, y: 8 },
            inventory: {
                items: [
                    {
                        id: 'item1',
                        name: 'Item',
                        description: 'An item',
                        type: 'item',
                        count: 10
                    }
                ]
            }
        });
    }
    
    /**
     * Show trading interface
     * @param {string} npcId - NPC ID
     */
    showTrading(npcId) {
        // In a real implementation, this would use the UI to display the trading interface
        // For now, just log the trading interface
        console.log(`Showing trading interface for NPC ${npcId}`);
    }
    
    /**
     * Handle trading
     * @param {string} npcId - NPC ID
     * @param {object} tradeData - Trade data
     */
    handleTrading(npcId, tradeData) {
        // In a real implementation, this would use the trading system
        // For now, just log the trade
        console.log(`Handling trade with NPC ${npcId}: ${JSON.stringify(tradeData)}`);
    }
}

/**
 * Handles player quests and objectives
 */
export class QuestManager {
    constructor(engine) {
        this.engine = engine;
        this.quests = new Map();
        this.objectives = new Map();
        
        // Initialize quests
        this.initializeQuests();
    }
    
    /**
     * Initialize quests
     */
    initializeQuests() {
        // In a real implementation, this would load from data files
        // For now, just add some basic quests directly
        
        // Add a quest
        this.quests.set('quest1', {
            id: 'quest1',
            title: 'Village in Need',
            description: 'The village needs help gathering supplies.',
            giver: 'Village Elder',
            location: 'Forest clearing',
            isMainQuest: true,
            status: 'in_progress',
            progress: 50,
            objectives: [
                {
                    id: 'obj1',
                    description: 'Collect 5 medicinal herbs',
                    type: 'collect',
                    required: 5,
                    current: 3,
                    completed: false
                },
                {
                    id: 'obj2',
                    description: 'Deliver herbs to the elder',
                    type: 'talk',
                    completed: false
                }
            ],
            rewards: [
                { type: 'item', name: 'Health Potion', amount: 3 },
                { type: 'gold', amount: 50 },
                { type: 'exp', amount: 100 }
            ],
            abandonable: false
        });
    }
    
    /**
     * Get all quests
     * @returns {Array} - Array of quests
     */
    getAllQuests() {
        return Array.from(this.quests.values());
    }
    
    /**
     * Get quests by chapter
     * @param {number} chapter - Chapter number
     * @returns {Array} - Array of quests in the chapter
     */
    getQuestsByChapter(chapter) {
        return Array.from(this.quests.values())
            .filter(quest => quest.chapter === chapter);
    }
    
    /**
     * Get quests by story thread
     * @param {string} threadId - Story thread ID
     * @returns {Array} - Array of quests in the thread
     */
    getQuestsByThread(threadId) {
        return Array.from(this.quests.values())
            .filter(quest => quest.storyThread === threadId);
    }
    
    /**
     * Get a quest by ID
     * @param {string} questId - Quest ID
     * @returns {object|null} - Quest object or null if not found
     */
    getQuest(questId) {
        // Check active quests first
        if (this.quests.has(questId)) {
            return this.quests.get(questId);
        }
        
        // Then check completed quests
        if (this.engine.storyManager.getCompletedQuests().has(questId)) {
            return this.engine.storyManager.getCompletedQuest(questId);
        }
        
        // Then check failed quests
        if (this.engine.storyManager.getFailedQuests().has(questId)) {
            return this.engine.storyManager.getFailedQuest(questId);
        }
        
        return null;
    }
    
    /**
     * Assign a quest to the player
     * @param {string} questId - Quest ID
     * @returns {boolean} - True if quest was assigned successfully
     */
    assignQuest(questId) {
        // Check if quest exists
        const quest = this.getQuest(questId);
        if (!quest) {
            console.error(`Cannot assign quest ${questId}: Quest not found`);
            return false;
        }
        
        // Clone the quest to create an instance for this player
        const questInstance = JSON.parse(JSON.stringify(quest));
        questInstance.status = 'in_progress';
        questInstance.dateStarted = new Date();
        
        // Add to active quests
        this.quests.set(questId, questInstance);
        
        // Notify UI
        this.engine.game.uiManager.showQuestModal(questId);
        
        console.log(`Quest assigned: ${questInstance.title}`);
        return true;
    }
    
    /**
     * Complete a quest
     * @param {string} questId - Quest ID
     * @returns {boolean} - True if quest was completed successfully
     */
    completeQuest(questId) {
        // Check if quest can be completed
        const quest = this.getQuest(questId);
        if (!quest || quest.status !== 'ready_to_complete') {
            console.log(`Cannot complete quest ${questId}: Not ready to complete`);
            return false;
        }
        
        // Update quest status
        quest.status = 'completed';
        quest.dateCompleted = new Date();
        
        // Move from active to completed
        this.quests.delete(questId);
        this.engine.storyManager.completeQuest(questId);
        
        // Notify UI
        this.engine.game.uiManager.showQuestCompleted(questId);
        
        console.log(`Quest completed: ${quest.title}`);
        return true;
    }
    
    /**
     * Fail a quest
     * @param {string} questId - Quest ID
     * @param {string} reason - Reason for failure
     * @returns {boolean} - True if quest was failed successfully
     */
    failQuest(questId, reason) {
        // Check if quest exists
        const quest = this.getQuest(questId);
        if (!quest) {
            console.error(`Cannot fail quest ${questId}: Quest not found`);
            return false;
        }
        
        // Update quest status
        quest.status = 'failed';
        quest.failReason = reason;
        quest.dateFailed = new Date();
        
        // Move from active to failed
        this.quests.delete(questId);
        this.engine.storyManager.failQuest(questId, reason);
        
        // Notify UI
        this.engine.game.uiManager.showQuestFailed(questId);
        
        console.log(`Quest failed: ${quest.title} (${reason})`);
        return true;
    }
    
    /**
     * Abandon a quest
     * @param {string} questId - Quest ID
     * @returns {boolean} - True if quest was abandoned successfully
     */
    abandonQuest(questId) {
        // Check if quest exists
        const quest = this.getQuest(questId);
        if (!quest) {
            console.error(`Cannot abandon quest ${questId}: Quest not found`);
            return false;
        }
        
        // Update quest status
        quest.status = 'abandoned';
        quest.dateAbandoned = new Date();
        
        // Move from active to failed
        this.quests.delete(questId);
        this.engine.storyManager.abandonQuest(questId);
        
        // Notify UI
        this.engine.game.uiManager.showQuestAbandoned(questId);
        
        console.log(`Quest abandoned: ${quest.title}`);
        return true;
    }
}

/**
 * Manages game engine systems and functionality
 */
export class GameEngine {
    constructor(game) {
        this.game = game;
        this.running = false;
        this.startTime = performance.now();
        this.engine = new Engine();
        this.storyManager = new StoryManager(this.engine);
        this.timeManager = new TimeManager(this.engine);
        this.weatherSystem = new WeatherSystem(this.engine);
        this.inputHandler = new InputHandler(this.engine);
        this.physicsSystem = new PhysicsSystem(this.engine);
        this.renderSystem = new RenderSystem(this.engine);
        this.soundManager = new SoundManager(this.engine);
        this.aiSystem = new AISystem(this.engine);
        this.questSystem = new QuestSystem(this.engine);
        this.saveSystem = new SaveSystem(this.engine);
        
        // Debug options
        this.debugOptions = {
            showCollisionBoxes: false,
            showPathFinding: false,
            showNPCStates: false
        };
        
        // God mode
        this.godMode = false;
        
        // Performance metrics
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = this.startTime;
        this.metrics = {
            fps: 0,
            frameTime: 0,
            entitiesRendered: 0,
            drawCalls: 0
        };
        
        // Canvas and rendering context
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Resize canvas to match window size
        this.resizeCanvas();
        
        // Window resize event listener
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Event listeners for input
        this.inputHandler.setupEventListeners();
        
        // Game loop event listener
        this.engine.gameLoop = (time) => this.gameLoop(time);
        
        // Start the game engine
        this.start();
    }
    
    /**
     * Initialize the game world
     * @param {string} seed - Seed for world generation
     */
    initWorld(seed) {
        this.engine.worldManager.initialize(seed);
        this.storyManager.initialize(this.engine.player);
        
        // Set player starting location
        this.engine.player.position = { x: 0, y: 0 };
        
        // Initialize quest system
        this.questSystem.initialize();
    }
    
    /**
     * Create the player character
     * @param {string} name - Player character name
     */
    createPlayerCharacter(name) {
        // Create player entity
        this.engine.entityManager.createPlayer(name);
        
        // Initialize player inventory
        this.engine.inventorySystem.createInventory();
        
        // Initialize player equipment
        this.engine.inventorySystem.createEquipment();
        
        // Add starting items to player inventory
        this.engine.inventorySystem.addItemToInventory(this.engine.player.inventory, 'wooden_sword', 1);
        this.engine.inventorySystem.addItemToInventory(this.engine.player.inventory, 'health_potion', 3);
        
        // Equip player with starting items
        this.engine.inventorySystem.equipItem(this.engine.player.inventory, this.engine.player.equipment, 0);
    }
    
    /**
     * Start the game engine
     */
    start() {
        this.running = true;
        this.startTime = performance.now();
        
        // Start the game loop
        this.gameLoop(this.startTime);
        
        // Save the game periodically
        this.autoSaveInterval = setInterval(() => this.saveGame(), 5 * 60 * 1000); // Auto-save every 5 minutes
    }
    
    /**
     * Stop the game engine
     */
    stop() {
        this.running = false;
        
        // Stop the game loop
        this.gameLoop = null;
        
        // Clear the auto-save interval
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
    }
    
    /**
     * Game loop function
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        // Calculate delta time in seconds
        const deltaTime = (timestamp - this.lastTimestamp) / 1000 || 0;
        this.lastTimestamp = timestamp;
        
        // Update game systems
        this.update(deltaTime);
        
        // Render the game
        this.render();
        
        // Schedule next frame
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    /**
     * Update all game systems
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update time
        this.timeManager.update(deltaTime);
        
        // Update weather
        this.weatherSystem.update(deltaTime);
        
        // Update AI if available
        if (typeof this.aiSystem.update === 'function') {
            this.aiSystem.update(deltaTime);
        }
        
        // Update entities
        this.engine.entityManager.update(deltaTime);
        
        // Update physics
        this.physicsSystem.update(deltaTime);
        
        // Update quests
        this.questSystem.update(deltaTime);
        
        // Update story
        this.storyManager.update(deltaTime);
    }
    
    /**
     * Render the game
     */
    render() {
        // Start measuring performance
        const startTime = performance.now();
        this.metrics.drawCalls = 0;
        this.metrics.entitiesRendered = 0;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update camera
        this.engine.renderSystem.updateZoom(1/60); // Assuming 60 FPS for smooth zoom
        this.engine.renderSystem.updateCameraShake(1/60);
        
        // Follow player if exists
        if (this.engine.player) {
            this.engine.renderSystem.followEntity(this.engine.player);
        }
        
        // Render world
        this.engine.renderSystem.render(this.ctx);
        
        // Render debug information if enabled
        if (this.debugOptions.showGrid) this.engine.renderSystem.renderGrid(this.ctx);
        if (this.debugOptions.showColliders) this.engine.renderSystem.renderColliders(this.ctx);
        
        // Update performance metrics
        const endTime = performance.now();
        this.metrics.frameTime = endTime - startTime;
        this.metrics.fps = 1000 / this.metrics.frameTime;
        
        // Set FPS display in UI
        if (this.game.configManager.getOptions().graphics.showFPS) {
            const fpsCounter = document.getElementById('fps-counter');
            if (fpsCounter) {
                fpsCounter.textContent = this.metrics.fps.toFixed(1);
            }
        }
    }
    
    /**
     * Resize the canvas to match the window size
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Update the render system to handle the resize
        this.engine.renderSystem.handleResize();
    }
    
    /**
     * Save the current game state
     * @returns {boolean} - True if save successful
     */
    saveGame() {
        return this.engine.saveSystem.saveGame();
    }
    
    /**
     * Load a saved game
     * @param {string} saveId - ID of the save to load
     * @returns {boolean} - True if load successful
     */
    loadGame(saveId) {
        return this.engine.saveSystem.loadGame(saveId);
    }
    
    /**
     * Get player inventory
     * @returns {object} - Player inventory
     */
    getPlayerInventory() {
        // Placeholder implementation
        return {
            size: 20,
            items: [
                { id: 'item1', name: 'Wooden Sword', description: 'A basic wooden sword', type: 'equipment', icon: 'sword', count: 1, value: 10 },
                { id: 'item2', name: 'Health Potion', description: 'Restores 20 health', type: 'consumable', icon: 'potion', count: 5, value: 5 },
                { id: 'item3', name: 'Leather Armor', description: 'Basic armor made from tanned leather', type: 'equipment', icon: 'armor', count: 1, value: 30 },
                { id: 'item4', name: 'Iron Ore', description: 'Raw iron ore', type: 'material', icon: 'material', count: 8, value: 3 }
            ]
        };
    }
    
    /**
     * Get player equipment
     * @returns {object} - Player equipment
     */
    getPlayerEquipment() {
        // Placeholder implementation
        return {
            head: null,
            torso: {
                id: 'torso1', name: 'Leather Vest', description: 'Basic torso protection', type: 'equipment', icon: 'armor', value: 20 },
                equipSlot: 'torso'
            },
            legs: null,
            feet: null,
            weapon: null,
            accessory: null
        };
    }
    
    /**
     * Get player stats
     * @returns {object} - Player stats
     */
    getPlayerStats() {
        // Placeholder implementation
        return {
            health: 85,
            maxHealth: 100,
            energy: 70,
            maxEnergy: 100,
            strength: 10,
            dexterity: 8,
            intelligence: 7,
            vitality: 10,
            defense: 5,
            attack: 12
        };
    }
    
    /**
     * Get all entities in the game world
     * @returns {Array} - Array of entities
     */
    getAllEntities() {
        // Placeholder implementation
        return [
            { id: 'player', name: 'Player', type: 'player', position: { x: 0, y: 0 } },
            { id: 'npc1', name: 'Village Elder', type: 'npc', position: { x: 10, y: 5 } },
            { id: 'npc2', name: 'Shopkeeper', type: 'npc', position: { x: 8, y: 8 } }
        ];
    }
    
    /**
     * Get entity by ID
     * @param {string} entityId - Entity ID
     * @returns {object|null} - Entity object or null if not found
     */
    getEntityById(entityId) {
        // Placeholder implementation
        return null;
    }
    
    /**
     * Get world information
     * @returns {object} - World information
     */
    getWorldInfo() {
        // Placeholder implementation
        return {
            seed: this.engine.worldManager.worldData.seed,
            width: this.engine.worldManager.worldData.width,
            height: this.engine.worldManager.worldData.height,
            regions: this.engine.worldManager.worldData.regions,
            villages: this.engine.worldManager.worldData.villages,
            dungeons: this.engine.worldManager.worldData.dungeons,
            pointsOfInterest: this.engine.worldManager.worldData.pointsOfInterest,
            factions: this.engine.worldManager.worldData.factions,
            factionRelationships: this.engine.worldManager.worldData.factionRelationships
        };
    }
    
    /**
     * Get active quests
     * @returns {Array} - Array of active quests
     */
    getActiveQuests() {
        // Placeholder implementation
        return [
            {
                id: 'quest1',
                title: 'Village in Need',
                description: 'The village needs help gathering supplies.',
                giver: 'Village Elder',
                location: 'Forest clearing',
                isMainQuest: true,
                status: 'in_progress',
                progress: 50,
                objectives: [
                    {
                        id: 'obj1',
                        description: 'Collect 5 medicinal herbs',
                        type: 'collect',
                        required: 5,
                        current: 3,
                        completed: false
                    },
                    {
                        id: 'obj2',
                        description: 'Deliver herbs to the elder',
                        type: 'talk',
                        completed: false
                    }
                ],
                rewards: [
                    { type: 'item', name: 'Health Potion', amount: 3 },
                    { type: 'gold', amount: 50 },
                    { type: 'exp', amount: 100 }
                ],
                abandonable: false
            }
        ];
    }
    
    /**
     * Get completed quests
     * @returns {Array} - Array of completed quests
     */
    getCompletedQuests() {
        // Placeholder implementation
        return [
            {
                id: 'quest2',
                title: 'Quest completed',
                description: 'The quest is completed',
                giver: 'Village Elder',
                location: 'Forest clearing',
                isMainQuest: true,
                status: 'completed',
                progress: 100,
                rewards: [
                    { type: 'item', name: 'Health Potion', amount: 3 },
                    { type: 'gold', amount: 50 },
                    { type: 'exp', amount: 100 }
                ],
                abandonable: false
            }
        ];
    }
    
    /**
     * Get failed quests
     * @returns {Array} - Array of failed quests
     */
    getFailedQuests() {
        // Placeholder implementation
        return [];
    }
    
    /**
     * Get story state
     * @returns {object} - Story state
     */
    getStoryState() {
        // Placeholder implementation
        return {
            currentChapter: 1,
            mainQuestProgress: 15,
            activePlotThreads: ['village_troubles', 'mysterious_stranger'],
            completedArcs: []
        };
    }
    
    /**
     * Get story flags
     * @returns {object} - Story flags
     */
    getStoryFlags() {
        // Placeholder implementation
        return {
            'met_elder': true,
            'knows_about_artifact': false,
            'village_reputation': 20,
            'helped_village': true
        };
    }
    
    /**
     * Get system statistics
     * @returns {object} - System statistics
     */
    getSystemStats() {
        return {
            fps: this.fps,
            entityCount: 15,
            memoryUsage: 50 * 1024 * 1024, // 50 MB (placeholder)
            uptime: (performance.now() - this.startTime) / 1000,
            debugOptions: this.debugOptions
        };
    }
    
    /**
     * Set debug option
     * @param {string} option - Option name
     * @param {boolean} value - Option value
     */
    setDebugOption(option, value) {
        if (option in this.debugOptions) {
            this.debugOptions[option] = value;
        }
    }
    
    /**
     * Toggle god mode
     * @returns {boolean} - New god mode state
     */
    toggleGodMode() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
    
    /**
     * Clear engine cache
     */
    clearCache() {
        console.log('Engine cache cleared');
    }
    
    /**
     * Teleport player to position
     * @param {object} position - Target position {x, y}
     */
    teleportPlayerTo(position) {
        if (this.engine.player) {
            this.engine.player.position = { ...position };
        }
    }
    
    /**
     * Update entity stats
     * @param {string} entityId - Entity ID
     * @param {object} newStats - New stats
     */
    updateEntityStats(entityId, newStats) {
        console.log(`Updated stats for entity ${entityId}`, newStats);
    }
    
    /**
     * Remove entity from game
     * @param {string} entityId - Entity ID
     * @returns {boolean} - True if entity was removed
     */
    removeEntity(entityId) {
        console.log(`Removed entity ${entityId}`);
        return true;
    }
    
    /**
     * Advance game time
     * @param {number} hours - Hours to advance
     */
    advanceTime(hours) {
        this.engine.timeManager.advanceTime(hours);
    }
    
    /**
     * Set weather
     * @param {string} weatherType - Weather type
     */
    setWeather(weatherType) {
        this.engine.weatherSystem.setWeather(weatherType);
    }
    
    /**
     * Spawn a random NPC
     * @returns {string} - ID of spawned NPC
     */
    spawnRandomNPC() {
        console.log('Spawned random NPC');
        return 'npc' + Math.floor(Math.random() * 1000).toString();
    }
    
    /**
     * Regenerate a specific region
     * @param {string} regionId - ID of region to regenerate
     * @returns {boolean} - True if region was regenerated
     */
    regenerateRegion(regionId) {
        console.log(`Regenerated region ${regionId}`);
        return true;
    }
    
    /**
     * Add a random quest
     */
    addRandomQuest() {
        console.log('Added random quest');
    }
    
    /**
     * Advance main story
     */
    advanceMainStory() {
        this.engine.storyManager.advanceMainStory();
    }
    
    /**
     * Reset story progress
     */
    resetStoryProgress() {
        this.engine.storyManager.resetProgress();
    }
    
    /**
     * Set a story flag
     * @param {string} flag - Flag name
     * @param {any} value - Flag value
     */
    setStoryFlag(flag, value) {
        this.engine.storyManager.setFlag(flag, value);
    }
}

// ... existing code ...
    /**
     * Render a single terrain tile
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     */
    renderTerrainTile(ctx, x, y) {
        // Get tile type based on world position
        const tileType = this.getTileType(x, y);
        
        // Get screen position for tile
        const screenPos = this.worldToScreenPosition(x, y);
        
        // Render tile
        const tileWidth = this.isometric.tileWidth * this.camera.zoom;
        const tileHeight = this.isometric.tileHeight * this.camera.zoom;
        
        // Set tile color based on type
        let fillStyle = '#7CBA35'; // Default color
        let patternType = '';
        
        switch (tileType) {
            case 'marble':
                fillStyle = '#E0E0E0';
                patternType = 'checker';
                break;
            case 'tech_floor':
                fillStyle = '#A5C8E1';
                patternType = 'line';
                break;
            case 'concrete':
                fillStyle = '#A0A0A0';
                patternType = 'grid';
                break;
            case 'tile':
                fillStyle = '#D9BC9A';
                patternType = 'checker';
                break;
            case 'metal':
                fillStyle = '#8A9DB5';
                patternType = 'grid';
                break;
            case 'carpet':
                fillStyle = '#9370DB';
                patternType = 'dot';
                break;
            case 'grate':
                fillStyle = '#505050';
                patternType = 'cross';
                break;
            default:
                fillStyle = '#D0D0D0';
        }
        
        // Draw isometric tile
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - tileHeight / 2
