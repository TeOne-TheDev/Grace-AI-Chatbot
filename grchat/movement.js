// AI-powered wake-up detection - decides if user's action/words are enough to wake a sleeping bot
async function detectWakeUpAI(txt, botName, wakeTime) {
    if (!getGroqKeys().length) return false;
    const key = getNextGroqKey();
    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_FAST_MODEL,
                max_tokens: 3,
                temperature: 0.0,
                messages: [{ role: 'user', content: `${botName} is currently sleeping. The user just said or did:

"${txt.substring(0, 300)}"

Would this realistically wake ${botName} up? Consider physical actions (shaking, knocking, touching), loud sounds or shouts, saying their name, strong light, urgent calls. Normal conversation or quiet actions should NOT wake them.

Answer only YES or NO:` }]
            }),
            signal: AbortSignal.timeout(4000)
        });
        const data = await res.json();
        return (data.choices?.[0]?.message?.content || '').trim().toUpperCase().startsWith('YES');
    } catch(e) {
        return false;
    }
}

async function callRoomManagerAI(prompt) {
    const key = getNextGroqKey();
    if (!key) return null;
    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_FAST_MODEL,
                max_tokens: 300,
                temperature: 0.0,
                messages: [
                    { role: 'system', content: 'You are a room/location tracker for a roleplay scene. Respond ONLY with valid JSON. No explanation, no markdown, no code block.' },
                    { role: 'user', content: prompt }
                ]
            }),
            signal: AbortSignal.timeout(8000)
        });
        const data = await res.json();
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const mx = raw.match(/\{[\s\S]*\}/);
        if (!mx) { logError('callRoomManagerAI', 'No JSON: ' + raw.substring(0, 120)); return null; }
        return JSON.parse(mx[0]);
    } catch(e) {
        logError('callRoomManagerAI', e.message);
        return null;
    }
}

