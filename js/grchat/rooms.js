const PRESET_ROOMS = [
    { id: 'living_room', icon: '📺', name: 'Living Room' },
    { id: 'kitchen', icon: '🍳', name: 'Kitchen' },
    { id: 'your_bedroom', icon: '🛏', name: 'Your Bedroom' },
    { id: 'bathroom', icon: '🚿', name: 'Bathroom' },
    { id: 'dining_room', icon: '🪑', name: 'Dining Room' },
    { id: 'nursery', icon: '🍼', name: 'Nursery' },
    { id: 'garden', icon: '🌿', name: 'Garden' },
    { id: 'garage', icon: '🔧', name: 'Garage' },
    { id: 'study', icon: '📚', name: 'Study' },
    { id: 'outside', icon: '🌆', name: 'Outside', outside: true },
];

// AI-generated schedule determines room. No keyword fallback.
// If AI omits room, fallback to first non-private room or bedroom.

const ROOM_ADJACENCY = {
    'living_room': ['kitchen', 'dining_room', 'garden', 'study'],
    'kitchen': ['living_room', 'dining_room'],
    'dining_room': ['kitchen', 'living_room'],
    'your_bedroom': ['bathroom', 'study'],
    'bathroom': ['your_bedroom'],
    'garden': ['living_room', 'garage'],
    'garage': ['garden', 'living_room'],
    'study': ['living_room', 'your_bedroom'],
    'outside': ['garden', 'garage', 'living_room'],
};

// Helper: get per-bot private bedroom id
function getBotBedroomId(botId) { return 'bedroom_' + botId; }

function initGroupRooms(grp) {
    if (!grp.rooms) grp.rooms = PRESET_ROOMS.map(r => ({ ...r }));
    if (!grp.memberRooms) grp.memberRooms = {}; // botId → roomId
    const members = (grp.memberIds || []).map(id => bots.find(b => b.id === id)).filter(Boolean);

    // Ensure each member has a private bedroom room entry
    members.forEach(bot => {
        const bedroomId = getBotBedroomId(bot.id);
        const existingBed = grp.rooms.find(r => r.id === bedroomId);
        if (!existingBed) {
            grp.rooms.push({ id: bedroomId, icon: '🛏', name: bot.name + "'s Room", private: true, ownerId: bot.id });
        } else if (existingBed.name !== bot.name + "'s Room") {
            existingBed.name = bot.name + "'s Room";
        }
        // Default member to their own bedroom if not assigned
        if (!grp.memberRooms[bot.id]) {
            grp.memberRooms[bot.id] = bedroomId;
        }
    });

    // Ensure your_bedroom exists
    if (!grp.rooms.find(r => r.id === 'your_bedroom')) {
        grp.rooms.push({ id: 'your_bedroom', icon: '🛏', name: 'Your Bedroom' });
    }
    // Ensure outside exists
    if (!grp.rooms.find(r => r.id === 'outside')) {
        grp.rooms.push({ id: 'outside', icon: '🌆', name: 'Outside', outside: true });
    }

    // ── FIX: Validate and repair userRoom ──────────────────────────────────
    // If userRoom doesn't exist in rooms (e.g. AI-gen rooms have different IDs),
    // pick the first common non-private room as default spawn.
    if (!grp.userRoom || !grp.rooms.find(r => r.id === grp.userRoom)) {
        const commonRoom = grp.rooms.find(r => !r.private && r.id !== 'your_bedroom' && r.id !== 'outside')
            || grp.rooms.find(r => !r.private)
            || grp.rooms[0];
        grp.userRoom = commonRoom ? commonRoom.id : 'living_room';
    }
}

function getRoomById(grp, roomId) {
    return (grp.rooms || PRESET_ROOMS).find(r => r.id === roomId) || PRESET_ROOMS[0];
}

function moveCharToRoom(grp, botId, roomId, silent, fromSchedule) {
    initGroupRooms(grp);
    const oldRoom = grp.memberRooms[botId];
    if (oldRoom === roomId) return false;
    // ── DIAGNOSTIC LOG ──
    const _botName = (bots.find(b => b.id === botId) || {}).name || botId;
    grp.memberRooms[botId] = roomId;
    // Record the virtual time when this bot was manually moved
    // Schedule movement will check if there's been interaction since then
    if (!fromSchedule) {
        const bot = bots.find(b => b.id === botId);
        if (bot) {
            if (!grp._manualMoveVirtualTime) grp._manualMoveVirtualTime = {};
            grp._manualMoveVirtualTime[botId] = bot.virtualMinutes;
        }
    }
    if (!Array.isArray(grp._recentlyMoved)) grp._recentlyMoved = [];
    if (!grp._recentlyMoved.includes(botId)) grp._recentlyMoved.push(botId);
    saveGroups();
    if (!silent) {
        const bot = bots.find(b => b.id === botId);
        const room = getRoomById(grp, roomId);
        showRoomToast(`${bot ? bot.name : 'Someone'} moved to ${room.icon} ${room.name}`);
    }
    return true;
}

function moveUserToRoom(grp, roomId) {
    initGroupRooms(grp);
    const prevRoomId = grp.userRoom;
    grp.userRoom = roomId;
    saveGroups();
    const room = getRoomById(grp, roomId);
    showRoomToast(`You moved to ${room.icon} ${room.name}`);
    renderGroupMemberDropdown(); // refresh dropdown
    // Inject room-change separator into chat
    if (prevRoomId !== roomId) {
        injectRoomChangeSep(room);
        // ── Pregnancy interaction scene ──
        if (prevRoomId !== roomId) {
            const _grpMembers = (grp.memberIds || []).map(id => bots.find(b => b.id === id)).filter(Boolean);
            setTimeout(() => maybeInjectPregnancyInteraction(grp, _grpMembers), 1800);
        }
    }
    // Update bedroom quick button highlight
    updateBedroomQuickBtn(grp);
}

function injectRoomChangeSep(room) {
    const container = document.getElementById('grp-chat-container');
    if (!container) return;
    const sep = document.createElement('div');
    sep.className = 'room-change-sep';
    sep.innerHTML = `<span class="room-change-sep-label">${room.icon} ${room.name}</span>`;
    container.appendChild(sep);
    container.scrollTop = container.scrollHeight;
    // Persist to history so it survives re-renders
    const grp = groups.find(g => g.id === curGroupId);
    if (grp) {
        grp.history.push({ role: 'room_sep', icon: room.icon, name: room.name });
        saveGroups();
    }
}

