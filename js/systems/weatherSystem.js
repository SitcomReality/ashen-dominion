/**
 * Manages weather conditions and effects in the game world
 */
export class WeatherSystem {
    constructor(engine) {
        this.engine = engine;
        this.random = null;
        
        // Weather state
        this.currentWeather = 'clear';
        this.targetWeather = 'clear';
        this.weatherIntensity = 0;
        this.targetIntensity = 0;
        this.transitionProgress = 1; // 1 means fully transitioned
        this.transitionDuration = 300; // Seconds for weather to change
        
        // Weather forecast (next few days)
        this.forecast = [];
        this.forecastDays = 3;
        
        // Weather types and their properties
        this.weatherTypes = {
            'clear': {
                nextWeatherChances: { 'clear': 0.7, 'cloudy': 0.3 },
                visualEffects: {
                    skyColor: '#87CEEB',
                    cloudCover: 0,
                    sunIntensity: 1.0,
                    shadowIntensity: 1.0
                },
                soundEffects: {
                    ambientSound: 'ambient_day',
                    volume: 0.8
                },
                gameplayEffects: {
                    visibilityModifier: 1.0,
                    movementModifier: 1.0
                }
            },
            'cloudy': {
                nextWeatherChances: { 'clear': 0.3, 'cloudy': 0.4, 'rain': 0.3 },
                visualEffects: {
                    skyColor: '#B0C4DE',
                    cloudCover: 0.7,
                    sunIntensity: 0.6,
                    shadowIntensity: 0.6
                },
                soundEffects: {
                    ambientSound: 'ambient_cloudy',
                    volume: 0.6
                },
                gameplayEffects: {
                    visibilityModifier: 0.9,
                    movementModifier: 0.95
                }
            },
            'rain': {
                nextWeatherChances: { 'cloudy': 0.5, 'rain': 0.3, 'storm': 0.2 },
                visualEffects: {
                    skyColor: '#708090',
                    cloudCover: 0.9,
                    sunIntensity: 0.3,
                    shadowIntensity: 0.4,
                    rainParticles: true
                },
                soundEffects: {
                    ambientSound: 'ambient_rain',
                    volume: 1.0
                },
                gameplayEffects: {
                    visibilityModifier: 0.7,
                    movementModifier: 0.8
                }
            },
            'storm': {
                nextWeatherChances: { 'rain': 0.7, 'storm': 0.3 },
                visualEffects: {
                    skyColor: '#4A4A4A',
                    cloudCover: 1.0,
                    sunIntensity: 0.1,
                    shadowIntensity: 0.2,
                    rainParticles: true,
                    lightningEffects: true
                },
                soundEffects: {
                    ambientSound: 'ambient_storm',
                    volume: 1.0,
                    thunderSounds: true
                },
                gameplayEffects: {
                    visibilityModifier: 0.5,
                    movementModifier: 0.7
                }
            },
            'snow': {
                nextWeatherChances: { 'cloudy': 0.3, 'snow': 0.7 },
                visualEffects: {
                    skyColor: '#E6E6FA',
                    cloudCover: 0.8,
                    sunIntensity: 0.4,
                    shadowIntensity: 0.5,
                    snowParticles: true
                },
                soundEffects: {
                    ambientSound: 'ambient_snow',
                    volume: 0.4
                },
                gameplayEffects: {
                    visibilityModifier: 0.6,
                    movementModifier: 0.6
                }
            }
        };
        
        // Weather particles
        this.particles = [];
        
        // Lightning state
        this.lightningTimer = 0;
        this.lightningActive = false;
        this.lightningIntensity = 0;
    }
    
    /**
     * Initialize the weather system
     * @param {string} seed - Seed for random generation
     */
    initialize(seed) {
        // Initialize random generator
        this.random = this.createRandom(seed + "_weather");
        
        // Set initial weather based on season
        this.setInitialWeather();
        
        // Generate initial forecast
        this.generateForecast();
        
        console.log(`Weather system initialized with seed: ${seed}`);
    }
    
