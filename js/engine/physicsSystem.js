/**
 * Handles physics, collisions, and movement
 */
export class PhysicsSystem {
    constructor(engine) {
        this.engine = engine;
        
        // Physics configuration
        this.gravity = 0; // No gravity in top-down view
        this.friction = 0.8; // General friction coefficient
        
        // Collision layers
        this.collisionLayers = {
            player: 0b0001,
            npc: 0b0010,
            obstacle: 0b0100,
            trigger: 0b1000
        };
        
        // Collision matrix (which layers collide with which)
        this.collisionMatrix = {
            [this.collisionLayers.player]: this.collisionLayers.obstacle | this.collisionLayers.npc,
            [this.collisionLayers.npc]: this.collisionLayers.obstacle | this.collisionLayers.player | this.collisionLayers.npc,
            [this.collisionLayers.obstacle]: this.collisionLayers.player | this.collisionLayers.npc,
            [this.collisionLayers.trigger]: 0 // Triggers don't physically collide, but detect overlaps
        };
        
        // Cached colliders
        this.colliders = [];
        
        // Spatial partitioning (grid-based)
        this.spatialHash = new Map();
        this.cellSize = 10; // Size of each spatial grid cell
    }
    
    /**
     * Update physics simulation
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Get all entities with physics components
        const physicsEntities = this.getPhysicsEntities();
        
        // Clear spatial hash
        this.spatialHash.clear();
        
        // Update entity positions and build spatial hash
        this.updatePositions(physicsEntities, deltaTime);
        
        // Check for collisions
        this.checkCollisions(physicsEntities);
        
        // Resolve collisions
        this.resolveCollisions();
        
        // Process triggers
        this.processTriggers();
    }
    
    /**
     * Get all entities with physics components
     * @returns {Array} - Array of physics entities
     */
    getPhysicsEntities() {
        // In a real implementation, this would filter entities with position, velocity, and collider
        // For now, just get all entities from entity manager
        return this.engine.entityManager.getAllEntities()
            .filter(entity => entity.position && entity.collider);
    }
    
    /**
     * Update entity positions based on velocity
     * @param {Array} entities - Array of physics entities
     * @param {number} deltaTime - Time since last update in seconds
     */
    updatePositions(entities, deltaTime) {
        for (const entity of entities) {
            // Skip if entity has no velocity
            if (!entity.velocity) continue;
            
            // Update position based on velocity
            const newPosition = {
                x: entity.position.x + entity.velocity.x * deltaTime,
                y: entity.position.y + entity.velocity.y * deltaTime
            };
            
            // Apply friction to velocity
            if (entity.velocity.x !== 0 || entity.velocity.y !== 0) {
                entity.velocity.x *= Math.pow(this.friction, deltaTime);
                entity.velocity.y *= Math.pow(this.friction, deltaTime);
                
                // Stop if velocity is very small
                if (Math.abs(entity.velocity.x) < 0.001) entity.velocity.x = 0;
                if (Math.abs(entity.velocity.y) < 0.001) entity.velocity.y = 0;
            }
            
            // Check for world boundaries
            if (this.engine.worldManager) {
                // In a real implementation, this would check world boundaries
                // and prevent entities from leaving the world
            }
            
            // Update entity position
            entity.position = newPosition;
            
            // Add entity to spatial hash
            this.addToSpatialHash(entity);
        }
    }
    
    /**
     * Add an entity to the spatial hash
     * @param {object} entity - Entity to add
     */
    addToSpatialHash(entity) {
        if (!entity.position || !entity.collider) return;
        
        // Calculate entity bounds
        const bounds = this.getEntityBounds(entity);
        
        // Calculate grid cells that contain the entity
        const minCellX = Math.floor(bounds.minX / this.cellSize);
        const maxCellX = Math.floor(bounds.maxX / this.cellSize);
        const minCellY = Math.floor(bounds.minY / this.cellSize);
        const maxCellY = Math.floor(bounds.maxY / this.cellSize);
        
        // Add entity to all cells it occupies
        for (let x = minCellX; x <= maxCellX; x++) {
            for (let y = minCellY; y <= maxCellY; y++) {
                const cellKey = `${x},${y}`;
                
                if (!this.spatialHash.has(cellKey)) {
                    this.spatialHash.set(cellKey, []);
                }
                
                this.spatialHash.get(cellKey).push(entity);
            }
        }
    }
    
