// storage.js - localStorage helpers
// Depends on: core/storage_shim.js (localStorage), core/utils.js (escapeHTML)

function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            alert('Storage quota exceeded. Please delete some old chat data or images to free up space.');
        }
    }
}

function safeGetItem(key, fallback) {
    try {
        const val = localStorage.getItem(key);
        return val !== null ? val : fallback;
    } catch (e) {
        return fallback;
    }
}

function safeRemoveItem(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        // Silent fail
    }
}

function saveIllusUrl(msgId, base64Url) {
    if (!msgId || !base64Url) return;
    const key = 'grace_illus_' + msgId;
    try {
        localStorage.setItem(key, base64Url);
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            console.warn('Storage quota exceeded for illustration');
        }
    }
}

function loadIllusUrl(msgId) {
    if (!msgId) return null;
    return localStorage.getItem('grace_illus_' + msgId) || null;
}

function savePortraitUrl(botId, base64Url) {
    if (!botId || !base64Url) return;
    const key = 'grace_portrait_' + botId;
    try {
        localStorage.setItem(key, base64Url);
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            console.warn('Storage quota exceeded for portrait');
        }
    }
}

function loadPortraitUrl(botId) {
    if (!botId) return null;
    return localStorage.getItem('grace_portrait_' + botId) || null;
}

function safeParse(key, fallback) {
    try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : fallback;
    } catch (e) {
        return fallback;
    }
}
