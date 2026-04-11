// schedule_data.js - Schedule data definitions
// Depends on: none

const SOLO_ROOMS = ['bedroom', 'bathroom', 'kitchen', 'living_room', 'garden', 'office', 'study'];

const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const KNOWN_VARIANT_KEYS = ['morning', 'afternoon', 'evening', 'night'];

const KNOWN_SCHED_FIELDS = ['room', 'activity', 'mood', 'company', 'notes'];

const _AUTO_UPDATE_CONFIG = {
    checkInterval: 3,
    maxDaysWithoutUpdate: 7
};