    /**
     * Get entities in the same spatial cells as the given entity
     * @param {object} entity - Entity to check
     * @returns {Array} - Array of nearby entities
     */
    getNearbyEntities(entity) {
        if (!entity.position || !entity.collider) return [];
        
        // Calculate entity bounds
        const bounds = this.getEntityBounds(entity);
        
        // Calculate grid cells that contain the entity
        const minCellX = Math.floor(bounds.minX / this.cellSize);
        const maxCellX = Math.floor(bounds.maxX / this.cellSize);
        const minCellY = Math.floor(bounds.minY / this.cellSize);
        const maxCellY = Math.floor(bounds.maxY / this.cellSize);
        
        // Get all entities in these cells
        const nearbyEntities = new Set();
        
        for (let x = minCellX; x <= maxCellX; x++) {
            for (let y = minCellY; y <= maxCellY; y++) {
                const cellKey = `${x},${y}`;
                
                if (this.spatialHash.has(cellKey)) {
                    for (const otherEntity of this.spatialHash.get(cellKey)) {
                        if (otherEntity !== entity) {
                            nearbyEntities.add(otherEntity);
                        }
                    }
                }
            }
        }
        
        return Array.from(nearbyEntities);
    }
    
    /**
     * Check for collisions between entities
     * @param {Array} entities - Array of physics entities
     */
    checkCollisions(entities) {
        // Clear previous collision data
        this.collisions = [];
        
        // Check each entity against nearby entities
        for (const entityA of entities) {
            // Skip if entity has no collider
            if (!entityA.collider) continue;
            
            // Get nearby entities from spatial hash
            const nearbyEntities = this.getNearbyEntities(entityA);
            
            for (const entityB of nearbyEntities) {
                // Skip if entity has no collider
                if (!entityB.collider) continue;
                
                // Skip if entities are the same
                if (entityA === entityB) continue;
                
                // Check collision layer compatibility
                if (!this.checkCollisionLayers(entityA, entityB)) continue;
                
                // Check for collision
                const collision = this.checkEntityCollision(entityA, entityB);
                
                if (collision) {
                    this.collisions.push(collision);
                }
            }
        }
    }
    
    /**
     * Check if two entities' collision layers allow them to collide
     * @param {object} entityA - First entity
     * @param {object} entityB - Second entity
     * @returns {boolean} - True if entities can collide
     */
    checkCollisionLayers(entityA, entityB) {
        // Get collision layers
        const layerA = entityA.collisionLayer || this.collisionLayers.obstacle;
        const layerB = entityB.collisionLayer || this.collisionLayers.obstacle;
        
        // Check if layers can collide
        return (this.collisionMatrix[layerA] & layerB) !== 0;
    }
    
    /**
     * Check for collision between two entities
     * @param {object} entityA - First entity
     * @param {object} entityB - Second entity
     * @returns {object|null} - Collision data or null if no collision
     */
    checkEntityCollision(entityA, entityB) {
        // Get entity bounds
        const boundsA = this.getEntityBounds(entityA);
        const boundsB = this.getEntityBounds(entityB);
        
        // Check for overlap
        if (boundsA.maxX < boundsB.minX || boundsA.minX > boundsB.maxX ||
            boundsA.maxY < boundsB.minY || boundsA.minY > boundsB.maxY) {
            // No overlap
            return null;
        }
        
        // Calculate overlap distances
        const overlapX = Math.min(boundsA.maxX - boundsB.minX, boundsB.maxX - boundsA.minX);
        const overlapY = Math.min(boundsA.maxY - boundsB.minY, boundsB.maxY - boundsA.minY);
        
        // Determine if this is a collision or trigger
        const isTrigger = 
            (entityA.collisionLayer === this.collisionLayers.trigger) ||
            (entityB.collisionLayer === this.collisionLayers.trigger);
        
        return {
            entityA,
            entityB,
            overlapX,
            overlapY,
            isTrigger
        };
    }
    