function updateBedroomQuickBtn(grp) {
    const btn = document.getElementById('grp-bedroom-quick-btn');
    if (!btn) return;
    if (!grp) {
        btn.classList.remove('active-room');
        return;
    }
    if (grp.userRoom === 'your_bedroom') {
        btn.classList.add('active-room');
    } else {
        btn.classList.remove('active-room');
    }
}
function showRoomToast(msg) {
    let t = document.getElementById('room-move-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'room-move-toast';
        t.className = 'room-move-toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function getHearingMemberIds(grp) {
    initGroupRooms(grp);
    const userRoom = grp.userRoom;
    const userIsOutside = userRoom === 'outside';
    return (grp.memberIds || []).filter(id => {
        const botRoom = grp.memberRooms[id];
        // If user is outside, only hear bots also outside
        // If user is inside, only hear bots in same room (outside bots can't hear)
        if (userIsOutside) return botRoom === 'outside';
        return botRoom === userRoom;
    });
}

// Resolve a room by ID or by name (fallback) - returns the room object or null
function resolveRoom(rooms, idOrName) {
    if (!idOrName) return null;
    // Exact ID match first
    let r = rooms.find(r => r.id === idOrName);
    if (r) return r;
    // Name match (case-insensitive)
    const lower = idOrName.toLowerCase().replace(/_/g, ' ');
    r = rooms.find(r => r.name.toLowerCase() === lower);
    if (r) return r;
    // Partial match as last resort
    r = rooms.find(r => r.name.toLowerCase().includes(lower) || lower.includes(r.id));
    return r || null;
}



function getStationaryStatus(bot) {
    if (!bot) return { locked: false };
    const cd = bot.cycleData;


    if (cd && cd.laborStarted && !cd.birthVirtualDay) {
        const laborHours = Math.round(getLaborElapsedMinutes(bot) / 60);
        return { locked: true, reason: `in active labor (${laborHours}h in) - cannot move from current position` };
    }


    if (cd && cd.pregnant) {
        const weeks = typeof getPregnancyWeek === 'function' ? getPregnancyWeek(bot) : 0;
        if (weeks >= 38) return { locked: true, reason: `extremely heavily pregnant (${weeks} weeks) - movement severely limited, stays in one spot` };
        if (weeks >= 36) return { locked: false, limited: true, reason: `heavily pregnant (${weeks} weeks) - moves slowly and rarely` };
    }
    return { locked: false };
}

function _deriveVietnamesePronouns(bot, activePersona) {
    const gender = (bot.gender || '').toLowerCase();
    const rel = (getDynField(bot, 'relation') || bot.relation || '').toLowerCase();
    const isFemale = /female|woman|girl|nu/i.test(gender);
    const isMale = /male|man|boy|nam/i.test(gender);
    const userGender = ((activePersona && activePersona.gender) || '').toLowerCase();
    const userIsFemale = /female|woman|girl|nu/i.test(userGender);
    const userIsMale = /male|man|boy|nam/i.test(userGender);
    let self, userAddr;
    if (/\bmother\b/.test(rel)) { self = 'mother'; userAddr = 'child'; }
    else if (/\baunt\b/.test(rel)) { self = 'aunt'; userAddr = 'niece/nephew'; }
    else if (/\bgrandmother\b/.test(rel)) { self = 'grandmother'; userAddr = 'grandchild'; }
    else if (/\bteacher\b/.test(rel) && isMale) { self = 'teacher'; userAddr = 'student'; }
    else if (/\buncle\b/.test(rel) && isMale) { self = 'uncle'; userAddr = 'niece/nephew'; }
    else if (/\bsister\b/.test(rel) && isFemale) { self = 'sister'; userAddr = 'sibling'; }
    else if (/\bbrother\b/.test(rel) && isMale) { self = 'brother'; userAddr = userIsFemale ? 'sibling' : 'friend'; }
    else if (isFemale) { self = 'I'; userAddr = userIsFemale ? 'sister' : 'brother'; }
    else if (isMale) { self = 'I'; userAddr = userIsFemale ? 'sibling' : 'friend'; }
    else { self = 'I'; userAddr = 'friend'; }
    return { self, userAddr };
}

function getSelfPronoun(bot, aiLang, activePersona) {
    if (aiLang !== 'Vietnamese') return 'I';
    return _deriveVietnamesePronouns(bot, activePersona).self;
}

function buildPronounGuidance(bot, aiLang, activePersona) {
    if (aiLang !== 'Vietnamese') return '';
    const { self, userAddr } = _deriveVietnamesePronouns(bot, activePersona);
    return `\n[PRONOUN USAGE - ABSOLUTELY MANDATORY]: ${bot.name} must always refer to themselves as "${self}" and address the user as "${userAddr}" throughout the entire conversation. NEVER use "I", "me", "myself" or any other pronoun instead of "${self}". Do not change pronoun usage in any message.`;
}

function buildStationaryTag(bot) {
    const s = getStationaryStatus(bot);
    if (s.locked) return `\n⛔ MOVEMENT LOCKED - ${bot.name} is ${s.reason}. She CANNOT walk, move rooms, or travel. Write her entirely from her current position. Any attempt to move her is a continuity error.`;
    if (s.limited) return `\n⚠️ MOVEMENT LIMITED - ${bot.name} is ${s.reason}. She should not move unless absolutely necessary and only very short distances.`;
    return '';
}


function toggleMemoryLog() {
    const box = document.getElementById('memory-log-text');
    const chevron = document.getElementById('memory-log-chevron');
    if (!box) return;
    const isHidden = box.style.display === 'none';
    box.style.display = isHidden ? 'block' : 'none';
    if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
}

function renderMemoryLogUI(bot) {
    const section = document.getElementById('memory-log-section');
    const textEl = document.getElementById('memory-log-text');
    if (!section || !textEl) return;

    if (bot.memorySummary && bot.memorySummary.length > 50) {
        textEl.innerHTML = '';
        const lines = bot.memorySummary
            .split(/\n+/)
            .map(l => l.trim())
            .filter(l => l.length > 0);
        lines.forEach(line => {
            const p = document.createElement('div');
            p.style.cssText = 'margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid var(--border)';
            p.textContent = line;
            textEl.appendChild(p);
        });
    } else {
        textEl.innerHTML = '<span class="memory-log-empty">No memory yet - builds after a few exchanges. Use Refresh to generate now.</span>';
    }

}

function refreshMemoryLogUI() {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    const btn = document.querySelector('.memory-log-refresh-btn');
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...'; btn.disabled = true; }
    // Force re-summarize by resetting both counters
    bot.lastSummaryAt = 0;
    bot.lastSummaryCutoff = 0;
    autoUpdateMemory(bot).then(() => {
        renderMemoryLogUI(bot);
        if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh'; btn.disabled = false; }
    }).catch(() => {
        if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh'; btn.disabled = false; }
    });
}

function toggleGrpStoryLog() {
    const box = document.getElementById('grp-story-log-text');
    const chevron = document.getElementById('grp-story-log-chevron');
    if (!box) return;
    const isHidden = box.style.display === 'none';
    box.style.display = isHidden ? 'block' : 'none';
    if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
}

function renderGrpStoryLog() {
    const grp = groups.find(g => g.id === curGroupId);
    const textEl = document.getElementById('grp-story-log-text');
    if (!textEl) return;
    if (grp && grp.memorySummary && grp.memorySummary.length > 50) {
        textEl.innerHTML = '';
        grp.memorySummary.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0).forEach(line => {
            const p = document.createElement('div');
            p.style.cssText = 'margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid var(--border)';
            p.textContent = line;
            textEl.appendChild(p);
        });
    } else {
        textEl.innerHTML = '<span style="font-style:italic">No story log yet - builds after a few exchanges.</span>';
    }
}

function refreshGrpStoryLog() {
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    const btn = document.querySelector('#grp-story-log-section button');
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }
    grp.lastSummaryAt = 0;
    autoUpdateGrpMemory(grp).then(() => {
        renderGrpStoryLog();
        if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh'; btn.disabled = false; }
    }).catch(() => {
        if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh'; btn.disabled = false; }
    });
}

