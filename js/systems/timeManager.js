/**
 * Manages game time and day/night cycle
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
        
        // Season names
        this.seasonNames = ['Spring', 'Summer', 'Fall', 'Winter'];
        
        // Day/night events
        this.timeEvents = {
            sunrise: 6,   // 6 AM
            noon: 12,     // 12 PM
            sunset: 18,   // 6 PM
            midnight: 0   // 12 AM
        };
        
        // Listeners for time events
        this.timeListeners = [];
    }
    
    /**
     * Initialize the time manager
     */
    initialize() {
        // Set initial time
        this.setTime(6, 0, 1, 0, 1);
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
            this.advanceHours(hoursToAdd);
        }
        
        // Trigger time update events
        if (this.hour !== previousHour) {
            this.notifyHourChanged();
        }
    }
    
    /**
     * Advance time by a number of hours
     * @param {number} hours - Hours to advance
     */
    advanceHours(hours) {
        // Store previous day to detect day changes
        const previousDay = this.day;
        
        // Add hours
        this.hour += hours;
        
        // Handle hour overflow
        if (this.hour >= this.HOURS_PER_DAY) {
            const daysToAdd = Math.floor(this.hour / this.HOURS_PER_DAY);
            this.hour %= this.HOURS_PER_DAY;
            this.advanceDays(daysToAdd);
        }
        
        // Check for specific time events
        this.checkTimeEvents();
        
        // Trigger day change event if day changed
        if (this.day !== previousDay) {
            this.notifyDayChanged();
        }
    }
    
    /**
     * Advance time by a number of days
     * @param {number} days - Days to advance
     */
    advanceDays(days) {
        // Store previous season to detect season changes
        const previousSeason = this.season;
        
        // Add days
        this.day += days;
        
        // Handle day overflow
        if (this.day > this.DAYS_PER_SEASON) {
            const seasonsToAdd = Math.floor((this.day - 1) / this.DAYS_PER_SEASON);
            this.day = ((this.day - 1) % this.DAYS_PER_SEASON) + 1;
            this.advanceSeasons(seasonsToAdd);
        }
        
        // Trigger season change event if season changed
        if (this.season !== previousSeason) {
            this.notifySeasonChanged();
        }
    }
    
    /**
     * Advance time by a number of seasons
     * @param {number} seasons - Seasons to advance
     */
    advanceSeasons(seasons) {
        // Store previous year to detect year changes
        const previousYear = this.year;
        
        // Add seasons
        this.season += seasons;
        
        // Handle season overflow
        if (this.season >= this.SEASONS_PER_YEAR) {
            const yearsToAdd = Math.floor(this.season / this.SEASONS_PER_YEAR);
            this.season %= this.SEASONS_PER_YEAR;
            this.year += yearsToAdd;
        }
        
        // Trigger year change event if year changed
        if (this.year !== previousYear) {
            this.notifyYearChanged();
        }
    }
    
    /**
     * Check for specific time events
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
                (this.day - 1)) * this.HOURS_PER_DAY * this.MINUTES_PER_HOUR + 
                this.hour * this.MINUTES_PER_HOUR + this.minute;
    }
    
    /**
     * Set the time scale
     * @param {number} scale - New time scale
     */
    setTimeScale(scale) {
        this.timeScale = scale;
    }
    
    /**
     * Set the current time
     * @param {number} hour - Hour (0-23)
     * @param {number} minute - Minute (0-59)
     * @param {number} day - Day (1-30)
     * @param {number} season - Season (0-3)
     * @param {number} year - Year
     */
    setTime(hour, minute, day, season, year) {
        this.hour = hour;
        this.minute = minute;
        this.day = day;
        this.season = season;
        this.year = year;
        
        // Notify about the time change
        this.notifyTimeChanged();
    }
    
    /**
     * Advance time by a number of hours
     * @param {number} hours - Hours to advance
     */
    advanceTime(hours) {
        this.advanceHours(hours);
    }
    
    /**
     * Skip to next day
     */
    skipToNextDay() {
        // Calculate hours until next day
        const hoursUntilNextDay = this.HOURS_PER_DAY - this.hour;
        
        // If it's exactly midnight, add a full day
        if (hoursUntilNextDay === 0) {
            this.advanceHours(this.HOURS_PER_DAY);
        } else {
            this.advanceHours(hoursUntilNextDay);
        }
        
        // Reset minutes
        this.minute = 0;
        
        // Notify about the time change
        this.notifyTimeChanged();
    }
    
    /**
     * Skip to next season
     */
    skipToNextSeason() {
        // Calculate days until next season
        const daysUntilNextSeason = this.DAYS_PER_SEASON - this.day + 1;
        
        // Advance days
        this.advanceDays(daysUntilNextSeason);
        
        // Reset time to beginning of day
        this.hour = 6;
        this.minute = 0;
        
        // Notify about the time change
        this.notifyTimeChanged();
    }
    
    /**
     * Add a time change listener
     * @param {function} callback - Callback function
     * @param {string} eventType - Event type (optional)
     */
    addListener(callback, eventType = 'timeChanged') {
        this.timeListeners.push({ callback, eventType });
    }
    
    /**
     * Remove a time change listener
     * @param {function} callback - Callback function to remove
     */
    removeListener(callback) {
        this.timeListeners = this.timeListeners.filter(listener => listener.callback !== callback);
    }
    
    /**
     * Notify listeners about time change
     */
    notifyTimeChanged() {
        const timeData = this.getCurrentTime();
        
        this.timeListeners.forEach(listener => {
            if (listener.eventType === 'timeChanged') {
                listener.callback(timeData);
            }
        });
        
        // Update the UI time display if UI manager exists
        if (this.engine && this.engine.game && this.engine.game.uiManager) {
            this.engine.game.uiManager.updateTimeDisplay(timeData);
        }
    }
    
    /**
     * Notify listeners about hour change
     */
    notifyHourChanged() {
        const timeData = this.getCurrentTime();
        
        this.timeListeners.forEach(listener => {
            if (listener.eventType === 'hourChanged') {
                listener.callback(timeData);
            }
        });
    }
    
    /**
     * Notify listeners about day change
     */
    notifyDayChanged() {
        const timeData = this.getCurrentTime();
        
        this.timeListeners.forEach(listener => {
            if (listener.eventType === 'dayChanged') {
                listener.callback(timeData);
            }
        });
    }
    
    /**
     * Notify listeners about season change
     */
    notifySeasonChanged() {
        const timeData = this.getCurrentTime();
        
        this.timeListeners.forEach(listener => {
            if (listener.eventType === 'seasonChanged') {
                listener.callback(timeData);
            }
        });
    }
    
    /**
     * Notify listeners about year change
     */
    notifyYearChanged() {
        const timeData = this.getCurrentTime();
        
        this.timeListeners.forEach(listener => {
            if (listener.eventType === 'yearChanged') {
                listener.callback(timeData);
            }
        });
    }
    
    /**
     * Notify listeners about specific time event
     * @param {string} eventName - Event name
     */
    notifyTimeEvent(eventName) {
        const timeData = this.getCurrentTime();
        
        this.timeListeners.forEach(listener => {
            if (listener.eventType === eventName) {
                listener.callback(timeData);
            }
        });
    }
}