    /**
     * Resolve collisions between entities
     */
    resolveCollisions() {
        // Process each collision
        for (const collision of this.collisions) {
            // Skip triggers (they don't physically resolve)
            if (collision.isTrigger) continue;
            
            // Get entities
            const entityA = collision.entityA;
            const entityB = collision.entityB;
            
            // Determine which entity should move (or both)
            let moveA = true;
            let moveB = true;
            
            // Static objects don't move
            if (entityA.isStatic) moveA = false;
            if (entityB.isStatic) moveB = false;
            
            // If both are static or both are movable, move both
            if ((!moveA && !moveB) || (moveA && moveB)) {
                moveA = true;
                moveB = true;
            }
            
            // Calculate resolution distances
            let resolutionX = collision.overlapX;
            let resolutionY = collision.overlapY;
            
            // Resolve in the direction of minimum overlap
            if (collision.overlapX < collision.overlapY) {
                // Resolve horizontally
                resolutionY = 0;
                
                // Determine direction
                const directionX = 
                    (entityA.position.x < entityB.position.x) ? -1 : 1;
                
                // Apply resolution
                if (moveA) {
                    entityA.position.x += directionX * resolutionX * (moveB ? 0.5 : 1);
                }
                
                if (moveB) {
                    entityB.position.x -= directionX * resolutionX * (moveA ? 0.5 : 1);
                }
                
                // Stop horizontal movement
                if (entityA.velocity) entityA.velocity.x = 0;
                if (entityB.velocity) entityB.velocity.x = 0;
            } else {
                // Resolve vertically
                resolutionX = 0;
                
                // Determine direction
                const directionY = 
                    (entityA.position.y < entityB.position.y) ? -1 : 1;
                
                // Apply resolution
                if (moveA) {
                    entityA.position.y += directionY * resolutionY * (moveB ? 0.5 : 1);
                }
                
                if (moveB) {
                    entityB.position.y -= directionY * resolutionY * (moveA ? 0.5 : 1);
                }
                
                // Stop vertical movement
                if (entityA.velocity) entityA.velocity.y = 0;
                if (entityB.velocity) entityB.velocity.y = 0;
            }
            
            // Notify entities of collision
            if (entityA.onCollision) {
                entityA.onCollision(entityB);
            }
            
            if (entityB.onCollision) {
                entityB.onCollision(entityA);
            }
        }
    }
    
    /**
     * Process trigger overlaps
     */
    processTriggers() {
        // Process each trigger overlap
        for (const collision of this.collisions) {
            // Skip non-triggers
            if (!collision.isTrigger) continue;
            
            // Get entities
            const entityA = collision.entityA;
            const entityB = collision.entityB;
            
            // Determine which entity is the trigger
            const trigger = 
                (entityA.collisionLayer === this.collisionLayers.trigger) ? 
                entityA : entityB;
            
            const other = (trigger === entityA) ? entityB : entityA;
            
            // Notify trigger
            if (trigger.onTriggerEnter) {
                trigger.onTriggerEnter(other);
            }
        }
    }
    
    /**
     * Calculate the bounds of an entity based on position and collider
     * @param {object} entity - Entity to calculate bounds for
     * @returns {object} - Bounds with minX, minY, maxX, maxY
     */
    getEntityBounds(entity) {
        const position = entity.position;
        const collider = entity.collider;
        
        // Default to size 1x1 if no collider size
        const width = collider.width || 1;
        const height = collider.height || 1;
        
        // Apply collider offset if specified
        const offsetX = collider.offset?.x || 0;
        const offsetY = collider.offset?.y || 0;
        
        // Calculate bounds
        return {
            minX: position.x + offsetX - width / 2,
            minY: position.y + offsetY - height / 2,
            maxX: position.x + offsetX + width / 2,
            maxY: position.y + offsetY + height / 2
        };
    }
    