function renderGpSchedule(bot) {
    const viewEl = document.getElementById('gp-sched-view-text');
    const badgeEl = document.getElementById('gp-sched-variant-badge');
    if (!viewEl) return;
    const s = bot ? bot.schedule : null;

    // Variant badge → header row
    const VARIANT_LABELS = { normal: 'Normal', trimester1: '🤰 Trimester 1', trimester2: '🤰 Trimester 2', trimester3: '🤰 Trimester 3', overdue: '⏳ Overdue', parasite_implantation: '👽 Implantation', parasite_feeding: '🦠 Feeding Phase', parasite_growth: '💥 Rapid Growth', parasite_maturation: '⚠️ Maturation', parasite_emergence: '🚨 EMERGENCE' };
    if (badgeEl) {
        if (bot && bot.scheduleVariants) {
            const active = _pickScheduleVariant(bot, bot.scheduleVariants);
            const key = KNOWN_VARIANT_KEYS.find(k => {
                const v = bot.scheduleVariants[k];
                return v && active && v.wake === active.wake && v.sleep === active.sleep;
            }) || (active ? KNOWN_VARIANT_KEYS.find(k => bot.scheduleVariants[k]) : null);
            const label = key ? (VARIANT_LABELS[key] || key) : null;
            if (label && label !== 'Normal') {
                badgeEl.innerHTML = '<span style="font-size:10px;font-weight:bold;color:#f59e0b;background:#1a0e00;border:1px solid #f59e0b55;border-radius:8px;padding:2px 8px">' + label + '</span>';
                badgeEl.style.display = 'inline';
            } else {
                badgeEl.innerHTML = '';
                badgeEl.style.display = 'none';
            }
        } else {
            badgeEl.innerHTML = '';
            badgeEl.style.display = 'none';
        }
    }

    if (!s) {
        viewEl.innerHTML = '<span style="color:var(--text-sub);font-style:italic">No schedule set.</span>';
        return;
    }

    const toMins = function (t) { if (!t) return 9999; var p = t.split(':').map(Number); return p[0] * 60 + (p[1] || 0); };
    var entries = [];
    if (s.wake) entries.push({ mins: toMins(s.wake), icon: '🌅', label: 'Wake', time: s.wake });
    if (s.breakfast) entries.push({ mins: toMins(s.breakfast), icon: '🍳', label: 'Breakfast', time: s.breakfast });
    if (s.lunch) entries.push({ mins: toMins(s.lunch), icon: '�-', label: 'Lunch', time: s.lunch });
    if (s.dinner) entries.push({ mins: toMins(s.dinner), icon: '🍽️', label: 'Dinner', time: s.dinner });
    if (s.sleep) entries.push({ mins: toMins(s.sleep), icon: '🌙', label: 'Bed', time: s.sleep });

    if (s.customActivities && s.customActivities.length > 0) {
        s.customActivities.forEach(function (a) {
            var st = a.start || a.startTime || '';
            var en = a.end || a.endTime || '';
            entries.push({ mins: toMins(st), icon: '📌', label: escapeHTML(a.name), time: st ? (st + '–' + en) : '-', isCustom: true });
        });
    }
    entries.sort(function (a, b) { return a.mins - b.mins; });

    const _rgsGrp = bot ? groups.find(g => g.memberIds && g.memberIds.includes(bot.id)) : null;
    const _rgsBedId = bot ? ('bedroom_' + bot.id) : null;
    const _rgsRooms = (_rgsGrp && _rgsGrp.rooms && _rgsGrp.rooms.length)
        ? _rgsGrp.rooms.filter(r => !r.private || r.id === _rgsBedId)
        : null;
    var timeline = _buildTimelineFromSchedule(s, _rgsRooms);
    var finalHtml = '';
    if (timeline.length > 0) {
        finalHtml = timeline.map(function (e, i) {
            var timeStr = e.end ? (e.start + '–' + e.end) : e.start;
            var isEdge = !e.end;
            return '<div style="display:grid;grid-template-columns:20px 1fr auto;align-items:center;gap:8px;padding:5px 2px;' +
                (i < timeline.length - 1 ? 'border-bottom:1px solid var(--border)' : '') + '">' +
                '<span style="font-size:13px;line-height:1">' + (e.icon || '•') + '</span>' +
                '<span style="font-size:12px;color:var(--text-main);font-weight:' + (isEdge ? '700' : '500') + '">' + e.name + '</span>' +
                '<span style="font-size:12px;font-weight:700;white-space:nowrap;color:' + (isEdge ? '#f59e0b' : '#e2b96a') + '">' + timeStr + '</span>' +
                '</div>';
        }).join('');
    }

    var activitiesHtml = s.activities
        ? '<div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--border);font-size:11px;color:var(--text-sub);font-style:italic">🎨 ' + escapeHTML(s.activities) + '</div>'
        : '';

    viewEl.innerHTML = finalHtml || '<span style="color:var(--text-sub);font-style:italic">No schedule set.</span>';
    if (activitiesHtml) viewEl.innerHTML += activitiesHtml;
}

function toggleGpMemoryLog() {
    const box = document.getElementById('gp-memory-log-text');
    const chevron = document.getElementById('gp-memory-log-chevron');
    if (!box) return;
    const isHidden = box.style.display === 'none';
    box.style.display = isHidden ? 'block' : 'none';
    if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
}

function renderGpMemoryLog(bot) {
    const textEl = document.getElementById('gp-memory-log-text');
    if (!textEl) return;
    if (bot && bot.memorySummary && bot.memorySummary.length > 50) {
        textEl.innerHTML = '';
        bot.memorySummary.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0).forEach(line => {
            const p = document.createElement('div');
            p.style.cssText = 'margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid var(--border)';
            p.textContent = line;
            textEl.appendChild(p);
        });
    } else {
        textEl.innerHTML = '<span style="font-style:italic;color:var(--text-sub)">No memory yet - builds after a few exchanges. Use Refresh to generate now.</span>';
    }
}

function refreshGpMemoryLog() {
    if (!_curGroupProfileBotId) return;
    const bot = bots.find(b => b.id === _curGroupProfileBotId);
    if (!bot) return;
    const grp = groups.find(g => g.id === curGroupId);
    const btn = document.querySelector('#gp-memory-log-section button');
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }
    // Force re-generate
    bot.lastSummaryAt = 0;
    bot.lastGrpSummaryAt = 0;
    bot.lastSummaryCutoff = 0;
    // Use group history if available (more relevant than solo history)
    const useGrp = grp && (grp.history || []).filter(m => m.speakerId === bot.id).length >= 2;
    const task = useGrp
        ? autoUpdateBotMemoryFromGroup(bot, grp)
        : autoUpdateMemory(bot);
    task.then(() => {
        renderGpMemoryLog(bot);
        if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh'; btn.disabled = false; }
    }).catch(() => {
        if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh'; btn.disabled = false; }
    });
}


async function autoUpdateBotMemoryFromGroup(bot, grp) {
    if (!bot || !grp) return;
    const keys = getGroqKeys();
    if (!keys.length) return;

    // Build this bot's conversation slice from group history
    const allGrp = grp.history || [];
    // Keep only messages where this bot spoke or the user spoke (give AI full context)
    const botMsgs = allGrp.filter(m =>
        m.role === 'user' || m.speakerId === bot.id
    );
    if (botMsgs.length < 4) return;

    const totalAssistant = botMsgs.filter(m => m.role === 'assistant').length;
    if (totalAssistant < 2) return;

    const lastSummaryAt = bot.lastGrpSummaryAt || 0;
    if (totalAssistant - lastSummaryAt < 2) return;

    const members = (grp.memberIds || []).map(id => bots.find(b => b.id === id)).filter(Boolean);
    const memberMap = {};
    members.forEach(m => { memberMap[m.id] = m; });

    const histText = botMsgs.slice(-30).map(m => {
        const display = (m.content || '').replace(/EMOTION::[\s\S]*/i, '').replace(/<[^>]+>/g, '').trim();
        if (m.role === 'user') return 'User: ' + display;
        return bot.name + ': ' + display;
    }).join('\n').substring(0, 3000);

    const prevSummary = bot.memorySummary
        ? `[Existing summary - update with new events below]\n${bot.memorySummary}\n\n[New events to integrate]\n`
        : '';

    try {
        const data = await fetchGroq({
            model: GROQ_GEN_MODEL,
            messages: [{
                role: 'system',
                content: `You are a story continuity engine. Your only job is to produce a dense factual log of what has happened so far - events, decisions, actions, dialogue facts - so the AI character never contradicts or forgets established story details. No emotional analysis, no opinions, no character study.`
            }, {
                role: 'user',
                content: `${prevSummary}CHARACTER: ${bot.name} (${bot.gender || 'Female'})
Personality: ${(bot.prompt || '').substring(0, 200)}

CONVERSATION (only ${bot.name}'s exchanges with the User):
${histText}

---
Write a factual continuity log for ${bot.name}:

1. WHAT HAPPENED: Every significant action, event, scene change in order. Specific - "she confessed her feelings at the park" not "emotional moment".
2. WHAT WAS ESTABLISHED: Promises, agreements, secrets, names, places, decisions that must stay consistent.
3. CURRENT SITUATION: Relationship stage, last known location, any unresolved plan or conflict.

Factual only. Past tense. No emotional analysis. Max 10 sentences. No headers, no preamble.`
            }],
            max_tokens: 800,
            temperature: 0.3
        });
        const summary = data.choices?.[0]?.message?.content?.trim();
        if (summary && summary.length > 30) {
            bot.memorySummary = summary;
            bot.lastGrpSummaryAt = totalAssistant;
            saveBots();
        }
    } catch (e) { logError('autoUpdateBotMemoryFromGroup', e.message); }
}

