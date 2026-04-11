// ─────────────────────────────────────────────────────────────────────────────
// CYCLE & PREGNANCY CONSTANTS - Centralized for easy modification and extension
// ─────────────────────────────────────────────────────────────────────────────
const CYCLE_CONSTANTS = {
    // Cycle phases
    PERIOD_LENGTH: 3,
    OVULATION_DAY: 7,
    FERTILE_WINDOW_START: 5,
    FERTILE_WINDOW_END: 8,
    POSTPARTUM_DAYS: 5,
    
    // Base pregnancy speeds (virtual weeks per real day)
    PREGNANCY_SPEED: 4.5,           // Normal pregnancy
    MONSTER_PREGNANCY_SPEED: 28,    // Monster pregnancy (ultra-fast)
    PARASITE_SPEED: 15,             // Parasite pregnancy
    
    // Random pregnancy on character creation
    RANDOM_PREGNANCY_CHANCE: 0.05,  // 5% chance for new female characters to start pregnant
};

// Trait effects on pregnancy/cycle - Centralized modifier system
// Each trait can specify modifiers that affect pregnancy calculations
const TRAIT_EFFECTS = {
    // Perfect Incubation: Pregnancy progresses x2 faster
    // Affects: Normal & Monster Pregnancy
    // Does NOT affect: Parasite Pregnancy
    'Perfect Incubation': {
        pregnancySpeedMultiplier: 2.0,
        appliesTo: ['normal', 'monster'],  // Not 'parasite'
        desc: 'Pregnancy progresses 2x faster than normal'
    },
    
    // Heat Cycle: Enhanced fertility cycle
    'Heat Cycle': {
        fertilityBoost: 1.5,
        cycleLengthMultiplier: 0.75,  // Shorter cycles
        desc: 'Enhanced fertility with more frequent cycles'
    },

    // ── Male trait effects (applied via partner in processIntercourse) ──
    'Hyper-Virility': {
        partnerConceptionMultiplier: 2.0,  // Doubles female's conception chance
        desc: 'Conception chance doubled when this male is the father'
    },
    'Alpha Seed': {
        partnerConceptionMultiplier: 1.2,  // +20% conception chance
        offspringDominantTraits: true,     // Future: offspring inherit father dominant traits
        desc: 'Conception +20%; offspring inherit dominant genetic traits'
    },
    'Rut Cycle': {
        rutPeriodDays: 21,    // Rut triggers every ~21 virtual days
        rutDurationDays: 3,   // Lasts ~3 days
        rutConceptionMultiplier: 1.5,  // Extra conception boost during rut
        desc: 'During rut phase: conception chance +50%'
    },
    'Breeding Instinct': {
        partnerConceptionMultiplier: 1.3,  // Neutral trait - applies to whoever has it
        desc: 'Primal drive increases conception chance +30%'
    }
};

// Legacy constants (keep for backward compatibility)
const PERIOD_LENGTH = CYCLE_CONSTANTS.PERIOD_LENGTH;
const OVULATION_DAY = CYCLE_CONSTANTS.OVULATION_DAY;
const FERTILE_WINDOW_START = CYCLE_CONSTANTS.FERTILE_WINDOW_START;
const FERTILE_WINDOW_END = CYCLE_CONSTANTS.FERTILE_WINDOW_END;
const POSTPARTUM_DAYS = CYCLE_CONSTANTS.POSTPARTUM_DAYS;
const PREGNANCY_SPEED = CYCLE_CONSTANTS.PREGNANCY_SPEED;
const MONSTER_PREGNANCY_SPEED = CYCLE_CONSTANTS.MONSTER_PREGNANCY_SPEED;
const PARASITE_SPEED = CYCLE_CONSTANTS.PARASITE_SPEED;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS - Get effective speeds with trait modifiers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get effective pregnancy speed with trait modifiers
 * @param {Object} bot - The bot object
 * @param {string} pregnancyType - 'normal', 'monster', or 'parasite'
 * @returns {number} Effective speed multiplier
 */
function getEffectivePregnancySpeed(bot, pregnancyType = 'normal') {
    const traits = bot.geneticTraits || [];
    let speedMultiplier = 1.0;
    
    // Check for Perfect Incubation trait
    if (traits.includes('Perfect Incubation')) {
        const effect = TRAIT_EFFECTS['Perfect Incubation'];
        // Only apply if pregnancy type is in the appliesTo list
        if (effect.appliesTo.includes(pregnancyType)) {
            speedMultiplier *= effect.pregnancySpeedMultiplier;
        }
    }
    
    return speedMultiplier;
}

/**
 * Get base pregnancy speed for type
 * @param {string} type - 'normal', 'monster', or 'parasite'  
 * @returns {number} Base speed
 */

/**
 * Get effective cycle length with trait modifiers
 * @param {Object} bot - The bot object
 * @returns {number} Modified cycle length
 */