// ── NEW: single post-exchange movement analyzer ──
// Called ONCE after all bots have replied for a turn.
// Sends the full exchange (user + all bot replies) to AI and applies results.
// ── Movement signal detection ────────────────────────────────────────────────
// Detects EXPLICIT movement intent in user messages OR bot replies.
// Keep broad - false negatives (missed moves) are worse than false positives (extra AI call).
const _MOVE_KEYWORDS = /\b(go to|walk to|move to|head to|lead me|guide me|follow me|come with me|take me|let'?s go|carry .{0,20} to|bring .{0,20} to|escort .{0,20} to|come to|step inside|step into|enter|bedroom|kitchen|bathroom|garden|living room|study|garage|dining|outside|my room|your room|her room|his room|come here|join me|let's move|i'?ll take you|let me take you|go to|go to|lead .{0,10} to|follow me|take .{0,10} to|enter room|go outside|go out|come here|run|go|follow|enter room|bedroom|kitchen)\b/i;

async function analyzeMovementAfterExchange(grp, members, userMsg, botReplies) {
    if (!grp) return;

    // ── INTIMATE SCENE GUARD ──
    // Skip ALL movement analysis during intimate/sexual activity to prevent
    // other bots from teleporting in unexpectedly
    const _exchangeText = [userMsg, ...(botReplies || []).map(r => r.reply || '')].join(' ');
    if (INTIMATE_SCENE_REGEX.test(_exchangeText)) return;
    // Also check recent history for ongoing intimate scene
    const _recentHistory = (grp.history || []).slice(-6).map(m => m.content || '').join(' ');
    if (INTIMATE_SCENE_REGEX.test(_recentHistory)) return;

    // ── CONVERSATION GUARD ──
    // If user is actively talking to bots who replied this turn, block all movement
    // unless there is a CLEAR and EXPLICIT movement intent in the user's message.
    const speakersThisTurn = new Set((botReplies || []).map(r => r.name));
    const userInSameRoom = members.some(m =>
        speakersThisTurn.has(m.name) &&
        (grp.memberRooms[m.id] || getBotBedroomId(m.id)) === grp.userRoom
    );

    const hasMovementIntent = _MOVE_KEYWORDS.test(userMsg);

    // Also check if any BOT REPLY this turn contained movement language
    // (e.g. bot says "Follow me to my room" → that signals movement even if user just said "ok")
    // NOTE: kept strict intentionally - casual phrases like "come in", "join me", "this way" must NOT trigger
    const _BOT_MOVE_SIGNALS = /\b(follow me to|come with me to|let'?s go to|i'?ll take you to|let me take you to|come to my (?:room|bedroom|chamber)|enter room|follow me to)\b/i;
    const botReplyHasMovement = (botReplies || []).some(r => _BOT_MOVE_SIGNALS.test(r.reply || ''));

    // When user is actively conversing in the same room as a bot who just replied,
    // only run movement analysis when the USER's own message has clear movement intent.
    // This prevents bot phrasing alone from teleporting characters mid-conversation.
    if (userInSameRoom && !hasMovementIntent) return;
    if (!hasMovementIntent && !botReplyHasMovement) return;

    // Block movement analysis when there are NO movement keywords in either
    // the user message or bot replies. This prevents the AI from over-interpreting
    // casual messages as physical movement commands.

    initGroupRooms(grp);

    const allRooms = grp.rooms || PRESET_ROOMS;
    const roomList = allRooms.map(r => `${r.id} (${r.name})`).join(', ');
    const userRoom = grp.userRoom || 'living_room';

    // Build current positions table
    const positions = members.map(m => {
        const rid = grp.memberRooms[m.id] || getBotBedroomId(m.id);
        const rObj = allRooms.find(r => r.id === rid);
        const bedroomId = getBotBedroomId(m.id);
        const bedroomName = allRooms.find(r => r.id === bedroomId)?.name || `${m.name}'s Room`;
        return `  • ${m.name}: currently in "${rid}" (${rObj?.name || rid}) | private bedroom: "${bedroomId}" (${bedroomName})`;
    }).join('\n');

    const userRoomObj = allRooms.find(r => r.id === userRoom);
    const userRoomName = userRoomObj?.name || userRoom;

    // Build exchange text
    const exchangeLines = [`User: ${userMsg}`, ...botReplies.map(r => `${r.name}: ${r.reply}`)].join('\n');

    const prompt = `You are tracking character PHYSICAL LOCATIONS in a shared house during a roleplay scene.

CURRENT POSITIONS:
  • User: in "${userRoom}" (${userRoomName})
${positions}

AVAILABLE ROOMS: ${roomList}

EXCHANGE:
${exchangeLines}

TASK: Did anyone PHYSICALLY move to a different room in this exchange?

MOVE = YES (physical relocation happened):
- User says: "go to", "walk to", "take me to", "let's go to [room]", "come with me to [room]", "I'm going to the [room]"
- User physically moves someone: "take her to [room]", "carry him to [room]", "bring [name] to [room]"
- Character says "follow me" / "come with me" / "step inside" / "come in" AND the user accepts or follows (enters the room)
- Scene text describes physical movement: "*walks to the kitchen*", "*leads you to*", "*enters the bedroom*"
- User accepts an invitation to move: character invited user to their room AND user agreed

MOVE = NO (stay in current room):
- Pure conversation, no physical relocation
- Talking about a room ("the kitchen looks nice") without going there
- Character OFFERS to go somewhere but user hasn't accepted yet
- Character says "follow me" but user does NOT accept or respond to it
- Planning future movement ("let's go later", "maybe tomorrow")
- Sexual or intimate activity in current room (they stay where they are)

BEDROOM RESOLUTION (CRITICAL):
- "MY bedroom / my room" spoken by User → "your_bedroom" (user's own room)
- "YOUR bedroom / your room / your chamber" said TO a character → that character's private bedroom id
- "[Name]'s bedroom / [Name]'s room / [Name]'s chamber" → that character's private bedroom id
- "the bedroom" with no possessive → "your_bedroom" (user's room)
- "Enter my chamber / my room" said BY a character → that character's own private bedroom id; BOTH move there

USER MOVEMENT RULES:
- ONLY set userRoom if the USER's own words or actions confirm they moved
- Character saying "follow me" alone is NOT enough - user must accept/follow
- If user says "ok" or "*follows*" after a movement invitation - that counts as acceptance

Return ONLY this JSON:
{
  "moved": true or false,
  "userRoom": "<new_room_id or null if user didn't move>",
  "characterMoves": [
    { "name": "<character first name>", "room": "<new_room_id>" }
  ],
  "reason": "<one sentence explaining what physically happened>"
}`;

    const result = await callRoomManagerAI(prompt);
    if (!result || !result.moved) return;

    // Post-process: align bedroom room IDs when user+character move together
    // e.g. AI says user→your_bedroom but character→bedroom_X (character's private room)
    // These represent two different rooms - only override when context clearly means same destination
    if (result.userRoom && Array.isArray(result.characterMoves) && result.characterMoves.length === 1) {
        const charMove = result.characterMoves[0];
        const uRoom = result.userRoom;
        const cRoom = charMove.room;

        if (uRoom === 'your_bedroom' && cRoom && cRoom.startsWith('bedroom_')) {
            // "guide me to YOUR bedroom" - user should go to the character's private room
            // But only do this if the exchange contained language suggesting going TO the character's room
            const _toCharRoom = /your (room|bedroom|chamber)|her (room|bedroom|chamber)|his (room|bedroom|chamber)/i.test(exchangeLines);
            if (_toCharRoom) result.userRoom = cRoom;
        } else if (cRoom === 'your_bedroom' && uRoom && uRoom.startsWith('bedroom_')) {
            // Character going to user's room - align
            charMove.room = uRoom;
        }
    }

    // If BOTH user AND a character are moving to the same bedroom, make sure the room IDs match
    // (AI sometimes returns your_bedroom for one and bedroom_X for the other when they mean the same place)
    if (result.userRoom && Array.isArray(result.characterMoves) && result.characterMoves.length > 0) {
        const _sameDest = result.characterMoves.filter(m =>
            m.room === result.userRoom ||
            (result.userRoom === 'your_bedroom' && m.room && !m.room.startsWith('bedroom_')) ||
            (result.userRoom && result.userRoom.startsWith('bedroom_') && m.room === 'your_bedroom')
        );
        // If user is in the same intended room as a character but IDs differ, resolve to most specific
        if (_sameDest.length === 0 && result.characterMoves.length === 1) {
            // No alignment found - leave as-is (they may genuinely be going to different rooms)
        }
    }

    // Apply user movement - ONLY if user explicitly expressed movement intent
    if (result.userRoom && result.userRoom !== userRoom) {
        if (!hasMovementIntent) {
            // AI suggested moving the user, but user didn't ask to move - reject silently
            result.userRoom = null;
        } else {
            const room = resolveRoom(allRooms, result.userRoom);
            if (room) {
                grp.userRoom = room.id;
                showRoomToast(`You moved to ${room.icon} ${room.name}`);
                injectRoomChangeSep(room);
                updateBedroomQuickBtn(grp);
            }
        }
    }

    // Apply character movements
    if (Array.isArray(result.characterMoves)) {
        result.characterMoves.forEach(move => {
            if (!move.name || !move.room) return;
            const moveName = move.name.toLowerCase().trim();
            const target = members.find(m => {
                const n = m.name.toLowerCase();
                return n === moveName || n.startsWith(moveName) || n.includes(moveName);
            });
            if (!target) return;
            // FIX: Only move bots that actually spoke this turn - prevents AI from
            // randomly repositioning non-participating bots to wrong rooms
            if (!speakersThisTurn.has(target.name)) return;
            // FIX: Never move a bot to ANOTHER bot's private bedroom
            if (move.room.startsWith('bedroom_') && move.room !== getBotBedroomId(target.id)) return;
            if (getStationaryStatus(target).locked) return;
            // FIX: Respect user manual moves - skip AI movement if bot was manually moved
            // and there hasn't been enough virtual time passed for schedule to take over
            if (grp._manualMoveVirtualTime && grp._manualMoveVirtualTime[target.id]) {
                const manualMoveTime = grp._manualMoveVirtualTime[target.id];
                const currentTime = target.virtualMinutes;
                const timeSinceMove = currentTime - manualMoveTime;
                // If moved less than 30 virtual minutes ago, respect manual placement
                if (timeSinceMove < 30) {
                    return;
                }
                // Clear the manual move timestamp after 30 virtual minutes
                delete grp._manualMoveVirtualTime[target.id];
            }
            const destRoom = resolveRoom(allRooms, move.room);
            if (!destRoom) { logError('analyzeMovement', 'Unknown room id: ' + move.room); return; }
            if (destRoom.id !== grp.memberRooms[target.id]) {
                moveCharToRoom(grp, target.id, destRoom.id, false);
                // Clear schedule cooldown so schedule can correct if AI placed bot wrong
                if (grp._schedMoveCooldown) delete grp._schedMoveCooldown[target.id];
            }
        });
    }
    saveGroups();
    renderGroupMemberDropdown();
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE-BASED MOVEMENT
// Simple rule: move every bot to their scheduled room at the right time.
// Only skip if the user is actively talking to that bot (chatted within last 2 min).
// ─────────────────────────────────────────────────────────────────────────────
function checkGroupScheduleMilestones(grp) {
    initGroupRooms(grp);
    const members = (grp.memberIds || []).map(id => bots.find(b => b.id === id)).filter(Boolean);
    console.log('[Schedule] Checking', members.length, 'members');

    // Sync all bots to the shared group clock
    const _grpRefBot = members[0];
    const _grpRefMins = _grpRefBot ? getVirtualMinutes(_grpRefBot) : null;
    members.forEach(bot => {
        if (_grpRefMins !== null && bot !== _grpRefBot) {
            bot.virtualMinutes = _grpRefMins;
            bot.virtualDay = Math.floor(_grpRefMins / 1440);
        }
        if (bot.scheduleVariants) {
            const freshSched = _pickScheduleVariant(bot, bot.scheduleVariants);
            if (freshSched) {
                if (!bot.schedule) bot.schedule = freshSched;
                else bot.schedule.customActivities = freshSched.customActivities;
            }
        }
    });

    if (!grp._schedMoveCooldown) grp._schedMoveCooldown = {};
    for (const bot of members) {
        if (!bot.schedule) continue;
        if (getStationaryStatus(bot).locked) continue;
        
        // Skip if already has a pending move
        if (grp._pendingSchedMove && grp._pendingSchedMove.botId === bot.id) continue;
        
        // Check cooldown (in virtual minutes)
        const coolUntil = grp._schedMoveCooldown[bot.id] || 0;
        if (bot.virtualMinutes < coolUntil) continue;

        const botRoom = grp.memberRooms[bot.id] || getBotBedroomId(bot.id);
        const tod = getTimeOfDay(bot);

        // Find active schedule slot
        const customs = (bot.schedule.customActivities || []);
        const activeSlot = customs.find(a => {
            const st = timeStrToMinutes(a.start || a.startTime || '');
            const et = timeStrToMinutes(a.end   || a.endTime   || '');
            return st && et && tod >= st && tod < et;
        });

        let targetRoom = null;
        let activityName = '';

        if (activeSlot) {
            activityName = activeSlot.name || '';
            const _storedRoom = activeSlot.room || null;
            const _grpRoomList = grp.rooms || PRESET_ROOMS;
            if (_storedRoom && _grpRoomList.find(r => r.id === _storedRoom)) {
                targetRoom = _storedRoom;
            } else {
                targetRoom = getRoomFromScheduleActivity(activityName.toLowerCase(), grp);
            }
        } else {
            const ctx = getScheduleContext(bot);
            const actTag = ctx.match(/\[ACTIVITY\]:\s*([^\n\[]+)/i);
            activityName = actTag ? actTag[1].trim().toLowerCase() : '';
            const isSleeping = /sleep|drowsy|stirring awake|winding down/i.test(activityName);
            targetRoom = isSleeping ? getBotBedroomId(bot.id) : getRoomFromScheduleActivity(activityName, grp);
        }

        if (!targetRoom && activeSlot) targetRoom = getBotBedroomId(bot.id);
        if (!targetRoom) continue;
        if (botRoom === targetRoom) continue;

        // Validate room exists in this group
        const _allGrpRooms = grp.rooms || PRESET_ROOMS;
        if (!_allGrpRooms.find(r => r.id === targetRoom)) continue;

        // Respect manual moves
        if (grp._manualMoveVirtualTime && grp._manualMoveVirtualTime[bot.id]) {
            const manualMoveTime = grp._manualMoveVirtualTime[bot.id];
            const timeSinceMove = bot.virtualMinutes - manualMoveTime;
            if (timeSinceMove < 30) continue;
            delete grp._manualMoveVirtualTime[bot.id];
        }

        // Instead of moving directly, set a pending move to nudge the user
        console.log('[Schedule] NUDGE for', bot.name, 'to', targetRoom);
        grp._pendingSchedMove = { botId: bot.id, roomId: targetRoom, activityName: activityName };
        break; // One nudge at a time
    }
}

// After user sends a message â€” resolve any pending scheduled room move
async function resolveScheduleMoveFromUserMsg(grp, userMsg) {
    if (!grp._pendingSchedMove) return;
    const { botId, roomId, activityName } = grp._pendingSchedMove;
    const bot = bots.find(b => b.id === botId);
    if (!bot) { grp._pendingSchedMove = null; return; }
    
    // Safety check - is bot already there?
    const currentRoom = grp.memberRooms[bot.id] || getBotBedroomId(bot.id);
    if (currentRoom === roomId) { grp._pendingSchedMove = null; return; }

    const roomObj = getRoomById(grp, roomId);
    const roomName = roomObj ? roomObj.name : roomId;

    const prompt = `Character "${bot.name}" just mentioned it might be time for their scheduled activity: "${activityName}" and that they need to go to the ${roomName}.

The user replied: "${userMsg.substring(0, 300)}"

Does the user's reply allow/encourage the character to go do their activity/leave, or does the user want/suggest they stay and keep talking?
Answer ONLY with one word: "allow" or "block"`;

    try {
        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_FAST_MODEL,
                max_tokens: 5,
                temperature: 0.0,
                messages: [{ role: 'user', content: prompt }]
            }),
            signal: AbortSignal.timeout(5000)
        });
        const data = await res.json();
        const answer = (data.choices?.[0]?.message?.content || '').trim().toLowerCase();
        console.log('[Schedule Resolve]', bot.name, 'answer:', answer);
        if (answer.includes('allow')) {
            moveCharToRoom(grp, botId, roomId, false);
        } else {
            // Blocked â€” cooldown 60 virtual minutes before nudging again
            if (!grp._schedMoveCooldown) grp._schedMoveCooldown = {};
            grp._schedMoveCooldown[botId] = bot.virtualMinutes + 60;
            console.log('[Schedule Blocked]', bot.name, 'cooldown until:', grp._schedMoveCooldown[botId]);
        }
    } catch(e) {
        logError('resolveScheduleMoveFromUserMsg', e.message);
    }
    grp._pendingSchedMove = null;
    saveGroups();
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE SYNC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getRoomFromScheduleActivity(activityStr, grp) {
    if (!activityStr) return null;
    const lower = activityStr.toLowerCase();
    
    // First check if a room is explicitly assigned in the group's room list
    if (grp && grp.rooms) {
        for (const room of grp.rooms) {
            if (room.id && lower.includes(room.id.replace(/_/g, ' '))) {
                return room.id;
            }
        }
    }
    
    // Fallback to ACTIVITY_ROOM_MAP keyword matching
    const ACTIVITY_ROOM_MAP = {
        'sleeping': 'bedroom',
        'getting ready for bed': 'bedroom',
        'morning routine': 'bathroom',
        'eating breakfast': 'kitchen',
        'eating lunch': 'kitchen',
        'eating dinner': 'dining_room',
        'cooking': 'kitchen',
        'reading': 'study',
        'studying': 'study',
        'working out': 'garden',
        'exercising': 'garden',
        'watching tv': 'living_room',
        'relaxing': 'living_room',
        'cleaning': 'living_room',
        'gardening': 'garden',
    };
    
    for (const [key, roomId] of Object.entries(ACTIVITY_ROOM_MAP)) {
        if (lower.includes(key)) return roomId;
    }
    return null;
}

