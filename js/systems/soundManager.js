/**
 * Manages game audio including music, sound effects, and ambient sounds
 */
export class SoundManager {
    constructor(engine) {
        this.engine = engine;
        
        // Audio context
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
     * Register sound assets
     */
    registerSounds() {
        // Register music tracks
        this.registerMusic('title', 'music/title');
        this.registerMusic('exploration', 'music/exploration');
        this.registerMusic('combat', 'music/combat');
        this.registerMusic('village', 'music/village');
        this.registerMusic('dungeon', 'music/dungeon');
        
        // Register ambient sounds
        this.registerAmbient('ambient_day', 'ambient/day_loop');
        this.registerAmbient('ambient_night', 'ambient/night_loop');
        this.registerAmbient('ambient_rain', 'ambient/rain_loop');
        this.registerAmbient('ambient_storm', 'ambient/storm_loop');
        this.registerAmbient('ambient_wind', 'ambient/wind_loop');
        this.registerAmbient('ambient_forest', 'ambient/forest_loop');
        this.registerAmbient('ambient_village', 'ambient/village_loop');
        
        // Register UI sounds
        this.registerSound('ui_click', 'ui/click');
        this.registerSound('ui_hover', 'ui/hover');
        this.registerSound('ui_open', 'ui/open');
        this.registerSound('ui_close', 'ui/close');
        this.registerSound('ui_success', 'ui/success');
        this.registerSound('ui_error', 'ui/error');
        this.registerSound('ui_notification', 'ui/notification');
        
        // Register player sounds
        this.registerSound('player_footstep', 'player/footstep', true);
        this.registerSound('player_attack', 'player/attack', true);
        this.registerSound('player_damage', 'player/damage', true);
        this.registerSound('player_jump', 'player/jump');
        this.registerSound('player_land', 'player/land');
        this.registerSound('player_pickup', 'player/pickup');
        
        // Register interaction sounds
        this.registerSound('door_open', 'interact/door_open');
        this.registerSound('door_close', 'interact/door_close');
        this.registerSound('chest_open', 'interact/chest_open');
        this.registerSound('switch', 'interact/switch');
        
        // Register combat sounds
        this.registerSound('sword_swing', 'combat/sword_swing', true);
        this.registerSound('sword_hit', 'combat/sword_hit', true);
        this.registerSound('arrow_shoot', 'combat/arrow_shoot');
        this.registerSound('spell_cast', 'combat/spell_cast');
        this.registerSound('spell_impact', 'combat/spell_impact', true);
        
        // Register enemy sounds
        this.registerSound('enemy_attack', 'enemy/attack', true);
        this.registerSound('enemy_damage', 'enemy/damage', true);
        this.registerSound('enemy_death', 'enemy/death', true);
        this.registerSound('enemy_alert', 'enemy/alert', true);
        
        // Register weather sounds
        this.registerSound('thunder', 'weather/thunder', true);
        this.registerSound('rain_heavy', 'weather/rain_heavy');
        this.registerSound('wind_gust', 'weather/wind_gust', true);
        
        // Map weather types to ambient sounds
        this.weatherSounds.set('clear', 'ambient_day');
        this.weatherSounds.set('cloudy', 'ambient_day');
        this.weatherSounds.set('rain', 'ambient_rain');
        this.weatherSounds.set('storm', 'ambient_storm');
        this.weatherSounds.set('snow', 'ambient_wind');
    }
    
    /**
     * Register a sound effect
     * @param {string} id - Sound ID
     * @param {string} path - Path to sound file (without extension)
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
     * Load a sound asynchronously
     * @param {string} path - Path to sound file (without extension)
     * @returns {Promise<AudioBuffer>} - Promise resolving to audio buffer
     */
    async loadSound(path) {
        // Try different extensions
        for (const ext of this.audioExtensions) {
            try {
                const response = await fetch(`assets/sounds/${path}.${ext}`);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                return audioBuffer;
            } catch (error) {
                // Try next extension
                continue;
            }
        }
        
        // If all extensions failed
        throw new Error(`Failed to load sound: ${path}`);
    }
    
    /**
     * Load a sound by ID
     * @param {string} id - Sound ID
     * @param {string} type - Sound type (sound, music, ambient)
     * @returns {Promise<AudioBuffer>} - Promise resolving to audio buffer
     */
    async loadSoundById(id, type = 'sound') {
        let soundData;
        
        switch (type) {
            case 'sound':
                soundData = this.sounds.get(id);
                break;
            case 'music':
                soundData = this.music.get(id);
                break;
            case 'ambient':
                soundData = this.ambient.get(id);
                break;
            default:
                throw new Error(`Invalid sound type: ${type}`);
        }
        
        if (!soundData) {
            throw new Error(`Sound not registered: ${id}`);
        }
        
        // If already loaded, return buffer
        if (soundData.loaded && soundData.buffer) {
            return soundData.buffer;
        }
        
        try {
            // Load sound
            const buffer = await this.loadSound(soundData.path);
            
            // Update sound data
            soundData.buffer = buffer;
            soundData.loaded = true;
            
            return buffer;
        } catch (error) {
            console.error(`Error loading sound ${id}:`, error);
            throw error;
        }
    }
    
    /**
     * Play a sound
     * @param {string} id - Sound ID
     * @param {object} options - Playback options
     * @returns {string|null} - Sound instance ID or null if failed
     */
    async playSound(id, options = {}) {
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const soundData = this.sounds.get(id);
            if (!soundData) {
                console.error(`Sound not found: ${id}`);
                return null;
            }
            
            // Load sound if not loaded
            if (!soundData.loaded) {
                await this.loadSoundById(id, 'sound');
            }
            
            // Create source
            const source = this.audioContext.createBufferSource();
            
            // If sound has variations, adjust pitch slightly
            if (soundData.variations) {
                // Random pitch between 0.9 and 1.1
                source.playbackRate.value = 0.9 + Math.random() * 0.2;
            }
            
            // Create gain node for this sound
            const gainNode = this.audioContext.createGain();
            
            // Set volume
            const volume = options.volume !== undefined ? options.volume : 1.0;
            gainNode.gain.value = volume;
            
            // Connect nodes
            source.buffer = soundData.buffer;
            source.connect(gainNode);
            
            // Connect to appropriate output based on category
            if (options.category === 'ui') {
                gainNode.connect(this.uiGain);
            } else {
                gainNode.connect(this.sfxGain);
            }
            
            // Set loop
            source.loop = options.loop || false;
            
            // Generate unique ID for this sound instance
            const instanceId = `${id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            
            // Store sound instance
            this.playingSounds.set(instanceId, {
                source,
                gainNode,
                id,
                startTime: this.audioContext.currentTime,
                options
            });
            
            // Set up cleanup when sound ends
            source.onended = () => {
                this.playingSounds.delete(instanceId);
                
                // Call onEnd callback if provided
                if (options.onEnd) {
                    options.onEnd();
                }
            };
            
            // Start playback
            const startTime = options.delay ? this.audioContext.currentTime + options.delay : this.audioContext.currentTime;
            source.start(startTime);
            
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
        
        if (fadeOutTime > 0) {
            // Fade out
            const gainNode = sound.gainNode;
            const currentTime = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
            gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeOutTime);
            
            // Stop after fade out
            sound.source.stop(currentTime + fadeOutTime);
        } else {
            // Stop immediately
            sound.source.stop();
        }
        
        // Remove from playing sounds
        this.playingSounds.delete(instanceId);
    }
    
    /**
     * Play music
     * @param {string} id - Music ID
     * @param {object} options - Playback options
     * @returns {boolean} - True if successful
     */
    async playMusic(id, options = {}) {
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const musicData = this.music.get(id);
            if (!musicData) {
                console.error(`Music not found: ${id}`);
                return false;
            }
            
            // Load music if not loaded
            if (!musicData.loaded) {
                await this.loadSoundById(id, 'music');
            }
            
            // If already playing this music, do nothing
            if (this.currentMusic && this.currentMusic.id === id) {
                return true;
            }
            
            // Default options
            const fadeTime = options.fadeTime !== undefined ? options.fadeTime : this.musicFadeTime;
            
            // If music is already playing, crossfade
            if (this.currentMusic) {
                // Store current music as previous
                this.previousMusic = this.currentMusic;
                
                // Start fading out previous music
                const prevGain = this.previousMusic.gainNode;
                prevGain.gain.setValueAtTime(prevGain.gain.value, this.audioContext.currentTime);
                prevGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeTime);
                
                // Stop previous music after fade out
                this.previousMusic.source.stop(this.audioContext.currentTime + fadeTime);
            }
            
            // Create source
            const source = this.audioContext.createBufferSource();
            source.buffer = musicData.buffer;
            
            // Create gain node
            const gainNode = this.audioContext.createGain();
            
            // Start with zero volume if fading in
            if (fadeTime > 0) {
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + fadeTime);
            }
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(this.musicGain);
            
            // Loop music
            source.loop = true;
            
            // Store current music
            this.currentMusic = {
                source,
                gainNode,
                id
            };
            
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
        
        if (fadeOutTime > 0) {
            // Fade out
            const gainNode = this.currentMusic.gainNode;
            gainNode.gain.setValueAtTime(gainNode.gain.value, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeOutTime);
            
            // Stop after fade out
            this.currentMusic.source.stop(this.audioContext.currentTime + fadeOutTime);
        } else {
            // Stop immediately
            this.currentMusic.source.stop();
        }
        
        this.currentMusic = null;
    }
    
    /**
     * Play ambient sound
     * @param {string} id - Ambient sound ID
     * @param {object} options - Playback options
     * @returns {string|null} - Sound instance ID or null if failed
     */
    async playAmbient(id, options = {}) {
        // Similar to playSound but connects to ambient gain node
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const ambientData = this.ambient.get(id);
            if (!ambientData) {
                console.error(`Ambient sound not found: ${id}`);
                return null;
            }
            
            // Load ambient sound if not loaded
            if (!ambientData.loaded) {
                await this.loadSoundById(id, 'ambient');
            }
            
            // Create source
            const source = this.audioContext.createBufferSource();
            source.buffer = ambientData.buffer;
            
            // Create gain node
            const gainNode = this.audioContext.createGain();
            
            // Set volume
            const volume = options.volume !== undefined ? options.volume : 1.0;
            gainNode.gain.value = volume;
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(this.ambientGain);
            
            // Loop ambient sounds by default
            source.loop = options.loop !== undefined ? options.loop : true;
            
            // Generate unique ID
            const instanceId = `ambient_${id}_${Date.now()}`;
            
            // Store ambient sound instance
            this.playingSounds.set(instanceId, {
                source,
                gainNode,
                id,
                ambient: true,
                startTime: this.audioContext.currentTime,
                options
            });
            
            // Add to current ambient sounds
            this.currentAmbient.push({
                id: instanceId,
                soundId: id
            });
            
            // Cleanup when ended
            source.onended = () => {
                this.playingSounds.delete(instanceId);
                this.currentAmbient = this.currentAmbient.filter(a => a.id !== instanceId);
            };
            
            // Start playback
            source.start();
            
            return instanceId;
        } catch (error) {
            console.error(`Error playing ambient sound ${id}:`, error);
            return null;
        }
    }
    
    /**
     * Stop all ambient sounds
     * @param {number} fadeOutTime - Fade out time in seconds
     */
    stopAllAmbient(fadeOutTime = 1) {
        // Copy the array since we'll be modifying it during iteration
        const ambientToStop = [...this.currentAmbient];
        
        for (const ambient of ambientToStop) {
            this.stopSound(ambient.id, fadeOutTime);
        }
        
        this.currentAmbient = [];
    }
    
    /**
     * Update weather ambient sounds
     * @param {string} weatherType - Weather type
     */
    updateWeatherAmbient(weatherType) {
        // Stop current weather ambient
        this.stopAllAmbient(2);
        
        // Get ambient sound for this weather
        const ambientId = this.weatherSounds.get(weatherType);
        if (!ambientId) return;
        
        // Play new ambient
        this.playAmbient(ambientId, { volume: 1.0 });
        
        // Add thunder for storms
        if (weatherType === 'storm') {
            // Schedule random thunder sounds
            this.scheduleRandomThunder();
        }
    }
    
    /**
     * Schedule random thunder sounds
     */
    scheduleRandomThunder() {
        const scheduleNext = () => {
            // Random delay between 5-20 seconds
            const delay = 5 + Math.random() * 15;
            
            setTimeout(() => {
                // Play thunder sound
                this.playSound('thunder', { volume: 0.8 + Math.random() * 0.4 });
                
                // Schedule next thunder if still in storm
                const currentWeather = this.engine.weatherSystem?.getCurrentWeather();
                if (currentWeather === 'storm') {
                    scheduleNext();
                }
            }, delay * 1000);
        };
        
        // Start scheduling
        scheduleNext();
    }
    
    /**
     * Update sound manager
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Check for time-of-day based music changes
        this.updateTimeBasedAudio();
        
        // Update positional audio if player has moved
        this.updatePositionalAudio();
        
        // Clean up finished sounds
        this.cleanupSounds();
    }
    
    /**
     * Update audio based on time of day
     */
    updateTimeBasedAudio() {
        // Get current time data
        const timeData = this.engine.timeManager?.getCurrentTime();
        if (!timeData) return;
        
        // Adjust ambient volume based on time of day
        if (timeData.isDaytime !== this.lastIsDaytime) {
            this.lastIsDaytime = timeData.isDaytime;
            
            // Play day/night ambient
            if (timeData.isDaytime) {
                this.playAmbient('ambient_day', { volume: 0.7 });
            } else {
                this.playAmbient('ambient_night', { volume: 0.7 });
            }
        }
    }
    
    /**
     * Update positional audio when player moves
     */
    updatePositionalAudio() {
        // In a real implementation, this would update audio positions
        // based on player movement and entity positions
    }
    
    /**
     * Clean up finished sounds
     */
    cleanupSounds() {
        // Remove any sounds that have ended but weren't properly cleaned up
        for (const [id, sound] of this.playingSounds.entries()) {
            if (sound.source.buffer) {
                const duration = sound.source.buffer.duration;
                const elapsedTime = this.audioContext.currentTime - sound.startTime;
                
                // If non-looping sound has played for longer than its duration, remove it
                if (!sound.source.loop && elapsedTime > duration) {
                    this.playingSounds.delete(id);
                    
                    // Remove from ambient list if needed
                    if (sound.ambient) {
                        this.currentAmbient = this.currentAmbient.filter(a => a.id !== id);
                    }
                }
            }
        }
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
     * Update all volume levels
     */
    updateVolumes() {
        if (!this.audioContext) return;
        
        this.masterGain.gain.value = this.masterVolume;
        this.musicGain.gain.value = this.musicVolume;
        this.sfxGain.gain.value = this.sfxVolume;
        this.ambientGain.gain.value = this.ambientVolume;
        this.uiGain.gain.value = this.sfxVolume; // UI sounds use SFX volume
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
            activeAmbient: this.currentAmbient.map(a => a.soundId),
            activeSounds: this.playingSounds.size
        };
    }
}