async function autoUpdateGrpMemory(grp) {
    if (!grp) return;
    const keys = getGroqKeys();
    if (!keys.length) return;

    const all = grp.history;
    const totalAssistant = all.filter(m => m.role === 'assistant').length;
    if (totalAssistant < 2) return;
    const lastSummaryAt = grp.lastSummaryAt || 0;
    if (totalAssistant - lastSummaryAt < 2) return;

    const members = (grp.memberIds || []).map(id => bots.find(b => b.id === id)).filter(Boolean);
    if (members.length === 0) return;
    const charName = members[0].name;

    let msgsToSummarize;
    if (all.length <= RECENT_MSG_KEEP) {
        msgsToSummarize = all;
    } else {
        const currentCutoff = all.length - RECENT_MSG_KEEP;
        const prevCutoff = grp.lastSummaryCutoff || 0;
        msgsToSummarize = all.slice(prevCutoff, currentCutoff);
        if (msgsToSummarize.length < 2) return;
    }

    const newHistText = msgsToSummarize.map(m => {
        const display = (m.content || '').replace(/EMOTION::[\s\S]*/i, '').replace(/<[^>]+>/g, '').trim();
        if (m.role === 'user') return 'User: ' + display;
        return charName + ': ' + display;
    }).join('\n').substring(0, 2000);

    const prevSummary = grp.memorySummary
        ? `[Trước đó] ${grp.memorySummary}\n\n[Mới]`
        : '';

    try {
        const data = await fetchGroq({
            model: GROQ_GEN_MODEL,
            messages: [{
                role: 'system',
                content: `Tóm tắt ngắn gọn đoạn hội thoại giữa User và ${charName}. Chỉ ghi: 1) Hành động chính xảy ra, 2) Cảm xúc của 2 người. Tối đa 3 câu. Không header, không phân tích.`
            }, {
                role: 'user',
                content: `${prevSummary}User và ${charName} nói chuyện:
${newHistText}

Tóm tắt ngắn (hành động + cảm xúc):`
            }],
            max_tokens: 200,
            temperature: 0.3
        });
        const summary = data.choices?.[0]?.message?.content?.trim();
        if (summary && summary.length > 10) {
            grp.memorySummary = summary;
            grp.lastSummaryAt = totalAssistant;
            grp.lastSummaryCutoff = all.length <= RECENT_MSG_KEEP ? 0 : (all.length - RECENT_MSG_KEEP);
            saveGroups();
            const dd = document.getElementById('grp-member-list-dropdown');
            if (dd && dd.style.display !== 'none') renderGrpStoryLog();
        }
    } catch (e) { logError('autoUpdateGrpMemory', e.message); }
}

const KICK_DESCRIPTIONS = [
    'A gentle flutter against her ribs - there they are.',
    'A soft nudge from inside, unmistakable now.',
    'Two quick taps, then stillness.',
    'A slow roll, like a wave passing through her.',
    'A sudden firm kick - she catches her breath.',
    'Three little bumps, rhythmic and calm.',
    'A long lazy stretch, pressing outward.',
    'A sharp jab under her ribs.',
    'Gentle fluttering, like butterfly wings.',
    'A slow tumble, shifting weight inside.',
    'A firm push against her palm.',
    'Quick rapid-fire taps, then nothing.',
    'A deep rolling movement, turning over.',
    'A light hiccup-like pulse, repeating softly.',
    'Sudden strong pressure - then gone.',
];

async function fullSyncDynBio() {
    const bot = bots.find(b => b.id === curId);
    if (!bot || !bot.history || bot.history.length === 0) {
        alert('No chat history to sync from.'); return;
    }
    const keys = getGroqKeys();
    if (!keys.length) { alert('Groq API key required.'); return; }

    const btn = document.getElementById('dynbio-full-btn');
    const statusEl = document.getElementById('dynbio-sync-status');
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...'; btn.disabled = true; }
    if (statusEl) statusEl.textContent = '🔍 Analyzing...';

    try {
        const vDay = getVirtualDay(bot);
        const startDay = bot.ageStartDay !== undefined ? bot.ageStartDay : 0;
        const yearsElapsed = Math.floor(Math.max(0, vDay - startDay) / 365);
        const baseAge = parseInt(bot.age) || 0;
        const currentAge = baseAge + yearsElapsed;

        // ── Build smart context: memory summary + recent messages ────────────
        // Instead of dumping 12,000 chars of raw history (slow, imprecise),
        // use the existing memory summary as the story digest, then append
        // only recent messages for events not yet captured in summary.
        const hasSummary = bot.memorySummary && bot.memorySummary.length > 50;

        // Recent messages: last 15 (covers ~500–900 chars, captures latest state)
        const recentMsgs = bot.history.slice(-15).map(m =>
            (m.role === 'user' ? 'User' : bot.name) + ': ' +
            m.content.replace(/EMOTION::[\s\S]*/i, '').replace(/<[^>]+>/g, '').trim().substring(0, 200)
        ).join('\n');

        const storyContext = hasSummary
            ? `Story summary (auto-generated from full history):\n${bot.memorySummary.substring(0, 1200)}\n\nMost recent exchanges:\n${recentMsgs}`
            : `Recent exchanges (last 15 messages):\n${recentMsgs}`;

        // Current known state - model only needs to find what CHANGED
        const curD = bot.dynBio || {};
        const knownState = [
            `Relation: ${curD.relation || bot.relation || 'not set'}`,
            `Appearance: ${curD.appearance || bot.appearance || 'not set'}`,
            `Personality: ${curD.prompt || bot.prompt || 'not set'}`,
            `Background: ${curD.bio || bot.bio || 'not set'}`,
            `Virginity lost: ${curD.virginityLost ? 'yes' : 'no'}`,
        ].join('\n');
        // ────────────────────────────────────────────────────────────────────

        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_FAST_MODEL,   // Fast model is sufficient; context is already pre-digested
                max_tokens: 400,           // Reduced from 800 - delta updates are short
                temperature: 0.1,
                messages: [
                    { role: 'system', content: `You are a character state tracker. You receive the CURRENT known state of a character plus a story context. Return ONLY the fields that have actually CHANGED or need updating based on the story. If nothing changed in a field, omit it entirely. Return ONLY valid JSON.` },
                    {
                        role: 'user', content: `Character: ${bot.name} (${bot.gender}, ~${currentAge} yrs old)

CURRENT KNOWN STATE:
${knownState}

STORY CONTEXT:
${storyContext}

Update only fields that changed. Return JSON with only changed/new fields:
{
  "relation": "<only if relationship evolved - e.g. 'girlfriend', 'wife', 'lovers'>",
  "appearance": "<only if permanent physical change occurred - add to existing description>",
  "prompt": "<only if personality notably developed - append new trait or growth>",
  "bio": "<only if major life event occurred - append to existing background>",
  "virginityLost": <true - only if first sexual intercourse just confirmed>,
  "significantChanges": ["<brief list of what changed>"]
}
Omit any field where nothing changed. Return {} if no changes detected.` }
                ]
            }),
            signal: AbortSignal.timeout(15000)   // Reduced from 30s - faster model + smaller payload,
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No valid JSON returned');
        const analysis = JSON.parse(jsonMatch[0]);

        if (!bot.dynBio) bot.dynBio = {};
        const d = bot.dynBio;

        const _fullRelAI = await detectRelationShiftAI(bot, histText, (d.relation || bot.relation || ''));
        applyRelationEngineUpdate(bot, false, _fullRelAI, (analysis.relation && typeof analysis.relation === 'string') ? analysis.relation : '', histText);
        if (analysis.appearance && typeof analysis.appearance === 'string') d.appearance = analysis.appearance;
        if (analysis.prompt && typeof analysis.prompt === 'string') d.prompt = analysis.prompt;
        if (analysis.bio && typeof analysis.bio === 'string') d.bio = analysis.bio;
        if (analysis.virginityLost === true) {
            d.virginityLost = true;
            const removeVirginTrait = (str) => str ? str.replace(/,?\s*\bVirgin\b\s*,?/g, ',').replace(/^,\s*|,\s*$/g, '').trim() : str;
            bot.prompt = removeVirginTrait(bot.prompt || '');
            if (d.prompt) d.prompt = removeVirginTrait(d.prompt);
        }
        d.lastSyncAt = bot.history.length;
        d.lastFullSyncAt = bot.history.length;

        if (yearsElapsed > 0 && baseAge) {
            if (bot.ageStartDay === undefined) bot.ageStartDay = 0;
        }

        saveBots();
        showBioPopup();

        const changes = (analysis.significantChanges || []).join(', ') || 'bio updated';
        if (statusEl) statusEl.textContent = '✅ Synced: ' + changes.substring(0, 60);
        if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> Full Sync'; btn.disabled = false; }

    } catch (e) {
        if (statusEl) statusEl.textContent = '❌ ' + (e.message || 'Sync failed');
        if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> Full Sync'; btn.disabled = false; }
    }
}