    /**
     * Create a random number generator with seed
     * @param {string} seed - Seed string
     * @returns {function} - Random number generator
     */
    createRandom(seed) {
        // Simple seeded random function
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        let state = hash || 1;
        
        return function() {
            state = (state * 48271) % 2147483647;
            return (state & 0x7FFFFFFF) / 0x7FFFFFFF;
        };
    }
    
    /**
     * Set initial weather based on current season
     */
    setInitialWeather() {
        // Get current season from time manager
        const currentTime = this.engine.timeManager.getCurrentTime();
        const season = currentTime?.season || 'Spring';
        
        // Set weather based on season
        switch (season) {
            case 'Winter':
                this.setWeather(Math.random() > 0.5 ? 'snow' : 'cloudy');
                break;
            case 'Spring':
                this.setWeather(Math.random() > 0.7 ? 'rain' : 'cloudy');
                break;
            case 'Summer':
                this.setWeather(Math.random() > 0.8 ? 'cloudy' : 'clear');
                break;
            case 'Fall':
                this.setWeather(Math.random() > 0.6 ? 'rain' : 'cloudy');
                break;
            default:
                this.setWeather('clear');
        }
    }
    
    /**
     * Generate a weather forecast for upcoming days
     */
    generateForecast() {
        this.forecast = [];
        
        let prevWeather = this.currentWeather;
        
        for (let i = 0; i < this.forecastDays; i++) {
            const nextWeather = this.predictNextWeather(prevWeather);
            
            this.forecast.push({
                day: i + 1,
                weather: nextWeather,
                intensity: 0.3 + this.random() * 0.7 // Random intensity between 0.3-1.0
            });
            
            prevWeather = nextWeather;
        }
    }
    
    /**
     * Predict the next weather based on current weather
     * @param {string} currentWeather - Current weather type
     * @returns {string} - Predicted next weather type
     */
    predictNextWeather(currentWeather) {
        const weatherInfo = this.weatherTypes[currentWeather];
        if (!weatherInfo) return 'clear';
        
        // Get next weather chances
        const chances = weatherInfo.nextWeatherChances;
        
        // Roll for next weather
        const roll = this.random();
        let cumulativeChance = 0;
        
        for (const [weather, chance] of Object.entries(chances)) {
            cumulativeChance += chance;
            if (roll <= cumulativeChance) {
                return weather;
            }
        }
        
        // Default to clear if somehow no weather was selected
        return 'clear';
    }
    
