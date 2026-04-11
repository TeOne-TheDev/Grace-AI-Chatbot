// chat/solo/life_events.js - Life events and time management for solo chat
// Depends on: core/time.js (minutesToTimeStr, timeStrToMinutes), core/storage.js (safeSetItem, safeGetItem), core/constants.js (ANNUAL_HOLIDAYS)

function getVirtualMinutes(bot) {
    return bot.virtualMinutes || 9 * 60;
}

function getTimeOfDay(minutes) {
    if (minutes < 6 * 60) return 'night';
    if (minutes < 12 * 60) return 'morning';
    if (minutes < 18 * 60) return 'afternoon';
    return 'evening';
}

function getTimeContext(bot) {
    const mins = getVirtualMinutes(bot);
    const timeStr = minutesToTimeStr(mins);
    const tod = getTimeOfDay(mins);
    return `[Current Time: ${timeStr} (${tod})]`;
}

function getVirtualDay(bot) {
    return bot.virtualDay || 0;
}

function setVirtualDay(bot, day) {
    bot.virtualDay = day;
    saveBots();
}

function advanceVirtualMinutes(bot, minutes) {
    bot.virtualMinutes = (bot.virtualMinutes || 9 * 60) + minutes;
    if (bot.virtualMinutes >= 24 * 60) {
        bot.virtualMinutes = bot.virtualMinutes % (24 * 60);
        bot.virtualDay = (bot.virtualDay || 0) + 1;
    }
    saveBots();
}

function getTodayHoliday(virtualDay) {
    const dayOfYear = virtualDay % 365;
    const monthDay = Math.floor(dayOfYear / 30) + 1;
    const dayOfMonth = (dayOfYear % 30) + 1;
    const dateStr = `${monthDay.toString().padStart(2, '0')}/${dayOfMonth.toString().padStart(2, '0')}`;
    
    return ANNUAL_HOLIDAYS.find(h => h.date === dateStr);
}

function getDayContext(bot) {
    const day = getVirtualDay(bot);
    const holiday = getTodayHoliday(day);
    
    if (holiday) {
        return `[Today is ${holiday.name} - themes: ${holiday.themes.join(', ')}]`;
    }
    
    return '';
}

function getRecentChatSnippet(bot, count = 3) {
    if (!bot.history || bot.history.length === 0) return '';
    
    const recent = bot.history.slice(-count * 2);
    return recent.map(m => {
        const role = m.role === 'user' ? 'You' : bot.name;
        return `${role}: ${m.content.substring(0, 100)}`;
    }).join('\n');
}

function maybeInjectLifeEvent(bot) {
    const holiday = getTodayHoliday(getVirtualDay(bot));
    if (!holiday) return null;
    
    if (Math.random() > 0.3) return null;
    
    const theme = holiday.themes[Math.floor(Math.random() * holiday.themes.length)];
    return `[Life Event: Today is ${holiday.name}. The atmosphere is ${theme}.]`;
}
