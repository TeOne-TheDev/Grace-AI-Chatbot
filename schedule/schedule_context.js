// schedule_context.js - Schedule context building
// Depends on: schedule/schedule_data.js (DAY_KEYS, DAY_NAMES), bots/bot_data.js (getCurrentAge), core/time.js (timeStrToMinutes, minutesToTimeStr)

function getScheduleContext(bot) {
    if (!bot.schedule) return '';
    
    const parts = ['[Daily Schedule]:'];
    const schedule = bot.schedule;
    
    DAY_KEYS.forEach(day => {
        if (schedule[day]) {
            parts.push(`${day}:`);
            KNOWN_VARIANT_KEYS.forEach(variant => {
                if (schedule[day][variant]) {
                    const entry = schedule[day][variant];
                    const time = entry.time || '';
                    const room = entry.room || '';
                    const activity = entry.activity || '';
                    parts.push(`  ${variant}: ${time} - ${room} - ${activity}`);
                }
            });
        }
    });
    
    return parts.join('\n');
}

function getScheduleMilestones(bot) {
    if (!bot.schedule) return [];
    
    const milestones = [];
    const schedule = bot.schedule;
    const currentDay = getVirtualDay(bot) % 7;
    const dayKey = DAY_KEYS[currentDay];
    
    if (schedule[dayKey]) {
        KNOWN_VARIANT_KEYS.forEach(variant => {
            if (schedule[dayKey][variant]) {
                const entry = schedule[dayKey][variant];
                const timeMins = timeStrToMinutes(entry.time || '09:00');
                milestones.push({
                    time: timeMins,
                    variant,
                    room: entry.room,
                    activity: entry.activity,
                    mood: entry.mood,
                    company: entry.company
                });
            }
        });
    }
    
    return milestones.sort((a, b) => a.time - b.time);
}

function checkScheduleMilestones(bot, currentMinutes) {
    const milestones = getScheduleMilestones(bot);
    const current = currentMinutes || getVirtualMinutes(bot);
    
    for (const milestone of milestones) {
        if (current >= milestone.time && current < milestone.time + 60) {
            return milestone;
        }
    }
    
    return null;
}

// Expose globally
window.getScheduleContext = getScheduleContext;
window.getScheduleMilestones = getScheduleMilestones;
window.checkScheduleMilestones = checkScheduleMilestones;