async function quickSyncDynBio(bot) {
    if (!bot || !bot.history || bot.history.length < 2) return;
    const keys = getGroqKeys();
    if (!keys.length) return;


    const assistantCount = bot.history.filter(m => m.role === 'assistant').length;
    const lastQuickSync = bot.dynBio?.lastQuickSyncCount || 0;
    if (assistantCount - lastQuickSync < 3) return;

    try {

        const last3 = bot.history.slice(-3).map(m =>
            (m.role === 'user' ? 'User' : bot.name) + ': ' +
            m.content.replace(/EMOTION::[\s\S]*/i, '').replace(/<[^>]+>/g, '').trim()
        ).join('\n');

        const d = bot.dynBio || {};
        const currentRelation = d.relation || bot.relation || '';
        const currentAppear = d.appearance || bot.appearance || '';
        const currentPrompt = d.prompt || bot.prompt || '';
        const virginityStatus = d.virginityLost ? 'Yes (lost in story)' : 'No (still virgin as far as we know)';

        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: DYNBIO_MODEL,
                max_tokens: 300,
                temperature: 0.1,
                messages: [
                    { role: 'system', content: 'You track character state changes in roleplay. Return ONLY valid JSON with ONLY changed fields. If nothing changed, return {}.' },
                    {
                        role: 'user', content: `Character: ${bot.name}
Current relation: "${currentRelation}"
IMPORTANT RELATION EVOLUTION RULES:
- Relationship changes must be gradual, plausible, and based on clear evidence in the latest messages.
- Do NOT jump abruptly (e.g. Enemy -> Lover in one step) unless explicit strong scene evidence exists.
- Prefer transitional states (e.g. "Rivals with growing respect") when dynamics are shifting.
Current virginity lost: ${virginityStatus}

Last 3 messages:
${last3}

Did these messages change any of these? Return JSON with ONLY changed fields:
{
  "relation": "<new relation if changed, else omit>",
  "virginityLost": <true if sex just happened, else omit>,
  "appearance": "<add permanent change if any, else omit>",
  "prompt": "<add personality note if major development, else omit>"
}
Return {} if nothing significant changed.` }
                ]
            }),
            signal: AbortSignal.timeout(10000),
        });

        const data = await res.json();
        if (data.error) return;
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return;
        const delta = JSON.parse(jsonMatch[0]);


        if (!bot.dynBio) bot.dynBio = {};
        const bd = bot.dynBio;
        const _quickRelAI = await detectRelationShiftAI(bot, last3, (bd.relation || bot.relation || ''));
        applyRelationEngineUpdate(bot, false, _quickRelAI, (delta.relation && typeof delta.relation === 'string') ? delta.relation : '', last3);
        if (delta.virginityLost === true) {
            bd.virginityLost = true;

            const removeVirgin = (str) => str ? str.replace(/,?\s*\bVirgin\b\s*,?/g, ',').replace(/^,\s*|,\s*$/g, '').trim() : str;
            bot.prompt = removeVirgin(bot.prompt || '');
            if (bd.prompt) bd.prompt = removeVirgin(bd.prompt);
        }

        // prompt field in dynBio not updated - traits+personality are fixed
        // if (delta.prompt && typeof delta.prompt === 'string') { ... }
        bd.lastSyncAt = bot.history.length;
        bd.lastQuickSyncCount = assistantCount;

        saveBots();


        const bioModal = document.getElementById('bio-modal');
        if (bioModal && bioModal.style.display === 'flex') {
            showBioPopup();
        }

    } catch (e) { }
}

function refreshBioPanelIfOpen(bot) {
    const bioModal = document.getElementById('bio-modal');
    if (bioModal && bioModal.style.display === 'flex') {
        renderReproHealth(bot);
        renderKickCounterUI(bot);
    }
}

