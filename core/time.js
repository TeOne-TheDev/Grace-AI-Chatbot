// time.js - Time utilities
// Depends on: none

function timeStrToMinutes(str) {
    if (!str) return 9 * 60;
    const parts = str.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
}

function minutesToTimeStr(mins) {
    if (mins === null || mins === undefined) return '00:00';
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
}