function syncMemberRoomsToSchedule(grp) {
    initGroupRooms(grp);
    const members = (grp.memberIds || []).map(id => bots.find(b => b.id === id)).filter(Boolean);
    let changed = false;
    const gathered = Array.isArray(grp._gatheredBotIds) ? grp._gatheredBotIds : [];
    const lockActive = (grp._gatheringLock || 0) > 0;
    const userRoom = grp.userRoom || 'living_room';

    // Use shared group virtual time - sync all bots to same clock
    const refBot = members[0];
    const grpVirtualMins = refBot ? getVirtualMinutes(refBot) : null;

    members.forEach(bot => {
        if (!bot.schedule) return;
        if (lockActive && gathered.includes(bot.id)) return;
        // ONLY guard: don't move a bot that is actively in conversation (chatted within last 2 min)
        const secsSinceChat = (Date.now() - (bot.lastChatted || 0)) / 1000;
        if (secsSinceChat < 120) return;
        // GUARD: Respect intentional moves for 30 min
        const overrideUntil = grp._schedRoomOverrideUntil?.[bot.id] || 0;
        if (Date.now() < overrideUntil) return;
        // Sync to group time
        if (grpVirtualMins !== null) {
            const prevMinutes = bot.virtualMinutes;
            bot.virtualMinutes = grpVirtualMins;
            bot.virtualDay = Math.floor(grpVirtualMins / 1440);

            // Sync states when time changes (like time advancement)
            const daysPassed = Math.abs(grpVirtualMins - prevMinutes) / 1440;
            if (daysPassed > 0) {
                if (typeof rollRandomStates === 'function') rollRandomStates(bot, daysPassed);
                if (typeof syncSystemStates === 'function') syncSystemStates(bot);
            }
        }
        const tod2 = getTimeOfDay(bot);
        // FIX: Always use today's correct day-of-week activities from scheduleVariants
        if (bot.scheduleVariants) {
            const _fresh = _pickScheduleVariant(bot, bot.scheduleVariants);
            if (_fresh && _fresh.customActivities) bot.schedule.customActivities = _fresh.customActivities;
        }
        const customs2 = (bot.schedule.customActivities || []);
        const activeSlot2 = customs2.find(a => {
            const st = timeStrToMinutes(a.start || a.startTime || '');
            const et = timeStrToMinutes(a.end   || a.endTime   || '');
            return st && et && tod2 >= st && tod2 < et;
        });

        let roomId;
        if (activeSlot2) {
            // Validate stored room exists in this group before using it
            const _syncStoredRoom = activeSlot2.room || null;
            const _syncGrpRooms = grp.rooms || PRESET_ROOMS;
            if (_syncStoredRoom && _syncGrpRooms.find(r => r.id === _syncStoredRoom)) {
                roomId = _syncStoredRoom;
            } else {
                roomId = getRoomFromScheduleActivity((activeSlot2.name || '').toLowerCase(), grp);
            }
        } else {
            const ctx = getScheduleContext(bot);
            const actTag = ctx.match(/\[ACTIVITY\]:\s*([^\n\[]+)/i);
            const activity = actTag ? actTag[1].trim().toLowerCase() : '';
            const isSleeping = /sleep|drowsy|stirring awake|winding down/i.test(activity);
            if (isSleeping) {
                roomId = getBotBedroomId(bot.id);
            } else {
                roomId = getRoomFromScheduleActivity(activity);
            }
        }

        // Validate roomId exists in this group's rooms (may differ from SOLO_ROOMS)
        if (roomId) {
            const _syncRooms = grp.rooms || PRESET_ROOMS;
            if (!_syncRooms.find(r => r.id === roomId)) {
                // Room ID not in group - try common room fallback
                const _fb = _syncRooms.find(r => !r.private && r.id !== 'your_bedroom' && r.id !== 'outside' && !r.id.startsWith('bedroom_'));
                roomId = _fb ? _fb.id : null;
            }
        }
        if (roomId && grp.memberRooms[bot.id] !== roomId) {
            grp.memberRooms[bot.id] = roomId;
            changed = true;
        }
    });
}