function openGroupCreateScreen() {
    openScreen('sc-group-create');
    const pickList = document.getElementById('member-pick-list');
    pickList.innerHTML = '';

    document.getElementById('grp-rel-section').style.display = 'none';
    document.getElementById('grp-rel-cards').innerHTML = '';
    document.getElementById('grp-relation-input').value = '';

    const personaSel = document.getElementById('grp-create-persona-select');
    if (personaSel) {
        personaSel.innerHTML = '<option value="">- No Persona -</option>';
        (personas || []).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name + (p.gender ? ' (' + p.gender + ')' : '');
            personaSel.appendChild(opt);
        });
    }
    if (!bots.length) {
        pickList.innerHTML = '<div style="text-align:center;color:var(--text-sub);padding:20px">No characters yet. Create a character first.</div>';
        return;
    }
    bots.forEach(bot => {
        const row = document.createElement('div');
        row.className = 'member-pick-row';
        row.dataset.id = bot.id;
        const img = document.createElement('img');
        img.src = bot.avatar;
        img.onerror = () => { img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(bot.name)}&background=random`; };
        const nameDiv = document.createElement('div');
        nameDiv.style.flex = '1';
        nameDiv.innerHTML = `<div style="font-weight:bold">${escapeHTML(bot.name)}</div><div style="font-size:12px;color:var(--text-sub)">${bot.gender || ''}${bot.age ? ' · ' + bot.age + ' y/o' : ''}</div>`;
        const check = document.createElement('div');
        check.className = 'check';
        check.innerHTML = '<i class="fas fa-check" style="font-size:11px;display:none"></i>';
        row.onclick = () => {
            row.classList.toggle('selected');
            check.querySelector('i').style.display = row.classList.contains('selected') ? 'block' : 'none';
            updateRelationshipCards();
        };
        row.appendChild(img); row.appendChild(nameDiv); row.appendChild(check);
        pickList.appendChild(row);
    });
}

// 30 most common relationships in the world
const REL_SOCIAL_TYPES = [
    { value: '', label: 'Select relation...' },
    { value: 'Parent', label: '👨‍👩‍👧 Parent' },
    { value: 'Child', label: '� Child' },
    { value: 'Sibling', label: '👫 Sibling' },
    { value: 'Spouse', label: '💑 Spouse' },
    { value: 'Partner', label: '❤️ Partner' },
    { value: 'Friend', label: '💙 Friend' },
    { value: 'Best Friend', label: '💖 Best Friend' },
    { value: 'Colleague', label: '� Colleague' },
    { value: 'Boss', label: '� Boss' },
    { value: 'Employee', label: '👷 Employee' },
    { value: 'Teacher', label: '🎓 Teacher' },
    { value: 'Student', label: '📚 Student' },
    { value: 'Mentor', label: '🌟 Mentor' },
    { value: 'Mentee', label: '🌱 Mentee' },
    { value: 'Neighbor', label: '🏠 Neighbor' },
    { value: 'Roommate', label: '🏡 Roommate' },
    { value: 'Classmate', label: '🎒 Classmate' },
    { value: 'Teammate', label: '⚽ Teammate' },
    { value: 'Family', label: '👨‍👩‍👧 Family' },
    { value: 'Grandparent', label: '👴 Grandparent' },
    { value: 'Grandchild', label: '👶 Grandchild' },
    { value: 'Aunt/Uncle', label: '👨‍👩‍👧 Aunt/Uncle' },
    { value: 'Cousin', label: '👫 Cousin' },
    { value: 'Niece/Nephew', label: '👶 Niece/Nephew' },
    { value: 'Stranger', label: '👤 Stranger' },
    { value: 'Acquaintance', label: '🤝 Acquaintance' },
    { value: 'Ex-Partner', label: '💔 Ex-Partner' },
    { value: 'Rival', label: '⚔️ Rival' },
    { value: 'Enemy', label: '😈 Enemy' },
];

function updateRelationshipCards() {
    const selected = [...document.querySelectorAll('.member-pick-row.selected')].map(r => r.dataset.id);
    const relSection = document.getElementById('grp-rel-section');
    const relCards = document.getElementById('grp-rel-cards');
    if (selected.length < 2) { relSection.style.display = 'none'; return; }
    relSection.style.display = 'block';


    const pairs = [];
    for (let i = 0; i < selected.length; i++) {
        for (let j = i + 1; j < selected.length; j++) {
            pairs.push([selected[i], selected[j]]);
        }
    }


    const existingVals = {};
    relCards.querySelectorAll('[data-pairid]').forEach(el => {
        existingVals[el.dataset.pairid] = el.value;
    });

    relCards.innerHTML = '';
    pairs.forEach(([idA, idB]) => {
        const botA = bots.find(b => b.id === idA);
        const botB = bots.find(b => b.id === idB);
        if (!botA || !botB) return;
        const pairId = idA + '_' + idB;

        const card = document.createElement('div');
        card.className = 'rel-char-card';


        const hdr = document.createElement('div');
        hdr.className = 'rel-char-hdr';
        const avA = document.createElement('img');
        avA.src = botA.portraitUrl || botA.avatar;
        avA.onerror = () => { avA.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(botA.name)}&background=random`; };
        const arrow = document.createElement('span');
        arrow.style.cssText = 'font-size:18px;color:var(--text-sub);flex-shrink:0';
        arrow.textContent = '↔';
        const avB = document.createElement('img');
        avB.src = botB.portraitUrl || botB.avatar;
        avB.onerror = () => { avB.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(botB.name)}&background=random`; };
        const nameInfo = document.createElement('div');
        nameInfo.style.flex = '1';
        nameInfo.innerHTML = `<div class="rel-char-name">${escapeHTML(botA.name)} & ${escapeHTML(botB.name)}</div><div class="rel-char-sub">Their relationship with each other</div>`;
        hdr.appendChild(avA); hdr.appendChild(arrow); hdr.appendChild(avB); hdr.appendChild(nameInfo);
        card.appendChild(hdr);

        // Social Type dropdown only
        const typeRow = document.createElement('div');
        typeRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin:8px 0;';
        const typeLabel = document.createElement('label');
        typeLabel.textContent = 'Social Relation:';
        typeLabel.style.cssText = 'font-size:12px;color:var(--text-sub);white-space:nowrap;';
        const typeSelect = document.createElement('select');
        typeSelect.className = 'rel-type-select';
        typeSelect.dataset.pairid = pairId;
        typeSelect.dataset.memberA = idA;
        typeSelect.dataset.memberB = idB;
        typeSelect.style.cssText = 'flex:1;padding:6px 10px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text-main);font-size:12px;cursor:pointer;';
        REL_SOCIAL_TYPES.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.value;
            opt.textContent = t.label;
            opt.style.cssText = 'background:var(--card-bg);color:var(--text-main);';
            typeSelect.appendChild(opt);
        });
        typeRow.appendChild(typeLabel);
        typeRow.appendChild(typeSelect);
        card.appendChild(typeRow);

        relCards.appendChild(card);
    });
}

// Deterministic relationship assignment based on age, gender, and randomization
function generateAllRelationshipsAI() {
    const selected = [...document.querySelectorAll('.member-pick-row.selected')].map(r => r.dataset.id);
    if (selected.length < 2) {
        showToast('Select at least 2 characters first', '#300', '#f87171');
        return;
    }

    const btn = document.getElementById('ai-generate-all-rels');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assigning...';
    }

    // Build character list with ages and genders
    const characters = selected.map(id => {
        const bot = bots.find(b => b.id === id);
        if (!bot) return null;
        const age = parseInt(bot.age) || 25;
        const gender = (bot.gender || '').toLowerCase();
        const isMale = gender.includes('male') || gender === 'm';
        const isFemale = gender.includes('female') || gender === 'f' || gender.includes('woman');
        return { id: bot.id, name: bot.name, age: age, gender: gender, isMale: isMale, isFemale: isFemale };
    }).filter(Boolean);

    // Generate all pairs
    const pairs = [];
    for (let i = 0; i < characters.length; i++) {
        for (let j = i + 1; j < characters.length; j++) {
            const charA = characters[i];
            const charB = characters[j];
            const sameGender = (charA.isMale && charB.isMale) || (charA.isFemale && charB.isFemale);
            const oppositeGender = (charA.isMale && charB.isFemale) || (charA.isFemale && charB.isMale);
            pairs.push({
                idA: charA.id,
                idB: charB.id,
                nameA: charA.name,
                nameB: charB.name,
                ageA: charA.age,
                ageB: charB.age,
                genderA: charA.gender,
                genderB: charB.gender,
                sameGender: sameGender,
                oppositeGender: oppositeGender
            });
        }
    }

    // Assign relationships based on age, gender, and randomization
    let filledCount = 0;
    pairs.forEach(pair => {
        const ageDiff = Math.abs(pair.ageA - pair.ageB);
        const avgAge = (pair.ageA + pair.ageB) / 2;
        const minAge = Math.min(pair.ageA, pair.ageB);
        const maxAge = Math.max(pair.ageA, pair.ageB);

        // Seed random with character IDs for consistency
        const seed = (pair.idA + pair.idB).split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const random = ((seed * 9301 + 49297) % 233280) / 233280;

        let relationship = '';

        // Helper to get relationship based on gender compatibility
        const getRomanticOption = (allowRomantic) => {
            if (!allowRomantic || pair.sameGender) {
                // Non-romantic options for same-gender pairs
                return random > 0.7 ? 'Best Friend' : (random > 0.4 ? 'Friend' : 'Roommate');
            } else {
                // Opposite gender: mix of romantic and platonic
                if (avgAge < 18) {
                    const opts = ['Friend', 'Best Friend', 'Crush', 'Classmate'];
                    return opts[Math.floor(random * opts.length)];
                } else if (avgAge < 30) {
                    const opts = ['Friend', 'Best Friend', 'Partner', 'Roommate', 'Dating'];
                    return opts[Math.floor(random * opts.length)];
                } else {
                    const opts = ['Friend', 'Partner', 'Spouse', 'Roommate', 'Neighbor'];
                    return opts[Math.floor(random * opts.length)];
                }
            }
        };

        // Age-based relationship logic with gender awareness
        if (ageDiff > 25) {
            // Large age gap: family or mentorship (never romantic)
            if (minAge < 18 && maxAge > 40) {
                const familyOpts = ['Parent', 'Grandparent', 'Aunt/Uncle', 'Teacher', 'Mentor'];
                relationship = familyOpts[Math.floor(random * familyOpts.length)];
            } else if (minAge < 25 && maxAge > 50) {
                const opts = ['Parent', 'Aunt/Uncle', 'Teacher', 'Mentor', 'Boss'];
                relationship = opts[Math.floor(random * opts.length)];
            } else {
                relationship = random > 0.5 ? 'Mentor' : 'Teacher';
            }
        } else if (ageDiff > 15) {
            // Moderate age gap: mostly non-romantic
            if (minAge < 20 && maxAge > 35) {
                const opts = ['Parent', 'Aunt/Uncle', 'Teacher', 'Boss'];
                relationship = opts[Math.floor(random * opts.length)];
            } else {
                relationship = random > 0.6 ? 'Boss' : (random > 0.3 ? 'Teacher' : 'Colleague');
            }
        } else if (ageDiff > 5) {
            // Small age gap: could be siblings or friends
            if (avgAge < 18) {
                const opts = ['Sibling', 'Cousin', 'Classmate', 'Teammate', 'Friend'];
                relationship = opts[Math.floor(random * opts.length)];
            } else if (avgAge < 30) {
                relationship = getRomanticOption(false); // Small age gap, mostly platonic
            } else {
                relationship = random > 0.5 ? 'Colleague' : 'Friend';
            }
        } else {
            // Very close in age: romantic options possible for opposite genders
            if (avgAge < 16) {
                const opts = ['Friend', 'Best Friend', 'Classmate', 'Teammate', 'Sibling', 'Cousin'];
                relationship = opts[Math.floor(random * opts.length)];
            } else if (avgAge < 25) {
                relationship = getRomanticOption(true);
            } else if (avgAge < 40) {
                relationship = getRomanticOption(true);
            } else {
                relationship = getRomanticOption(true);
            }
        }

        // Fill dropdown
        const pairId = `${pair.idA}_${pair.idB}`;
        const select = document.querySelector(`.rel-type-select[data-pairid="${pairId}"]`);
        if (select && relationship) {
            select.value = relationship;
            filledCount++;
        }
    });

    if (btn) {
        btn.style.background = '#22c55e';
        btn.style.borderColor = '#22c55e';
        btn.innerHTML = '✅ Assigned!';
        setTimeout(() => {
            btn.style.background = '#8b5cf6';
            btn.style.borderColor = '#8b5cf6';
            btn.innerHTML = '✨ Auto-Assign';
        }, 2000);
        btn.disabled = false;
    }
}

async function generateWorldRooms() {
    const env = (document.getElementById('grp-world-input')?.value || '').trim();
    const era = (document.getElementById('grp-world-era')?.value || '').trim();
    if (!env) return alert('Please enter an environment first (e.g. Ship, Forest, Home...)');

    const btn = document.getElementById('grp-world-gen-btn');
    const status = document.getElementById('grp-world-gen-status');
    const preview = document.getElementById('grp-world-preview');
    const roomsDiv = document.getElementById('grp-world-rooms-preview');
    const roomsJson = document.getElementById('grp-world-rooms-json');
    btn.disabled = true;

    const setting = env + (era ? ' - ' + era : '');

    // ── Step 1: groq/compound → generate room list ──────────────────────────
    if (status) { status.style.display = 'block'; status.textContent = '✨ Generating locations...'; }

    const ROOM_ICONS = {
        bedroom: '🛏', bathroom: '🚿', kitchen: '🍳', living: '📺', dining: '🪑',
        study: '📚', garden: '🌿', garage: '🔧', deck: '⛵', bridge: '🎛️',
        cabin: '🛖', hold: '⚓', forest: '🌲', cave: '🪨', camp: '🔥',
        market: '🛒', tavern: '🍺', throne: '👑', dungeon: '⛓️', courtyard: '🏰',
        lab: '🔬', server: '💻', hangar: '🚀', med: '🏥', bar: '🍸',
        pool: '🏊', gym: '💪', roof: '🏙️', basement: '🪜', attic: '📦',
        default: '📍'
    };

    try {
        const key = getNextGroqKey();
        if (!key) throw new Error('No API key');

        const roomRes = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'groq/compound',
                max_tokens: 800,
                temperature: 0.5,
                messages: [{
                    role: 'system',
                    content: 'You are a world-building assistant. Return ONLY valid JSON. No markdown, no explanation.'
                }, {
                    role: 'user',
                    content: `Generate a list of 6-13 distinct locations/rooms that would realistically exist in this environment: "${setting}".

Rules:
- Tailor locations specifically to the environment (e.g. ship → bridge, deck, cabin, hold; forest → camp, cave, stream; home → bedroom, kitchen, living room)
- Each location needs a short id (snake_case), a display name, and a 1-sentence description
- Include 1 "outside" or equivalent open area
- Do NOT include generic locations that don't fit (e.g. no "kitchen" on a forest expedition unless there's a camp)

