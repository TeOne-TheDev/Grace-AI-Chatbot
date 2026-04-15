// bot_storage.js - Bot save/load functions
// Depends on: core/storage.js (safeSetItem, safeGetItem, safeRemoveItem, saveIllusUrl, savePortraitUrl), core/constants.js (RECENT_MSG_KEEP)

function saveBots() {
    const botsClean = bots.map(bot => {
        const botClean = {
            ...bot,
            history: (bot.history || []).map(msg => {
                if (msg.illustUrl && msg.illustUrl.startsWith('data:')) {
                    saveIllusUrl(msg.msgId, msg.illustUrl);
                    return { ...msg, illustUrl: '__stored__' };
                }
                return msg;
            })
        };
        if (botClean.portraitUrl && botClean.portraitUrl.startsWith('data:')) {
            savePortraitUrl(bot.id, botClean.portraitUrl);
            botClean.portraitUrl = '__stored__';
        }
        return botClean;
    });
    safeSetItem('grace_bots_v6', JSON.stringify(botsClean));
    const home = document.getElementById('sc-home');
    if (home && !home.classList.contains('off')) renderBotList();
}

function saveGroups() {
    const groupsClean = groups.map(grp => ({
        ...grp,
        history: (grp.history || []).map(msg => {
            if (msg.grpIllusUrl && msg.grpIllusUrl.startsWith('data:')) {
                saveIllusUrl(msg.msgId || 'grp_' + Date.now(), msg.grpIllusUrl);
                return { ...msg, grpIllusUrl: '__stored__' };
            }
            return msg;
        })
    }));
    safeSetItem('grace_groups_v1', JSON.stringify(groupsClean));
}

function saveFolders() {
    safeSetItem('grace_folders_v1', JSON.stringify(folders));
}

function savePersonas() {
    safeSetItem('grace_personas_v1', JSON.stringify(personas));
}

function trimBotHistory(bot, maxLen) {
    maxLen = maxLen || 200;
    const minKeep = RECENT_MSG_KEEP * 2;
    const effectiveMax = Math.max(maxLen, minKeep);
    if ((bot.history || []).length > effectiveMax + 20) {
        bot.history = bot.history.slice(-(effectiveMax));
    }
}

function deleteAllChatData() {
    if (!confirm('Are you absolutely sure you want to delete ALL characters, group chats, folders, and images? Your API keys and global settings will remain. This CANNOT be undone!')) return;

    bots = [];
    groups = [];
    folders = [];
    curId = null;
    curGroupId = null;

    safeRemoveItem('grace_bots_v6');
    safeRemoveItem('grace_bots');
    safeRemoveItem('grace_groups_v1');
    safeRemoveItem('grace_folders_v1');

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('grace_illus_') || key.startsWith('grace_portrait_'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => safeRemoveItem(k));

    if (typeof showScreen === 'function') {
        showScreen('sc-home');
    }
    if (typeof renderBotList === 'function') {
        renderBotList();
    }
    if (typeof renderFolderList === 'function') {
        renderFolderList();
    }

    showToast('🗑️ All chat data deleted successfully', '#1a0505', '#ef4444');
}
