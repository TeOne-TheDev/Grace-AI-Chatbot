// schedule_data.js - Schedule data definitions
// Depends on: none

const SOLO_ROOMS = [
    { id:'bathroom',    name:'Bathroom' },
    { id:'bedroom',     name:'Bedroom' },
    { id:'living_room', name:'Living Room' },
    { id:'kitchen',     name:'Kitchen' },
    { id:'dining_room', name:'Dining Room' },
    { id:'nursery',     name:'Nursery' },
    { id:'study',       name:'Study / Office' },
    { id:'garden',      name:'Garden / Balcony' },
    { id:'outside',     name:'Outside (errands, gym, café, park…)' },
];

const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const KNOWN_VARIANT_KEYS = ['normal','trimester1','trimester2','trimester3','overdue','postpartum_newborn','parasite_implantation','parasite_feeding','parasite_growth','parasite_maturation','parasite_emergence','cycle_period','cycle_follicular','cycle_ovulation','cycle_luteal','cycle_pms'];

const KNOWN_SCHED_FIELDS = ['wake','breakfast','lunch','dinner','sleep'];

const _AUTO_UPDATE_CONFIG = {
    checkInterval: 3,
    maxDaysWithoutUpdate: 7,
    minDelayMs: 0,  // No cooldown - update immediately when triggered
    lastUpdateTime: 0,  // timestamp of last auto-update
    updateQueue: [],    // queue of bots waiting to update
    isProcessing: false // whether currently processing queue
};

// Expose globally
window.SOLO_ROOMS = SOLO_ROOMS;
window.DAY_KEYS = DAY_KEYS;
window.DAY_NAMES = DAY_NAMES;
window.KNOWN_VARIANT_KEYS = KNOWN_VARIANT_KEYS;
window.KNOWN_SCHED_FIELDS = KNOWN_SCHED_FIELDS;
window._AUTO_UPDATE_CONFIG = _AUTO_UPDATE_CONFIG;