function initCycleData(bot) {
    if (bot.cycleData) return;
    const randomCycleDay = Math.floor(Math.random() * CYCLE_LENGTH);
    
    // Check if female and randomly start pregnant
    const isFemale = (bot.gender || '').toLowerCase().includes('female') ||
                     (bot.gender || '').toLowerCase().includes('woman') ||
                     (bot.gender || '').toLowerCase() === 'f';
    
    let startPregnant = false;
    let startPregnancyWeek = 0;
    
    if (isFemale && Math.random() < CYCLE_CONSTANTS.RANDOM_PREGNANCY_CHANCE) {
        startPregnant = true;
        // Random pregnancy week between 4 and 36
        startPregnancyWeek = 4 + Math.floor(Math.random() * 33);
    }
    
    bot.cycleData = {
        lastPeriodStartDay: -(randomCycleDay),
        cycleLength: CYCLE_LENGTH,
        periodLength: PERIOD_LENGTH,
        pregnant: startPregnant,
        conceptionVirtualDay: startPregnant ? getVirtualDay(bot) - Math.ceil((startPregnancyWeek * 7) / CYCLE_CONSTANTS.PREGNANCY_SPEED) : null,
        intercourseEvents: [],
        laborStarted: false,
        laborVirtualDay: null,
        birthVirtualDay: null,
        postpartumStartDay: null,
        pregnancyTestTaken: startPregnant && startPregnancyWeek >= 9,
        pregnancyTestDay: startPregnant && startPregnancyWeek >= 9 ? (getVirtualDay(bot) - Math.ceil((startPregnancyWeek * 7) / CYCLE_CONSTANTS.PREGNANCY_SPEED) + 3) : null,
        fetusCount: 1,
        fetuses: [{ gender: 'unknown', nickname: '' }],
        children: [],
        eventLog: [],
        // ── Father / partner tracking ──
        fatherId: null,       // bot.id of the father (null = user/unknown)
        fatherName: null,     // display name of the father
        fatherTraits: [],     // father's genetic traits at time of conception
        partnerHistory: [],   // [{ partnerId, partnerName, virtualDay, protected }]
    };
    
    if (startPregnant) {
        addReproEvent(bot, `🤰 Started pregnant at ${startPregnancyWeek} weeks`);
    }
    
    saveBots();
}

function addReproEvent(bot, text) {
    if (!bot.cycleData) return;
    const day = getVirtualDay(bot);
    if (!bot.cycleData.eventLog) bot.cycleData.eventLog = [];
    bot.cycleData.eventLog.unshift({ day, text, ts: Date.now() });
    
    if (bot.cycleData.eventLog.length > 20) bot.cycleData.eventLog = bot.cycleData.eventLog.slice(0, 20);
    saveBots();
}

