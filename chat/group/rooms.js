// chat/group/rooms.js - Room management for group chat
// Depends on: core/constants.js (PRESET_ROOMS, ROOM_ADJACENCY), bots/bot_storage.js (saveBots, saveGroups), core/ui_helpers.js (showToast)

const PRESET_ROOMS = [
    { id: 'living_room', name: 'Living Room', icon: '🛋️' },
    { id: 'kitchen', name: 'Kitchen', icon: '🍳' },
    { id: 'bedroom', name: 'Bedroom', icon: '🛏️' },
    { id: 'bathroom', name: 'Bathroom', icon: '🚿' },
    { id: 'garden', name: 'Garden', icon: '🌳' },
    { id: 'office', name: 'Office', icon: '💼' },
    { id: 'dining_room', name: 'Dining Room', icon: '🍽️' },
];

const ROOM_ADJACENCY = {
    'living_room': ['kitchen', 'garden', 'dining_room'],
    'kitchen': ['living_room', 'dining_room'],
    'bedroom': ['bathroom', 'living_room'],
    'bathroom': ['bedroom'],
    'garden': ['living_room'],
    'office': ['living_room'],
    'dining_room': ['kitchen', 'living_room'],
};

function initGroupRooms(grpId) {
    const grp = groups.find(g => g.id === grpId);
    if (!grp) return;
    
    if (!grp.rooms) {
        grp.rooms = JSON.parse(JSON.stringify(PRESET_ROOMS));
        saveGroups();
    }
}

function getRoomById(grpId, roomId) {
    const grp = groups.find(g => g.id === grpId);
    if (!grp || !grp.rooms) return null;
    
    return grp.rooms.find(r => r.id === roomId);
}

function moveCharToRoom(grpId, botId, roomId) {
    const grp = groups.find(g => g.id === grpId);
    if (!grp) return;
    
    if (!grp.charRooms) grp.charRooms = {};
    grp.charRooms[botId] = roomId;
    
    saveGroups();
    showToast('Character moved', '#0a1a0a', '#22c55e');
}

function moveUserToRoom(grpId, roomId) {
    const grp = groups.find(g => g.id === grpId);
    if (!grp) return;
    
    grp.userRoom = roomId;
    saveGroups();
    
    injectRoomChangeSep(roomId);
}

function injectRoomChangeSep(roomId) {
    const room = PRESET_ROOMS.find(r => r.id === roomId);
    if (!room) return;
    
    const sep = {
        role: 'system',
        content: `[You moved to ${room.name}]`,
        msgId: 'sep_' + Date.now(),
        timestamp: Date.now()
    };
    
    const grp = groups.find(g => g.id === curGroupId);
    if (grp) {
        grp.history = grp.history || [];
        grp.history.push(sep);
        saveGroups();
        renderGroupChat();
    }
}

function updateBedroomQuickBtn(botId) {
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    
    const btn = document.getElementById('bedroom-quick-btn');
    if (btn) {
        btn.textContent = bot.gender === 'Female' ? '🛏️ Bedroom' : '🛏️ Bedroom';
    }
}

function showRoomToast(msg) {
    showToast(msg, '#0a1a0a', '#22c55e');
}

function getHearingMemberIds(grpId, roomId) {
    const grp = groups.find(g => g.id === grpId);
    if (!grp || !grp.charRooms) return grp.memberIds;
    
    const adjacentRooms = ROOM_ADJACENCY[roomId] || [];
    const hearingIds = [];
    
    grp.memberIds.forEach(id => {
        const charRoom = grp.charRooms[id];
        if (charRoom === roomId || adjacentRooms.includes(charRoom)) {
            hearingIds.push(id);
        }
    });
    
    return hearingIds;
}

function resolveRoom(grpId, botId) {
    const grp = groups.find(g => g.id === grpId);
    if (!grp || !grp.charRooms) return 'living_room';
    
    return grp.charRooms[botId] || 'living_room';
}

function autoUpdateBotMemoryFromGroup(grpId, botId) {
    const grp = groups.find(g => g.id === grpId);
    const bot = bots.find(b => b.id === botId);
    if (!grp || !bot) return;
    
    const grpHistory = grp.history || [];
    const botHistory = bot.history || [];
    
    grpHistory.forEach(msg => {
        if (msg.responderId === botId) {
            const existing = botHistory.find(h => h.msgId === msg.msgId);
            if (!existing) {
                botHistory.push({
                    role: 'assistant',
                    content: msg.content,
                    msgId: msg.msgId,
                    timestamp: msg.timestamp
                });
            }
        }
    });
    
    saveBots();
}

function autoUpdateGrpMemory(grpId) {
    const grp = groups.find(g => g.id === grpId);
    if (!grp) return;
    
    grp.memberIds.forEach(id => {
        autoUpdateBotMemoryFromGroup(grpId, id);
    });
}

function fullSyncDynBio() {
    bots.forEach(bot => {
        if (bot.dynBio) {
            bot.grpDynBio = { ...bot.dynBio };
        }
    });
    saveBots();
}

function quickSyncDynBio(botId) {
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    
    bot.grpDynBio = { ...bot.dynBio };
    saveBots();
}

function generateWorldRooms() {
    showToast('🏠 Generating world rooms...', '#0a1a0a', '#f97316');
}

function rollGroupName() {
    const prefixes = ['The', 'Cozy', 'Happy', 'Sunny', 'Peaceful', 'Lucky'];
    const nouns = ['Home', 'House', 'Place', 'Haven', 'Corner', 'Spot'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${prefix} ${noun}`;
}
