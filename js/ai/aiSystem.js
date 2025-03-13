/**
 * Manages NPC behavior, pathfinding, and decision making
 */
export class AISystem {
    constructor(engine) {
        this.engine = engine;
        
        // AI agent references
        this.agents = new Map();
        
        // Update frequency (not every agent updates every frame)
        this.updateInterval = 0.1; // seconds
        this.updateTimer = 0;
        this.agentsPerUpdate = 10;
        
        // Pathfinding grid
        this.pathfindingGrid = null;
        this.gridResolution = 1; // Grid cell size in world units
        
        // Behavior presets
        this.behaviorPresets = {
            villager: {
                goals: ['follow_schedule', 'satisfy_needs', 'flee_danger'],
                senses: ['sight', 'hearing'],
                sightRange: 8,
                hearingRange: 12,
                maxSpeed: 1.5,
                needsDecay: {
                    hunger: 0.005,
                    fatigue: 0.004,
                    social: 0.003
                }
            },
            guard: {
                goals: ['patrol', 'protect_area', 'chase_enemies'],
                senses: ['sight', 'hearing'],
                sightRange: 12,
                hearingRange: 15,
                maxSpeed: 2.0,
                needsDecay: {
                    hunger: 0.003,
                    fatigue: 0.002,
                    social: 0.001
                }
            },
            merchant: {
                goals: ['follow_schedule', 'trade', 'protect_goods'],
                senses: ['sight'],
                sightRange: 10,
                hearingRange: 8,
                maxSpeed: 1.2,
                needsDecay: {
                    hunger: 0.004,
                    fatigue: 0.003,
                    social: 0.002
                }
            },
            animal: {
                goals: ['wander', 'find_food', 'avoid_predators'],
                senses: ['sight', 'hearing', 'smell'],
                sightRange: 7,
                hearingRange: 10,
                smellRange: 15,
                maxSpeed: 2.5,
                needsDecay: {
                    hunger: 0.01,
                    fatigue: 0.005
                }
            },
            enemy: {
                goals: ['attack_player', 'patrol_area', 'return_to_spawn'],
                senses: ['sight', 'hearing'],
                sightRange: 15,
                hearingRange: 18,
                maxSpeed: 2.2,
                needsDecay: {
                    hunger: 0.002,
                    fatigue: 0.001
                }
            }
        };
        
        // State machines for different behavior types
        this.behaviorStates = {
            idle: {
                enter: (agent) => {
                    agent.velocity = { x: 0, y: 0 };
                    agent.animation = 'idle';
                },
                update: (agent, deltaTime) => {
                    // Check if we should transition to another state
                    if (agent.needsAttention()) {
                        return 'satisfy_need';
                    }
                    
                    if (agent.shouldFollowSchedule()) {
                        return 'follow_schedule';
                    }
                    
                    // Random chance to wander
                    if (Math.random() < 0.01) {
                        return 'wander';
                    }
                    
                    return null; // Stay in this state
                },
                exit: (agent) => {}
            },
            wander: {
                enter: (agent) => {
                    // Set a random destination
                    const wanderDistance = 5 + Math.random() * 5;
                    const wanderAngle = Math.random() * Math.PI * 2;
                    
                    agent.destination = {
                        x: agent.position.x + Math.cos(wanderAngle) * wanderDistance,
                        y: agent.position.y + Math.sin(wanderAngle) * wanderDistance
                    };
                    
                    agent.animation = 'walk';
                },
                update: (agent, deltaTime) => {
                    // Check if we've reached the destination
                    if (agent.hasReachedDestination()) {
                        return 'idle';
                    }
                    
                    // Move toward destination
                    agent.moveToward(agent.destination, deltaTime);
                    
                    // Check for higher priority states
                    if (agent.needsAttention()) {
                        return 'satisfy_need';
                    }
                    
                    if (agent.shouldFollowSchedule()) {
                        return 'follow_schedule';
                    }
                    
                    return null; // Stay in this state
                },
                exit: (agent) => {
                    agent.destination = null;
                }
            },
            follow_schedule: {
                enter: (agent) => {
                    // Get current scheduled activity
                    const activity = agent.getCurrentScheduledActivity();
                    if (activity) {
                        agent.currentActivity = activity;
                        
                        // Set destination to activity location
                        agent.destination = agent.getLocationPosition(activity.location);
                        agent.animation = 'walk';
                    } else {
                        // No scheduled activity, go idle
                        return 'idle';
                    }
                },
                update: (agent, deltaTime) => {
                    // If activity changed, reenter this state
                    const currentActivity = agent.getCurrentScheduledActivity();
                    if (currentActivity && currentActivity !== agent.currentActivity) {
                        return 'follow_schedule';
                    }
                    
                    // If we reached the destination, perform the activity
                    if (agent.hasReachedDestination()) {
                        return 'perform_activity';
                    }
                    
                    // Move toward destination
                    agent.moveToward(agent.destination, deltaTime);
                    
                    // Check for higher priority interruptions
                    if (agent.needsAttention()) {
                        return 'satisfy_need';
                    }
                    
                    // Check for danger
                    if (agent.isInDanger()) {
                        return 'flee_danger';
                    }
                    
                    return null; // Stay in this state
                },
                exit: (agent) => {}
            },
            perform_activity: {
                enter: (agent) => {
                    agent.velocity = { x: 0, y: 0 };
                    
                    // Set animation based on activity
                    if (!agent.currentActivity) {
                        return 'idle';
                    }
                    
                    switch (agent.currentActivity.action) {
                        case 'sleep':
                            agent.animation = 'sleep';
                            break;
                        case 'eat':
                        case 'eat_breakfast':
                        case 'eat_lunch':
                        case 'eat_dinner':
                            agent.animation = 'eat';
                            // Reduce hunger need
                            if (agent.brain && agent.brain.needs) {
                                agent.brain.needs.hunger = Math.max(0, agent.brain.needs.hunger - 0.5);
                            }
                            break;
                        case 'work':
                            agent.animation = 'work';
                            break;
                        case 'socialize':
                            agent.animation = 'talk';
                            // Reduce social need
                            if (agent.brain && agent.brain.needs) {
                                agent.brain.needs.social = Math.max(0, agent.brain.needs.social - 0.3);
                            }
                            break;
                        default:
                            agent.animation = 'idle';
                    }
                },
                update: (agent, deltaTime) => {
                    // Check if the activity is no longer current
                    const currentActivity = agent.getCurrentScheduledActivity();
                    if (!currentActivity || currentActivity !== agent.currentActivity) {
                        return 'follow_schedule';
                    }
                    
                    // If sleeping, reduce fatigue
                    if (agent.currentActivity.action === 'sleep' && agent.brain && agent.brain.needs) {
                        agent.brain.needs.fatigue = Math.max(0, agent.brain.needs.fatigue - 0.01 * deltaTime);
                    }
                    
                    // Check for danger
                    if (agent.isInDanger()) {
                        return 'flee_danger';
                    }
                    
                    return null; // Stay in this state
                },
                exit: (agent) => {}
            },
            satisfy_need: {
                enter: (agent) => {
                    // Determine which need to satisfy
                    const need = agent.getMostUrgentNeed();
                    if (!need) {
                        return 'idle';
                    }
                    
                    agent.currentNeed = need;
                    
                    // Set destination based on need
                    let destination = null;
                    
                    switch (need) {
                        case 'hunger':
                            destination = agent.getLocationPosition('tavern') || 
                                          agent.getLocationPosition('home');
                            break;
                        case 'fatigue':
                            destination = agent.getLocationPosition('home') || 
                                          agent.getLocationPosition('inn');
                            break;
                        case 'social':
                            destination = agent.getLocationPosition('tavern') || 
                                          agent.getLocationPosition('village_square');
                            break;
                    }
                    
                    if (destination) {
                        agent.destination = destination;
                        agent.animation = 'walk';
                    } else {
                        // No appropriate location found, go idle
                        return 'idle';
                    }
                },
                update: (agent, deltaTime) => {
                    // If we reached the destination, satisfy the need
                    if (agent.hasReachedDestination()) {
                        // Reduce the need
                        if (agent.brain && agent.brain.needs && agent.currentNeed) {
                            agent.brain.needs[agent.currentNeed] = Math.max(0, agent.brain.needs[agent.currentNeed] - 0.5);
                        }
                        
                        // Return to schedule or idle
                        if (agent.shouldFollowSchedule()) {
                            return 'follow_schedule';
                        } else {
                            return 'idle';
                        }
                    }
                    
                    // Move toward destination
                    agent.moveToward(agent.destination, deltaTime);
                    
                    // Check for danger
                    if (agent.isInDanger()) {
                        return 'flee_danger';
                    }
                    
                    return null; // Stay in this state
                },
                exit: (agent) => {
                    agent.currentNeed = null;
                }
            },
            flee_danger: {
                enter: (agent) => {
                    // Set flee destination away from danger
                    const danger = agent.getNearestDanger();
                    if (!danger) {
                        return 'idle';
                    }
                    
                    // Calculate direction away from danger
                    const dirX = agent.position.x - danger.position.x;
                    const dirY = agent.position.y - danger.position.y;
                    
                    // Normalize direction
                    const length = Math.sqrt(dirX * dirX + dirY * dirY);
                    const normX = dirX / length;
                    const normY = dirY / length;
                    
                    // Set destination away from danger
                    const fleeDistance = 10; // Flee 10 units away
                    agent.destination = {
                        x: agent.position.x + normX * fleeDistance,
                        y: agent.position.y + normY * fleeDistance
                    };
                    
                    agent.animation = 'run';
                },
                update: (agent, deltaTime) => {
                    // If we reached the destination, go idle
                    if (agent.hasReachedDestination()) {
                        if (agent.shouldFollowSchedule()) {
                            return 'follow_schedule';
                        } else {
                            return 'idle';
                        }
                    }
                    
                    // Move toward destination faster (running)
                    agent.moveToward(agent.destination, deltaTime, 1.5); // 1.5x speed multiplier
                    
                    // Check if still in danger
                    if (!agent.isInDanger()) {
                        // Danger passed, go back to schedule
                        if (agent.shouldFollowSchedule()) {
                            return 'follow_schedule';
                        } else {
                            return 'idle';
                        }
                    }
                    
                    return null; // Stay in this state
                },
                exit: (agent) => {}
            },
            patrol: {
                enter: (agent) => {
                    // Set up patrol points if not already defined
                    if (!agent.patrolPoints || agent.patrolPoints.length === 0) {
                        // Default to some points around current position
                        const radius = 10;
                        const numPoints = 4;
                        
                        agent.patrolPoints = [];
                        for (let i = 0; i < numPoints; i++) {
                            const angle = (i / numPoints) * Math.PI * 2;
                            const point = {
                                x: agent.position.x + Math.cos(angle) * radius,
                                y: agent.position.y + Math.sin(angle) * radius
                            };
                            agent.patrolPoints.push(point);
                        }
                    }
                    
                    // Set current patrol point
                    agent.currentPatrolPointIndex = 0;
                    agent.destination = agent.patrolPoints[agent.currentPatrolPointIndex];
                    agent.animation = 'walk';
                },
                update: (agent, deltaTime) => {
                    // If we reached the destination, move to the next patrol point
                    if (agent.hasReachedDestination()) {
                        agent.currentPatrolPointIndex = (agent.currentPatrolPointIndex + 1) % agent.patrolPoints.length;
                        agent.destination = agent.patrolPoints[agent.currentPatrolPointIndex];
                    }
                    
                    // Move toward destination
                    agent.moveToward(agent.destination, deltaTime);
                    
                    // Check for danger
                    if (agent.isInDanger()) {
                        return 'flee_danger';
                    }
                    
                    return null; // Stay in this state
                },
                exit: (agent) => {}
            }
        };
    }
}