function getCurrentCycleDay(bot) {
    const cd = bot.cycleData;
    if (!cd) return 1;
    
    if (cd.cycleLength !== CYCLE_LENGTH) {
        cd.cycleLength = CYCLE_LENGTH;
        cd.periodLength = PERIOD_LENGTH;
        const virtualDay = getVirtualDay(bot);
        const oldDays = virtualDay - cd.lastPeriodStartDay;
        const oldCycleDay = ((oldDays % 28) + 28) % 28 + 1;
        const newCycleDay = Math.max(1, Math.min(CYCLE_LENGTH, Math.round(oldCycleDay / 28 * CYCLE_LENGTH)));
        cd.lastPeriodStartDay = virtualDay - (newCycleDay - 1);
    }
    
    
    if (cd.pregnant && cd.pregnancyTestTaken === undefined) {
        const weeksNow = getPregnancyWeek(bot) || 0;
        cd.pregnancyTestTaken = weeksNow >= 9; 
        cd.pregnancyTestDay = weeksNow >= 9 ? (cd.conceptionVirtualDay || 0) + 3 : null;
    }
    const virtualDay = getVirtualDay(bot);
    const daysSinceLastPeriod = virtualDay - cd.lastPeriodStartDay;
    return ((daysSinceLastPeriod % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH + 1;
}

function getCyclePhase(cycleDay) {
    
    if (cycleDay <= PERIOD_LENGTH) {
        return { name: '🩸 Menstruation', color: '#f87171', fertility: 'Very Low', fertilityScore: 5, desc: 'Period phase - uterus shedding lining' };
    } else if (cycleDay < FERTILE_WINDOW_START) {
        return { name: '🌱 Follicular', color: '#86efac', fertility: 'Low', fertilityScore: 20, desc: 'Post-period - follicles developing' };
    } else if (cycleDay >= FERTILE_WINDOW_START && cycleDay <= OVULATION_DAY) {
        return { name: '🔥 Fertile Window', color: '#f97316', fertility: cycleDay === OVULATION_DAY ? 'PEAK' : 'High', fertilityScore: cycleDay === OVULATION_DAY ? 98 : 75, desc: cycleDay === OVULATION_DAY ? '🥚 Ovulation day - maximum fertility!' : 'Fertile window - conception possible' };
    } else if (cycleDay <= FERTILE_WINDOW_END) {
        return { name: '🌡️ Post-Ovulation', color: '#fbbf24', fertility: 'Moderate', fertilityScore: 40, desc: 'Egg released - still possible conception window' };
    } else if (cycleDay <= Math.floor(CYCLE_LENGTH * 0.78)) {
        return { name: '🌙 Luteal Phase', color: '#c084fc', fertility: 'Very Low', fertilityScore: 5, desc: 'Post-ovulation - progesterone rising' };
    } else {
        return { name: '🔴 Pre-Menstrual', color: '#94a3b8', fertility: 'None', fertilityScore: 2, desc: 'PMS phase - period approaching' };
    }
}

function getPregnancyWeek(bot) {
    if (!bot.cycleData || !bot.cycleData.pregnant || bot.cycleData.conceptionVirtualDay === null) return null;
    const virtualDay = getVirtualDay(bot);
    const daysPregnant = virtualDay - bot.cycleData.conceptionVirtualDay;
    
    // Get effective speed with trait modifiers
    const speedMultiplier = getEffectivePregnancySpeed(bot, 'normal');
    const effectiveSpeed = PREGNANCY_SPEED * speedMultiplier;
    
    let weeks = Math.floor((daysPregnant * effectiveSpeed) / 7);
    
    // Cap at maximum reasonable pregnancy weeks (42 normal, 45 with Always Overdue trait)
    const disadvantages = bot.geneticTraits || [];
    const isAlwaysOverdue = disadvantages.includes('Always Overdue');
    const maxWeeks = isAlwaysOverdue ? 45 : 42;
    
    return Math.min(weeks, maxWeeks);
}

function getMonsterPregnancyWeek(bot) {
    if (!bot.cycleData || !bot.cycleData.pregnant || bot.cycleData.conceptionVirtualDay === null) return null;
    const virtualDay = getVirtualDay(bot);
    const daysPregnant = virtualDay - bot.cycleData.conceptionVirtualDay;
    
    // Get effective speed with trait modifiers
    const speedMultiplier = getEffectivePregnancySpeed(bot, 'monster');
    const effectiveSpeed = MONSTER_PREGNANCY_SPEED * speedMultiplier;
    
    let weeks = Math.floor((daysPregnant * effectiveSpeed) / 7);
    
    // Cap monster pregnancy at 10 days (the full monster pregnancy duration)
    return Math.min(weeks, 10);
}

function getEffectivePregnancyWeek(bot) {
    if (bot.cycleData && bot.cycleData.isMonsterPregnancy) return getMonsterPregnancyWeek(bot);
    return getPregnancyWeek(bot);
}

function promptSetPregnancyWeek() {
    const bot = bots.find(b => b.id === curId);
    if (!bot || !bot.cycleData || !bot.cycleData.pregnant) return;
    const isMonster = !!(bot.cycleData.isMonsterPregnancy);
    if (isMonster) {
        
        const currentDay = getVirtualDay(bot) - (bot.cycleData.conceptionVirtualDay || 0);
        const input = prompt('Set monster pregnancy day (1–10):\nCurrent: Day ' + currentDay, currentDay);
        if (input === null) return;
        const day = parseInt(input);
        if (isNaN(day) || day < 1 || day > 10) { alert('Please enter a number between 1 and 10.'); return; }
        bot.cycleData.conceptionVirtualDay = getVirtualDay(bot) - day;
        saveBots();
        showBioPopup();
        updateReproductiveStatus(bot);
        showToast('✅ Set to Day ' + day, '#0a1a00', '#22c55e');
    } else {
        const current = getPregnancyWeek(bot) || 0;
        const _isAlwaysOverduePSW = (bot.disadvantages || []).includes('Always Overdue');
        const _maxWeek = _isAlwaysOverduePSW ? 45 : 42;
        const input = prompt(`Set pregnancy week (1–${_maxWeek}):\nCurrent: Week ` + current, current);
        if (input === null) return;
        const week = parseInt(input);
        if (isNaN(week) || week < 1 || week > _maxWeek) { alert(`Please enter a number between 1 and ${_maxWeek}.`); return; }
        const virtualDay = getVirtualDay(bot);
        
        bot.cycleData.conceptionVirtualDay = virtualDay - Math.ceil((week * 7) / PREGNANCY_SPEED);
        // Reset labor state in case user rolls back from a full-term week
        bot.cycleData.laborStarted = false;
        bot.cycleData.laborVirtualDay = null;
        bot.cycleData.waterBroke = false;
        bot.cycleData.laborProgress = null;
        saveBots();
        showBioPopup();
        updateReproductiveStatus(bot);
        showToast('✅ Set to Week ' + week, '#0a1a00', '#22c55e');
    }
}