    /**
     * Cast a ray and check for intersection with entities
     * @param {object} origin - Ray origin {x, y}
     * @param {object} direction - Ray direction {x, y}
     * @param {number} maxDistance - Maximum ray distance
     * @param {number} layerMask - Collision layers to check against
     * @returns {object|null} - Ray hit result or null if no hit
     */
    raycast(origin, direction, maxDistance, layerMask) {
        // Normalize direction
        const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (length === 0) return null;
        
        const normalizedDir = {
            x: direction.x / length,
            y: direction.y / length
        };
        
        // Get entities in ray path
        const potentialHits = this.getEntitiesInRayPath(origin, normalizedDir, maxDistance);
        
        // Check each entity for intersection
        let closestHit = null;
        let closestDistance = maxDistance;
        
        for (const entity of potentialHits) {
            // Skip if entity has no collider
            if (!entity.collider) continue;
            
            // Skip if entity layer doesn't match layerMask
            if ((entity.collisionLayer & layerMask) === 0) continue;
            
            // Check for intersection
            const hit = this.raycastEntity(origin, normalizedDir, entity);
            
            if (hit && hit.distance < closestDistance) {
                closestHit = hit;
                closestDistance = hit.distance;
            }
        }
        
        return closestHit;
    }
    
    /**
     * Get entities that might be in the path of a ray
     * @param {object} origin - Ray origin {x, y}
     * @param {object} direction - Ray direction {x, y}
     * @param {number} maxDistance - Maximum ray distance
     * @returns {Array} - Array of potential entities
     */
    getEntitiesInRayPath(origin, direction, maxDistance) {
        // Calculate endpoint
        const endpoint = {
            x: origin.x + direction.x * maxDistance,
            y: origin.y + direction.y * maxDistance
        };
        
        // Calculate bounds of ray
        const minX = Math.min(origin.x, endpoint.x);
        const maxX = Math.max(origin.x, endpoint.x);
        const minY = Math.min(origin.y, endpoint.y);
        const maxY = Math.max(origin.y, endpoint.y);
        
        // Calculate grid cells that contain the ray
        const minCellX = Math.floor(minX / this.cellSize);
        const maxCellX = Math.floor(maxX / this.cellSize);
        const minCellY = Math.floor(minY / this.cellSize);
        const maxCellY = Math.floor(maxY / this.cellSize);
        
        // Get all entities in these cells
        const potentialEntities = new Set();
        
        for (let x = minCellX; x <= maxCellX; x++) {
            for (let y = minCellY; y <= maxCellY; y++) {
                const cellKey = `${x},${y}`;
                
                if (this.spatialHash.has(cellKey)) {
                    for (const entity of this.spatialHash.get(cellKey)) {
                        potentialEntities.add(entity);
                    }
                }
            }
        }
        
        return Array.from(potentialEntities);
    }
    
    /**
     * Check if a ray intersects an entity
     * @param {object} origin - Ray origin {x, y}
     * @param {object} direction - Ray direction {x, y}
     * @param {object} entity - Entity to check
     * @returns {object|null} - Hit result or null if no hit
     */
    raycastEntity(origin, direction, entity) {
        // Get entity bounds
        const bounds = this.getEntityBounds(entity);
        
        // Implement ray-AABB intersection test
        // This is a simplified version for a rectangular collider
        
        // Calculate t values for each boundary
        const invDirX = 1 / direction.x;
        const invDirY = 1 / direction.y;
        
        let tMinX = (bounds.minX - origin.x) * invDirX;
        let tMaxX = (bounds.maxX - origin.x) * invDirX;
        let tMinY = (bounds.minY - origin.y) * invDirY;
        let tMaxY = (bounds.maxY - origin.y) * invDirY;
        
        // Swap if direction is negative
        if (invDirX < 0) {
            [tMinX, tMaxX] = [tMaxX, tMinX];
        }
        
        if (invDirY < 0) {
            [tMinY, tMaxY] = [tMaxY, tMinY];
        }
        
        // Find the largest tMin and smallest tMax
        const tMin = Math.max(tMinX, tMinY);
        const tMax = Math.min(tMaxX, tMaxY);
        
        // Check if there is an intersection
        if (tMin > tMax || tMax < 0) {
            return null;
        }
        
        // Calculate intersection point and normal
        const hitDistance = tMin >= 0 ? tMin : tMax;
        const hitPoint = {
            x: origin.x + direction.x * hitDistance,
            y: origin.y + direction.y * hitDistance
        };
        
        // Determine hit normal
        let hitNormal;
        if (tMinX > tMinY) {
            hitNormal = { x: -Math.sign(direction.x), y: 0 };
        } else {
            hitNormal = { x: 0, y: -Math.sign(direction.y) };
        }
        
        return {
            entity,
            distance: hitDistance,
            point: hitPoint,
            normal: hitNormal
        };
    }
}