// schedule_ui.js - Schedule UI functions
// Depends on: schedule/schedule_data.js (DAY_KEYS, KNOWN_VARIANT_KEYS), schedule/schedule_generation.js (generateScheduleAI, generateScheduleAIGroup), bots/bot_storage.js (saveBots, saveGroups), core/ui_helpers.js (showToast, logError), core/i18n.js (t)

function toggleScheduleView() {
    const panel = document.getElementById('schedule-panel');
    if (!panel) return;
    
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function toggleGpScheduleView() {
    const panel = document.getElementById('grp-schedule-panel');
    if (!panel) return;
    
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function _keyForBot(botId) {
    return 'sched_' + botId;
}

function _repairScheduleJSON(jsonStr) {
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        logError('Failed to parse schedule JSON', e.message);
        return null;
    }
}

function _sanitizeScheduleRooms(schedule) {
    if (!schedule) return schedule;
    
    DAY_KEYS.forEach(day => {
        if (schedule[day]) {
            KNOWN_VARIANT_KEYS.forEach(variant => {
                if (schedule[day][variant]) {
                    const entry = schedule[day][variant];
                    if (entry.room && !SOLO_ROOMS.includes(entry.room)) {
                        entry.room = 'living_room';
                    }
                }
            });
        }
    });
    
    return schedule;
}