Return JSON array:
[{"id":"location_id","name":"Display Name","desc":"One sentence description","icon":"single emoji"}]`
                }]
            }),
            signal: AbortSignal.timeout(30000)
        });

        const roomData = await roomRes.json();
        if (roomData.error) throw new Error(roomData.error.message);
        let rawRooms = (roomData.choices?.[0]?.message?.content || '').trim().replace(/\`\`\`json|\`\`\`/g, '').trim();
        const roomMatch = rawRooms.match(/\[[\s\S]*\]/);
        if (!roomMatch) throw new Error('No room array in response');
        const rooms = JSON.parse(roomMatch[0]);

        // Store and display rooms
        const processedRooms = rooms.map(r => ({
            id: r.id,
            name: r.name,
            icon: r.icon || '📍',
            desc: r.desc || '',
            outside: r.id === 'outside' || (r.name || '').toLowerCase().includes('outside')
        }));

        roomsJson.value = JSON.stringify(processedRooms);
        roomsDiv.style.display = 'block';
        roomsDiv.innerHTML = '<div style="font-weight:bold;margin-bottom:6px;color:var(--text-sub);font-size:10px;text-transform:uppercase;letter-spacing:0.5px">Generated Locations</div>' +
            processedRooms.map(r => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)"><span>${r.icon}</span><span style="font-weight:600;font-size:12px">${r.name}</span><span style="color:var(--text-sub);font-size:11px;flex:1">${r.desc}</span></div>`).join('');

        if (status) status.textContent = '✅ Locations ready!';

    } catch (e) {
        logError('generateWorldRooms', e.message);
        if (status) status.textContent = '⚠️ Failed: ' + e.message;
    }
    btn.disabled = false;
}