    /**
     * Update weather conditions
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update weather transition
        this.updateWeatherTransition(deltaTime);
        
        // Update weather effects
        this.updateWeatherEffects(deltaTime);
        
        // Check for weather changes
        this.checkWeatherChange(deltaTime);
    }
    
    /**
     * Update weather transition progress
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateWeatherTransition(deltaTime) {
        // If we're already at target weather, no need to transition
        if (this.currentWeather === this.targetWeather && 
            this.weatherIntensity === this.targetIntensity &&
            this.transitionProgress >= 1) {
            return;
        }
        
        // Progress the transition
        this.transitionProgress += deltaTime / this.transitionDuration;
        if (this.transitionProgress > 1) {
            this.transitionProgress = 1;
            this.currentWeather = this.targetWeather;
            this.weatherIntensity = this.targetIntensity;
        }
        
        // Interpolate intensity
        this.weatherIntensity = this.lerp(
            this.weatherIntensity,
            this.targetIntensity,
            this.transitionProgress
        );
    }
    
    /**
     * Update weather visual and sound effects
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateWeatherEffects(deltaTime) {
        // Get current weather properties
        const weatherProps = this.weatherTypes[this.currentWeather];
        if (!weatherProps) return;
        
        // Update visual effects
        this.updateVisualEffects(weatherProps.visualEffects, deltaTime);
        
        // Update sound effects
        this.updateSoundEffects(weatherProps.soundEffects, deltaTime);
        
        // Update gameplay effects
        this.applyGameplayEffects(weatherProps.gameplayEffects);
    }
    
    /**
     * Update visual weather effects
     * @param {object} visualEffects - Visual effects configuration
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateVisualEffects(visualEffects, deltaTime) {
        // Update sky color and cloud cover
        // In a real implementation, these would affect the renderer
        
        // Update rain/snow particles
        this.updateParticles(deltaTime);
        
        // Update lightning effects for storms
        if (visualEffects.lightningEffects) {
            this.updateLightning(deltaTime);
        } else {
            this.lightningActive = false;
            this.lightningIntensity = 0;
        }
    }
    
    /**
     * Update weather particles (rain/snow)
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateParticles(deltaTime) {
        // In a real implementation, this would manage particle systems
        // For rain, snow, etc.
    }
    
    /**
     * Update lightning effects
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateLightning(deltaTime) {
        // Update lightning timer
        if (this.lightningActive) {
            // Lightning is active, fade it out
            this.lightningIntensity -= deltaTime * 2;
            if (this.lightningIntensity <= 0) {
                this.lightningActive = false;
                this.lightningIntensity = 0;
            }
        } else {
            // Check for new lightning strike
            this.lightningTimer -= deltaTime;
            if (this.lightningTimer <= 0) {
                // Random time until next lightning (3-15 seconds)
                this.lightningTimer = 3 + this.random() * 12;
                
                // 50% chance to actually show lightning
                if (this.random() < 0.5 * this.weatherIntensity) {
                    this.lightningActive = true;
                    this.lightningIntensity = 0.5 + this.random() * 0.5; // Random intensity
                    
                    // In a real implementation, we'd play thunder sound with delay
                    const thunderDelay = 1 + this.random() * 3; // 1-4 second delay
                }
            }
        }
    }
    
    /**
     * Update sound effects for weather
     * @param {object} soundEffects - Sound effects configuration
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateSoundEffects(soundEffects, deltaTime) {
        // In a real implementation, this would play weather ambient sounds
        // And adjust their volume based on intensity
    }
    
    /**
     * Apply gameplay effects from weather
     * @param {object} gameplayEffects - Gameplay effects configuration
     */
    applyGameplayEffects(gameplayEffects) {
        // Apply movement modifier to player and NPCs
        // In a real implementation, this would affect movement speed
        
        // Apply visibility modifier to sight ranges
        // In a real implementation, this would affect NPC detection ranges
    }
    
    /**
     * Check if weather should change
     * @param {number} deltaTime - Time since last update in seconds
     */
    checkWeatherChange(deltaTime) {
        // In a real implementation, this would be tied to the time system
        // and change weather based on time of day, season, etc.
        
        // For now, we'll just use a simple timer
        // In a real game, this would be handled by the time manager triggering events
    }
    
    /**
     * Set the current weather
     * @param {string} weatherType - Weather type to set
     * @param {number} intensity - Intensity of weather (0-1)
     */
    setWeather(weatherType, intensity = 0.7) {
        if (!this.weatherTypes[weatherType]) {
            console.error(`Invalid weather type: ${weatherType}`);
            return;
        }
        
        console.log(`Changing weather to ${weatherType} (intensity: ${intensity})`);
        
        this.targetWeather = weatherType;
        this.targetIntensity = intensity;
        this.transitionProgress = 0;
        
        // Update forecast if this was a manual change
        this.generateForecast();
    }
    
    /**
     * Get the current weather
     * @returns {string} - Current weather type
     */
    getCurrentWeather() {
        return this.currentWeather;
    }
    
    /**
     * Get the weather forecast
     * @returns {Array} - Weather forecast
     */
    getForecast() {
        return this.forecast;
    }
    
    /**
     * Get weather effects for current conditions
     * @returns {object} - Weather effects
     */
    getWeatherEffects() {
        const weatherProps = this.weatherTypes[this.currentWeather];
        if (!weatherProps) return null;
        
        // Clone the effects and apply intensity
        const effects = JSON.parse(JSON.stringify(weatherProps));
        
        // Adjust effect values based on intensity
        // For example, cloud cover would be multiplied by intensity
        
        return effects;
    }
    
    /**
     * Linear interpolation helper
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} - Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
}