async function generateWorldBackground(btn) {
    const setting = (document.getElementById('grp-world-input')?.value.trim() || '');
    if (!setting) return alert('Please enter an environment first!');
    
    const status = document.getElementById('grp-world-gen-status');
    const preview = document.getElementById('grp-world-preview');
    
    if (btn) btn.disabled = true;
    if (status) {
        status.style.display = 'block';
        status.textContent = '✨ Generating background...';
    }
    
    try {
        const bgPrompt = `masterpiece, best quality, stunning wide establishing shot, ${setting} environment, cinematic composition, dramatic lighting, highly detailed, immersive atmosphere, no characters, no people, no text, no watermark, 16:9 landscape`;
        const blob = await polliFetch(bgPrompt, Math.floor(Math.random() * 999999), 1280, 720, 'zimage');
        const b64 = await blobToBase64(blob);
        preview.src = b64;
        preview.style.display = 'block';
        document.getElementById('grp-world-bgurl').value = b64;
        if (status) status.textContent = '✅ Background ready!';
    } catch (e) {
        logError('generateWorldBackground', e.message);
        if (status) status.textContent = '⚠️ Failed: ' + e.message;
    }
    if (btn) btn.disabled = false;
}

function saveGroup() {
    const name = document.getElementById('grp-name-input').value.trim();
    if (!name) return alert('Please enter a group name!');
    const selected = [...document.querySelectorAll('.member-pick-row.selected')].map(r => r.dataset.id);
    if (selected.length < 2) return alert('Please select at least 2 members!');
    const copySolo = document.getElementById('grp-copy-solo')?.checked !== false;
    const memberRelation = (document.getElementById('grp-relation-input')?.value || '').trim();
    const grpCreatePersonaId = document.getElementById('grp-create-persona-select')?.value || '';
    const worldEnv = (document.getElementById('grp-world-input')?.value.trim() || '');
    const worldEra = (document.getElementById('grp-world-era')?.value.trim() || '');
    const worldRoomsJson = document.getElementById('grp-world-rooms-json')?.value || '';
    const worldBgUrl = document.getElementById('grp-world-bgurl')?.value || '';
    // worldType: if env is "home" or empty → home, otherwise custom
    const _envLower = worldEnv.toLowerCase();
    const worldType = (!worldEnv || _envLower === 'home' || _envLower === 'house') ? 'home' : 'custom';
    const worldSetting = worldEnv + (worldEra ? ' - ' + worldEra : '');
    let worldRooms = null;
    try { if (worldRoomsJson) worldRooms = JSON.parse(worldRoomsJson); } catch (e) { }

    const characterRelations = {};
    // Save social type only
    document.querySelectorAll('.rel-type-select[data-pairid]').forEach(el => {
        const socialType = el.value;
        if (socialType) {
            characterRelations[el.dataset.memberA + '_' + el.dataset.memberB] = socialType;
        }
    });
    const grp = { id: Date.now().toString(), name, memberIds: selected, history: [], memberRelation, characterRelations, personaId: grpCreatePersonaId, personaLocked: !!grpCreatePersonaId, worldType, worldSetting, worldEra, bgUrl: worldBgUrl || '', worldRooms: worldRooms || null };
    // Apply AI-generated rooms if available
    if (worldRooms && Array.isArray(worldRooms)) {
        grp.rooms = worldRooms;
    }
    // Give brand-new bots (still on day 0) a random starting day so the group
    // begins in a varied season/date instead of always January day 1.
    const _grpStartDay = Math.floor(Math.random() * 365);
    const _grpStartMins = _grpStartDay * 1440 + 9 * 60; // 9:00 AM on the random day
    let _anyBotUpdated = false;
    selected.forEach(id => {
        const _mb = bots.find(b => b.id === id);
        if (_mb && getVirtualDay(_mb) === 0) {
            _mb.virtualMinutes = _grpStartMins;
            _mb.virtualDay = _grpStartDay;
            _anyBotUpdated = true;
        }
    });
    if (_anyBotUpdated) saveBots();
    groups.unshift(grp);
    
    // If checked, copy solo dynBio to group as initial state
    if (copySolo) {
        selected.forEach(id => {
            grpCopySoloToGroupInitial(grp.id, id);
        });
    }
    
    saveGroups();
    document.getElementById('grp-name-input').value = '';
    const relInput = document.getElementById('grp-relation-input');
    if (relInput) relInput.value = '';
    document.getElementById('grp-rel-cards').innerHTML = '';
    document.getElementById('grp-rel-section').style.display = 'none';

    const wi = document.getElementById('grp-world-input'); if (wi) wi.value = '';
    const we = document.getElementById('grp-world-era'); if (we) we.value = '';
    const wp = document.getElementById('grp-world-preview'); if (wp) { wp.src = ''; wp.style.display = 'none'; }
    const ws = document.getElementById('grp-world-gen-status'); if (ws) ws.style.display = 'none';
    const wr = document.getElementById('grp-world-rooms-preview'); if (wr) { wr.innerHTML = ''; wr.style.display = 'none'; }
    const wrj = document.getElementById('grp-world-rooms-json'); if (wrj) wrj.value = '';
    document.getElementById('grp-world-bgurl').value = '';
    const copySoloCb = document.getElementById('grp-copy-solo');
    if (copySoloCb) copySoloCb.checked = true; // Reset to default
    renderBotList();
    closeScreen('sc-group-create');
}

async function rollGroupName(btn) {
    const selected = [...document.querySelectorAll('.member-pick-row.selected')].map(r => r.dataset.id);
    const members = selected.map(id => bots.find(b => b.id === id)).filter(Boolean);
    if (!members.length) { alert('Select at least one member first!'); return; }
    const k1 = getNextGroqKey();
    if (!k1) { alert(t('needKey')); return; }
    diceSpin(btn);
    setDiceLoading(btn, true);
    const memberInfo = members.map(m => `${m.name} (${m.gender}${m.age ? ', ' + m.age : ''}): ${(m.prompt || '').substring(0, 50)}`).join('\n');
    try {
        const data = await fetchGroq({
            model: GROQ_THINK_MODEL,
            messages: [{
                role: 'user',
                content: `Create a short, creative group chat name (3-5 words) for a roleplay group with these characters:\n${memberInfo}\nReturn ONLY the group name, no explanation, no quotes.`
            }],
            max_tokens: 20,
            temperature: 1.1
        });
        const name = (data.choices?.[0]?.message?.content || '').trim().replace(/["']/g, '');
        document.getElementById('grp-name-input').value = name;
    } catch (e) { logError('rollGroupName failed', e.message); }
    setDiceLoading(btn, false);
}


const GROUP_REL_PRESETS = [
    'Old college friends reuniting after years',
    'Rival siblings forced to work together',
    'Survivors of a shared trauma',
    'Coworkers on a dangerous mission',
    'Family gathering after years apart',
    'Strangers stuck together in an unusual situation',
    'Longtime rivals in a competition',
    'Childhood friends who grew apart',
    'Members of a secret organization',
    'Travel companions on an adventure',
    'Teacher and students',
    'Medical team in an emergency',
    'Military unit in wartime',
    'Space crew on a long mission',
    'Neighbors in a small town',
    'Members of a band or musical group',
    'Sports teammates',
    'Detectives working a case',
    'Cult members',
    'Escaped prisoners'
];

function selectRelPreset() {
    const select = document.getElementById('grp-rel-preset');
    const input = document.getElementById('grp-relation-input');
    if (select && input) {
        input.value = select.value;
    }
}

function randomizeGroupRel() {
    generateAllRelationshipsAI();
}


