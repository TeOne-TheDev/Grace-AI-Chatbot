// Periodic state sync for group chat bots
function syncGroupBotStates() {
    if (!curGroupId) return;
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;

    const members = grp.memberIds.map(mid => bots.find(b => b.id === mid)).filter(Boolean);
    members.forEach(bot => {
        // Sync system states (postpartum, lactating, etc.)
        if (typeof syncSystemStates === 'function') syncSystemStates(bot);
        // Sync pregnancy states and moods
        if (typeof syncPregnancyStates === 'function') syncPregnancyStates(bot);
        if (typeof syncMoodStates === 'function') syncMoodStates(bot);
    });
}

// Set up periodic state sync for group chat (every 5 minutes)
if (typeof window !== 'undefined' && !window._groupStateSyncInterval) {
    window._groupStateSyncInterval = setInterval(syncGroupBotStates, 5 * 60 * 1000);
}

// Decode Unicode escape sequences to emojis
function decodeUnicode(str) {
    if (!str) return str;

    // First try to detect and fix corrupted UTF-8 (mojibake)
    // Common patterns: ðŸ (which should be emoji), âš (which should be symbols)
    if (/ð|â|ï|¿|½|¼|¾|»|«/.test(str)) {
        try {
            // Convert Latin-1 misinterpreted UTF-8 back to proper UTF-8
            // This handles cases where UTF-8 bytes were read as Latin-1
            const bytes = [];
            for (let i = 0; i < str.length; i++) {
                const code = str.charCodeAt(i);
                if (code < 256) {
                    bytes.push(code);
                }
            }
            // Try to decode as UTF-8
            str = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
        } catch (e) {
            // If that fails, try the original approach
        }
    }

    return str.replace(/\\u([0-9A-Fa-f]{4})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    });
}

function openGroupChat(id) {
    curGroupId = id;
    const grp = groups.find(g => g.id === id);
    if (!grp) return;
    grp.lastChatted = Date.now();

    // Initial state sync for group members
    syncGroupBotStates();

    saveGroups();

    // Strip Always Overdue / Always Multiples from members with Parasite Host trait
    (grp.memberIds || []).forEach(mid => {
        const _mb = bots.find(b => b.id === mid);
        if (_mb) stripParasiteConflictTraits(_mb);
    });
    // Reset group session tokens
    _grpSessionTokens = { prompt: 0, completion: 0 };
    const grpTb = document.getElementById('grp-session-token-badge');
    if (grpTb) grpTb.textContent = '';
    const grpTbRow = document.getElementById('grp-token-menu-row');
    if (grpTbRow) grpTbRow.style.display = 'none';
    window._grpTurnActive = false;
    document.getElementById('grp-c-name').innerText = grp.name;
    const members = grp.memberIds.map(mid => bots.find(b => b.id === mid)).filter(Boolean);
    const grpLocBadge = document.getElementById('grp-location-badge');
    if (grpLocBadge) {
        if (grp._cachedLocation) {
            grpLocBadge.textContent = '\uD83D\uDCCD ' + grp._cachedLocation;
        } else {
            grpLocBadge.textContent = `\uD83D\uDCCD ${members.length} member${members.length !== 1 ? 's' : ''}`;
        }
        grpLocBadge.style.display = 'block';
        if (!grp._cachedLocation && grp.history && grp.history.length >= 4) {
            detectAndUpdateLocation(grp, true);
        }
    }
    updateModelBadge();
    const _grpM = MODEL_LIST.find(m => m.id === getActiveModelId());
    if (_grpM) { const gEl = document.getElementById('grp-c-model'); if (gEl) { gEl.textContent = _grpM.label; gEl.style.color = _grpM.color; } }
    document.getElementById('sc-group-chat').classList.add('active');

    document.getElementById('sc-home').classList.add('off');
    history.pushState({ screen: 'sc-group-chat' }, '', location.pathname + '#sc-group-chat');
    updateGroupTimeBadges(members);
    const grpContainer = document.getElementById('grp-chat-container');
    const bgToUse = grp.bgUrl || '';
    if (bgToUse) {
        grpContainer.style.backgroundImage = `url('${bgToUse}')`;
        grpContainer.style.backgroundSize = 'cover';
        grpContainer.style.backgroundPosition = 'center';
    } else {
        grpContainer.style.backgroundImage = '';
    }
    renderGroupChat();
    const grpLifeToggle = document.getElementById('grp-life-events-toggle');
    if (grpLifeToggle) grpLifeToggle.checked = safeGetItem('grace_life_events') === '1';
    saveGroups();
    // Init rooms for ALL worldTypes (home and custom/AI-gen)
    const isFirstOpen = !grp.memberRooms || Object.keys(grp.memberRooms).length === 0;
    initGroupRooms(grp);
    if (isFirstOpen) syncMemberRoomsToSchedule(grp);
    else renderGroupMemberDropdown();
    if (grp.history.length === 0) triggerGroupGreeting(grp);
    updateBedroomQuickBtn(grp);

    // Schedule check is now triggered only when virtual time changes (in sendGroupMsg or time skip)
    // No continuous setInterval needed
}

function closeGroupChat() {
    const scGrp = document.getElementById('sc-group-chat');
    scGrp.classList.remove('active');

    document.getElementById('sc-home').classList.remove('off');
    // Clear schedule check interval when leaving group chat
    const grp = groups.find(g => g.id === curGroupId);
    if (grp && grp._schedCheckInterval) {
        clearInterval(grp._schedCheckInterval);
        grp._schedCheckInterval = null;
    }
    curGroupId = null;
}

function clearGroupChat() {
    if (!curGroupId) return;
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp || !confirm('Clear all group chat history?\n\n⚠️ All member characters will be reset to their initial state (appearance, measurements, cycle data, etc.)')) return;
    grp.history = [];
    
    // Reset group persona lock so user can repick after clearing chat
    grp.personaLocked = false;
    
    // Restore all member bots to their first data
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    members.forEach(bot => {
        // Reset chat-related state
        bot.memorySummary = null;
        bot.lastSummaryAt = 0;
        bot.lastSummaryCutoff = 0;
        bot.kickData = null;
        bot.virtualDay = 0;
        bot.virtualMinutes = 540;
        bot.ageStartDay = 0;
        bot.dynBio = {};
        bot.currentEmotion = null;
        bot.emotionState = null;
        // Restore first data
        restoreFirstData(bot);
    });
    
    saveGroups();
    saveBots();
    document.getElementById('grp-chat-container').innerHTML = '';
    triggerGroupGreeting(grp);
}



function renderGroupChat() {
    const container = document.getElementById('grp-chat-container');
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    container.innerHTML = '';
    const memberMap = {};
    grp.memberIds.forEach(id => { const b = bots.find(b2 => b2.id === id); if (b) memberMap[id] = b; });
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    updateGroupTimeBadges(members);

    grp.history.forEach(msg => {
        if (msg.role === 'room_sep') {
            const sep = document.createElement('div');
            sep.className = 'room-change-sep';
            sep.innerHTML = `<span class="room-change-sep-label">${escapeHTML(msg.icon || '')} ${escapeHTML(msg.name || '')}</span>`;
            container.appendChild(sep);
            return;
        }
        const row = document.createElement('div');
        row.className = `msg-row ${msg.role === 'user' ? 'usr' : 'bot'}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'msg-content-wrapper';

        let safeContent;
        if (msg.role === 'user') {
            safeContent = formatBubbleContent(msg.content);
        } else {
            safeContent = formatBubbleContent(msg.content);
        }

        if (msg.role === 'assistant' && msg.speakerId) {
            const speaker = memberMap[msg.speakerId];
            if (speaker) {
                // Name tag goes inside wrapper, above bubble (same column)
                const nameTag = document.createElement('div');
                nameTag.className = 'grp-speaker-name';
                nameTag.textContent = speaker.name;
                wrapper.appendChild(nameTag);

                // Avatar wrapper div (same structure as normal chat)
                const avWrap = document.createElement('div');
                avWrap.style.cssText = 'position:relative;display:inline-block;cursor:pointer;flex-shrink:0';
                avWrap.title = 'View profile';
                const av = document.createElement('img');
                av.src = speaker.avatar;
                av.className = 'msg-av';
                av.onerror = () => { av.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.name)}&background=random`; };
                avWrap.appendChild(av);
                avWrap.addEventListener('click', function (e) {
                    e.stopPropagation();
                    _curGroupProfileBotId = speaker.id;
                    showGroupMemberBio(speaker.id);
                });
                row.appendChild(avWrap);
            }
        }

        const bubble = document.createElement('div');
        bubble.className = `bubble ${msg.role === 'user' ? 'usr' : 'bot'}`;
        bubble.innerHTML = safeContent;
        wrapper.appendChild(bubble);

        // Add illust image if stored
        if (msg.role === 'assistant' && msg.grpIllusUrl) {
            const img = document.createElement('img');
            img.src = msg.grpIllusUrl;
            img.style.cssText = 'width:250px;max-width:100%;border-radius:12px;border:1px solid var(--border);margin-top:5px;display:block;cursor:pointer';
            img.onclick = () => openImgZoom(msg.grpIllusUrl);
            wrapper.appendChild(img);
        }

        row.appendChild(wrapper);
        container.appendChild(row);
    });

    // \u2500\u2500 Per-bot thought buttons: add \uD83D\uDCAD to each bot's LAST message \u2500\u2500
    const lastBotIdx = grp.history.map(m => m.role).lastIndexOf('assistant');
    const lastMsgIdxPerBot = {};
    grp.history.forEach((msg, idx) => {
        if (msg.role === 'assistant' && msg.speakerId) lastMsgIdxPerBot[msg.speakerId] = idx;
    });

    const allBotRows = container.querySelectorAll('.msg-row.bot');
    let botRowIdx = 0;
    grp.history.forEach((msg, histIdx) => {
        if (msg.role !== 'assistant') return;
        const row = allBotRows[botRowIdx++];
        if (!row) return;
        const wrapper = row.querySelector('.msg-content-wrapper');
        if (!wrapper) return;
        const isLastForThisBot = lastMsgIdxPerBot[msg.speakerId] === histIdx;
        const isOverallLast = histIdx === lastBotIdx;

        if (!isLastForThisBot) return; // only attach to each bot's last message

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:nowrap;margin-top:6px';

        // \uD83D\uDCAD thought button - always shown on each bot's last message
        const thoughtBtn = document.createElement('button');
        thoughtBtn.className = 'thought-btn';
        thoughtBtn.innerHTML = '💭';
        thoughtBtn.title = 'Inner thoughts';
        const capSpeakerId = msg.speakerId;
        const capHistIdx = histIdx;
        thoughtBtn.onclick = () => toggleInlineThought(thoughtBtn, null, null, capSpeakerId, capHistIdx);
        btnRow.appendChild(thoughtBtn);

        if (isOverallLast) {
            // Extra buttons only on the very last bot message
            if (!msg.grpIllusUrl) {
                const illusBtn = document.createElement('button');
                illusBtn.className = 'illus-btn';
                illusBtn.innerHTML = '<i class="fas fa-camera"></i>';
                illusBtn.title = 'Illustrate Scene';
                illusBtn.onclick = () => illustrateGroupScene();
                btnRow.insertBefore(illusBtn, thoughtBtn);
            }

            const contBtn = document.createElement('button');
            contBtn.className = 'continue-btn';
            contBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            contBtn.title = 'Continue story';
            contBtn.onclick = continueGroupStory;
            btnRow.appendChild(contBtn);

            const rewindBtn = document.createElement('button');
            rewindBtn.className = 'thought-btn';
            rewindBtn.innerHTML = '<i class="fas fa-rotate-left"></i>';
            rewindBtn.title = 'Rewind - remove last exchange';
            rewindBtn.style.cssText = 'color:#f87171;border-color:#f8717155';
            rewindBtn.onclick = () => rewindGroupChat();
            btnRow.appendChild(rewindBtn);
        }

        wrapper.appendChild(btnRow);
    });

    container.scrollTop = container.scrollHeight;
}

// → buildGroupSys + resolveRespondersAI: see grchat/group_system.js

// resolveScheduleMoveFromUserMsg removed - schedule movement is now unconditional.
// Bots always move to their scheduled room; the only guard is active conversation (lastChatted < 2 min).

async function sendGroupMsg() {
    if (!getGroqKeys().length) return;
    if (!curGroupId) return;
    window._grpTurnActive = true;

    const inp = document.getElementById('grp-msg-input');
    const txt = (inp ? inp.value : '').trim();
    if (!txt) return;

    const grp = groups.find(g => g.id === curGroupId);
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    const aiLang = getLang();

    // initGroupRooms for ALL worldTypes
    initGroupRooms(grp);
    grp.lastChatted = Date.now();
    // Schedule milestones: move bots to their scheduled room (unconditional)
    if (grp._pendingSchedMove) {
        await resolveScheduleMoveFromUserMsg(grp, txt);
    }
    checkGroupScheduleMilestones(grp);

    grp.history.push({ role: 'user', content: txt, msgId: Date.now().toString() });
    if (inp) { inp.value = ''; autoResize(inp); }
    renderGroupChat();

    const typingArea = document.getElementById('grp-typing-area');

    const hearingIds = getHearingMemberIds(grp);
    let hearingMembers = members.filter(m => hearingIds.includes(m.id));

    // â”€â”€ SHOUT / BROADCAST DETECTION - AI-powered, language-agnostic â”€â”€
    // Run before hearing check so members can gather before bots reply
    // Shout detection for ALL worldTypes
    {
        // GUARD: Skip shout detection if message contains intimate signals
        // to prevent teleportation during/after intimate confirmations
        // Also checks recent history so ongoing sex scenes are protected even if current msg lacks intimate words
        const _hasIntimateSignal = INTIMATE_SCENE_REGEX.test(txt);

        // Also check last 6 history messages for ongoing intimate scene
        const _recentHistoryText = (grp.history || []).slice(-6).map(m => m.content || '').join(' ');
        const _recentIntimate = INTIMATE_SCENE_REGEX.test(_recentHistoryText);

        if (!_hasIntimateSignal && !_recentIntimate) {
            const _shoutResult = await detectShoutAI(txt);
            if (_shoutResult) {
                const movedNames = [];
                members.forEach(bot => {
                    if (getStationaryStatus(bot).locked) return;
                    // Outside bots can't hear a shout from inside
                    if (grp.memberRooms[bot.id] === 'outside') return;
                    if (grp.memberRooms[bot.id] !== grp.userRoom) {
                        grp.memberRooms[bot.id] = grp.userRoom;
                        movedNames.push(bot.name);
                    }
                });
                if (movedNames.length > 0) {
                    saveGroups();
                    renderGroupMemberDropdown();
                    updateBedroomQuickBtn(grp);
                    const newHearingIds = getHearingMemberIds(grp);
                    hearingMembers = members.filter(m => newHearingIds.includes(m.id));
                    const userRoomObj = getRoomById(grp, grp.userRoom);
                    injectRoomChangeSep(userRoomObj);
                }
            }
        }
    }

    if (hearingMembers.length === 0) {
        typingArea.style.display = 'none';
        const userRoom = getRoomById(grp, grp.userRoom);

        // â”€â”€ Try time skip FIRST (before showing any note) â”€â”€
        // applyGroupTimeSkip handles regex patterns + AI detection and returns true if a skip was applied
        const _skipApplied = await applyGroupTimeSkip(txt, members);
        if (_skipApplied) {
            // Sync rooms after time jump - works for all worldTypes
            syncMemberRoomsToSchedule(grp);
            analyzeMovementAfterExchange(grp, members, txt, []).catch(() => { });
            window._grpTurnActive = false;
            return;
        }

        // No time skip detected - show alone note
        const noteEl = document.createElement('div');
        noteEl.style.cssText = 'text-align:center;padding:6px;color:var(--text-sub);font-size:12px;font-style:italic';
        // Fix grammar: avoid "in the Your Bedroom" when room name starts with a possessive word
        const _roomArticle = /^(your|my|our)\b/i.test(userRoom.name) ? '' : 'the ';
        noteEl.textContent = userRoom.id === 'outside'
            ? `${decodeUnicode(userRoom.icon)} You're outside alone. Nobody's with you right now.`
            : `${decodeUnicode(userRoom.icon)} You're alone in ${_roomArticle}${userRoom.name}. Nobody heard that.`;
        document.getElementById('grp-chat-container').appendChild(noteEl);
        document.getElementById('grp-chat-container').scrollTop = document.getElementById('grp-chat-container').scrollHeight;
        setTimeout(() => noteEl.remove(), 3500);
        analyzeMovementAfterExchange(grp, members, txt, []).catch(e => logError('analyzeMovement(alone)', e.message));
        window._grpTurnActive = false;
        return;
    }

    // â”€â”€ Single AI call: who is addressed + who responds â”€â”€
    let aiRes = await resolveRespondersAI(txt, hearingMembers, grp.history);
    if (!aiRes || (!aiRes.addressed.length && !aiRes.bystanders.length)) {
        // Fallback: pick 1 random
        aiRes = { addressed: [...hearingMembers].sort(() => Math.random() - 0.5).slice(0, 1), bystanders: [] };
    }

    // Tag bystanders
    for (const b of aiRes.addressed) { b._isBystanderThisTurn = false; }
    for (const b of aiRes.bystanders) { b._isBystanderThisTurn = true; }

    let responders = [...aiRes.addressed, ...aiRes.bystanders].slice(0, 3);

    // â”€â”€ Varied bystander reaction styles - natural, brief, true to character â”€â”€
    const _bystanderStyles = [
        (names) => `The user spoke to ${names}, not you - but you're right there and heard every word. React briefly and naturally as yourself: one short physical action + one casual spoken line at most. Don't pretend the message was meant for you. Let ${names} stay the focus.`,
        (names) => `You weren't addressed - ${names} was. You're nearby and caught it. Maybe you glance over, raise an eyebrow, or slip in a quick offhand comment. Keep it to 1â€“2 short sentences. Don't take over the exchange.`,
        (names) => `${names} is the one being talked to. You just overheard from the side. React the way your character naturally would - a little laugh, a teasing line, a supportive nudge, or just a quiet reaction. Max 2 short sentences. Stay in the background.`,
        (names) => `You heard what the user said to ${names} - you weren't included. Chime in only if it feels genuinely natural for your personality: a brief reaction, a whispered aside, or a small gesture. If it doesn't suit you, keep completely silent (write nothing). If you do react, keep it under 2 sentences.`,
        (names) => `The user's message was for ${names}. You're present but not the focus. A brief, in-character reaction is fine - something real, unscripted, that fits who you are. Don't echo or paraphrase what was said. 1â€“2 sentences max, dialogue optional.`,
    ];

    // Collect all bot replies this turn for unified post-exchange movement analysis
    const _turnBotReplies = [];

    // â”€â”€ SLEEP FILTER - check if sleeping bots can be woken up â”€â”€
    // Use getScheduleContext as truth (handles both schedule-based and time-based sleep)
    function _isBotActuallySleeping(bot) {
        // Primary: check schedule context activity
        if (bot.schedule) {
            const ctx = getScheduleContext(bot);
            const actMatch = ctx.match(/RIGHT NOW[:\s]+(?:[^:]+?is\s+)([^\n\.\[\(]+)/i)
                || ctx.match(/RIGHT NOW[:\s]+([^\n\[\(]{5,80})/i);
            if (actMatch) {
                const act = actMatch[1].trim().toLowerCase();
                if (act.includes('sleep') || act.includes('stirring awake') || act.includes('very drowsy')) return true;
            }
        }
        // Fallback: time-based check
        return isBotSleeping(bot);
    }
    const _awakeResponders = [];
    for (const bot of responders) {
        if (_isBotActuallySleeping(bot)) {
            const woken = await detectWakeUpAI(txt, bot.name, bot.schedule?.wake || '07:00');
            if (woken) {
                // Advance time to wake time
                const wakeMin = timeStrToMinutes(bot.schedule?.wake || '07:00');
                bot.virtualMinutes = getVirtualDay(bot) * 1440 + wakeMin;
                bot.virtualDay = Math.floor(bot.virtualMinutes / 1440);
                saveBots();
                _awakeResponders.push(bot);
            } else {
                // Still asleep - generate a brief sleeping reaction from the bot, then stay asleep
                const _sleepSys = `You are ${bot.name}. You are SOUND ASLEEP. You are completely unconscious and unaware of your surroundings.
The user just did or said something near you while you sleep. Write a brief, purely physical reaction - the kind of thing a deeply sleeping person does unconsciously: shifting, murmuring, pulling covers, slight frown, a sleepy sound. You do NOT wake up. You do NOT speak coherently. No dialogue, no awareness, no eye contact. 1-2 short action lines only. Stay asleep.`;
                try {
                    showTypingFor(bot);
                    const _sleepData = await fetchGroqChat([{ role: 'system', content: _sleepSys }, { role: 'user', content: txt }], 60);
                    let _sleepReply = (_sleepData.choices?.[0]?.message?.content || '');
                    extractAndSetEmotion(_sleepReply);
                    _sleepReply = _sleepReply.replace(/^EMOTION::\S+\s*/m, '').trim();
                    _sleepReply = cleanGroupReply(cleanReply(_sleepReply), bot.name);
                    grp.history.push({ role: 'assistant', content: _sleepReply, speakerId: bot.id, msgId: Date.now().toString() });
                    bot.lastChatted = Date.now();
                    grp.lastChatted = Date.now();
                    saveGroups();
                    renderGroupChat();
                } catch (e) {
                    // Fallback: static note
                    const s = bot.schedule;
                    const wakeStr = s?.wake || '07:00';
                    const noteEl = document.createElement('div');
                    noteEl.style.cssText = 'text-align:center;padding:4px 8px;color:var(--text-sub);font-size:11px;font-style:italic;opacity:0.7';
                    noteEl.textContent = `\uD83D\uDCA4 ${bot.name} is asleep. (Wakes at ${wakeStr})`;
                    document.getElementById('grp-chat-container').appendChild(noteEl);
                    document.getElementById('grp-chat-container').scrollTop = document.getElementById('grp-chat-container').scrollHeight;
                }
                typingArea.style.display = 'none';
            }
        } else {
            _awakeResponders.push(bot);
        }
    }
    responders = _awakeResponders;
    if (responders.length === 0) {
        typingArea.style.display = 'none';
        await applyGroupTimeSkip(txt, members);
        window._grpTurnActive = false;
        return;
    }

    for (const bot of responders) {
        showTypingFor(bot);
        const isBystander = !!bot._isBystanderThisTurn;
        // The ones actually addressed
        const _addressedNames = responders.filter(r => !r._isBystanderThisTurn && r.id !== bot.id).map(r => r.name).join(' and ');

        const botAddressNote = !isBystander
            ? ''
            : _bystanderStyles[Math.floor(Math.random() * _bystanderStyles.length)](_addressedNames || "the others");
        const sys = buildGroupSys(bot, hearingMembers, grp, aiLang, botAddressNote);
        const recentHistory = buildRecentHistory(grp, members, bot.id, txt);
        try {
            const data = await fetchGroqChat([{ role: 'system', content: sys }, ...recentHistory], getReplyMaxTokens());
            let reply = data.choices?.[0]?.message?.content || '';
            console.log(`[Chatbot Response - ${bot.name}]`, reply);
            extractAndSetEmotion(reply);
            reply = reply.replace(/^EMOTION::\S+\s*/m, '').trim();
            const _countDlg = (s) => (s.match(/"[^"]{2,}"/g) || []).length;
            if (_countDlg(reply) < 2) {
                try {
                    const _grpPersonaId = grp.personaId || '';
                    const _grpPersona = _grpPersonaId ? personas.find(p => p.id === _grpPersonaId) : null;
                    const _sp = getSelfPronoun(bot, aiLang, _grpPersona);
                    const _personaNote = _grpPersonaId ? getPersonaContext({ personaId: _grpPersonaId }) : '';
                    const _rewriteSys = `You are ${bot.name}. ${_personaNote}\nWrite an in-character response using this exact format:\\n${_sp} *action*. "Spoken line with ${_sp} as subject." ${_sp} *feeling*. "Spoken line with ${_sp} as subject." ${_sp} *action*. "Final line."\\n${getReplyWordTarget()} Min 2 quoted spoken lines. EVERY dialogue line must have a subject - at least 2 must begin with "${_sp}". BAD: "Not happening." GOOD: "${_sp} don't think so." Dialogue must dominate. No name labels.`;
                    const _retryData = await fetchGroqChat([{ role: 'system', content: _rewriteSys }, { role: 'user', content: `Current world state: Continue the scene naturally. Use the context of our existing conversation. Last message was: "${txt.substring(0, 150)}"` }], getReplyMaxTokens());
                    const _retryReply = (_retryData.choices?.[0]?.message?.content || '').replace(/^EMOTION::\S+\s*/m, '').trim();
                    if (_countDlg(_retryReply) >= 2) reply = _retryReply;
                } catch (e2) { }
            }
            reply = cleanGroupReply(cleanReply(reply), bot.name);
            grp.history.push({ role: 'assistant', content: reply, speakerId: bot.id, msgId: Date.now().toString() });
            bot.lastChatted = Date.now();
            grp.lastChatted = Date.now();
            _turnBotReplies.push({ name: bot.name, reply: reply.replace(/\*/g, '').substring(0, 300) });

            // Intercourse detection - no gender/pregnancy gate
            if (true) {
                if (!bot.cycleData) initCycleData(bot);
                const _combinedGrpLen = (txt + ' ' + reply).length;
                const _hasIntimateSignalGrp = /\b(cum(?:s|ming|med)? inside|came inside|cumming inside|finish(?:ed|ing)? inside|release[sd]? inside|ejaculat|creampie|didn't pull out|don't pull out|shot inside|finish inside|release inside)\b/i.test(txt + ' ' + reply);
                if (!bot.cycleData.pregnant && _combinedGrpLen > 80) {
                    const _grpKw = detectIntimacyKeyword(txt, reply);
                    if (_grpKw) {
                        showIntimacyConfirm(bot, () => processIntercourse(bot, _grpKw.protected), _grpKw.protected);
                    } else if (_hasIntimateSignalGrp) {
                        detectIntercourseAI(txt, reply).then(result => {
                            if (result) showIntimacyConfirm(bot, () => processIntercourse(bot, result.protected), result.protected);
                        }).catch(() => { });
                    }
                }


                // â”€â”€ Fix 2a: Monster pregnancy detection (trait: Unbreakable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                if (!bot.cycleData.isMonsterPregnancy) {
                    maybeDetectMonsterPregnancy(bot).catch(() => { });
                }

                const cd = bot.cycleData;

                // â”€â”€ Fix 4: Labor detection AI for group members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                if (cd.pregnant && !cd.laborStarted && !cd.birthVirtualDay) {
                    const pregWeeks = getPregnancyWeek(bot) || 0;
                    const minWeekForLabor = (bot.geneticTraits && bot.geneticTraits.includes('Always Overdue')) ? 43 : 37;
                    if (pregWeeks >= minWeekForLabor) {
                        detectLaborAI(txt + ' ' + reply).then(isLabor => {
                            if (isLabor && !bot.cycleData.laborStarted) {
                                bot.cycleData.laborStarted = true;
                                bot.cycleData.laborVirtualDay = getVirtualDay(bot);
                                bot.cycleData.laborVirtualMinutes = getVirtualMinutes(bot);
                                bot.cycleData.laborStartedRealTime = Date.now();
                                if (!bot.cycleData.laborProgress) bot.cycleData.laborProgress = { stage: 'prelabor', intensity: 1 };
                                addReproEvent(bot, `\uD83D\uDEA8 Labor started in group (Week ${getPregnancyWeek(bot)})`);
                                updateReproductiveStatus(bot);
                                saveBots();
                                renderGroupChat();
                            }
                        }).catch(() => { });
                    }
                }

                // â”€â”€ Fix 2b: Parasite auto-labor check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                if (cd.isParasitePregnancy) {
                    checkParasiteAutoLabor(bot);
                }
            }
            saveGroups();
            renderGroupChat();

            if (bot.cycleData && bot.cycleData.laborStarted) {
                const recentForLabor = grp.history.slice(-6).map(m => {
                    const spk = m.role === 'user' ? 'User' : (members.find(b => b.id === m.speakerId)?.name || 'Bot');
                    return `${spk}: ${m.content}`;
                }).join('\n');
                updateLaborProgressAsync(bot, recentForLabor, true);
            }
        } catch (e) {
            logError('Group sendMsg error (' + bot.name + ')', e.message);
        }
        await new Promise(r => setTimeout(r, 500));
    }



    const alreadySpoke = new Set(responders.map(b => b.id));
    if (responders.length > 0 && hearingMembers.length >= 2) {
        const nonResponders = hearingMembers.filter(m => !alreadySpoke.has(m.id));
        const reactors = nonResponders.filter(() => Math.random() < CHAIN_REACTOR_CHANCE);

        const eligibleChain = nonResponders.filter(m => !reactors.find(r => r.id === m.id));
        const chainResponder = eligibleChain.length > 0 && Math.random() < CHAIN_RESPONDER_CHANCE
            ? eligibleChain[Math.floor(Math.random() * eligibleChain.length)]
            : null;
        const allReactors = [...reactors];
        if (chainResponder) allReactors.push(chainResponder);

        for (const bot of allReactors) {
            await new Promise(r => setTimeout(r, 600));
            showTypingFor(bot);
            const lastBotMsg = grp.history.slice().reverse().find(m => m.role === 'assistant' && m.speakerId !== bot.id);
            const lastSpeaker = lastBotMsg ? memberMap_safe(lastBotMsg.speakerId, hearingMembers) : null;
            const reactionHint = lastSpeaker
                ? `[${lastSpeaker.name} just said something. React naturally to them or to the overall scene - you can address them directly, disagree, agree, joke, or simply respond with a physical action]`
                : `[Continue naturally in the scene]`;

            const sys = buildGroupSys(bot, hearingMembers, grp, aiLang, '');

            const recentHistory = buildRecentHistory(grp, members, bot.id);
            try {
                const data = await fetchGroqChat([{ role: 'system', content: sys }, ...recentHistory, { role: 'user', content: reactionHint }], getReplyMaxTokens());
                let reply = data.choices?.[0]?.message?.content || '';
                console.log(`[Chain Reactor Response - ${bot.name}]`, reply); // Added console logging for chain reactor responses
                extractAndSetEmotion(reply);
                reply = reply.replace(/^EMOTION::\S+\s*/m, '').trim();
                reply = cleanGroupReply(cleanReply(reply), bot.name);
                grp.history.push({ role: 'assistant', content: reply, speakerId: bot.id, msgId: Date.now().toString() });
                bot.lastChatted = Date.now();
                grp.lastChatted = Date.now();
                _turnBotReplies.push({ name: bot.name, reply: reply.replace(/\*/g, '').substring(0, 300) });
                alreadySpoke.add(bot.id);
                saveGroups();
                renderGroupChat();

                advanceGroupChatMinutes(members, 1 + Math.floor(Math.random() * 3));
            } catch (e) { logError('Group reaction error (' + bot.name + ')', e.message); }
        }
    }

    typingArea.style.display = 'none';

    updateGroupMemberStatuses(hearingMembers, grp);

    // â”€â”€ Unified post-exchange movement analysis â”€â”€
    // Run ONCE after all bots have replied, with the full exchange context
    // Movement analysis runs for ALL worldTypes (home and custom/AI-gen)
    if (_turnBotReplies.length > 0) {
        analyzeMovementAfterExchange(grp, members, txt, _turnBotReplies).catch(e => logError('analyzeMovement', e.message));
    }

    if ((grp._gatheringLock || 0) > 0) {
        // Safety: cap stale values (lock should never exceed ~3 turns)
        if (grp._gatheringLock > 5) grp._gatheringLock = 1;
        grp._gatheringLock--;
        if (grp._gatheringLock === 0) grp._gatheredBotIds = [];
    }

    renderGroupMemberDropdown();

    maybeInjectGroupLifeEvent(grp, members);
    autoUpdateGrpMemory(grp);
    // Also update individual bot memories from group history
    members.forEach(bot => {
        autoUpdateBotMemoryFromGroup(bot, grp).catch(e => logError('autoUpdateBotMemFromGrp', e.message));
    });

    const _grpBotReplies = grp.history.filter(m => m.role === 'assistant').length;
    if (!grp._cachedLocation && _grpBotReplies >= 1) {
        detectAndUpdateLocation(grp, true);
    } else if (grp._cachedLocation && _grpBotReplies % 3 === 0) {
        detectAndUpdateLocation(grp, true);
    }



    await applyGroupTimeSkip(txt, members);
    window._grpTurnActive = false;
}


async function illustrateGroupScene() {
    if (!curGroupId) return;
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp || !grp.history.length) return;
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    const container = document.getElementById('grp-chat-container');

    const loadEl = document.createElement('div');
    loadEl.style.cssText = 'text-align:center;padding:10px;color:var(--text-sub);font-size:13px;font-style:italic';
    loadEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Drawing scene...`;
    container.appendChild(loadEl);
    container.scrollTop = container.scrollHeight;

    // â”€â”€ All chatbots currently in same room as user â”€â”€
    initGroupRooms(grp);
    const userRoomId = grp.userRoom || 'living_room';
    const userRoomObj = (grp.rooms || []).find(r => r.id === userRoomId) || { name: 'the room', icon: '\uD83C\uDFE0' };
    const presentMembers = members.filter(m => (grp.memberRooms[m.id] || getBotBedroomId(m.id)) === userRoomId);
    const sceneCast = presentMembers.length > 0 ? presentMembers : members;

    // â”€â”€ Active image model â”€â”€
    const activeImgModel = getImgModel();
    const isQwenImage = activeImgModel === 'qwen-image';

    // â”€â”€ Style tags (only for non-Qwen models) â”€â”€
    const styleCounts = {};
    sceneCast.forEach(m => { const s = m.imgStyle || 'photorealism'; styleCounts[s] = (styleCounts[s] || 0) + 1; });
    const dominantStyle = Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'photorealism';
    const styleShortTags = isQwenImage ? '' : (GRP_STYLE_SHORT_MAP[dominantStyle] || GRP_STYLE_SHORT_MAP['photorealism']);
    const qualityShortTags = isQwenImage ? 'high quality, detailed' : (GRP_QUALITY_SHORT_MAP[dominantStyle] || GRP_QUALITY_SHORT_MAP['photorealism']);

    // â”€â”€ Room â”€â”€
    const roomDesc = (grp.worldType === 'custom' && grp.worldSetting)
        ? grp.worldSetting
        : `${decodeUnicode(userRoomObj.icon)} ${userRoomObj.name}`;

    // â”€â”€ All characters in room: appearance + pregnancy â”€â”€
    const charLines = sceneCast.map(m => {
        const appStr = (m.appearance || 'not specified').substring(0, 300);
        const natHint = [m.country, m.year].filter(Boolean).join(', ');
        const subjDesc = `${m.gender || 'female'}${natHint ? `, ${natHint}` : ''}`;
        let pregNote = '';
        if (m.cycleData && m.cycleData.pregnant && m.cycleData.pregnancyTestTaken) {
            const wks = getPregnancyWeek(m) || 0;
            const fc = (m.cycleData.fetuses || []).length;
            const fcLabel = fc >= 4 ? `, ${fc} babies (HYPERPREGNANCY - belly much larger than normal for this week)` : fc === 3 ? ', triplets' : fc === 2 ? ', twins' : '';
            if (wks <= 13) pregNote = ` | pregnant week ${wks}${fcLabel} - no visible bump yet`;
            else if (wks <= 20) pregNote = ` | pregnant week ${wks}${fcLabel} - small visible bump`;
            else if (wks <= 26) pregNote = ` | pregnant week ${wks}${fcLabel} - clearly rounded belly`;
            else if (wks <= 32) pregNote = ` | pregnant week ${wks}${fcLabel} - large prominent belly`;
            else pregNote = ` | pregnant week ${wks}${fcLabel} - VERY large full-term belly, clothing visibly stretched`;
        }
        return `[${subjDesc}]: ${appStr}${pregNote}`;
    }).join('\n\n');

    const hasPregnant = sceneCast.some(m => m.cycleData && m.cycleData.pregnant && m.cycleData.pregnancyTestTaken);
    const pregRule = hasPregnant ? ' Pregnancy belly size MUST match the week exactly - render it accurately, never hide or reduce it.' : '';

    // â”€â”€ Build prompt using LLaMA 3.1 8B and recent history â”€â”€
    const recentHistoryText = (grp.history || []).slice(-5).map(m => {
        const spk = m.role === 'user' ? 'User' : (members.find(b => b.id === m.speakerId)?.name || 'Bot');
        return `${spk}: ${(m.content || '').replace(/\*/g, '').replace(/EMOTION::.*/g, '').trim()}`;
    }).join('\n');

    const promptContent = `Default character appearances:\n${charLines}\n\nRoom/Setting: ${roomDesc}\n\nRecent messages:\n${recentHistoryText}\n\nWrite an image generation prompt. CRITICAL RULES:\n1. MUST include character appearance details from the descriptions above (hair, skin tone, age, clothing).\n2. Open with nationality/ethnicity first.\n3. Include pregnancy details if present.\n4. Include all characters in the scene.\n5. Use full body or waist-up shot.\n6. Max 80 words. No character names.`;

    let finalPrompt = '';
    const key = getNextGroqKey();
    if (key) {
        try {
            const res = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'system', content: promptContent }], max_tokens: 220 }),
                signal: AbortSignal.timeout(30000),
            });
            const pd = await res.json();
            finalPrompt = pd.choices?.[0]?.message?.content?.trim() || '';
            finalPrompt = finalPrompt.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').replace(/^prompt:?\s*/i, '').replace(/^["']|["']$/g, '').trim();
        } catch (e) { logError('grp illus prompt fail', e.message); }
    }
    if (!finalPrompt) {
        finalPrompt = sceneCast.map(m => (m.appearance || '').substring(0, 150)).join(', ') + `, ${roomDesc}, cinematic lighting`;
    }
    // Structured prompt: style (3-4) + quality (3-4) + AI-generated scene (appearance/state + activity + room)
    finalPrompt = `${styleShortTags}, ${qualityShortTags}, ${finalPrompt}`.trim();

    const imgEl = document.createElement('img');
    imgEl.style.cssText = 'width:100%;max-width:320px;border-radius:14px;border:1px solid var(--border);margin:8px auto;display:block;box-shadow:0 4px 20px rgba(0,0,0,0.4);cursor:pointer';
    imgEl.alt = 'group scene';
    imgEl.onclick = () => { if (imgEl.src) openImgZoom(imgEl.src); };

    loadImageWithFallback(imgEl, finalPrompt, Math.floor(Math.random() * 999999),
        (url) => {
            loadEl.remove();
            container.appendChild(imgEl);
            container.scrollTop = container.scrollHeight;
            const lastBotMsg = grp.history.slice().reverse().find(m => m.role === 'assistant');
            if (lastBotMsg) { lastBotMsg.grpIllusUrl = url; saveGroups(); }
        },
        () => { loadEl.innerHTML = '\u26A0\uFE0F Could not generate image.'; },
        grp.name
    );
}

async function continueGroupStory() {
    if (!curGroupId) return;
    const grp = groups.find(g => g.id === curGroupId);
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    if (!members.length) return;
    const aiLang = getLang();

    const typingArea = document.getElementById('grp-typing-area');


    const hearingIds = getHearingMemberIds(grp);
    const hearingMembers = members.filter(m => hearingIds.includes(m.id));
    const pool = hearingMembers.length > 0 ? hearingMembers : members;

    // Pick a random bot from the pool
    const bot = pool[Math.floor(Math.random() * pool.length)];
    showTypingFor(bot);

    let sys = buildGroupSys(bot, members, grp, aiLang, '');
    const recentHistory = buildRecentHistory(grp, members, bot.id);
    try {
        const data = await fetchGroqChat([{ role: 'system', content: sys }, ...recentHistory, { role: 'user', content: 'Continue the scene naturally. React to the physical environment and those present around you.' }], getReplyMaxTokens());
        let reply = (data.choices?.[0]?.message?.content || '').replace(/^EMOTION::\S+\s*/m, '').trim();
        reply = cleanGroupReply(cleanReply(reply), bot.name);
        grp.history.push({ role: 'assistant', content: reply, speakerId: bot.id, msgId: Date.now().toString() });
        bot.lastChatted = Date.now();
        grp.lastChatted = Date.now();
        const _contReplies = [{ name: bot.name, reply: reply.replace(/\*/g, '').substring(0, 300) }];
        saveGroups();
        renderGroupChat();

        // Chain reactor
        if (pool.length >= 2) {
            const others = pool.filter(m => m.id !== bot.id);
            const reactor = others.find(() => Math.random() < 0.50) || null;
            if (reactor) {
                await new Promise(r => setTimeout(r, 700));
                showTypingFor(reactor);
                const sys2 = buildGroupSys(reactor, members, grp, aiLang, '');
                const hist2 = buildRecentHistory(grp, members, reactor.id);
                try {
                    const data = await fetchGroqChat([{ role: 'system', content: sys2 }, ...hist2, { role: 'user', content: `[${bot.name} just spoke. React to them naturally]` }], getReplyMaxTokens());
                    let reply2 = (data.choices?.[0]?.message?.content || '').replace(/^EMOTION::\S+\s*/m, '').trim();
                    reply2 = cleanGroupReply(cleanReply(reply2), reactor.name);
                    grp.history.push({ role: 'assistant', content: reply2, speakerId: reactor.id, msgId: Date.now().toString() });
                    reactor.lastChatted = Date.now();
                    grp.lastChatted = Date.now();
                    _contReplies.push({ name: reactor.name, reply: reply2.replace(/\*/g, '').substring(0, 300) });
                    saveGroups();
                    renderGroupChat();
                } catch (e) { logError('continueGroupStory reaction error', e.message); }
            }
        }

        // Unified post-exchange movement analysis for continue turn
        // Movement analysis for continue - works for all worldTypes
        analyzeMovementAfterExchange(grp, members, '[scene continues]', _contReplies).catch(e => logError('analyzeMovement', e.message));
    } catch (e) { logError('continueGroupStory error', e.message); typingArea.style.display = 'none'; return; }

    typingArea.style.display = 'none';
}

function handleGroupKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const _now = Date.now(); if (_now - _lastSendTime < _SEND_COOLDOWN_MS) return; _lastSendTime = _now; sendGroupMsg(); }
}

function insertThoughtGroup() {
    const inp = document.getElementById('grp-msg-input');
    if (!inp) return;
    const s = inp.selectionStart, e2 = inp.selectionEnd;
    inp.value = inp.value.substring(0, s) + '()' + inp.value.substring(e2);
    inp.selectionStart = inp.selectionEnd = s + 1;
    inp.focus();
    autoResize(inp);
}

function insertActionStarGroup() {
    const inp = document.getElementById('grp-msg-input');
    const s = inp.selectionStart, e2 = inp.selectionEnd;
    if (s === e2) { inp.value = inp.value.substring(0, s) + '**' + inp.value.substring(e2); inp.selectionStart = inp.selectionEnd = s + 1; }
    else { const sel = inp.value.substring(s, e2); inp.value = inp.value.substring(0, s) + '*' + sel + '*' + inp.value.substring(e2); inp.selectionStart = inp.selectionEnd = e2 + 2; }
    autoResize(inp);
}

function openProfileFromTooltip() {
    if (curGroupId && _curGroupProfileBotId) {
        showGroupMemberBio(_curGroupProfileBotId);
    } else if (curId) {
        showBioPopup();
    }
}
function showGroupMemberBio(botId) {
    try {
        const bot = bots.find(b => b.id === botId);
        if (!bot) { console.warn('showGroupMemberBio: botId=' + botId + ' not found'); return; }
        // Remove the dropdown outside-click listener - bio is taking over the screen
        _removeGrpDDListener();
        _curGroupProfileBotId = botId;
        const grp = groups.find(g => g.id === curGroupId);
        // Group bio is COMPLETELY SEPARATE from solo chat - no fallbacks
        const grpD = bot.grpDynBio || {};

        document.getElementById('gp-name').textContent = bot.name;
        const genBadge = document.getElementById('gp-gen-badge');
        if (genBadge) genBadge.textContent = (bot.gender || 'Unknown') + ' \u00b7 Human';

        document.getElementById('gp-age').textContent = bot.age || '\u2014';
        // Group relation - show social and family (emotional hidden - in development)
        const relations = [];
        const socialRel = grpD.socialRelation || bot.socialRelation;
        const familyRel = grpD.familyRelation || bot.familyRelation;
        if (socialRel) relations.push(`Social: ${socialRel}`);
        if (familyRel) relations.push(`Family: ${familyRel}`);
        document.getElementById('gp-rel').textContent = relations.length ? relations.join(' | ') : (grpD.relation || bot.relation || '\u2014');
        document.getElementById('gp-app').textContent = bot.appearance || '\u2014';
        ['gp-app', 'gp-bio'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.classList.remove('bio-text-expanded'); el.classList.add('bio-text-collapsed'); }
            const hint = el ? el.nextElementSibling : null;
            if (hint && hint.classList.contains('bio-expand-hint')) hint.textContent = 'â–¼ Show more';
        });
        // Group bio only from grpDynBio or static - never from solo
        document.getElementById('gp-bio').textContent = grpD.bio || bot.bio || '\u2014';

        // --- NEW: Populate Group Personality & Add Random Button ---
        const gppersonality = document.getElementById('gp-personality');
        const gppersonalityBox = document.getElementById('gp-personality-box');
        if (gppersonality && gppersonalityBox) {
            gppersonalityBox.style.display = 'block';
            // Group personality only from grpDynBio or static - never from solo
            let pText = grpD.prompt || bot.prompt || '';
            const allTraits = bot.disadvantages || [];

            // Filter genetic traits out of personality text
            if (pText && typeof ALL_TRAITS !== 'undefined') {
                const geneticTraitNames = ALL_TRAITS.filter(t => t.category === 'genetic').map(t => t.name);
                geneticTraitNames.forEach(traitName => {
                    const regex = new RegExp(`\\b${traitName}\\b`, 'gi');
                    pText = pText.replace(regex, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim();
                });
                pText = pText.replace(/\s+/g, ' ');
            }

            // Handle Personality Traits and Chips
            const persTraits = allTraits.filter(t => {
                const traitObj = typeof ALL_TRAITS !== 'undefined' ? ALL_TRAITS.find(x => x.name === t) : null;
                return traitObj && traitObj.category === 'personality';
            });

            if (!pText && persTraits.length === 0 && typeof randomizeBotPersonalityInBio === 'function') {
                gppersonality.innerHTML = `
                    <div style="font-style:italic;color:#888;margin-bottom:6px;">No personality configured.</div>
                    <button id="gp-random-trait-btn" onclick="randomizeBotPersonalityInBio('${bot.id}'); event.stopPropagation();" style="background:#b259ff22;border:1px solid #b259ff55;color:#b259ff;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px">
                        <i class="fas fa-dice"></i> Auto Generate Traits
                    </button>
                `;
            } else {
                let html = '<div style="display:flex;flex-wrap:wrap;gap:5px;padding-top:4px">';
                const uniqueTraits = new Set();
                
                // Add traits from bot.disadvantages
                persTraits.forEach(t => uniqueTraits.add(t));
                
                // Add custom prompt text if any
                if (pText) {
                    const parts = pText.split(',').map(s => s.trim()).filter(Boolean);
                    parts.forEach(part => uniqueTraits.add(part));
                }

                uniqueTraits.forEach(trait => {
                    html += `<span class="personality-chip">${trait}</span>`;
                });

                html += '</div>';
                gppersonality.innerHTML = html || '\u2014';
            }
        }
        // -----------------------------------------------------------

        // --- Render traits as chips ---
        const gpTraitsBox = document.getElementById('gp-traits-box');
        const gpTraitsChips = document.getElementById('gp-traits-chips');
        if (gpTraitsBox && gpTraitsChips) {
            const traits = bot.geneticTraits || [];
            // Filter to only show genetic traits, not personality traits
            const validTraits = traits.filter(t => {
                const traitObj = typeof ALL_TRAITS !== 'undefined' ? ALL_TRAITS.find(tr => tr.name === t) : null;
                return traitObj !== null && traitObj.category === 'genetic';
            });
            if (validTraits.length > 0) {
                gpTraitsBox.style.display = 'block';
                gpTraitsChips.innerHTML = validTraits.map(t => {
                    const traitObj = typeof ALL_TRAITS !== 'undefined' ? ALL_TRAITS.find(tr => tr.name === t) : null;
                    let chipClass = 'trait-chip';
                    if (traitObj) {
                        if (traitObj.mutable !== undefined) {
                            chipClass += traitObj.mutable ? ' mutable' : ' immutable';
                        } else if (traitObj.category === 'genetic') {
                            chipClass += ' immutable';
                        }
                    }
                    return `<span class="${chipClass}">${t}</span>`;
                }).join('');
            } else {
                gpTraitsBox.style.display = 'none';
                gpTraitsChips.innerHTML = '';
            }
        }
        // -----------------------------------------------------------




        const portrait = document.getElementById('gp-portrait');
        const ph = document.getElementById('gp-portrait-ph');
        const grpPortrait = (bot.grpPortraits && grp) ? bot.grpPortraits[grp.id] : null;
        const src = grpPortrait || bot.portraitUrl || '';
        if (src) { portrait.src = src; portrait.style.display = 'block'; ph.style.display = 'none'; }
        else { portrait.style.display = 'none'; ph.style.display = 'flex'; }

        let actionBar = document.getElementById('gp-action-bar');
        if (!actionBar) {
            actionBar = document.createElement('div');
            actionBar.id = 'gp-action-bar';
            actionBar.style.cssText = 'display:flex;gap:8px;padding:8px 14px 4px;flex-shrink:0';
            const bioContent = document.querySelector('#grp-bio-modal .bio-content');
            if (bioContent) bioContent.appendChild(actionBar);
        }
        actionBar.innerHTML =
            '<button onclick="grpSyncMemberBio(\'' + botId + '\')" style="flex:1;background:#1a0b2e;border:1px solid #7c3aed55;color:#a78bfa;border-radius:10px;padding:9px;font-size:12px;font-weight:bold;cursor:pointer"><i class="fas fa-sync-alt"></i> Sync Bio</button>' +
            '<button onclick="grpUpdateMemberPortrait(\'' + botId + '\')" style="flex:1;background:#0a1a30;border:1px solid #0084ff55;color:#60a5fa;border-radius:10px;padding:9px;font-size:12px;font-weight:bold;cursor:pointer"><i class="fas fa-portrait"></i> Portrait</button>';


        const statusEl = document.getElementById('gp-status-badge');
        if (statusEl) {
            if (bot.currentStatus) {
                statusEl.style.display = 'flex';
                statusEl.innerHTML = '<span style="font-size:18px">' + decodeUnicode(bot.currentStatus.icon) + '</span><span style="font-size:12px;font-weight:bold;color:' + bot.currentStatus.color + '">' + bot.currentStatus.label + '</span>';
            } else { statusEl.style.display = 'none'; }
        }


        const emoBox = document.getElementById('gp-emo-box');
        if (emoBox && bot.emotion && bot.emotion.icon) {
            emoBox.style.display = 'block';
            const icon = document.getElementById('gp-emo-icon');
            const label = document.getElementById('gp-emo-label');
            const desc = document.getElementById('gp-emo-text');
            let displayIcon = decodeUnicode(bot.emotion.icon || '');
            // Fallback: if still corrupted, use common emoji mappings
            if (displayIcon && /ð|â|ï|¿|½|¼|¾|»|«/.test(displayIcon)) {
                const emojiMap = {
                    'Happy': '😄', 'Sad': '😢', 'Angry': '😠', 'Afraid': '😨', 'Surprised': '😲',
                    'In Love': '💖', 'Confused': '😕', 'Fine': '😊', 'Excited': '🤩', 'Blushing': '😳',
                    'Shy': '😶', 'Lonely': '🏙️', 'Heartbroken': '💔', 'Crying': '😭', 'Furious': '🤬',
                    'Jealous': '😤', 'Disgusted': '🤢', 'Suspicious': '🤨', 'Smug': '😏', 'Determined': '💪',
                    'Healthy': '💚', 'Strong': '⚡', 'Weak': '😔', 'Exhausted': '😴', 'Ill': '🤒',
                    'Injured': '🤕', 'In Pain': '😣', 'Drunk': '🥴', 'Hungover': '🤕', 'Hungry': '🍽️',
                    'Sleepy': '😴', 'Pregnant': '🤰', 'Overdue': '⏳', 'On Period': '🩸', 'Fat': '🍔',
                    'Slim': '🏃', 'Tied Up': '⛓️', 'Bored': '😒', 'Embarrassed': '😅', 'Guilty': '😔',
                    'Relieved': '😅', 'Hopeful': '✨', 'Naughty': '😈'
                };
                displayIcon = emojiMap[bot.emotion.label] || '😶';
            }
            if (icon) icon.textContent = displayIcon;
            if (label) label.textContent = bot.emotion.label || '';
            if (desc) desc.textContent = bot.emotion.desc || '';
        } else if (emoBox) { emoBox.style.display = 'none'; }


        const reproSection = document.getElementById('gp-repro-section');
        const isFemale = (bot.gender || '').toLowerCase().includes('female') || (bot.gender || '').toLowerCase() === 'f';
        if (reproSection) {
            reproSection.style.display = isFemale ? 'block' : 'none';
            if (isFemale) {
                const grpForRepro = groups.find(g => g.id === curGroupId);
                renderGroupMemberRepro(bot, grpForRepro);
            }
        }


        renderGpSchedule(bot);
        renderGpMemoryLog(bot);
        renderGroupStatesInBio(bot);
        const _gpMemBox = document.getElementById('gp-memory-log-text');
        const _gpMemChev = document.getElementById('gp-memory-log-chevron');
        if (_gpMemBox) { _gpMemBox.style.display = 'none'; }
        if (_gpMemChev) { _gpMemChev.style.transform = 'rotate(0deg)'; }

        history.pushState({ screen: 'sc-group-chat', modal: 'grp-bio' }, '', location.pathname + '#grp-bio');
        window._bioModalGuard = true;
        document.getElementById('grp-bio-modal').style.display = 'flex';
        setTimeout(() => { window._bioModalGuard = false; }, 600);
    } catch (_grpBioErr) { _showBioError(_grpBioErr); return; }

    const _ltrBot = bots.find(b => b.id === botId);
    if (_ltrBot && _ltrBot.cycleData && _ltrBot.cycleData.laborStarted && !_ltrBot.cycleData.birthVirtualDay) {
        startLaborTimerRefresh(_ltrBot, true);
    }
}

function renderGroupMemberRepro(bot, grp) {
    if (!bot.cycleData) initCycleData(bot);
    const cd = bot.cycleData;


    const grpMembers = grp ? grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean) : [];
    const refBot = grpMembers.length > 0 ? grpMembers[0] : bot;
    const currentGroupMins = getVirtualMinutes(refBot);
    const virtualDay = Math.floor(currentGroupMins / 1440);
    const cycleDay = getCurrentCycleDay(bot);
    const phase = getCyclePhase(cycleDay);


    const logEl = document.getElementById('gp-event-log');
    if (cd.eventLog && cd.eventLog.length > 0) {
        logEl.innerHTML = cd.eventLog.slice().reverse().slice(0, 10).map(e =>
            `<div class="re-item"><span style="color:#0084ff;font-weight:bold">Day ${e.day + 1}</span> - ${e.text}</div>`
        ).join('');
    } else {
        logEl.innerHTML = '<div style="color:var(--text-sub);font-size:11px;font-style:italic">No significant events yet.</div>';
    }

    if (cd.pregnant || cd.birthVirtualDay !== null) {
        document.getElementById('gp-cycle-panel').style.display = 'none';
        document.getElementById('gp-preg-panel').style.display = 'block';

        const weeks = getPregnancyWeek(bot) || 0;
        const info = getPregnancyInfo(weeks);
        const fCount = (cd.fetuses || []).length;

        // â”€â”€ PARASITE PREGNANCY (group): fill badge + larva list, then return early â”€â”€
        if (cd.isParasitePregnancy && cd.pregnant) {
            // NOTE: checkParasiteAutoLabor is called in the message flow, not here (avoid side effects in render)
            const stageInfo = getParasiteStageLabel(bot);
            const parasiteDay = getParasiteWeek(bot);
            const larvaeCount = (cd.fetuses || []).length;
            document.getElementById('gp-preg-num').textContent = parasiteDay;
            document.getElementById('gp-preg-label').textContent = 'Day ' + parasiteDay + ' / 15 - ' + stageInfo.stage;
            document.getElementById('gp-preg-desc').textContent = stageInfo.desc;
            document.getElementById('gp-preg-status').textContent = decodeUnicode(stageInfo.icon) + ' PARASITE GESTATION active';
            (document.getElementById('gp-preg-note') || { textContent: '' }).textContent = decodeUnicode('\uD83D\uDC7D') + ' ' + larvaeCount + ' parasite larv' + (larvaeCount === 1 ? 'a' : 'ae') + ' gestating';
            const gpCntBadge = document.getElementById('gp-fetus-count-badge');
            if (gpCntBadge) gpCntBadge.textContent = decodeUnicode('\uD83D\uDC7D') + ' ' + larvaeCount + ' Larvae';
            // Larva list
            const gpInfoEl = document.getElementById('gp-pw-fetus-info');
            if (gpInfoEl) {
                gpInfoEl.style.display = 'block';
                gpInfoEl.innerHTML = (cd.fetuses || []).map((_, i) =>
                    `<div style="display:flex;align-items:center;gap:6px;padding:2px 0">
                        <span style="color:#e879f9;font-size:13px">${decodeUnicode('\uD83D\uDC7D')}</span>
                        <b style="color:#c084fc">Larva ${i + 1}</b>
                        <span style="font-size:10px;color:#a855f7">- gestating inside host</span>
                    </div>`
                ).join('');
            }
            const gpSympEl = document.getElementById('gp-preg-symptoms');
            const gpSympSection = document.getElementById('gp-preg-symptom-section');
            if (gpSympEl && gpSympSection) {
                gpSympEl.innerHTML = `<div style="color:#c084fc;font-size:11px;font-style:italic">${stageInfo.desc}</div>`;
                gpSympSection.style.display = 'block';
            }
            document.getElementById('gp-labor-progress').style.display = 'none';
            
            // Initialize and show delivery progress panel only (cleaner UI)
            if (cd.laborStarted) {
                // Initialize delivery progress if not already done
                if (!cd.deliveryInProgress && typeof initDeliveryProgress === 'function') {
                    initDeliveryProgress(bot);
                }
                
                // Render individual delivery progress UI
                if (typeof renderDeliveryProgress === 'function') {
                    renderDeliveryProgress(bot);
                }
            }
            
            return;
        }

        if (cd.birthVirtualDay !== null && !cd.pregnant) {
            const startDay = cd.postpartumStartDay !== null ? cd.postpartumStartDay : cd.birthVirtualDay;
            const postDays = virtualDay - startDay;
            const stillRecovering = postDays < POSTPARTUM_DAYS;
            const wasParasite = !!(cd.children && cd.children.some(c => c.type === 'parasite'));

            document.getElementById('gp-preg-num').textContent = postDays;
            document.getElementById('gp-preg-label').textContent = wasParasite ? `Day(s) Post-Emergence (${POSTPARTUM_DAYS}d)` : (stillRecovering ? `Day(s) Postpartum (${POSTPARTUM_DAYS}d)` : 'Days since birth');
            document.getElementById('gp-preg-status').textContent = stillRecovering
                ? (wasParasite ? '🧪 Parasite emergence complete. Recovery period.' : '🤱 Baby born! Postpartum.')
                : '✅ Recovery complete.';
            document.getElementById('gp-preg-desc').textContent = stillRecovering
                ? (wasParasite ? 'Recovery from parasite emergence. Body healing from trauma.' : 'Rest and recovery. Baby needs you 24/7.')
                : 'Recovery complete. Cycle resuming soon.';
            (document.getElementById('gp-preg-note') || { textContent: '' }).textContent = stillRecovering
                ? (wasParasite ? '🧪 Larvae have emerged. Focus on physical recovery.' : '👶 Newborn needs feeding every 2-3h.')
                : '';
            document.getElementById('gp-pw-fetus-info').style.display = 'none';
            document.getElementById('gp-labor-progress').style.display = 'none';
            return;
        }


        if (cd.laborStarted && cd.pregnant) {
            const laborMinutes = getLaborElapsedMinutes(bot, currentGroupMins);
            const laborHours = Math.floor(laborMinutes / 60);
            const laborMins = Math.floor(laborMinutes % 60);
            document.getElementById('gp-preg-num').textContent = laborHours > 0 ? laborHours : `${laborMins}m`;
            document.getElementById('gp-preg-label').textContent = laborHours > 0 ? 'Hours in Labor' : 'Minutes in Labor';
            document.getElementById('gp-preg-desc').textContent = laborHours < 2 ? 'Early labor - contractions beginning.' : laborHours < 8 ? 'Active labor - contractions intensifying!' : 'Advanced labor - delivery very soon!';
            document.getElementById('gp-preg-status').textContent = '🚨 IN LABOR - Delivery imminent!';
            (document.getElementById('gp-preg-note') || { textContent: '' }).textContent = laborHours > 8 ? '🩺 Hospital strongly recommended.' : '💨 Breathing through contractions.';


            // gp-preg-baby-box removed


            _renderGpFetusDetail(bot, weeks, fCount);


            _renderLaborProgressPanel(bot, 'gp-labor-progress', 'gp-labor-progress-content');


            const sympEl = document.getElementById('gp-preg-symptoms');
            const sympSection = document.getElementById('gp-preg-symptom-section');
            if (sympEl && sympSection) {
                sympEl.innerHTML = renderLaborSymptomsHTML(cd, laborHours);
                sympSection.style.display = 'block';
            }
            return;
        }


        const gpRawDays = (virtualDay - (cd.conceptionVirtualDay || 0)) * PREGNANCY_SPEED;
        if (weeks < 1) {
            document.getElementById('gp-preg-num').textContent = Math.max(0, Math.floor(gpRawDays));
            document.getElementById('gp-preg-label').textContent = 'Day(s) - ' + (info ? info.label : '');
        } else {
            document.getElementById('gp-preg-num').textContent = weeks;
            document.getElementById('gp-preg-label').textContent = (info ? info.label : 'Week') + (info && info.trimester ? ' - ' + info.trimester + ' Tri.' : '');
        }

        if (info) {
            document.getElementById('gp-preg-desc').textContent = info.desc;
            const testTaken = cd.pregnancyTestTaken;
            const gpStatusDisplay = testTaken ? info.status :
                weeks < 3 ? '🔬 Too early - she feels normal' :
                    weeks < 5 ? '😶 No signs yet' :
                        weeks < 8 ? '🤔 Period late - she wonders...' :
                            '😟 Strongly suspects - no test yet';
            document.getElementById('gp-preg-status').textContent = gpStatusDisplay;
        }


        const multLabel = fCount === 1 ? '' : fCount === 2 ? '👯 Twins - ' : fCount === 3 ? '👯‍♀️ Triplets - ' : `${fCount}x Multiples - `;
        const isParasite = !!(cd.isParasitePregnancy);
        (document.getElementById('gp-preg-note') || { textContent: '' }).textContent = (cd.pregnancyTestTaken && info)
            ? (isParasite ? `🧪 ${fCount} parasite larv${fCount === 1 ? 'a' : 'ae'} gestating` : multLabel + info.baby)
            : (info ? (isParasite ? `🧪 ${fCount} parasite larv${fCount === 1 ? 'a' : 'ae'} gestating` : multLabel + info.baby) : '');
        const badge = document.getElementById('gp-fetus-count-badge');
        if (badge) badge.textContent = fCount === 1 ? 'Singleton' : fCount === 2 ? '👯 Twins' : fCount === 3 ? '👯‍♀️ Triplets' : `${fCount}x Multiples`;


        _renderGpFetusDetail(bot, weeks, fCount);


        const sympEl = document.getElementById('gp-preg-symptoms');
        const sympSection = document.getElementById('gp-preg-symptom-section');
        if (sympEl && sympSection && info) {
            const testBanner = !cd.pregnancyTestTaken && weeks >= 5
                ? `<div style="color:#f59e0b;border:1px solid #f59e0b33;border-radius:6px;padding:5px 8px;margin-bottom:6px;font-size:11px">🧪 <b>Test not taken</b> - she won't know for certain until she tests</div>`
                : cd.pregnancyTestTaken
                    ? `<div style="color:#4ade80;font-size:11px;padding:3px 0;margin-bottom:4px">✅ Pregnancy test taken (Day ${(cd.pregnancyTestDay || 0) + 1})</div>`
                    : '';

            const _gpUiAwareness = cd.pregnancyTestTaken ? 'confirmed'
                : weeks < 3 ? 'unaware'
                    : weeks < 5 ? 'vague'
                        : weeks < 8 ? 'suspects'
                            : 'strongly_suspects';
            const isHyperPregGp = fCount >= 4;

            let multiNote = '';
            if (isHyperPregGp && _gpUiAwareness !== 'unaware') {
                const hpLabel = fCount === 4 ? 'Quadruplets' : fCount === 5 ? 'Quintuplets' : fCount === 6 ? 'Sextuplets' : fCount === 7 ? 'Septuplets' : fCount === 8 ? 'Octuplets' : `${fCount}x Multiples`;
                let trimLabel, trimSymptoms, trimNote;
                if (weeks <= 13) {
                    trimLabel = 'T1 - Weeks 1-13';
                    trimSymptoms = ['Intense nausea - unpredictable, morning/noon/night', 'Bone-deep exhaustion - sleep barely helps', 'Breasts sore and full, sensitive to any contact', 'Frequent urination', 'Headaches coming and going', 'Mild bloating - belly already tighter', 'Food aversions and cravings - strong, inconsistent'];
                    trimNote = 'Not visibly pregnant yet - but feels it constantly.';
                } else if (weeks <= 26) {
                    trimLabel = 'T2 - Weeks 14-26';
                    trimSymptoms = ['Belly visibly large - precedes her into rooms', 'Multiple babies kicking simultaneously', 'Round ligament pain when standing or turning', 'Constant lower backache', 'Regular Braxton Hicks', 'Heartburn after most meals', 'Shortness of breath on exertion', 'Tires faster than expected'];
                    trimNote = 'Adjusts position frequently. Hand to belly when kicked.';
                } else {
                    trimLabel = 'T3 - Weeks 27+';
                    trimSymptoms = ['Lungs ~65% capacity - every breath shallow', 'Chronic back pain - spikes sharp periodically', 'Constant powerful multi-directional fetal movement', 'Getting up requires effort and planning', 'Braxton Hicks throughout the day', 'Constant pelvic pressure - every step deliberate', 'Feet/ankles swelling by evening', 'Permanent bone-level fatigue'];
                    trimNote = 'Entire physical reality. She has adapted. She continues.';
                }
                multiNote = `<div style="background:linear-gradient(135deg,#1a0028,#3d0060);border:1px solid #c084fc;border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:11px">
                  <div style="color:#e879f9;font-weight:bold;font-size:12px;margin-bottom:2px">⚠️ HYPERPREGNANCY - ${hpLabel}</div>
                  <div style="color:#a78bfa;font-size:10px;font-weight:bold;margin-bottom:6px">${trimLabel}</div>
                  ${trimSymptoms.map(s => `<div style="color:#f0abfc;font-size:10px;margin-bottom:2px">• ${s}</div>`).join('')}
                  <div style="color:#c084fc;font-size:10px;margin-top:6px;font-style:italic;border-top:1px solid #7c3aed44;padding-top:5px">💬 ${trimNote}</div>
                </div>`;
            } else if (!isHyperPregGp && fCount > 1) {
                multiNote = `<div style="color:#c084fc;border:1px solid #c084fc33;border-radius:6px;padding:5px 8px;margin-bottom:6px;font-size:11px">👯 <b>${fCount === 2 ? 'Twins' : fCount === 3 ? 'Triplets' : fCount + 'x Multiples'}</b> - symptoms MORE intense: stronger nausea, larger bump, higher hCG</div>`;
            }

            const sympList = (_gpUiAwareness === 'unaware')
                ? []
                : isHyperPregGp
                    ? [] // panel already shows full trimester symptoms - no duplication
                    : (info.symptoms || []).slice(0, 8);

            const hasContent = testBanner || multiNote || sympList.length > 0 || (info.cannotFeel && info.cannotFeel.length);
            if (hasContent) {
                sympEl.innerHTML = testBanner + multiNote
                    + sympList.map(s => `<div style="color:var(--text-main);font-size:11px;padding:4px 0;border-bottom:1px solid var(--border)">• ${s}</div>`).join('')
                    + (info.cannotFeel && info.cannotFeel.length ? '<div style="margin-top:4px">' + info.cannotFeel.map(s => `<div style="color:#f87171;font-size:11px;padding:3px 0">⛔ ${s}</div>`).join('') + '</div>' : '');
                sympSection.style.display = 'block';
            } else {
                sympSection.style.display = 'none';
            }
        }
        document.getElementById('gp-labor-progress').style.display = 'none';

        const babyBoxN = null; // gp-preg-baby-box removed
        if (babyBoxN) babyBoxN.style.display = '';

    } else {
        document.getElementById('gp-cycle-panel').style.display = 'block';
        document.getElementById('gp-preg-panel').style.display = 'none';
        const _gpSympSect = document.getElementById('gp-preg-symptom-section');
        if (_gpSympSect) _gpSympSect.style.display = 'none';
        const _gpLaborProg = document.getElementById('gp-labor-progress');
        if (_gpLaborProg) _gpLaborProg.style.display = 'none';

        const daysUntilPeriod = CYCLE_LENGTH - cycleDay + 1;
        document.getElementById('gp-rp-day').textContent = cycleDay;
        document.getElementById('gp-rp-fertility').textContent = phase.fertility;
        document.getElementById('gp-rp-period').textContent = daysUntilPeriod <= 0 ? 'Now' : daysUntilPeriod + 'd';
        document.getElementById('gp-rp-phase').textContent = phase.name + ' - ' + phase.desc;
        const fill = document.getElementById('gp-rp-fill');
        fill.style.width = phase.fertilityScore + '%';
        fill.style.background = phase.color;
    }
}

function _renderGpFetusDetail(bot, weeks, fCount) {
    const badge = document.getElementById('gp-fetus-count-badge');
    const infoEl = document.getElementById('gp-pw-fetus-info');
    if (!infoEl) return;
    const cd = bot.cycleData;
    if (!cd || !cd.fetuses || cd.fetuses.length === 0) { infoEl.style.display = 'none'; return; }
    if (badge) badge.textContent = fCount === 1 ? 'Singleton' : fCount === 2 ? '👯 Twins' : fCount === 3 ? '👯‍♀️ Triplets' : `${fCount}x Multiples`;
    const sizeRef = getFetusSize(weeks);
    const milestone = getFetusMilestone(weeks);
    const canRevealGender = weeks >= 18;
    if (canRevealGender) {
        let changed = false;
        cd.fetuses.forEach(f => { if (!f.gender || f.gender === 'unknown') { f.gender = Math.random() < 0.5 ? 'male' : 'female'; changed = true; } });
        if (changed) saveBots();
    }
    const lines = cd.fetuses.map((fetus, i) => {
        const lengthStr = getFetusLengthStr(sizeRef.lengthCm, fCount, i);
        const weightStr = getFetusWeightStr(sizeRef.weightG, fCount, i);
        const gIcon = fetus.gender === 'male' ? '\u2642\uFE0F' : fetus.gender === 'female' ? '\u2640\uFE0F' : '\u2753';
        const gColor = getGenderColor(fetus.gender);
        const gBtns = canRevealGender
            ? `<span style="margin-left:4px"><button onclick="setGpFetusGender('${bot.id}',${i},'male')" style="background:${fetus.gender === 'male' ? '#1e3a5f' : 'transparent'};border:1px solid #3b82f644;color:#60a5fa;border-radius:4px;padding:1px 5px;font-size:9px;cursor:pointer">\u2642</button><button onclick="setGpFetusGender('${bot.id}',${i},'female')" style="background:${fetus.gender === 'female' ? '#4a1a3a' : 'transparent'};border:1px solid #ec489944;color:#f472b6;border-radius:4px;padding:1px 5px;font-size:9px;cursor:pointer">\u2640</button></span>`
            : `<span style="font-size:9px;color:#666;margin-left:4px">gender at wk18</span>`;
        const prefix = fCount > 1 ? `<b style="color:#a855f7">${(bot.cycleData && bot.cycleData.isParasitePregnancy) ? 'Larva' : 'Baby'} ${i + 1}</b> ` : '';
        return `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">${prefix}<span style="color:${gColor}">${gIcon}</span><span>\uD83D\uDCCF ${lengthStr}</span><span>\u2696\uFE0F ${weightStr}</span>${gBtns}</div>`;
    });
    const milestoneHtml = milestone ? `<div style="color:#a855f7;font-style:italic;margin-top:2px;font-size:9px">${milestone}</div>` : '';
    infoEl.innerHTML = lines.join('') + milestoneHtml;
    infoEl.style.display = 'block';
}

function setGpFetusGender(botId, idx, gender) {
    const bot = bots.find(b => b.id === botId);
    if (!bot || !bot.cycleData || !bot.cycleData.fetuses) return;
    bot.cycleData.fetuses[idx].gender = gender;
    saveBots();
    addReproEvent(bot, `\uD83D\uDD2C Fetus ${idx + 1} gender set: ${gender === 'male' ? 'Boy \u2642\uFE0F' : 'Girl \u2640\uFE0F'}`);
    renderGroupMemberRepro(bot, groups.find(g => g.id === curGroupId));
}

function renderLaborSymptomsHTML(cd, laborHours) {

    const lp = cd.laborProgress || {};
    const waterBroke = cd.waterBroke || false;
    const stage = lp.stage || (laborHours < 1 ? (waterBroke ? 'early' : 'prelabor') : laborHours < 2 ? 'early' : laborHours < 8 ? 'active' : laborHours < 14 ? 'transition' : 'pushing');
    const stageLabels = { prelabor: '\uD83D\uDFE1 Pre-Labor / False Alarm?', early: '\uD83D\uDFE1 Early Labor', active: '\uD83D\uDFE0 Active Labor', transition: '\uD83D\uDD34 Transition', pushing: '\uD83D\uDEA8 Pushing / Delivery' };
    let html = `<div style="color:#ef4444;font-weight:bold;font-size:12px;margin-bottom:6px">${stageLabels[stage] || '\uD83D\uDEA8 In Labor'}</div>`;
    if (waterBroke) {
        html += `<div style="color:#60a5fa;font-size:11px;padding:3px 0;border-bottom:1px solid #3b82f633;font-weight:bold">\uD83D\uDCA7 Waters have broken</div>`;
    }


    const physicalSymptoms = {
        prelabor: [
            '\uD83E\uDD14 Irregular cramping - could be Braxton Hicks or real labor',
            '\uD83D\uDE30 Restless, lower back ache, feels "off" but unsure why',
            '\uD83D\uDCA7 Waters may not have broken yet - she doesn\'t know for certain',
        ],
        early: [
            '\uD83E\uDD30 Deep menstrual-like cramps - low pelvis and lower back',
            '\uD83D\uDE30 Restless, unable to get comfortable, mild back pressure',
            '\uD83D\uDCA6 Irregular tightening - 10-20 min apart, ~30-45 seconds',
        ],
        active: [
            '\uD83E\uDD75 Sweating, flushing between contractions',
            '\uD83D\uDE24 Breathing hard, unable to talk through contractions',
            '\uD83E\uDD22 Nausea possible - body in full labor mode',
        ],
        transition: [
            '\uD83E\uDEA8 Shaking uncontrollably between contractions',
            '\uD83C\uDF21\uFE0F Hot flashes and chills alternating',
            '\uD83D\uDE35 Feeling overwhelmed, exhausted, urge to give up',
        ],
        pushing: [
            '\uD83D\uDCAA Overwhelming involuntary urge to push',
            '\uD83D\uDD25 Ring of fire - searing burn as ' + (cd.isParasitePregnancy ? 'larvae emerge' : 'baby crowns'),
            '\uD83D\uDE2D\u200D\uD83D\uDCA8 Extreme pressure in pelvis - multiple pushes needed',
        ]
    };
    const symptoms = physicalSymptoms[stage] || physicalSymptoms.pushing;
    html += symptoms.map(s => `<div style="color:#fca5a5;font-size:11px;padding:3px 0;border-bottom:1px solid #ef444422">${s}</div>`).join('');


    const painLevels = { prelabor: '1\u20133 / 10 (ambiguous)', early: '2\u20134 / 10 (cramping)', active: '6\u20138 / 10', transition: '8\u201310 / 10', pushing: '9\u201310 / 10' };
    html += `<div style="color:#f87171;font-size:11px;padding:4px 0;margin-top:2px">\uD83E\uDD75 Pain level: <b>${painLevels[stage] || '9/10'}</b></div>`;

    return html;

    html += `<div>⏰ <b>Time in labor:</b> ${elapsedStr}</div>`;

    if (lp.cervixDilation) html += `<div>💊 <b>Dilation:</b> ${lp.cervixDilation}</div>`;

    if (lp.contractionFreq) html += `<div>⏱️ <b>Contractions:</b> ${lp.contractionFreq}</div>`;

    if (fCount > 1) {
        const delivered = lp.babiesDelivered !== undefined ? lp.babiesDelivered : 0;
        html += `<div>👶 <b>Babies delivered:</b> ${delivered} / ${fCount}</div>`;
    }

    if (lp.pushingProgress) html += `<div>🔽 <b>Progress:</b> ${lp.pushingProgress}</div>`;

    if (lp.fetalPosition) html += `<div>🧭 <b>Position:</b> ${lp.fetalPosition}</div>`;

    if (lp.notes) html += `<div style="color:#f9a8d4;margin-top:4px;font-style:italic">📋 ${lp.notes}</div>`;
    if (bot.cycleData && bot.cycleData.waterBroke) html += `<div style="color:#60a5fa;margin-top:5px;font-size:11px;font-weight:bold">💧 Waters have broken</div>`;
    content.innerHTML = html;
}

let _laborProgressLock = {};

async function updateLaborProgressAsync(bot, recentText, isGroup) {
    if (!bot || !bot.cycleData || !bot.cycleData.laborStarted) return;
    if (_laborProgressLock[bot.id]) return;
    const keys = getGroqKeys();
    if (!keys.length) return;

    _laborProgressLock[bot.id] = true;
    try {
        const fCount = (bot.cycleData.fetuses || []).length;
        const laborHours = Math.round(getLaborElapsedMinutes(bot) / 60);
        const existing = bot.cycleData.laborProgress || {};

        const prompt = `You are a medical AI tracking the labor progress of ${bot.name} carrying ${fCount} ${(bot.cycleData && bot.cycleData.isParasitePregnancy) ? (fCount === 1 ? 'larva' : 'larvae') : (fCount === 1 ? 'baby' : 'babies')}.
Labor started ${laborHours}h ago.
Recent conversation excerpt:
---
${recentText.substring(0, 900)}
---
Based on this, extract the current labor state. Reply ONLY with a valid JSON object with these optional fields (omit fields if not mentioned):
{
  "stage": "prelabor" | "early" | "active" | "transition" | "pushing" | "delivered",
  "cervixDilation": "e.g. 6cm",
  "contractionFreq": "e.g. every 3 min, lasting 60s",
  "pushingProgress": "e.g. crowning, 2 pushes in",
  "babiesDelivered": <number if multiple births in progress>,
  "waterBroke": true,
  "notes": "brief observation max 12 words"
}
STAGE GUIDE: Use "prelabor" if contractions are still irregular/ambiguous (could be Braxton Hicks). Use "early" once contractions are clearly real and regular, OR waters have broken. Use "active" when contractions are intense and frequent (every 4-6 min). Use "transition" near end of dilation. Use "pushing" when she is actively bearing down.
For "waterBroke": only set true if the text clearly describes waters/amniotic fluid breaking or gushing. Once true, never set back to false.
Only include fields clearly supported by the text. If nothing relevant, return {}.`;

        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_COMPOUND_MODEL,
                max_tokens: 180,
                temperature: 0.1,
                messages: [{ role: 'user', content: prompt }]
            }),
            signal: AbortSignal.timeout(12000)
        });
        const data = await res.json();
        if (data.error || !data.choices?.[0]) throw new Error('no response');
        const raw = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {

            if (parsed.waterBroke === true) {
                bot.cycleData.waterBroke = true;
                delete parsed.waterBroke;
            }

            bot.cycleData.laborProgress = Object.assign(existing, parsed);
            saveBots();

            if (!isGroup) {
                _renderLaborProgressPanel(bot, 'solo-labor-progress', 'solo-labor-progress-content');
                const soloSympEl = document.getElementById('preg-symptoms-list');
                if (soloSympEl && bot.cycleData.laborStarted) soloSympEl.innerHTML = renderLaborSymptomsHTML(bot.cycleData, laborHours);
            } else {
                _renderLaborProgressPanel(bot, 'gp-labor-progress', 'gp-labor-progress-content');
            }
        }
    } catch (e) { }
    _laborProgressLock[bot.id] = false;
}

function setSettingsSheetOpen(menuId, overlayId, isOpen) {
    const m = document.getElementById(menuId);
    const ov = document.getElementById(overlayId);
    if (!m) return;
    m.classList.toggle('open', !!isOpen);
    if (ov) ov.classList.toggle('open', !!isOpen);
}
function toggleSettingsSheet(e, menuId, overlayId, onOpen) {
    if (e) e.stopPropagation();
    const m = document.getElementById(menuId);
    if (!m) return;
    const willOpen = !m.classList.contains('open');
    if (willOpen && typeof onOpen === 'function') onOpen();
    setSettingsSheetOpen(menuId, overlayId, willOpen);
}
function closeChatSettings() {
    setSettingsSheetOpen('chat-settings-menu', 'chat-settings-overlay', false);
}
function toggleChatSettings(e) {
    toggleSettingsSheet(e, 'chat-settings-menu', 'chat-settings-overlay', function () {
        syncReplyLengthBtns();
        syncChatImgModelBtns();
        syncNpcToggle();
    });
}
function closeGroupSettings() {
    setSettingsSheetOpen('grp-settings-menu', 'grp-settings-overlay', false);
}
function toggleGroupSettings(e) {
    toggleSettingsSheet(e, 'grp-settings-menu', 'grp-settings-overlay', function () {
        syncReplyLengthBtns();
        syncChatImgModelBtns();
    });
}

function toggleChatBgFromMenu(e) {
    e.stopPropagation();
    if (!curId) return;
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;

    // toggle background
    bot.useBg = !bot.useBg;
    saveBots();

    // update toggle
    const toggle = document.getElementById('menu-bg-toggle');
    if (toggle) toggle.checked = bot.useBg;

    // update chat background
    const scChat = document.getElementById('sc-chat');
    const chatContainer = document.getElementById('chat-container');
    if (bot.useBg && bot.portraitUrl) {
        scChat.classList.add('has-bg');
        scChat.style.backgroundImage = `url('${bot.portraitUrl}')`;
        chatContainer.classList.remove('has-bg');
        chatContainer.style.backgroundImage = '';
    } else {
        scChat.classList.remove('has-bg');
        scChat.style.backgroundImage = '';
        chatContainer.classList.remove('has-bg');
        chatContainer.style.backgroundImage = '';
    }
}

function syncNpcToggle() {
    const toggle = document.getElementById('menu-npc-toggle');
    if (!toggle) return;
    const bot = bots.find(b => b.id === curId);
    toggle.checked = bot ? (bot.npcEnabled === true) : false;
}

function toggleNpcMode(e) {
    e.stopPropagation();
    if (!curId) return;
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    bot.npcEnabled = (bot.npcEnabled === true) ? false : true;
    saveBots();
    const toggle = document.getElementById('menu-npc-toggle');
    if (toggle) toggle.checked = bot.npcEnabled;
}

// Simple keyboard handler: scroll chat to bottom when viewport resizes (keyboard opens/closes)
window.addEventListener('resize', function () {
    const chatCont = document.getElementById('chat-container');
    if (chatCont) setTimeout(() => { chatCont.scrollTop = chatCont.scrollHeight; }, 80);
    const grpCont = document.getElementById('grp-chat-container');
    if (grpCont) setTimeout(() => { grpCont.scrollTop = grpCont.scrollHeight; }, 80);
});

// Seed history with a real URL fragment so Android WebView's canGoBack()
// is always true and the first back press never exits the app immediately.
window.addEventListener('DOMContentLoaded', function () {
    const msgInp = document.getElementById('msg-input');
    if (msgInp) {
        msgInp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const _now2 = Date.now(); if (_now2 - _lastSendTime < _SEND_COOLDOWN_MS) return; _lastSendTime = _now2; sendMsg(); }
        });
    }
    history.replaceState({ _grace: 0, _base: true }, '', location.pathname + location.search + '#base');
    _pushAppState();
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => { })
            .catch(() => { /* sw.js not present in single-file mode - ignore */ });
    });
}

let _pendingCycleChange = null;

async function maybeDetectMonsterPregnancy(bot) {
    const keys = getGroqKeys();
    if (!keys.length) return;


    const aCount = (bot.history || []).filter(m => m.role === 'assistant').length;
    if (aCount < 1) return;
    if (bot._lastMonsterCheck === aCount) return;
    bot._lastMonsterCheck = aCount;

    try {
        const historyCtx = bot.history.slice(-20).map(m => {
            const spk = m.role === 'user' ? 'User' : bot.name;
            return spk + ': ' + (m.content || '').replace(/EMOTION::.*/g, '').substring(0, 400);
        }).join('\n');

        const monsterDetectMessages = [{
            role: 'system',
            content: `You are a content classifier for a roleplay story. Read the chat excerpt and detect if it contains sexual intercourse or impregnation involving a non-human, supernatural, or monstrous entity - e.g. demon, monster, creature, beast, alien, werewolf, dragon, tentacle entity, spirit, incubus, succubus, orc, goblin, or any clearly non-human species.

Reply ONLY with valid JSON - no explanation, no markdown:
{"monsterActivity": false, "type": null}

Set "monsterActivity" to true ONLY if there is clear evidence of sexual intercourse, impregnation, or an act that could result in pregnancy with a non-human/monstrous entity.
"type": short label (e.g. "demon", "creature", "alien") or null.
Default to false when uncertain.`
        }, {
            role: 'user',
            content: `Chat excerpt:\n${historyCtx}\n\nJSON:`
        }];

        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: GROQ_GEN_MODEL, max_tokens: 80, temperature: 0.0, messages: monsterDetectMessages }),
            signal: AbortSignal.timeout(15000)
        });
        const data = await res.json();
        const raw = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(raw);

        if (parsed && parsed.monsterActivity === true) {
            const cd = bot.cycleData;
            const virtualDay = getVirtualDay(bot);

            cd.isMonsterPregnancy = true;
            cd.monsterType = parsed.type || 'creature';
            if (!cd.pregnant) {

                cd.pregnant = true;
                cd.conceptionVirtualDay = virtualDay;
                cd.laborStarted = false;
                cd.fetusCount = 1;
                cd.fetuses = [{ gender: 'unknown', nickname: '' }];
                addReproEvent(bot, `🐾 MONSTER IMPREGNATION - ${cd.monsterType} activity detected. Rapid gestation begins. She does not know.`);
            } else {

                cd.conceptionVirtualDay = virtualDay;
                addReproEvent(bot, `🐾 Pregnancy converted to MONSTER PREGNANCY (${cd.monsterType}) - ultra-rapid gestation.`);
            }

            cd.pregnancyTestTaken = false;
            saveBots();
            updateReproductiveStatus(bot);
            refreshBioPanelIfOpen(bot);
        }
    } catch (e) { }
}

async function detectCycleChangeInMessage(bot, userMsg, botReply) {
    const isFemale = (bot.gender || '').toLowerCase().includes('female') || (bot.gender || '').toLowerCase().includes('woman') || (bot.gender || '').toLowerCase() === 'f';
    if (!isFemale || !bot.cycleData) return;

    const combined = (userMsg + ' ' + botReply).toLowerCase();



    const hasInterventionKeyword = /\b(potion|elixir|drug|serum|injection|inject|ritual|spell|enchant|magic|wand|accelerat|speed up|slow down|faster preg|slower preg|gestation.*faster|gestation.*slower|advance.*week|rewind.*week|reverse.*preg|undo.*preg|science.*preg|preg.*science|lab.*preg|preg.*lab|technology.*preg|preg.*tech|alter.*preg|preg.*alter|manipulat.*preg|preg.*manipulat|machine.*preg|preg.*machine|device.*preg|preg.*device|accelerat.*gestation|gestation.*accelerat|compress.*gestation|gestation.*compress)\b/i.test(combined);
    if (!hasInterventionKeyword) return;

    const cd = bot.cycleData;
    const currentWeek = getPregnancyWeek(bot);
    const isPregnant = cd.pregnant;
    const state = isPregnant ? `pregnant at week ${currentWeek || 0}/40` : `not pregnant, cycle day ${Math.min(cd.cycleLength || 14, 1)}`;

    const key = getNextGroqKey();
    if (!key) return;

    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_GEN_MODEL,
                max_tokens: 80, temperature: 0.1,
                messages: [{
                    role: 'user',
                    content: `Roleplay context: ${bot.name} (female) is currently ${state}.

User said: "${userMsg}"
Bot replied: "${botReply.substring(0, 200)}"

Does this exchange describe a DELIBERATE IN-STORY intervention that directly changes her pregnancy progression or cycle? This ONLY includes: magic spells/potions/elixirs, drugs/serums/injections, scientific devices/machines, rituals, or other supernatural/technological means that explicitly speed up, slow down, reverse, or alter pregnancy/gestation.

IMPORTANT - do NOT flag these as changes:
- Normal time passing ("next day", "skip 3 days", "a week later", sleeping, waking up)
- Emotional reactions to pregnancy
- Pregnancy symptoms or body changes
- Medical checkups or pregnancy tests
- Characters simply talking about or mentioning the pregnancy

If YES (deliberate supernatural/drug/science intervention only): return JSON {"changed":true,"type":"pregnancy_speed"|"cycle_skip","deltaWeeks":<number, negative=reverse>,"desc":"<one short sentence what changed, max 12 words>"}
If NO: return {"changed":false}
Return ONLY the JSON.`
                }]
            }), signal: AbortSignal.timeout(8000),
        });
        const data = await res.json();
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return;
        const result = JSON.parse(match[0]);
        if (!result.changed) return;


        _pendingCycleChange = {
            type: result.type,
            deltaWeeks: result.deltaWeeks || 0,
            desc: result.desc || 'Story change detected',
            bot,
            applyFn: () => applyCycleChange(bot, result)
        };


        const banner = document.getElementById('cycle-change-banner');
        const descEl = document.getElementById('cycle-change-desc');
        if (banner && descEl) {
            descEl.textContent = result.desc;
            banner.style.display = 'flex';

            clearTimeout(window._cycleBannerTimer);
            window._cycleBannerTimer = setTimeout(dismissCycleChange, 20000);
        }
    } catch (e) { }
}

function applyCycleChange(bot, result) {
    if (!bot.cycleData) return;
    const speed = PREGNANCY_SPEED;

    if (result.type === 'pregnancy_speed' && result.deltaWeeks) {

        const virtualDaysShift = Math.round((result.deltaWeeks * 7) / speed);
        if (bot.cycleData.conceptionVirtualDay !== null) {
            bot.cycleData.conceptionVirtualDay -= virtualDaysShift;
        }
        const newWeek = getPregnancyWeek(bot);
        addReproEvent(bot, `Story magic: pregnancy advanced by ${result.deltaWeeks} weeks â†’ now week ${newWeek}`);
    } else if (result.type === 'cycle_skip' && result.deltaWeeks) {

        const minsToAdd = Math.round(result.deltaWeeks * 7 * 1440 / speed);
        advanceVirtualMinutes(bot, minsToAdd);
        addReproEvent(bot, `Story time skip: +${result.deltaWeeks} weeks`);
    }
    saveBots();
    renderChat();
    renderReproHealth && renderReproHealth(bot);
}

function confirmCycleChange() {
    dismissCycleChange();
    if (_pendingCycleChange && _pendingCycleChange.applyFn) {
        _pendingCycleChange.applyFn();
    }
    _pendingCycleChange = null;
}

function dismissCycleChange() {
    const banner = document.getElementById('cycle-change-banner');
    if (banner) banner.style.display = 'none';
    clearTimeout(window._cycleBannerTimer);
}
function toggleGroupMemberList() {
    const dd = document.getElementById('grp-member-list-dropdown');
    if (!dd) return;
    const isOpen = dd.style.display !== 'none';
    if (isOpen) { dd.style.display = 'none'; _removeGrpDDListener(); return; }
    renderGroupMemberDropdown();
    renderGrpStoryLog();
    dd.style.display = 'block';
    setTimeout(() => {
        _removeGrpDDListener(); // remove any stale listener first
        window._grpDDCloseHandler = function (e) {
            if (!dd.contains(e.target)) {
                dd.style.display = 'none';
                _removeGrpDDListener();
            }
        };
        document.addEventListener('click', window._grpDDCloseHandler);
    }, 10);
}

function _removeGrpDDListener() {
    if (window._grpDDCloseHandler) {
        document.removeEventListener('click', window._grpDDCloseHandler);
        window._grpDDCloseHandler = null;
    }
}
// â”€â”€ ROOM LIST MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openRoomListModal() {
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    initGroupRooms(grp);

    const overlay = document.getElementById('room-list-overlay');
    const body = document.getElementById('room-list-body');
    const badge = document.getElementById('room-list-source-badge');
    if (!overlay || !body) return;

    const rooms = grp.rooms || PRESET_ROOMS;
    const hasAIRooms = grp.worldRooms && Array.isArray(grp.worldRooms) && grp.worldRooms.length > 0;
    const memberRooms = grp.memberRooms || {};
    const members = (grp.memberIds || []).map(id => bots.find(b => b.id === id)).filter(Boolean);

    // Build member-by-room index
    const byRoom = {};
    members.forEach(bot => {
        const rid = memberRooms[bot.id] || getBotBedroomId(bot.id);
        if (!byRoom[rid]) byRoom[rid] = [];
        byRoom[rid].push(bot);
    });

    body.innerHTML = rooms.map(r => {
        const occupants = byRoom[r.id] || [];
        const isUserHere = grp.userRoom === r.id;
        const isAI = hasAIRooms && grp.worldRooms.some(wr => wr.id === r.id);
        const chips = occupants.map(bot =>
            `<span style="font-size:10px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;padding:1px 7px;color:#c4b5fd">${bot.name}</span>`
        ).join(' ');
        const youChip = isUserHere ? `<span style="font-size:10px;background:#0a1a30;border:1px solid #0084ff44;border-radius:8px;padding:1px 7px;color:#60a5fa;font-weight:bold">You</span>` : '';
        const aiBadge = isAI ? `<span style="font-size:9px;background:#7c3aed22;border:1px solid #7c3aed44;color:#a855f7;border-radius:5px;padding:0 5px;margin-left:4px">AI gen</span>` : '';
        return `<div style="background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:10px 12px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:${r.desc || occupants.length || isUserHere ? '6' : '0'}px">
            <span style="font-size:16px">${r.icon || '📍'}</span>
            <span style="font-size:13px;font-weight:700;color:#eee">${r.name}</span>
            ${r.private ? '<span style="font-size:9px;background:#1a0b2e;border:1px solid #3b156b;color:#9b7fe8;border-radius:5px;padding:0 5px">private</span>' : ''}
            ${aiBadge}
            <span style="font-size:9px;color:#333;margin-left:auto">${r.id}</span>
          </div>
          ${r.desc ? `<div style="font-size:11px;color:#666;font-style:italic;margin-bottom:${occupants.length || isUserHere ? '6' : '0'}px">${r.desc}</div>` : ''}
          ${(occupants.length || isUserHere) ? `<div style="display:flex;flex-wrap:wrap;gap:4px">${youChip}${chips}</div>` : '<div style="font-size:10px;color:#333;font-style:italic">empty</div>'}
        </div>`;
    }).join('');

    badge.innerHTML = hasAIRooms
        ? `<span style="color:#a855f7">✨ AI-generated rooms</span> · ${rooms.length} locations`
        : `<span style="color:#555">Default preset rooms</span> · ${rooms.length} locations`;

    overlay.style.display = 'flex';
    // close-on-back
    history.pushState({ modal: 'room-list' }, '', location.pathname + '#room-list');
}

function closeRoomListModal() {
    const overlay = document.getElementById('room-list-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Handle back button to close room list modal
window.addEventListener('popstate', function (e) {
    if (e.state && e.state.modal === 'room-list') {
        closeRoomListModal();
    }
});

// Global click handler to close room list when clicking outside (handles bio modal case)
document.addEventListener('click', function(e) {
    const roomListOverlay = document.getElementById('room-list-overlay');
    if (!roomListOverlay || roomListOverlay.style.display === 'none') return;
    
    const roomListContent = roomListOverlay.querySelector('div[onclick="event.stopPropagation()"]');
    if (roomListContent && roomListContent.contains(e.target)) return;
    
    // Check if clicking inside bio modal - if so, don't close room list
    const bioModal = document.getElementById('grp-bio-modal');
    if (bioModal && bioModal.style.display === 'flex') {
        const bioContent = bioModal.querySelector('.bio-content');
        if (bioContent && bioContent.contains(e.target)) return;
    }
    
    closeRoomListModal();
});

function renderGroupMemberDropdown() {
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    initGroupRooms(grp);
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    const items = document.getElementById('grp-member-list-items');
    if (!items) return;
    items.innerHTML = '';


    const roomMemberMap = {};
    (grp.rooms || PRESET_ROOMS).forEach(r => { roomMemberMap[r.id] = []; });
    members.forEach(bot => {
        const rid = grp.memberRooms[bot.id] || 'living_room';
        if (!roomMemberMap[rid]) roomMemberMap[rid] = [];
        roomMemberMap[rid].push(bot);
    });
    const userRoom = grp.userRoom || 'living_room';


    const hdr = document.createElement('div');
    hdr.className = 'room-section-hdr';
    hdr.textContent = '🏠 Rooms - tap a room to move yourself';
    items.appendChild(hdr);

    const wrap = document.createElement('div');
    wrap.className = 'room-group-wrap';

    // Sort: your_bedroom first â†’ regular rooms â†’ private bedrooms â†’ outside last
    const _sortedRooms = [...(grp.rooms || PRESET_ROOMS)].sort((a, b) => {
        const rank = r => r.id === 'your_bedroom' ? 0 : r.id === 'outside' ? 99 : r.private ? 50 : 1;
        return rank(a) - rank(b);
    });
    _sortedRooms.forEach(room => {
        const inRoom = roomMemberMap[room.id] || [];
        const isUserHere = userRoom === room.id;
        const isPrivateBedroom = room.private && room.ownerId;

        if (inRoom.length === 0 && !isUserHere && room.id !== 'your_bedroom' && room.id !== 'outside') return;

        const card = document.createElement('div');
        const isOutsideRoom = room.id === 'outside';
        const isYourBedroom = room.id === 'your_bedroom';
        card.className = isOutsideRoom ? 'room-card room-card-outside' : isYourBedroom ? 'room-card room-card-your-bedroom' : 'room-card';
        if (isUserHere) {
            card.style.borderColor = isOutsideRoom ? '#f59e0b88' : '#22c55e55';
            if (isOutsideRoom) card.style.background = 'rgba(245,158,11,0.06)';
        } else if (isPrivateBedroom) {
            card.style.borderColor = '#7c3aed44';
            card.style.cursor = 'pointer';
            card.onclick = (e) => {
                if (e.target.closest('.room-member-chip')) return;
                e.stopPropagation();
                moveUserToRoom(grp, room.id);
            };
        } else {
            card.style.cursor = 'pointer';
            if (isOutsideRoom) card.style.borderColor = '#f59e0b44';
            card.onclick = (e) => {
                if (e.target.closest('.room-member-chip')) return;
                e.stopPropagation();
                moveUserToRoom(grp, room.id);
            };
        }

        const cardHdr = document.createElement('div');
        cardHdr.className = 'room-card-hdr';

        const nameEl = document.createElement('div');
        nameEl.className = 'room-card-name';
        nameEl.innerHTML = `${decodeUnicode(room.icon)} ${room.name}${isPrivateBedroom ? ' <span style="font-size:9px;color:#a855f7;background:#1a0b2e;border:1px solid #7c3aed44;border-radius:8px;padding:1px 5px;font-weight:normal">private</span>' : ''}`;

        const moveBtn = document.createElement('div');
        moveBtn.className = 'room-card-you';
        moveBtn.textContent = isUserHere ? '\u2713 Here' : 'Go';
        moveBtn.style.color = isUserHere ? '#22c55e' : (isOutsideRoom ? '#f59e0b' : isPrivateBedroom ? '#a855f7' : '#0084ff');
        moveBtn.style.background = isUserHere ? '#22c55e22' : (isOutsideRoom ? '#f59e0b22' : isPrivateBedroom ? '#a855f722' : '#0084ff22');
        moveBtn.style.flexShrink = '0';

        cardHdr.appendChild(nameEl);
        cardHdr.appendChild(moveBtn);
        card.appendChild(cardHdr);


        const chipsRow = document.createElement('div');
        chipsRow.className = 'room-card-members';


        if (isUserHere) {
            const youChip = document.createElement('div');
            youChip.className = 'you-chip';
            youChip.innerHTML = `<span>You</span>`;
            chipsRow.appendChild(youChip);
        }

        inRoom.forEach(bot => {
            const chip = document.createElement('div');
            chip.className = 'room-member-chip';
            chip.title = bot.name;
            chip.style.cursor = 'pointer'; // Indicate clickable
            const av = document.createElement('img');
            av.src = bot.avatar;
            av.onerror = () => { av.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(bot.name)}&background=random`; };
            const nameSpan = document.createElement('span');
            nameSpan.className = 'room-chip-name';
            nameSpan.textContent = bot.name;
            const chipInfo = document.createElement('div');
            chipInfo.className = 'room-chip-info';
            chipInfo.appendChild(nameSpan);
            chip.appendChild(av);
            chip.appendChild(chipInfo);

            // Click on avatar or name to open bio
            av.onclick = (e) => {
                e.stopPropagation();
                showGroupMemberBio(bot.id);
            };
            nameSpan.onclick = (e) => {
                e.stopPropagation();
                showGroupMemberBio(bot.id);
            };

            // Activity badge
            if (bot.schedule) {
                const ctx = getScheduleContext(bot);
                // Primary: use dedicated [ACTIVITY]: tag (clean, no room suffix)
                const cleanMatch = ctx.match(/\[ACTIVITY\]:\s*([^\n\[]+)/i);
                let actText = cleanMatch ? cleanMatch[1].trim() : null;
                // Fallback: parse RIGHT NOW line and strip room suffix
                if (!actText) {
                    const raw = (ctx.match(/RIGHT NOW[:\s]+(?:[^:]+?is\s*)([^\n\.\[\(]+)/i) || [])[1];
                    if (raw) actText = raw.trim()
                        .replace(/\s+in\s+(?:the\s+)?[a-z ]{0,25}$/i, '')
                        .replace(/\s+\(.*$/, '').trim();
                }
                if (actText && actText.length > 3) {
                    const actBadge = document.createElement('span');
                    actBadge.className = 'room-activity-badge';
                    actBadge.textContent = actText.length > 40 ? actText.substring(0, 38) + '\u2026' : actText;
                    chipInfo.appendChild(actBadge);
                }
            }
            chip.setAttribute('draggable', 'true');
            let dragStarted = false;
            chip.addEventListener('dragstart', (e) => {
                dragStarted = true;
                e.dataTransfer.setData('text/plain', bot.id);
                e.stopPropagation();
            });
            chip.addEventListener('dragend', () => {
                setTimeout(() => { dragStarted = false; }, 50);
            });
            chip.addEventListener('click', (e) => {
                if (!dragStarted) {
                    e.stopPropagation();
                    showGroupMemberBio(bot.id);
                }
            });
            chipsRow.appendChild(chip);
        });

        if (inRoom.length === 0 && !isUserHere) {
            const empty = document.createElement('span');
            empty.className = 'room-empty-label';
            empty.textContent = 'empty';
            chipsRow.appendChild(empty);
        }

        card.appendChild(chipsRow);
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            card.style.outline = '2px dashed #0084ff88';
        });
        card.addEventListener('dragleave', () => {
            card.style.outline = '';
        });
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            card.style.outline = '';
            const botId = e.dataTransfer.getData('text/plain');
            if (botId && botId !== '') {
                const moved = moveCharToRoom(grp, botId, room.id, false);
                if (moved) renderGroupMemberDropdown();
            }
        });
        wrap.appendChild(card);
    });

    items.appendChild(wrap);
}

async function showHintsGroup() {
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp || !getGroqKeys().length) return;
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    const history = grp.history.slice(-8);
    const histText = history.map(m => {
        const spk = m.role === 'user' ? 'User' : (members.find(b => b.id === m.speakerId)?.name || 'Bot');
        return `${spk}: ${m.content.substring(0, 120)}`;
    }).join('\n');
    const key = getNextGroqKey();
    if (!key) return;

    const overlay = document.getElementById('grp-hint-overlay');
    const content = document.getElementById('grp-hint-content');
    if (!overlay || !content) return;
    overlay.style.display = 'flex';
    content.innerHTML = '<div class="hint-loading"><i class="fas fa-spinner fa-spin"></i> Generating suggestions...</div>';
    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: HINT_MODEL, max_tokens: 300, temperature: 1.0,
                messages: [{
                    role: 'user', content: `You are writing 3 possible next messages the USER could send in this group roleplay.

CRITICAL FORMATTING RULES:
- Physical actions: wrap in asterisks *like this*
- Spoken dialogue: wrap in "quotes like this"
- Mix: *action* "then speech"
- Varied in tone. 1â€“2 sentences each. No labels.

Return ONLY a JSON array of exactly 3 strings. No markdown.

Group: ${members.map(b => b.name).join(', ')}

Conversation:
${histText}`
                }]
            }), signal: AbortSignal.timeout(12000)
        });
        const data = await res.json();
        const raw = (data.choices?.[0]?.message?.content || '').trim().replace(/^```(?:json)?|```$/gm, '').trim();
        let hints = [];
        try { hints = JSON.parse(raw); } catch (e) {
            hints = raw.split('\n').map(l => l.replace(/^[\d\-\.\*]+\s*/, '')).filter(l => l.length > 3);
        }
        hints = hints.slice(0, 3);
        if (hints.length === 0) throw new Error('empty');
        renderHintOptions(content, hints, 'grp-msg-input', 'grp-hint-overlay');
    } catch (e) {
        content.innerHTML = '<div class="hint-loading" style="color:#ff6666">\u26A0 Could not generate suggestions. Try again.</div>';
        setTimeout(() => { overlay.style.display = 'none'; }, 3000);
    }
}

async function grpFullSyncDynBio() {
    closeGroupSettings();
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    if (!members.length || !getGroqKeys().length) return;
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#1a0b2e;color:#a78bfa;border:1px solid #7c3aed;border-radius:20px;padding:8px 18px;font-size:13px;z-index:999;white-space:nowrap';
    toast.textContent = '\u26A1 Syncing group bios...';
    document.body.appendChild(toast);
    const histText = grp.history.slice(-30).map(m => {
        const spk = m.role === 'user' ? 'User' : (members.find(b => b.id === m.speakerId)?.name || 'Bot');
        return `${spk}: ${m.content.substring(0, 150)}`;
    }).join('\n');
    const key = getNextGroqKey();
    if (!key) { toast.remove(); return; }
    for (const bot of members) {
        try {
            const res = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: GROQ_GEN_MODEL, max_tokens: 400,
                    messages: [{
                        role: 'user', content: `Based on this group chat history, extract dynamic bio updates for ${bot.name}.
History:
${histText}

Return JSON only: {"relation":"<how their relationship with user evolved>","appearance":"<any appearance details revealed>","bio":"<new backstory facts revealed>","prompt":"<personality traits shown in action>"}
Only include fields where something NEW was revealed. Empty string if nothing new.` }]
                }), signal: AbortSignal.timeout(12000)
            });
            const data = await res.json();
            const raw = (data.choices?.[0]?.message?.content || '').trim();
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                // â”€â”€ Fix 3: write to grpDynBio (separate from solo dynBio) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                // Solo fullSyncDynBio writes to bot.dynBio. Writing here to the same field
                // would cause them to overwrite each other. Group context updates go to
                // bot.grpDynBio; getDynField merges both with grpDynBio taking precedence
                // when in a group context.
                if (!bot.grpDynBio) bot.grpDynBio = {};
                // prompt excluded - traits & personality never change from sync
                ['appearance', 'bio'].forEach(k => {
                    if (parsed[k] && parsed[k].trim()) bot.grpDynBio[k] = parsed[k].trim();
                });
                const _grpHist = (groups.find(g => g.id === curGroupId)?.history || []).slice(-20).map(m => {
                    const sp = m.role === 'user' ? 'User' : (bots.find(b2 => b2.id === m.speakerId)?.name || 'Bot');
                    return sp + ': ' + (m.content || '').replace(/EMOTION::.*/g, '').trim().substring(0, 160);
                }).join('\n');
                const _grpRelAI = await detectRelationShiftAI(bot, _grpHist, ((bot.grpDynBio && bot.grpDynBio.relation) || bot.relation || ''));
                applyRelationEngineUpdate(bot, true, _grpRelAI, (parsed.relation && parsed.relation.trim()) ? parsed.relation.trim() : '', _grpHist);
                // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            }
        } catch (e) { }
    }
    saveBots();
    toast.textContent = '\u2705 Group bios synced!';
    setTimeout(() => toast.remove(), 2500);
}

let _addMemberSelectedId = null;

function openAddMemberModal() {
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    _addMemberSelectedId = null;
    const pickList = document.getElementById('add-member-pick-list');
    const relSection = document.getElementById('add-member-rel-section');
    const relCards = document.getElementById('add-member-rel-cards');
    pickList.innerHTML = '';
    relSection.style.display = 'none';
    relCards.innerHTML = '';

    const available = bots.filter(b => !grp.memberIds.includes(b.id));
    if (!available.length) {
        pickList.innerHTML = '<div style="text-align:center;color:var(--text-sub);padding:20px;font-size:13px">No more characters available to add.</div>';
        document.getElementById('add-member-modal').style.display = 'flex';
        return;
    }

    const existingMembers = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);

    available.forEach(bot => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid var(--border);cursor:pointer';
        const av = document.createElement('img');
        av.src = bot.portraitUrl || bot.avatar;
        av.style.cssText = 'width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--border)';
        av.onerror = () => { av.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(bot.name)}&background=random`; };
        const info = document.createElement('div');
        info.style.flex = '1';
        info.innerHTML = `<div style="font-weight:bold;font-size:14px">${escapeHTML(bot.name)}</div><div style="font-size:11px;color:var(--text-sub)">${bot.gender || ''}${bot.age ? ' · ' + bot.age + ' y/o' : ''}</div>`;
        const check = document.createElement('div');
        check.style.cssText = 'width:24px;height:24px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;transition:all .15s';

        row.onclick = () => {

            pickList.querySelectorAll('[data-addid]').forEach(r => {
                r.querySelector('.add-check').style.background = '';
                r.querySelector('.add-check').style.borderColor = 'var(--border)';
                r.querySelector('.add-check').innerHTML = '';
            });
            _addMemberSelectedId = bot.id;
            check.style.background = '#22c55e';
            check.style.borderColor = '#22c55e';
            check.innerHTML = '\u2713';
            check.style.color = '#fff';


            relSection.style.display = 'block';
            relCards.innerHTML = '';
            existingMembers.forEach(member => {
                const pairId = bot.id + '_' + member.id;
                const card = document.createElement('div');
                card.className = 'rel-char-card';
                const hdr = document.createElement('div');
                hdr.className = 'rel-char-hdr';
                const avA = document.createElement('img');
                avA.src = bot.portraitUrl || bot.avatar;
                avA.onerror = () => { avA.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(bot.name)}&background=random`; };
                const arrow = document.createElement('span');
                arrow.style.cssText = 'font-size:16px;color:var(--text-sub)';
                arrow.textContent = '\u2194';
                const avB = document.createElement('img');
                avB.src = member.portraitUrl || member.avatar;
                avB.onerror = () => { avB.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`; };
                const nameInfo = document.createElement('div');
                nameInfo.style.flex = '1';
                nameInfo.innerHTML = `<div class="rel-char-name">${escapeHTML(bot.name)} & ${escapeHTML(member.name)}</div><div class="rel-char-sub">Relationship with each other</div>`;
                hdr.appendChild(avA); hdr.appendChild(arrow); hdr.appendChild(avB); hdr.appendChild(nameInfo);
                card.appendChild(hdr);

                const presets = document.createElement('div');
                presets.className = 'rel-presets';
                REL_PRESETS.forEach(p => {
                    const btn = document.createElement('button');
                    btn.className = 'rel-preset-btn';
                    btn.textContent = p.label;
                    btn.onclick = () => {
                        ta.value = p.value;
                        presets.querySelectorAll('.rel-preset-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                    };
                    presets.appendChild(btn);
                });

                // AI Suggest button
                const aiBtn = document.createElement('button');
                aiBtn.className = 'rel-preset-btn ai-suggest-btn';
                aiBtn.style.cssText = 'background:#8b5cf6;border-color:#8b5cf6;color:#fff;margin-left:8px;';
                aiBtn.innerHTML = '\u2728 AI';
                aiBtn.title = 'AI suggests relationship based on character profiles';
                aiBtn.onclick = async () => {
                    aiBtn.disabled = true;
                    aiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    const suggestion = await suggestRelationshipAI(bot, member);
                    if (suggestion) {
                        ta.value = suggestion;
                        presets.querySelectorAll('.rel-preset-btn').forEach(b => b.classList.remove('active'));
                        aiBtn.style.background = '#22c55e';
                        aiBtn.style.borderColor = '#22c55e';
                    }
                    aiBtn.disabled = false;
                    aiBtn.innerHTML = '\u2728 AI';
                };
                presets.appendChild(aiBtn);

                card.appendChild(presets);

                const ta = document.createElement('textarea');
                ta.className = 'rel-custom-input';
                ta.dataset.newpairid = pairId;
                ta.dataset.memberA = bot.id;
                ta.dataset.memberB = member.id;
                ta.placeholder = 'Describe their relationship... (optional)';
                ta.rows = 2;
                card.appendChild(ta);
                relCards.appendChild(card);
            });
        };

        check.className = 'add-check';
        row.dataset.addid = bot.id;
        row.appendChild(av); row.appendChild(info); row.appendChild(check);
        pickList.appendChild(row);
    });

    document.getElementById('add-member-modal').style.display = 'flex';
}

// AI-powered relationship suggestion
async function suggestRelationshipAI(botA, botB) {
    const keys = getGroqKeys();
    if (!keys.length) { showGrpToast('No API key configured', '#300', '#f87171'); return null; }

    const key = getNextGroqKey();
    const prompt = `Character A: ${botA.name}
Gender: ${botA.gender || 'female'}
Age: ${botA.age || 'unknown'}
Personality: ${botA.prompt || 'Not specified'}
Background: ${botA.bio || 'Not specified'}

Character B: ${botB.name}
Gender: ${botB.gender || 'female'}
Age: ${botB.age || 'unknown'}
Personality: ${botB.prompt || 'Not specified'}
Background: ${botB.bio || 'Not specified'}

Based on their personalities, backgrounds, and potential chemistry, suggest ONE specific relationship dynamic between them. Be creative but logical.

Examples:
- "Childhood friends who drifted apart but still deeply care"
- "Professional rivals with mutual respect and underlying attraction"
- "Ex-lovers who broke up amicably but tension remains"
- "Protective older sister figure and rebellious younger one"
- "Strangers who feel an inexplicable familiarity"

Return ONLY the relationship description (5-12 words). No explanation, no quotes.`;

    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'openai/gpt-oss-20b',
                max_tokens: 60,
                temperature: 0.8,
                messages: [
                    { role: 'system', content: 'You are a creative relationship designer for roleplay characters. Suggest compelling, specific relationship dynamics.' },
                    { role: 'user', content: prompt }
                ]
            }),
            signal: AbortSignal.timeout(15000)
        });
        const data = await res.json();
        if (data.error) { logError('suggestRelationshipAI', data.error.message); return null; }
        const suggestion = (data.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '');
        return suggestion || null;
    } catch (e) {
        logError('suggestRelationshipAI', e.message);
        return null;
    }
}

function randomizeAllRelationshipsForNewMember() {
    if (!_addMemberSelectedId) return;
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    
    const newBot = bots.find(b => b.id === _addMemberSelectedId);
    if (!newBot) return;
    
    const existingMembers = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    if (!existingMembers.length) return;
    
    const btn = document.getElementById('randomize-all-rels-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Randomizing...';
    }
    
    const newAge = parseInt(newBot.age) || 25;
    const newGender = (newBot.gender || '').toLowerCase();
    const newIsMale = newGender.includes('male') || newGender === 'm';
    const newIsFemale = newGender.includes('female') || newGender === 'f' || newGender.includes('woman');
    
    existingMembers.forEach(member => {
        const memberAge = parseInt(member.age) || 25;
        const memberGender = (member.gender || '').toLowerCase();
        const memberIsMale = memberGender.includes('male') || memberGender === 'm';
        const memberIsFemale = memberGender.includes('female') || memberGender === 'f' || memberGender.includes('woman');
        
        const sameGender = (newIsMale && memberIsMale) || (newIsFemale && memberIsFemale);
        const oppositeGender = (newIsMale && memberIsFemale) || (newIsFemale && memberIsMale);
        
        const ageDiff = Math.abs(newAge - memberAge);
        const avgAge = (newAge + memberAge) / 2;
        const minAge = Math.min(newAge, memberAge);
        const maxAge = Math.max(newAge, memberAge);
        
        const seed = (newBot.id + member.id).split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const random = ((seed * 9301 + 49297) % 233280) / 233280;
        
        let relationship = '';
        
        const getRomanticOption = (allowRomantic) => {
            if (!allowRomantic || sameGender) {
                return random > 0.7 ? 'Best Friend' : (random > 0.4 ? 'Friend' : 'Roommate');
            } else {
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
        
        if (ageDiff > 25) {
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
            if (minAge < 20 && maxAge > 35) {
                const opts = ['Parent', 'Aunt/Uncle', 'Teacher', 'Boss'];
                relationship = opts[Math.floor(random * opts.length)];
            } else {
                relationship = random > 0.6 ? 'Boss' : (random > 0.3 ? 'Teacher' : 'Colleague');
            }
        } else if (ageDiff > 5) {
            if (avgAge < 18) {
                const opts = ['Sibling', 'Cousin', 'Classmate', 'Teammate', 'Friend'];
                relationship = opts[Math.floor(random * opts.length)];
            } else if (avgAge < 30) {
                relationship = getRomanticOption(false);
            } else {
                relationship = random > 0.5 ? 'Colleague' : 'Friend';
            }
        } else {
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
        
        const pairId = newBot.id + '_' + member.id;
        const textarea = document.querySelector(`textarea[data-newpairid="${pairId}"]`);
        if (textarea && relationship) {
            textarea.value = relationship;
        }
    });
    
    if (btn) {
        btn.style.background = '#22c55e';
        btn.style.borderColor = '#22c55e';
        btn.innerHTML = '✅ Randomized!';
        setTimeout(() => {
            btn.style.background = '#8b5cf6';
            btn.style.borderColor = '#8b5cf6';
            btn.innerHTML = '✨ Randomize All Relationships';
            btn.disabled = false;
        }, 2000);
    }
}

function confirmAddMember() {
    if (!_addMemberSelectedId) { showGrpToast('\u26A0 Select a character first', '#1a0000', '#ff6666'); return; }
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    grp.memberIds.push(_addMemberSelectedId);
    // ... (rest of the code remains the same)

    if (!grp.characterRelations) grp.characterRelations = {};
    document.querySelectorAll('[data-newpairid]').forEach(el => {
        const val = el.value.trim();
        if (val) grp.characterRelations[el.dataset.memberA + '_' + el.dataset.memberB] = val;
    });
    saveGroups();
    document.getElementById('add-member-modal').style.display = 'none';
    _addMemberSelectedId = null;

    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    updateGroupTimeBadges(members);
    renderGroupChat();
    showGrpToast('\u2705 Member added!', '#0a1a00', '#22c55e');
}

document.addEventListener('click', function (e) {
    // Handle room panel and bio modal click-outside behavior
    const roomListOverlay = document.getElementById('room-list-overlay');
    const bioModal = document.getElementById('grp-bio-modal');
    
    if (!roomListOverlay || roomListOverlay.style.display === 'none') return;
    
    // Check if clicking inside bio content
    if (bioModal && bioModal.style.display === 'flex' && e.target.closest('#grp-bio-modal .bio-content')) {
        return; // Don't close anything when clicking inside bio content
    }
    
    // Check if clicking inside room list content
    if (e.target.closest('#room-list-overlay .room-list-content')) {
        return; // Don't close room list when clicking inside room list content
    }
    
    // If bio modal is open and clicking outside bio content (but still within room list overlay)
    if (bioModal && bioModal.style.display === 'flex' && e.target.closest('#grp-bio-modal')) {
        // Clicked on bio modal background (outside content) - close bio only
        bioModal.style.display = 'none';
        return;
    }
    
    // If clicking outside room list overlay entirely
    if (!e.target.closest('#room-list-overlay')) {
        closeRoomListModal();
        if (bioModal) bioModal.style.display = 'none';
        return;
    }
    
    // If clicking on room list overlay background (outside room list content)
    // and bio modal is not open, close room list
    if (!e.target.closest('#room-list-overlay .room-list-content') && (!bioModal || bioModal.style.display === 'none')) {
        closeRoomListModal();
    }
});

function toggleBioField(el) {
    if (!el) return;
    const hint = el.nextElementSibling;
    const isCollapsed = el.classList.contains('bio-text-collapsed');
    if (isCollapsed) {
        el.classList.remove('bio-text-collapsed');
        el.classList.add('bio-text-expanded');
        if (hint && hint.classList.contains('bio-expand-hint')) hint.textContent = '\u25B2 Show less';
    } else {
        el.classList.remove('bio-text-expanded');
        el.classList.add('bio-text-collapsed');
        if (hint && hint.classList.contains('bio-expand-hint')) hint.textContent = '\u25BC Show more';
    }
}

function showGrpToast(msg, bg, color) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:' + bg + ';color:' + color + ';border:1px solid ' + color + '44;border-radius:20px;padding:8px 18px;font-size:13px;z-index:800;white-space:nowrap;pointer-events:none;transition:opacity .4s';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3000);
    return t;
}

async function grpSyncMemberBio(botId) {
    const grp = groups.find(g => g.id === curGroupId);
    const bot = bots.find(b => b.id === botId);
    if (!grp || !bot) return;
    const key = getNextGroqKey ? getNextGroqKey() : (getGroqKeys()[0] || null);
    if (!key) { alert('No Groq API key'); return; }
    const toast = showGrpToast('\u26A1 Syncing ' + bot.name + ' from group...', '#1a0b2e', '#a78bfa');
    const histText = grp.history.slice(-30).map(m => {
        const spk = m.role === 'user' ? 'User' : (bots.find(b2 => b2.id === m.speakerId)?.name || 'Bot');
        return spk + ': ' + (m.content || '').replace(/EMOTION::.*/g, '').trim().substring(0, 150);
    }).join('\n');
    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST', headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_GEN_MODEL, max_tokens: 400,
                messages: [{ role: 'user', content: 'Based on this GROUP chat, extract updates for ' + bot.name + '.\nHistory:\n' + histText + '\n\nReturn JSON only (no explanation):\n{"relation":"<relationship evolved in group>","bio":"<new backstory revealed>","prompt":"<personality shown>"}\nIMPORTANT: NEVER change appearance/physical traits. Only update relation, bio, prompt. Use empty string if nothing new.' }]
            }), signal: AbortSignal.timeout(15000)
        });
        const data = await res.json();
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            if (!bot.grpDynBio) bot.grpDynBio = {};
            ['bio', 'prompt'].forEach(k => { if (parsed[k] && parsed[k].trim()) bot.grpDynBio[k] = parsed[k].trim(); });
            const _grpRelAI2 = await detectRelationShiftAI(bot, histText, ((bot.grpDynBio && bot.grpDynBio.relation) || bot.relation || ''));
            applyRelationEngineUpdate(bot, true, _grpRelAI2, (parsed.relation && parsed.relation.trim()) ? parsed.relation.trim() : '', histText);
            saveBots();
        }
        toast.textContent = '\u2705 Bio synced!';
        if (document.getElementById('grp-bio-modal').style.display === 'flex' && _curGroupProfileBotId === botId) showGroupMemberBio(botId);
        setTimeout(() => toast.remove(), 2000);
    } catch (e) { toast.textContent = '\u26A0 Sync failed'; setTimeout(() => toast.remove(), 2500); }
}

async function grpUpdateMemberPortrait(botId) {
    const grp = groups.find(g => g.id === curGroupId);
    const bot = bots.find(b => b.id === botId);
    if (!grp || !bot) return;
    const confirmed = await _showUpdateBgConfirm(
        `Generate a new background portrait for <b>${bot.name}</b> based on the current group chat scene?`
    );
    if (!confirmed) return;
    const key = getNextGroqKey ? getNextGroqKey() : (getGroqKeys()[0] || null);
    if (!key) { showGrpToast('\u26A0 No Groq API key set', '#1a0a0a', '#f87171'); return; }
    const toast = showGrpToast('\ud83d\uddbc Generating portrait...', '#0a1a30', '#60a5fa');
    const histText = grp.history.slice(-8).map(m => {
        const spk = m.role === 'user' ? 'User' : (bots.find(b2 => b2.id === m.speakerId)?.name || 'Bot');
        return spk + ': ' + (m.content || '').replace(/EMOTION::.*/g, '').trim().substring(0, 120);
    }).join('\n');
    const styleTagMap = {
        'photorealism': 'photorealism, ultra-high resolution, 85mm lens, 8K UHD',
        'anime': 'anime art style, cel shading, vibrant colors',
        'semi-realistic': 'semi-realistic illustration, painterly',
        'manhwa': 'manhwa webtoon, clean lines, Korean comic style'
    };
    const styleTag = styleTagMap[getImgStyleOverride() || bot.imgStyle || 'photorealism'] || styleTagMap['photorealism'];
    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST', headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_GEN_MODEL, max_tokens: 200,
                messages: [{ role: 'user', content: 'Write a Stable Diffusion portrait prompt for ' + bot.name + ' (' + bot.gender + ') based on this group chat scene.\nBase appearance: ' + (bot.appearance || 'not specified') + '.\nCapture current emotion/expression. Include specific scene background.\nOutput ONLY the prompt. Waist-up, ' + styleTag + '. Max 100 words.\n\n' + histText }]
            }), signal: AbortSignal.timeout(15000)
        });
        const data = await res.json();
        const pp = (data.choices?.[0]?.message?.content || '').trim();
        if (!pp) throw new Error('empty');
        const finalP = 'waist-up portrait of ' + (bot.gender || 'female').toLowerCase() + ' character, ' + pp + ', ' + styleTag + ', detailed background, masterpiece, high quality';
        const seed = Math.floor(Math.random() * 999999);
        const blobUrl = await generateImagePollinationsPortrait(finalP, seed);
        if (!bot.grpPortraits) bot.grpPortraits = {};
        bot.grpPortraits[grp.id] = blobUrl;
        saveBots();
        toast.textContent = '\u2705 Portrait updated!';
        if (document.getElementById('grp-bio-modal').style.display === 'flex' && _curGroupProfileBotId === botId) showGroupMemberBio(botId);
    } catch (e) { toast.textContent = '\u26A0 Portrait failed'; setTimeout(() => toast.remove(), 2500); }
}

// Password removed - direct access to hidden characters
async function _checkPw(val) {
    // Always return true - no password needed
    return true;
}
let _ctxBotId = null;
let _ctxFromHidden = false;
let _grpCtxId = null;

function openHiddenBots() {
    const el = document.getElementById('pw-overlay');
    el.style.display = 'flex';
    const inp = document.getElementById('pw-input');
    inp.value = '';
    pwClearError();
    setTimeout(() => inp.focus(), 100);
}
function closePwOverlay() {
    document.getElementById('pw-overlay').style.display = 'none';
}
function pwClearError() {
    document.getElementById('pw-error').style.display = 'none';
}
async function pwSubmit() {
    const val = document.getElementById('pw-input').value;
    const ok = await _checkPw(val);
    if (ok) {
        closePwOverlay();
        openHiddenScreen();
    } else {
        document.getElementById('pw-error').style.display = 'block';
        document.getElementById('pw-input').value = '';
    }
}
function openHiddenScreen() {
    renderHiddenBotList();
    document.getElementById('sc-hidden').classList.add('active');
    document.getElementById('sc-home').classList.add('off');
    history.pushState({ screen: 'sc-hidden' }, '', location.pathname + '#sc-hidden');
}
function closeHiddenScreen() {
    document.getElementById('sc-hidden').classList.remove('active');
    document.getElementById('sc-home').classList.remove('off');
}

function renderHiddenBotList() {
    const list = document.getElementById('hidden-bot-list');
    list.innerHTML = '';
    const hidden = bots.filter(b => b.hidden);
    if (hidden.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-sub)"><div style="font-size:40px;margin-bottom:12px">\uD83D\uDC41</div><div style="font-size:16px">No hidden characters</div></div>';
        return;
    }
    const grid = document.createElement('div');
    grid.className = 'bot-grid-wrap';
    hidden.sort((a, b) => (b.lastChatted || 0) - (a.lastChatted || 0)).forEach(bot => {
        const card = _makeBotCardDOM(bot, true);
        grid.appendChild(card);
    });
    list.appendChild(grid);
}

function openBotBio(botId) {
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    curId = botId;
    // Don't clear curGroupId here - bio popup should work in group context too
    showBioPopup();
}

function _makeBotCardDOM(bot, fromHidden) {
    const card = document.createElement('div');
    card.className = 'bot-card';
    if (bot.favourite) card.style.border = '1.5px solid #f59e0b66';

    let pressTimer = null;
    let wasLongPress = false;
    const startPress = (e) => {
        wasLongPress = false;
        pressTimer = setTimeout(() => {
            wasLongPress = true;
            pressTimer = null;
            openCardCtx(bot.id, fromHidden);
        }, 500);
    };
    const cancelPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
    card.addEventListener('touchstart', startPress, { passive: true });
    card.addEventListener('touchend', cancelPress);
    card.addEventListener('touchmove', cancelPress);
    card.addEventListener('contextmenu', (e) => { e.preventDefault(); openCardCtx(bot.id, fromHidden); });

    // Use addEventListener instead of onclick to avoid conflicts
    let clickTimestamp = 0;
    const CLICK_GUARD_MS = 400; // Prevent double-click issues

    card.addEventListener('click', (e) => {
        e.preventDefault();
        const now = Date.now();
        if (now - clickTimestamp < CLICK_GUARD_MS) return; // Ignore rapid clicks
        clickTimestamp = now;

        if (wasLongPress) { wasLongPress = false; return; }
        if (e.target.closest('.bot-card-fav')) return;
        // Allow avatar and name clicks to proceed to openChat if they didn't trigger bio popup
        // The avatar/name handlers use stopPropagation, so if we reach here, they didn't handle it
        try { openChat(bot.id); } catch (err) { console.error('Bot card click error:', err); }
    });

    const imgWrap = document.createElement('div');
    imgWrap.className = 'bot-card-img-wrap';

    if (bot.portraitUrl) {
        const portrait = document.createElement('img');
        portrait.className = 'bot-card-portrait';
        portrait.src = bot.portraitUrl;
        portrait.onerror = () => { portrait.style.display = 'none'; };
        imgWrap.appendChild(portrait);
        const av = document.createElement('img');
        av.className = 'bot-card-avatar';
        av.src = bot.avatar;
        av.onerror = () => { av.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(bot.name) + '&background=random'; };
        av.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            try { openChat(bot.id); } catch (err) { console.error('Avatar click error:', err); }
        });
        imgWrap.appendChild(av);
    } else {
        const av = document.createElement('img');
        av.className = 'bot-card-img';
        av.src = bot.avatar;
        av.onerror = () => { av.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(bot.name) + '&background=random'; };
        av.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            try { openChat(bot.id); } catch (err) { console.error('Avatar click error:', err); }
        });
        imgWrap.appendChild(av);
    }

    if (bot.lastChatted) {
        const timeStr = (() => { const d = new Date(bot.lastChatted); return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'); })();
        const timeBadge = document.createElement('div');
        timeBadge.className = 'bot-card-time';
        timeBadge.textContent = timeStr;
        imgWrap.appendChild(timeBadge);
    }

    if (bot.favourite) {
        const favDot = document.createElement('div');
        favDot.className = 'bot-card-fav';
        favDot.innerHTML = '⭐';
        imgWrap.appendChild(favDot);
    }

    card.appendChild(imgWrap);
    const body = document.createElement('div');
    body.className = 'bot-card-body';
    const lastMsg = bot.history && bot.history.length > 0 ? bot.history[bot.history.length - 1] : null;
    const preview = lastMsg ? lastMsg.content.replace(/^EMOTION::\S+\s*/m, '').replace(/<[^>]+>/g, '').trim().substring(0, 45) : (bot.bio || bot.prompt || '').substring(0, 45);
    const nameDiv = document.createElement('div');
    nameDiv.className = 'bot-card-name';
    nameDiv.innerHTML = escapeHTML(bot.name) + (bot.hidden ? ' <span style="font-size:10px;color:#60a5fa">👁️‍🗨️</span>' : '');
    nameDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        openBotBio(bot.id);
    });
    const descDiv = document.createElement('div');
    descDiv.className = 'bot-card-desc';
    descDiv.textContent = preview;
    body.appendChild(nameDiv);
    body.appendChild(descDiv);
    card.appendChild(body);
    return card;
}

function _makeGroupCardDOM(grp) {
    // ... (rest of the code remains the same)
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    if (!members.length) return null;
    const card = document.createElement('div');
    card.className = 'bot-card-group';

    let pressTimer = null;
    let wasLongPress = false;
    const startPress = (e) => {
        wasLongPress = false;
        pressTimer = setTimeout(() => {
            wasLongPress = true;
            pressTimer = null;
            openGrpCtx(grp.id);
        }, 500);
    };
    const cancelPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
    card.addEventListener('touchstart', startPress, { passive: true });
    card.addEventListener('touchend', cancelPress);
    card.addEventListener('touchmove', cancelPress);
    card.addEventListener('contextmenu', (e) => { e.preventDefault(); openGrpCtx(grp.id); });

    // Use addEventListener instead of onclick
    card.addEventListener('click', (e) => {
        if (wasLongPress) { wasLongPress = false; return; }
        openGroupChat(grp.id);
    });

    const imgWrap = document.createElement('div');
    const showMembers = members.slice(0, 4);
    imgWrap.className = 'grp-card-img-wrap' + (showMembers.length === 1 ? ' single' : '');
    showMembers.forEach(m => {
        const img = document.createElement('img');
        img.src = m.avatar || m.portraitUrl;
        img.onerror = () => { img.src = m.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name) + '&background=random'; };
        imgWrap.appendChild(img);
    });
    if (showMembers.length === 3) {
        const fill = document.createElement('div'); fill.style.cssText = 'background:var(--bg-main)'; imgWrap.appendChild(fill);
    }
    const badge = document.createElement('div'); badge.className = 'grp-badge'; badge.textContent = 'GROUP'; imgWrap.appendChild(badge);
    card.appendChild(imgWrap);
    const body = document.createElement('div');
    body.className = 'grp-card-body';
    body.innerHTML = '<div class="grp-card-name">' + escapeHTML(grp.name) + '</div>';
    card.appendChild(body);
    return card;
}

function openCardCtx(botId, fromHidden) {
    _ctxBotId = botId;
    _ctxFromHidden = !!fromHidden;
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    document.getElementById('card-ctx-name').textContent = bot.name;
    document.getElementById('ctx-fav-label').textContent = bot.favourite ? 'Unfavourite' : 'Favourite';
    document.getElementById('ctx-fav-btn').style.color = bot.favourite ? '#f59e0b' : '#f59e0b';
    document.getElementById('ctx-hide-label').textContent = bot.hidden ? 'Unhide' : 'Hide';
    document.getElementById('ctx-del-btn').style.opacity = bot.favourite ? '0.35' : '1';
    document.getElementById('ctx-del-btn').title = bot.favourite ? 'Unfavourite first to delete' : '';
    document.getElementById('card-ctx-overlay').style.display = 'flex';
}
function closeCardCtx() {
    document.getElementById('card-ctx-overlay').style.display = 'none';
    _ctxBotId = null;
}
function ctxToggleFav() {
    const bot = bots.find(b => b.id === _ctxBotId);
    if (!bot) return;
    bot.favourite = !bot.favourite;
    saveBots();
    closeCardCtx();
    renderBotList();
    if (_ctxFromHidden) renderHiddenBotList();
}
function ctxToggleHide() {
    const bot = bots.find(b => b.id === _ctxBotId);
    if (!bot) return;
    bot.hidden = !bot.hidden;
    saveBots();
    closeCardCtx();
    renderBotList();
    if (_ctxFromHidden) renderHiddenBotList();
}
function ctxDelete() {
    const bot = bots.find(b => b.id === _ctxBotId);
    if (!bot) return;
    if (bot.favourite) { showGrpToast('â­ Unfavourite first before deleting', '#1a0e00', '#f59e0b'); closeCardCtx(); return; }
    if (!confirm('Delete "' + bot.name + '"? This cannot be undone.')) return;
    bots = bots.filter(b => b.id !== _ctxBotId);
    saveBots();
    closeCardCtx();
    renderBotList();
    if (_ctxFromHidden) renderHiddenBotList();
}

function openGrpCtx(grpId) {
    _grpCtxId = grpId;
    const grp = groups.find(g => g.id === grpId);
    document.getElementById('grp-ctx-name').textContent = grp ? grp.name : 'Group';
    document.getElementById('grp-ctx-overlay').style.display = 'flex';
}
function closeGrpCtx() {
    document.getElementById('grp-ctx-overlay').style.display = 'none';
    _grpCtxId = null;
}
function grpCtxDelete() {
    if (!_grpCtxId) return;
    const grp = groups.find(g => g.id === _grpCtxId);
    if (!grp || !confirm('Delete group "' + grp.name + '"?')) return;
    groups = groups.filter(g => g.id !== _grpCtxId);
    saveGroups();
    closeGrpCtx();
    renderBotList();
}

let _sessionTokens = { prompt: 0, completion: 0 };
let _grpSessionTokens = { prompt: 0, completion: 0 };
function trackTokens(usage, isGroup) {
    if (!usage) return;
    if (isGroup) {
        _grpSessionTokens.prompt += (usage.prompt_tokens || 0);
        _grpSessionTokens.completion += (usage.completion_tokens || 0);
        const total = _grpSessionTokens.prompt + _grpSessionTokens.completion;
        const badge = document.getElementById('grp-session-token-badge');
        const row = document.getElementById('grp-token-menu-row');
        if (badge) {
            badge.textContent = '🪙 ' + total.toLocaleString() + ' tk  ·  in: ' + _grpSessionTokens.prompt.toLocaleString() + '  out: ' + _grpSessionTokens.completion.toLocaleString();
        }
        if (row) row.style.display = 'flex';
    } else {
        _sessionTokens.prompt += (usage.prompt_tokens || 0);
        _sessionTokens.completion += (usage.completion_tokens || 0);
        const total = _sessionTokens.prompt + _sessionTokens.completion;
        const badge = document.getElementById('session-token-badge');
        const row = document.getElementById('solo-token-menu-row');
        if (badge) {
            badge.textContent = '🪙 ' + total.toLocaleString() + ' tk  ·  in: ' + _sessionTokens.prompt.toLocaleString() + '  out: ' + _sessionTokens.completion.toLocaleString();
            badge.title = 'Session: ' + _sessionTokens.prompt + ' in / ' + _sessionTokens.completion + ' out';
        }
        if (row) row.style.display = 'flex';
    }
}
const PERSONA_MALE_TRAITS = [

    { name: 'Alpha', mutable: true, desc: 'Commands the room without trying; authority radiates from every gesture' },
    { name: 'Brooding Hero', mutable: true, desc: 'Dark, tortured depth beneath a strong exterior; pain worn like armor' },
    { name: 'Roguish', mutable: true, desc: 'Devilish charm with a wicked grin; rules are for others to follow' },
    { name: 'Chivalrous', mutable: true, desc: 'Old-world honor; protects, provides, and never strikes first' },
    { name: 'Stoic Provider', mutable: true, desc: 'Expresses love through action and protection rather than words' },
    { name: 'Commanding', mutable: true, desc: 'When he speaks, people listen - authority is as natural as breathing' },
    { name: 'Territorial', mutable: true, desc: 'What is his, is his; trespass on his people or space at your peril' },
    { name: 'Primal', mutable: true, desc: 'Raw instinct close to the surface - hunger, drive, and intensity' },
    { name: 'Calculating', mutable: true, desc: 'Every move measured in advance; emotion is a tool, not a weakness' },
    { name: 'Relentless', mutable: true, desc: 'Never stops; obstacles are puzzles, not walls' },

    { name: 'Romantic', mutable: true, desc: 'Believes deeply in love; expresses affection through grand and tender gestures' },
    { name: 'Possessive', mutable: true, desc: 'Treats loved ones as his alone; struggles with sharing attention' },
    { name: 'Jealous', mutable: true, desc: 'Easily threatened by rivals; needs constant reassurance' },
    { name: 'Protective', mutable: true, desc: 'Instinctively shields those he loves, sometimes to a suffocating degree' },
    { name: 'Loyal', mutable: true, desc: 'Once committed, stands by his person through every storm' },
    { name: 'Affectionate', mutable: true, desc: 'Expresses warmth freely through gestures and small tender acts' },

    { name: 'Dominant', mutable: true, desc: 'Naturally takes charge; expects to lead in all dynamics' },
    { name: 'Manipulative', mutable: true, desc: 'Bends situations and people to his will through subtle moves' },
    { name: 'Cunning', mutable: true, desc: 'Sharp-minded and calculating; always three steps ahead' },
    { name: 'Vindictive', mutable: true, desc: 'Wrongs are never forgotten; revenge is planned slowly and savored' },
    { name: 'Competitive', mutable: true, desc: 'Must win at everything; second place is personal failure' },

    { name: 'Arrogant', mutable: true, desc: 'Convinced of his own superiority; holds others to a lower standard' },
    { name: 'Sarcastic', mutable: true, desc: 'Weaponizes wit; every compliment might be an insult in disguise' },
    { name: 'Provocative', mutable: true, desc: 'Deliberately stirs tension; enjoys watching others react' },
    { name: 'Intense', mutable: true, desc: 'Feels and acts at full volume; nothing is casual or half-hearted' },
    { name: 'Explosive', mutable: true, desc: 'Erupts without warning; emotions detonate rather than simmer' },

    { name: 'Aloof', mutable: true, desc: 'Emotional distance as armor; closeness must be earned, slowly' },
    { name: 'Brooding', mutable: true, desc: 'Carries a quiet storm within; dark thoughts simmer beneath stillness' },
    { name: 'Secretive', mutable: true, desc: 'Reveals little; guards his inner world with deliberate silence' },

    { name: 'Calm', mutable: true, desc: 'Unshaken by turbulence; steady presence anchors those around him' },
    { name: 'Disciplined', mutable: true, desc: 'Operates by structure; impulse is the enemy' },
    { name: 'Confident', mutable: true, desc: 'Comfortable in his own skin; doubt is a stranger he rarely entertains' },
    { name: 'Charismatic', mutable: true, desc: 'Commands attention effortlessly; people gravitate toward him' },
    { name: 'Independent', mutable: true, desc: 'Relies on himself first; accepting help feels like surrender' },
    { name: 'Stubborn', mutable: true, desc: 'Changing his mind requires moving a mountain' },
    { name: 'Resilient', mutable: true, desc: 'Bends but does not break; rises from setbacks with quiet determination' },

    { name: 'Intelligent', mutable: true, desc: 'Sharp analytical mind; connects dots others miss entirely' },
    { name: 'Witty', mutable: true, desc: 'Quick with clever observations; humor is his sharpest tool' },
    { name: 'Mature', mutable: true, desc: 'Wisdom beyond his years; handles weight without collapsing' },

    { name: 'Strong-willed', mutable: false, desc: 'An unbreakable core that no pressure or threat can crack' },
    { name: 'Born leader', mutable: false, desc: 'Commands respect instinctively; others follow before he speaks' },
    { name: 'Innate genius', mutable: false, desc: 'Born with a mind that processes reality at an extraordinary level' },
    { name: 'Silver tongue', mutable: false, desc: 'Words bend reality; persuasion is as natural as breathing' },
    { name: 'Magnetic presence', mutable: false, desc: 'Their very existence draws people in - rooms shift when he enters' },
    { name: 'Sixth sense', mutable: false, desc: 'Perceives what others cannot - danger, truth, hidden emotion' },
    { name: 'Apex Predator Aura', mutable: false, desc: 'Innate dominance that triggers submission in others without a word' },
    { name: 'Unbreakable', mutable: false, desc: 'No amount of pain or loss can crack him - he endures where others collapse' },
    { name: 'Born Dominant', mutable: false, desc: 'Control is not a choice; it is his default state in every dynamic' },
];

let selectedPersonaTraits = new Map();
let _personaTraitTab = 'all';

function openPersonaTraitPicker() {
    _personaTraitTab = 'all';
    document.querySelectorAll('[data-ptab]').forEach(b => b.classList.toggle('active', b.dataset.ptab === 'all'));
    document.getElementById('persona-trait-search').value = '';
    renderPersonaTraitList();
    const overlay = document.getElementById('persona-trait-picker-overlay');
    overlay.style.display = 'flex';
    overlay.style.pointerEvents = 'auto';
}

function closePersonaTraitPicker() {
    const overlay = document.getElementById('persona-trait-picker-overlay');
    overlay.style.display = 'none';
    overlay.style.pointerEvents = 'none';
}

function switchPersonaTab(tab) {
    _personaTraitTab = tab;
    document.querySelectorAll('[data-ptab]').forEach(b => b.classList.toggle('active', b.dataset.ptab === tab));
    renderPersonaTraitList();
}

function renderPersonaTraitList() {
    const q = (document.getElementById('persona-trait-search').value || '').toLowerCase();
    let list = PERSONA_MALE_TRAITS.filter(t => {
        if (q && !t.name.toLowerCase().includes(q) && !t.desc.toLowerCase().includes(q)) return false;
        if (_personaTraitTab === 'mutable') return t.mutable;
        if (_personaTraitTab === 'immutable') return !t.mutable;
        return true;
    });
    const el = document.getElementById('persona-trait-list');
    if (!list.length) { el.innerHTML = '<div style="color:var(--text-sub);font-size:13px;padding:16px;text-align:center">No traits found.</div>'; return; }
    el.innerHTML = list.map(t => {
        const isSel = selectedPersonaTraits.has(t.name);
        const selClass = isSel ? (t.mutable ? 'selected' : 'selected imm') : '';
        return `<div class="trait-picker-item ${selClass}" onclick="togglePersonaTrait('${t.name}',${t.mutable})">
      <div class="trait-picker-check">${isSel ? '✓' : ''}</div>
      <div style="flex:1">
        <div class="trait-picker-name">${t.name}</div>
        <div style="font-size:11px;color:var(--text-sub)">${t.desc}</div>
      </div>
      <span class="trait-picker-badge" style="background:${t.mutable ? '#0a1a30' : '#1a0b2e'};color:${t.mutable ? '#60a5fa' : '#a78bfa'};border:1px solid ${t.mutable ? '#0084ff55' : '#7c3aed55'}">${t.mutable ? '⟳' : '🔒'}</span>
    </div>`;
    }).join('');
}

function togglePersonaTrait(name, mutable) {
    if (selectedPersonaTraits.has(name)) {
        selectedPersonaTraits.delete(name);
    } else {
        selectedPersonaTraits.set(name, mutable);
    }
    renderPersonaTraitList();
    renderPersonaTraitChips();
}

// renderPersonaTraitChips() is defined in traits/traits_picker.js
function setGroupPersona(personaId) {
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    if (grp.personaLocked) return;
    grp.personaId = personaId || '';
    saveGroups();
    _renderGroupPersonaContent(grp);
}

function toggleGroupPersonaLock() {
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    // If already locked, prevent unlocking and show warning
    if (grp.personaLocked) {
        showToast('🔒 Persona is permanently locked. You can\'t repick for the best experience.', '#1a0b2e', '#a855f7');
        return;
    }
    grp.personaLocked = true;
    saveGroups();
    _applyGroupPersonaLockUI(grp);
}

function _applyGroupPersonaLockUI(grp) {
    const sel = document.getElementById('grp-persona-select');
    const btn = document.getElementById('grp-persona-lock-btn');
    const hint = document.getElementById('grp-persona-lock-hint');
    const locked = !!(grp && grp.personaLocked);
    if (sel) sel.disabled = locked;
    if (btn) {
        btn.textContent = locked ? '🔒' : '🔓';
        btn.style.background = locked ? '#2a0a3a' : '#1a0b2e';
        btn.style.borderColor = locked ? '#a855f7' : '#3b156b';
        btn.title = locked ? 'Unlock to change persona' : 'Lock persona';
    }
    if (hint) hint.style.display = locked ? 'block' : 'none';
}

function _renderGroupPersonaContent(grp) {
    const content = document.getElementById('grp-persona-quick-content');
    if (!content) return;
    const personaId = grp ? grp.personaId : '';
    if (!personaId) {
        content.innerHTML = '<div style="color:var(--text-sub);font-style:italic;text-align:center;padding:10px">No persona active for this group.</div>';
        return;
    }
    const p = personas.find(x => x.id === personaId);
    if (!p) { content.innerHTML = '<div style="color:#ff4444;text-align:center;padding:10px">Persona data not found.</div>'; return; }
    const traitList = (p.traits && p.traits.length) ? p.traits.map(tr => `<span style="background:#1a0b2e;border:1px solid #7c3aed44;color:#c084fc;border-radius:8px;padding:2px 8px;font-size:11px">${tr}</span>`).join(' ') : '';
    content.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;gap:12px;padding-bottom:8px;border-bottom:1px solid var(--border)">
            <div style="width:46px;height:46px;border-radius:50%;background:#1a0b2e;border:2px solid #b259ff;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">👤</div>
            <div>
              <div style="font-size:15px;font-weight:bold;color:#b259ff">${escapeHTML(p.name)}</div>
              <div style="font-size:11px;color:var(--text-sub)">${escapeHTML(p.gender)}${p.age ? ' · ' + p.age + ' y/o' : ''}${p.career ? ' · ' + escapeHTML(p.career) : ''}${p.country ? ' · ' + escapeHTML(p.country) : ''}</div>
            </div>
          </div>
          ${p.appearance ? `<div><span style="font-size:10px;color:#888;text-transform:uppercase;font-weight:bold">Appearance</span><div style="font-size:12px;color:var(--text-sub);margin-top:2px">${escapeHTML(p.appearance)}</div></div>` : ''}
          ${p.bio ? `<div><span style="font-size:10px;color:#888;text-transform:uppercase;font-weight:bold">Background</span><div style="font-size:12px;color:var(--text-sub);margin-top:2px">${escapeHTML(p.bio)}</div></div>` : ''}
          ${traitList ? `<div><span style="font-size:10px;color:#888;text-transform:uppercase;font-weight:bold">Traits</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${traitList}</div></div>` : ''}
          ${p.prompt ? `<div><span style="font-size:10px;color:#888;text-transform:uppercase;font-weight:bold">Notes / Personality</span><div style="font-size:12px;color:var(--text-sub);font-style:italic;margin-top:2px">${escapeHTML(p.prompt)}</div></div>` : ''}
        </div>`;
}

function openGroupPersonaPanel() {
    const overlay = document.getElementById('grp-persona-quick-overlay');
    const content = document.getElementById('grp-persona-quick-content');
    if (!overlay || !content) return;
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) { content.innerHTML = '<div style="color:var(--text-sub);font-style:italic;text-align:center;padding:14px">No active group.</div>'; overlay.style.display = 'flex'; return; }
    
    // If locked, show warning and prevent opening
    if (grp.personaLocked && grp.personaId) {
        showToast('🔒 Persona is locked. You can\'t repick for the best experience.', '#1a0b2e', '#a855f7');
        return;
    }

    const sel = document.getElementById('grp-persona-select');
    if (sel) {
        sel.innerHTML = '<option value="">- None (no persona) -</option>';
        personas.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name + (p.gender ? ' (' + p.gender + ')' : '');
            sel.appendChild(opt);
        });
        sel.value = grp.personaId || '';
    }


    _applyGroupPersonaLockUI(grp);

    _renderGroupPersonaContent(grp);
    overlay.style.display = 'flex';
}

// rollBotCareer() is defined in js/shared.js (superior version with culture context + fallback)

async function rollPersonaCareer(btn) {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    diceSpin(btn); setDiceLoading(btn, true);
    const gender = document.getElementById('persona-gender').value;
    const country = document.getElementById('persona-country').value.trim();
    try {
        const result = await callLlama(
            `Generate a single realistic career/occupation for a ${gender} person${country ? ' from ' + country : ''}. Return ONLY the job title.`,
            'Generate a career.'
        );
        document.getElementById('persona-career').value = result.replace(/["\'\.]/g, '').trim();
    } catch (e) { logError('rollPersonaCareer failed', e.message); }
    setDiceLoading(btn, false);
}

function openPersonaQuickPanel() {
    const overlay = document.getElementById('persona-quick-overlay');
    const content = document.getElementById('persona-quick-content');
    if (!overlay || !content) return;
    const bot = bots.find(b => b.id === curId);
    const locked = !!(bot && bot.personaLocked);
    
    // If locked, show warning and prevent opening
    if (locked && bot.personaId) {
        showToast('🔒 Persona is locked. You can\'t repick for the best experience.', '#1a0b2e', '#a855f7');
        return;
    }

    let selectorHtml = '';
    if (personas.length > 0 || (bot && bot.personaId)) {
        const currentId = bot ? (bot.personaId || '') : '';
        const opts = personas.map(p => {
            const isSel = currentId === p.id ? ' selected' : '';
            return '<option value="' + escapeHTML(p.id) + '"' + isSel + '>' + escapeHTML(p.name) + (p.gender ? ' (' + escapeHTML(p.gender) + ')' : '') + '</option>';
        }).join('');
        const lockIcon = locked ? '\uD83D\uDD12' : '\uD83D\uDD13';
        const lockBg = locked ? '#2a0a3a' : '#1a0b2e';
        const lockBorder = locked ? '#a855f7' : '#3b156b';
        const lockTitle = locked ? 'Unlock to change persona' : 'Lock persona';
        const hintDisplay = locked ? 'block' : 'none';
        selectorHtml = '<div style="margin-bottom:10px">'
            + '<label style="font-size:11px;color:#888;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:5px">Active persona for this bot:</label>'
            + '<div style="display:flex;gap:6px;align-items:center">'
            + '<select id="solo-persona-select" class="form-control" style="border-color:#3b156b;font-size:13px;padding:8px;flex:1"' + (locked ? ' disabled' : '') + ' onchange="setSoloChatPersona(this.value)"><option value="">- None -</option>' + opts + '</select>'
            + '<button id="solo-persona-lock-btn" onclick="toggleSoloPersonaLock()" title="' + lockTitle + '" style="background:' + lockBg + ';border:1px solid ' + lockBorder + ';color:#b259ff;border-radius:10px;width:38px;height:38px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s">' + lockIcon + '</button>'
            + '</div>'
            + '<div id="solo-persona-lock-hint" style="font-size:10px;color:var(--text-sub);margin-top:4px;display:' + hintDisplay + '">\uD83D\uDD12 Locked \u2014 tap the lock to change persona.</div>'
            + '</div>';
    }

    if (!bot || !bot.personaId) {
        content.innerHTML = selectorHtml + '<div style="color:var(--text-sub);font-style:italic;text-align:center;padding:14px">No persona active for this chatbot.<br><button onclick="openScreen(\'sc-create-persona\');document.getElementById(\'persona-quick-overlay\').style.display=\'none\';" style="margin-top:8px;background:#b259ff22;border:1px solid #b259ff;color:#b259ff;border-radius:10px;padding:7px 16px;cursor:pointer;font-weight:bold">+ Create Persona</button></div>';
        overlay.style.display = 'flex';
        return;
    }
    const p = personas.find(x => x.id === bot.personaId);
    if (!p) {
        content.innerHTML = selectorHtml + '<div style="color:#ff4444;text-align:center;padding:10px">Persona data not found.</div>';
        overlay.style.display = 'flex';
        return;
    }
    const traitList = (p.traits && p.traits.length) ? p.traits.map(tr => '<span style="background:#1a0b2e;border:1px solid #7c3aed44;color:#c084fc;border-radius:8px;padding:2px 8px;font-size:11px">' + escapeHTML(tr) + '</span>').join(' ') : '';
    content.innerHTML = selectorHtml
        + '<div style="display:flex;flex-direction:column;gap:8px">'
        + '<div style="display:flex;align-items:center;gap:12px;padding-bottom:8px;border-bottom:1px solid var(--border)">'
        + '<div style="width:46px;height:46px;border-radius:50%;background:#1a0b2e;border:2px solid #b259ff;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">\u{1F464}</div>'
        + '<div>'
        + '<div style="font-size:15px;font-weight:bold;color:#b259ff">' + escapeHTML(p.name) + '</div>'
        + '<div style="font-size:11px;color:var(--text-sub)">' + escapeHTML(p.gender) + (p.age ? ' \u00B7 ' + p.age + ' y/o' : '') + (p.career ? ' \u00B7 ' + escapeHTML(p.career) : '') + (p.country ? ' \u00B7 ' + escapeHTML(p.country) : '') + '</div>'
        + '</div></div>'
        + (p.appearance ? '<div><span style="font-size:10px;color:#888;text-transform:uppercase;font-weight:bold">Appearance</span><div style="font-size:12px;color:var(--text-sub);margin-top:2px">' + escapeHTML(p.appearance) + '</div></div>' : '')
        + (p.bio ? '<div><span style="font-size:10px;color:#888;text-transform:uppercase;font-weight:bold">Background</span><div style="font-size:12px;color:var(--text-sub);margin-top:2px">' + escapeHTML(p.bio) + '</div></div>' : '')
        + (traitList ? '<div><span style="font-size:10px;color:#888;text-transform:uppercase;font-weight:bold">Traits</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">' + traitList + '</div></div>' : '')
        + (p.prompt ? '<div><span style="font-size:10px;color:#888;text-transform:uppercase;font-weight:bold">Notes</span><div style="font-size:12px;color:var(--text-sub);font-style:italic;margin-top:2px">' + escapeHTML(p.prompt) + '</div></div>' : '')
        + '</div>';
    overlay.style.display = 'flex';
}

function setSoloChatPersona(personaId) {
    const bot = bots.find(b => b.id === curId);
    if (!bot || bot.personaLocked) return;
    bot.personaId = personaId || '';
    saveBots();
    openPersonaQuickPanel();
}

function toggleSoloPersonaLock() {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    // If already locked, prevent unlocking and show warning
    if (bot.personaLocked) {
        showToast('🔒 Persona is permanently locked. You can\'t repick for the best experience.', '#1a0b2e', '#a855f7');
        return;
    }
    bot.personaLocked = true;
    saveBots();
    openPersonaQuickPanel();
}

// Stores form data per mode so switching doesn't bleed data between them
var _formDataByMode = { realistic: null, anime: null };
var _currentFormMode = 'realistic';

function _saveFormSnapshot(mode) {
    var snap = {};
    ['bot-name', 'bot-age', 'bot-career', 'bot-relation', 'bot-year', 'bot-country',
        'bot-bio', 'bot-context', 'bot-prompt', 'bot-app', 'bot-series'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) snap[id] = el.value;
        });
    var g = document.getElementById('bot-gender');
    if (g) snap['bot-gender'] = g.value;
    var img = document.getElementById('bot-img-style');
    if (img) snap['bot-img-style'] = img.value;
    // save avatar
    var avUrl = document.getElementById('bot-av-url');
    if (avUrl) snap['bot-av-url'] = avUrl.value;
    var avPreview = document.getElementById('av-preview');
    if (avPreview) snap['av-preview-src'] = avPreview.src;
    // save portrait/chat background
    var portraitUrl = document.getElementById('bot-portrait-url');
    if (portraitUrl) snap['bot-portrait-url'] = portraitUrl.value;
    var portraitPreview = document.getElementById('portrait-preview');
    if (portraitPreview) {
        snap['portrait-preview-src'] = portraitPreview.src;
        snap['portrait-preview-display'] = portraitPreview.style.display;
    }
    var portraitEditSection = document.getElementById('portrait-edit-section');
    if (portraitEditSection) snap['portrait-edit-display'] = portraitEditSection.style.display;
    // save appearance tags array
    snap['_appTags'] = typeof _appTags !== 'undefined' ? _appTags.slice() : [];
    _formDataByMode[mode] = snap;
}

function _restoreFormSnapshot(mode) {
    var snap = _formDataByMode[mode];
    var empty = !snap;
    var data = snap || {};

    function sv(id, val) {
        var el = document.getElementById(id);
        if (!el) return;
        el.value = val != null ? String(val) : '';
        if (typeof autoResize === 'function' && el.tagName === 'TEXTAREA') autoResize(el);
    }

    ['bot-name', 'bot-age', 'bot-career', 'bot-relation', 'bot-year', 'bot-country',
        'bot-bio', 'bot-context', 'bot-prompt', 'bot-series'].forEach(function (id) {
            sv(id, empty ? '' : (data[id] || ''));
        });
    var g = document.getElementById('bot-gender');
    if (g) g.value = empty ? 'Female' : (data['bot-gender'] || 'Female');
    var img = document.getElementById('bot-img-style');
    if (img) img.value = empty ? (mode === 'anime' ? 'anime' : 'photorealism') : (data['bot-img-style'] || 'photorealism');

    // Restore avatar
    var avUrl = document.getElementById('bot-av-url');
    if (avUrl) avUrl.value = empty ? '' : (data['bot-av-url'] || '');
    var avPreview = document.getElementById('av-preview');
    if (avPreview) avPreview.src = empty 
        ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Ccircle cx='45' cy='45' r='45' fill='%23111111'/%3E%3C/svg%3E"
        : (data['av-preview-src'] || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Ccircle cx='45' cy='45' r='45' fill='%23111111'/%3E%3C/svg%3E");

    // Restore portrait/chat background
    var portraitUrl = document.getElementById('bot-portrait-url');
    if (portraitUrl) portraitUrl.value = empty ? '' : (data['bot-portrait-url'] || '');
    var portraitPreview = document.getElementById('portrait-preview');
    if (portraitPreview) {
        portraitPreview.src = empty ? '' : (data['portrait-preview-src'] || '');
        portraitPreview.style.display = empty ? 'none' : (data['portrait-preview-display'] || 'none');
    }
    var portraitEditSection = document.getElementById('portrait-edit-section');
    if (portraitEditSection) {
        portraitEditSection.style.display = empty ? 'none' : (data['portrait-edit-display'] || 'none');
    }

    // Restore appearance tags
    if (typeof initAppTags === 'function') {
        initAppTags(empty ? '' : (data['bot-app'] || ''));
    }
}

function graceSetMode(mode) {
    var isAnime = (mode === 'anime');

    // Save current mode snapshot before switching
    if (_currentFormMode !== mode) {
        _saveFormSnapshot(_currentFormMode);
        _currentFormMode = mode;
        _restoreFormSnapshot(mode);
    }

    var rBtn = document.getElementById('ctog-real');
    var aBtn = document.getElementById('ctog-anime');
    var panel = document.getElementById('anime-panel');
    var title = document.getElementById('lbl-create-title');
    var sc = document.getElementById('sc-create');
    var randomizeWrap = document.getElementById('randomize-fields-wrap');

    if (rBtn) {
        rBtn.style.background = isAnime ? '#111' : '#0d2a4a';
        rBtn.style.borderColor = isAnime ? '#222' : '#0084ff';
        rBtn.style.color = isAnime ? '#555' : '#60b3ff';
    }
    if (aBtn) {
        aBtn.style.background = isAnime ? 'linear-gradient(135deg,#2a0050,#3a0030)' : '#111';
        aBtn.style.borderColor = isAnime ? '#a855f7' : '#222';
        aBtn.style.color = isAnime ? '#e879f9' : '#555';
    }
    if (panel) panel.style.display = isAnime ? 'block' : 'none';
    if (randomizeWrap) randomizeWrap.style.display = isAnime ? 'none' : 'flex';
    if (title) title.textContent = isAnime ? '' : '';
    if (sc) {
        if (isAnime) sc.classList.add('anime-mode');
        else sc.classList.remove('anime-mode');
    }
    if (!isAnime) {
        var s = document.getElementById('anime-status');
        if (s) s.textContent = '';
    }
}

async function doAnimeSearch() {
    var charEl = document.getElementById('ai-char');
    var seriesEl = document.getElementById('ai-series');
    var btn = document.getElementById('anime-go-btn');
    var status = document.getElementById('anime-status');

    var charName = charEl ? charEl.value.trim() : '';
    var serieName = seriesEl ? seriesEl.value.trim() : '';

    if (!charName) {
        status.style.color = '#ef4444';
        status.textContent = '⚠️ Enter a character name first';
        if (charEl) charEl.focus();
        return;
    }

    var key = getNextGroqKey();
    if (!key) {
        status.style.color = '#ef4444';
        status.textContent = '⚠️ No Groq API key - add one in Settings';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Looking up ' + escapeHTML(charName) + '...';
    status.style.color = '#a855f7';
    status.textContent = 'Asking AI...';


    var arcKeywords = /arc|saga|arc|timeskip|post-|pre-|season|part |chapter|final|war|wano|marineford|dressrosa|alabasta|enies|thriller|punk hazard|whole cake|skypiea|water 7|episode|volume/i;
    var isArcHint = serieName && arcKeywords.test(serieName);
    var arcLine = isArcHint
        ? '\nARC/ERA SPECIFIED: "' + serieName + '" - appearance MUST reflect this exact arc/era, not any other. Use the outfit and hairstyle the character wears specifically during this arc.'
        : (serieName ? '\nSeries/Game/Movie: "' + serieName + '"' : '');

    var prompt = 'You are an expert fictional character visual database. Return accurate JSON for the character below.\n' +
        'Character: "' + charName + '"' + arcLine +
        '\n\n=== APPEARANCE - MOST CRITICAL FIELD ===\n' +
        'The "appearance" field feeds directly into an image generator. It must be comma-separated SHORT visual tags - like Stable Diffusion prompt tokens.\n' +
        'RULES:\n' +
        '- NO sentences. NO verbs (has, wears, sports, features). NO subject name.\n' +
        '- GOOD: "long straight orange hair, brown eyes, almond-shaped, fair skin, slim build, white crop top, black shorts, sandals, gold hoop earrings, tattoo left shoulder"\n' +
        '- BAD: "She has long orange hair and wears a white top with black shorts"\n' +
        '- Tag order: hair color + style + length â†’ eye color + shape â†’ skin tone â†’ body build/height â†’ EXACT clothing (garment + color + material + fit) â†’ footwear â†’ accessories â†’ tattoos/markings\n' +
        '- CANON-ACCURATE ONLY. Wrong color = wrong image. If unsure, omit rather than guess.\n' +
        (isArcHint
            ? '- ARC-SPECIFIC: Use the appearance from "' + serieName + '" specifically, NOT the character\'s earliest or most iconic look.\n'
            : '- Use the LATEST/ADULT version (post-timeskip if applicable, final arc look).\n- For characters who appear young via magic/technique (e.g. Tsunade) still tag as "adult, mature physique, [age]-year-old adult body" to prevent AI rendering a child.\n') +
        '- Minimum 10 tags. Be specific: "long straight orange hair past waist" not just "orange hair".\n' +
        '\n=== OTHER RULES ===\n' +
        '- "age": integer only, age at the specified arc (or latest if no arc given)\n' +
        '- "prompt": 4-5 core personality trait descriptors, NO behavior toward others, NO sentences\n' +
        '\nReturn ONLY raw JSON, no markdown, no explanation:\n' +
        '{\n' +
        '  "name": "full name",\n' +
        '  "series": "source title",\n' +
        '  "gender": "Male or Female",\n' +
        '  "age": <integer>,\n' +
        '  "career": "role/occupation",\n' +
        '  "appearance": "10+ comma-separated visual tags, arc-accurate, NO sentences",\n' +
        '  "bio": "backstory and key events relevant to this arc, 3-4 sentences",\n' +
        '  "prompt": "4-5 core personality trait descriptors",\n' +
        '  "context": "2-3 sentence first meeting scenario in second person",\n' +
        '  "relation": "relationship with user",\n' +
        '  "country": "world/setting",\n' +
        '  "year": "time period / arc"\n' +
        '}';

    async function callGroqForCharJSON(model) {
        var timeout = model.includes('120b') || model.includes('kimi') ? 90000 : 30000;
        var resp = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                max_tokens: 4000,
                temperature: 0.3,
                messages: [{ role: 'user', content: prompt }]
            }),
            signal: AbortSignal.timeout(timeout)
        });
        if (!resp.ok) {
            var eb = {}; try { eb = await resp.json(); } catch (e2) { }
            throw new Error((eb && eb.error && eb.error.message) ? eb.error.message : 'HTTP ' + resp.status);
        }
        var data = await resp.json();
        var msg = data.choices && data.choices[0] && data.choices[0].message;
        var raw = (msg && msg.content) ? msg.content.trim() : '';

        if (!raw && msg && msg.reasoning) raw = msg.reasoning.trim();
        raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

        var jsonStart = -1;
        var jsonEnd = -1;
        for (var i = raw.length - 1; i >= 0; i--) {
            if (raw[i] === '}') {
                jsonEnd = i;
                var depth = 0;
                for (var j = i; j >= 0; j--) {
                    if (raw[j] === '}') depth++;
                    else if (raw[j] === '{') depth--;
                    if (depth === 0) { jsonStart = j; break; }
                }
                if (jsonStart >= 0) break;
            }
        }
        if (jsonStart < 0 || jsonEnd < 0) throw new Error('No JSON in response');
        var jsonStr = raw.slice(jsonStart, jsonEnd + 1);

        jsonStr = jsonStr.replace(/[\u2010-\u2015\u2212]/g, '-')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"');
        try {
            return JSON.parse(jsonStr);
        } catch (pe) {
            throw new Error('Parse error');
        }
    }

    try {
        var c;
        status.style.color = '#a855f7'; status.textContent = 'Looking up character...';
        c = await callGroqForCharJSON(GROQ_SCHEDULE_MODEL);

        // Store result in preview - DO NOT fill the main form yet
        window._animePreviewData = c;

        // Build preview HTML
        var ageNum2 = c.age ? parseInt(c.age) : 0;
        var maturityTag = ageNum2 >= 30 ? ', mature adult woman, adult face, fully grown'
            : ageNum2 >= 18 ? ', young adult woman, adult' : '';
        window._animePreviewData._finalAppearance = (c.appearance || '') + maturityTag;

        var previewBox = document.getElementById('anime-preview-box');
        var previewContent = document.getElementById('anime-preview-content');
        if (previewBox && previewContent) {
            var _prevLines = [];
            _prevLines.push('<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:6px">' +
                '<b style="color:#c084fc;font-size:14px">' + escapeHTML(c.name || '') + '</b>' +
                (c.series ? '<span style="color:#a78bfa;font-size:12px">from ' + escapeHTML(c.series) + '</span>' : '') +
                '</div>');
            // Info row
            var _infoRow = [];
            if (c.gender) _infoRow.push('<span style="background:#1a0b2e;border:1px solid #7c3aed44;color:#c084fc;border-radius:10px;padding:2px 8px;font-size:10px">' + escapeHTML(c.gender) + '</span>');
            if (c.age) _infoRow.push('<span style="background:#0a1a30;border:1px solid #0084ff44;color:#60b3ff;border-radius:10px;padding:2px 8px;font-size:10px">Age ' + escapeHTML(String(c.age)) + '</span>');
            if (c.career) _infoRow.push('<span style="background:#0a1a20;border:1px solid #22c55e44;color:#86efac;border-radius:10px;padding:2px 8px;font-size:10px">' + escapeHTML(c.career) + '</span>');
            if (c.year) _infoRow.push('<span style="background:#1a1000;border:1px solid #f59e0b44;color:#fbbf24;border-radius:10px;padding:2px 8px;font-size:10px">' + escapeHTML(c.year) + '</span>');
            if (c.country) _infoRow.push('<span style="background:#1a1000;border:1px solid #f59e0b44;color:#fbbf24;border-radius:10px;padding:2px 8px;font-size:10px">' + escapeHTML(c.country) + '</span>');
            if (_infoRow.length) _prevLines.push('<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">' + _infoRow.join('') + '</div>');
            // Appearance
            if (c.appearance) _prevLines.push('<div style="font-size:11px;margin-bottom:4px"><span style="color:#888">Appearance: </span><span style="color:#d8b4fe">' + escapeHTML(c.appearance.substring(0, 160)) + (c.appearance.length > 160 ? '\u2026' : '') + '</span></div>');
            // Bio
            if (c.bio) _prevLines.push('<div style="font-size:11px;margin-bottom:4px"><span style="color:#888">Bio: </span>' + escapeHTML(c.bio.substring(0, 140)) + (c.bio.length > 140 ? '\u2026' : '') + '</div>');
            // Relation + context
            if (c.relation) _prevLines.push('<div style="font-size:11px;margin-bottom:4px"><span style="color:#888">Relationship: </span>' + escapeHTML(c.relation) + '</div>');
            if (c.context) _prevLines.push('<div style="font-size:11px;color:var(--text-sub);font-style:italic;border-top:1px solid var(--border);padding-top:6px;margin-top:4px">' + escapeHTML(c.context.substring(0, 160)) + (c.context.length > 160 ? '\u2026' : '') + '</div>');
            previewContent.innerHTML = _prevLines.join('');
            previewBox.style.display = 'block';
        }

        if (c.series && seriesEl) seriesEl.value = c.series;

        status.style.color = '#4ade80';
        status.textContent = '\u2705 ' + (c.name || charName) + ' found! Click "Apply to Form" to use.';

    } catch (err) {
        status.style.color = '#ef4444';
        status.textContent = err.name === 'TimeoutError' ? '\u23F1\uFE0F Timed out - try again' : '\u274C ' + (err.message || 'Error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-robot"></i> Search &amp; Fill All Fields';
}


// â”€â”€ STATE SYSTEM FUNCTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openStatePicker() {
    filterStatePicker('');
    const inp = document.getElementById('state-picker-search');
    if (inp) inp.value = '';
    document.getElementById('state-picker-overlay').style.display = 'flex';
}
function closeStatePicker() {
    document.getElementById('state-picker-overlay').style.display = 'none';
    const bot = bots.find(b => b.id === curId);
    if (bot) { saveBots(); renderStatesInBio(bot); renderGroupStatesInBio(bot); }
}
function filterStatePicker(q) {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    const lower = (q || '').toLowerCase();
    const body = document.getElementById('state-picker-body');
    if (!body) return;
    body.innerHTML = '';
    const list = ALL_STATES.filter(s => !q || s.label.toLowerCase().includes(lower) || s.desc.toLowerCase().includes(lower));
    list.forEach(s => {
        const isActive = hasBotState(bot, s.id);
        const row = document.createElement('div');
        row.className = 'trait-picker-item' + (isActive ? ' selected' : '');
        row.style.borderLeft = isActive ? `3px solid ${s.color}` : '';
        row.innerHTML = `<div class="trait-picker-check" style="${isActive ? 'background:' + s.color + ';border-color:' + s.color + ';color:#000' : ''}">${isActive ? '\u2713' : ''}</div>
            <div class="trait-picker-name" style="flex:1">
                <div>${s.icon} ${s.label}</div>
                <div style="font-size:10px;color:var(--text-sub);margin-top:1px">${s.desc}</div>
            </div>`;
        row.onclick = () => {
            setBotState(bot, s.id, !isActive);
            filterStatePicker(document.getElementById('state-picker-search')?.value || '');
        };
        body.appendChild(row);
    });
}
function renderStatesInBio(bot) {
    const box = document.getElementById('p-states-box');
    const chips = document.getElementById('p-states-chips');
    if (!box || !chips) return;
    const activeStates = (bot.states || []).map(id => ALL_STATES.find(s => s.id === id)).filter(Boolean);
    // Also auto-inject states based on cycleData
    const cd = bot.cycleData;
    const autoStates = [];
    if (cd) {
        if (cd.postpartumStartDay != null && !cd.pregnant) { if (!bot.states || !bot.states.includes('postpartum')) autoStates.push('postpartum'); }
        if (cd.pregnant && !cd.birthVirtualDay) { /* pregnancy shown in repro panel */ }
        if (cd.laborStarted && !cd.birthVirtualDay) { if (!bot.states || !bot.states.includes('in_labor')) autoStates.push('in_labor'); }
        if (cd.newbornPresent) { if (!bot.states || !bot.states.includes('nursing')) autoStates.push('nursing'); }
    }
    const allActive = [...new Set([...(bot.states || []), ...autoStates])];
    const displayStates = allActive.map(id => ALL_STATES.find(s => s.id === id)).filter(Boolean);
    if (displayStates.length === 0) { box.style.display = 'none'; return; }
    box.style.display = '';
    chips.innerHTML = displayStates.map(s =>
        `<span style="display:inline-flex;align-items:center;gap:4px;background:${s.bg};border:1px solid ${s.color}55;color:${s.color};border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600">${s.icon} ${s.label}</span>`
    ).join('');
}

function renderGroupStatesInBio(bot) {
    const box = document.getElementById('gp-states-box');
    const chips = document.getElementById('gp-states-chips');
    if (!box || !chips) return;
    const activeStates = (bot.states || []).map(id => ALL_STATES.find(s => s.id === id)).filter(Boolean);
    // Also auto-inject states based on cycleData
    const cd = bot.cycleData;
    const autoStates = [];
    if (cd) {
        if (cd.postpartumStartDay != null && !cd.pregnant) { if (!bot.states || !bot.states.includes('postpartum')) autoStates.push('postpartum'); }
        if (cd.pregnant && !cd.birthVirtualDay) { /* pregnancy shown in repro panel */ }
        if (cd.laborStarted && !cd.birthVirtualDay) { if (!bot.states || !bot.states.includes('in_labor')) autoStates.push('in_labor'); }
        if (cd.newbornPresent) { if (!bot.states || !bot.states.includes('nursing')) autoStates.push('nursing'); }
    }
    const allActive = [...new Set([...(bot.states || []), ...autoStates])];
    const displayStates = allActive.map(id => ALL_STATES.find(s => s.id === id)).filter(Boolean);
    if (displayStates.length === 0) { box.style.display = 'none'; return; }
    box.style.display = '';
    chips.innerHTML = displayStates.map(s =>
        `<span style="display:inline-flex;align-items:center;gap:4px;background:${s.bg};border:1px solid ${s.color}55;color:${s.color};border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600">${s.icon} ${s.label}</span>`
    ).join('');
}

// â”€â”€ CHILDREN SYSTEM FUNCTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getChildAge(child, bot) {
    if (!child || !child.birthDay) return 0;
    const currentDay = getVirtualDay(bot);
    return Math.max(0, currentDay - child.birthDay);
}
function formatChildAge(days) {
    if (days < 30) return days + ' day' + (days !== 1 ? 's' : '') + ' old';
    if (days < 365) return Math.floor(days / 30) + ' month' + (Math.floor(days / 30) !== 1 ? 's' : '') + ' old';
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    return years + 'y' + (months > 0 ? ' ' + months + 'm' : '') + ' old';
}
function openChildBio(childId) {
    // Find child across all bots
    let motherBot = null, child = null;
    for (const b of bots) {
        if (b.cycleData && b.cycleData.children) {
            const c = b.cycleData.children.find(x => x.id === childId);
            if (c) { motherBot = b; child = c; break; }
        }
    }
    if (!child) return;

    const ageDays = getChildAge(child, motherBot || bots[0]);
    const ageStr = formatChildAge(ageDays);
    const ageYears = Math.floor(ageDays / 365);
    const gIcon = child.gender === 'female' ? '\uD83D\uDC67' : child.gender === 'male' ? '\uD83D\uDC66' : '\uD83E\uDDD2';
    const gStr = child.gender === 'female' ? 'Female' : child.gender === 'male' ? 'Male' : 'Unknown';
    const isFemale = child.gender === 'female';

    // Traits HTML
    const traitsHtml = (child.traits || []).map(t => {
        const td = typeof ALL_TRAITS !== 'undefined' ? ALL_TRAITS.find(x => x.name === t) : null;
        const color = td && !td.mutable ? '#c084fc' : '#60a5fa';
        const bg = td && !td.mutable ? '#1a0b2e' : '#0a1a30';
        const icon = td && !td.mutable ? '\uD83D\uDD12 ' : '';
        return `<span style="display:inline-flex;align-items:center;background:${bg};border:1px solid ${color}44;color:${color};border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600">${icon}${t}</span>`;
    }).join('');

    // States HTML
    const activeStates = (child.states || []).map(id => ALL_STATES.find(s => s.id === id)).filter(Boolean);
    const statesHtml = activeStates.map(s =>
        `<span style="display:inline-flex;align-items:center;gap:4px;background:${s.bg};border:1px solid ${s.color}55;color:${s.color};border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600">${s.icon} ${s.label}</span>`
    ).join('');

    // Appearance from child data or auto-generate placeholder
    const appearance = child.appearance || (isFemale ? 'Appearance not yet recorded.' : 'Appearance not yet recorded.');

    // Body measurements estimate based on age
    let bodyMeasHtml = '';
    if (isFemale && ageYears >= 13) {
        bodyMeasHtml = `<div style="font-size:11px;color:var(--text-sub);font-style:italic;margin-top:4px">Body measurements unlock at adulthood (18+).</div>`;
    } else if (!isFemale) {
        bodyMeasHtml = '';
    } else {
        bodyMeasHtml = `<div style="font-size:11px;color:var(--text-sub);font-style:italic;margin-top:4px">Child - no measurements tracked.</div>`;
    }

    // Personality from traits
    const personalityText = child.personality || (child.traits || []).slice(0, 3).join(', ') || '-';

    // Build modal HTML - mirrors bot bio layout, minus cycle/pregnancy panels
    let modal = document.getElementById('child-bio-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'child-bio-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:600;display:flex;align-items:flex-end;justify-content:center';
        modal.innerHTML = '<div id="child-bio-content" style="background:var(--bg-panel);border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;padding:0 0 40px"></div>';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';

    document.getElementById('child-bio-content').innerHTML = `
        <!-- Header -->
        <div style="position:sticky;top:0;background:var(--bg-panel);border-bottom:1px solid var(--border);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;z-index:10">
            <div style="font-size:16px;font-weight:bold">${gIcon} ${child.name}</div>
            <button onclick="document.getElementById('child-bio-modal').style.display='none'" style="background:none;border:none;color:var(--text-sub);font-size:20px;cursor:pointer">\u2715</button>
        </div>

        <div style="padding:14px 16px">

        <!-- Avatar placeholder + name/age row -->
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">
            <div style="width:64px;height:64px;border-radius:50%;background:var(--av-bg);display:flex;align-items:center;justify-content:center;font-size:30px;flex-shrink:0">${gIcon}</div>
            <div>
                <div style="font-size:17px;font-weight:bold">${child.name}</div>
                <div style="font-size:12px;color:var(--text-sub);margin-top:2px">${gStr} · ${ageStr}</div>
                ${motherBot ? `<div style="font-size:11px;color:#a855f7;margin-top:2px">Mother: ${motherBot.name}</div>` : ''}
            </div>
        </div>

        <!-- Age & Born row -->
        <div style="display:flex;gap:6px;margin-bottom:8px">
            <div class="bio-detail-box" style="flex:1;margin-bottom:0">
                <div class="bio-detail-label">Age</div>
                <div class="bio-detail-text">${ageStr}</div>
            </div>
            <div class="bio-detail-box" style="flex:1;margin-bottom:0">
                <div class="bio-detail-label">Gender</div>
                <div class="bio-detail-text">${gStr}</div>
            </div>
            <div class="bio-detail-box" style="flex:1;margin-bottom:0">
                <div class="bio-detail-label">Born Day</div>
                <div class="bio-detail-text">${child.birthDay || 0}</div>
            </div>
        </div>

        <!-- Appearance & Body -->
        <div class="bio-detail-box" style="margin-bottom:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <div class="bio-detail-label" style="margin-bottom:0">Appearance &amp; Body</div>
                <button onclick="editChildField('${child.id}','appearance')" style="background:#1a000e;border:1px solid #f472b622;color:#f472b6;border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer">\u270F\uFE0F Edit</button>
            </div>
            <div style="font-size:12px;color:var(--text-sub)">${appearance}</div>
            ${bodyMeasHtml}
        </div>

        <!-- Background -->
        <div class="bio-detail-box" style="margin-bottom:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <div class="bio-detail-label" style="margin-bottom:0">Background</div>
                <button onclick="editChildField('${child.id}','bio')" style="background:#0a1a30;border:1px solid #0084ff22;color:#0084ff;border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer">\u270F\uFE0F Edit</button>
            </div>
            <div style="font-size:12px;color:var(--text-sub)">${child.bio || '-'}</div>
        </div>

        <!-- Personality -->
        <div class="bio-detail-box" style="margin-bottom:8px">
            <div class="bio-detail-label">\u26A1 Traits</div>
            <div style="font-size:12px;color:var(--text-main)">${personalityText}</div>
        </div>

        <!-- Traits -->
        ${traitsHtml ? `<div class="bio-detail-box" style="margin-bottom:8px">
            <div class="bio-detail-label">\u26A1 Inherited Traits</div>
            <div style="display:flex;flex-wrap:wrap;gap:5px;padding-top:2px">${traitsHtml}</div>
        </div>` : ''}

        <!-- States -->
        ${activeStates.length > 0 ? `<div class="bio-detail-box" style="margin-bottom:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <div class="bio-detail-label" style="margin-bottom:0">\uD83C\uDFF7\uFE0F Status</div>
                <button onclick="editChildStates('${child.id}')" style="background:#1a0e00;border:1px solid #f59e0b44;color:#f59e0b;border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer">+ Edit</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:5px">${statesHtml}</div>
        </div>` : `<div class="bio-detail-box" style="margin-bottom:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <div class="bio-detail-label" style="margin-bottom:0">\uD83C\uDFF7\uFE0F Status</div>
                <button onclick="editChildStates('${child.id}')" style="background:#1a0e00;border:1px solid #f59e0b44;color:#f59e0b;border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer">+ Add</button>
            </div>
            <div style="font-size:11px;color:var(--text-sub);font-style:italic">No active states.</div>
        </div>`}

        </div>
    `;
}

function editChildField(childId, field) {
    // Find child
    let motherBot = null, child = null;
    for (const b of bots) {
        if (b.cycleData && b.cycleData.children) {
            const c = b.cycleData.children.find(x => x.id === childId);
            if (c) { motherBot = b; child = c; break; }
        }
    }
    if (!child) return;
    const label = field === 'appearance' ? 'Appearance' : 'Background';
    const current = child[field] || '';
    const val = prompt(`Edit ${label} for ${child.name}:`, current);
    if (val !== null) {
        child[field] = val;
        saveBots();
        openChildBio(childId); // re-render
    }
}

function editChildStates(childId) {
    let motherBot = null, child = null;
    for (const b of bots) {
        if (b.cycleData && b.cycleData.children) {
            const c = b.cycleData.children.find(x => x.id === childId);
            if (c) { motherBot = b; child = c; break; }
        }
    }
    if (!child) return;

    // Temporarily point state picker to child
    window._statePickerTarget = { child, motherBot };
    const overlay = document.getElementById('state-picker-overlay');
    if (!overlay) return;

    // Patch filterStatePicker to work on child
    const body = document.getElementById('state-picker-body');
    if (!body) return;
    body.innerHTML = '';
    ALL_STATES.forEach(s => {
        const isActive = (child.states || []).includes(s.id);
        const row = document.createElement('div');
        row.className = 'trait-picker-item' + (isActive ? ' selected' : '');
        row.style.borderLeft = isActive ? `3px solid ${s.color}` : '';
        row.innerHTML = `<div class="trait-picker-check" style="${isActive ? 'background:' + s.color + ';border-color:' + s.color + ';color:#000' : ''}">${isActive ? '\u2713' : ''}</div>
            <div class="trait-picker-name" style="flex:1"><div>${s.icon} ${s.label}</div><div style="font-size:10px;color:var(--text-sub);margin-top:1px">${s.desc}</div></div>`;
        row.onclick = () => {
            if (!child.states) child.states = [];
            if (isActive) child.states = child.states.filter(x => x !== s.id);
            else child.states.push(s.id);
            saveBots();
            editChildStates(childId);
        };
        body.appendChild(row);
    });
    // Override close button
    overlay.style.display = 'flex';
    const doneBtn = overlay.querySelector('button');
    if (doneBtn) doneBtn.onclick = () => { overlay.style.display = 'none'; openChildBio(childId); };
}

// Render nursery panel - called when bio panel opens
function renderNurseryPanel(bot) {
    const section = document.getElementById('p-nursery-section');
    if (!section) return;
    const children = bot.cycleData && bot.cycleData.children ? bot.cycleData.children : [];
    if (children.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    const list = document.getElementById('p-nursery-list');
    if (!list) return;
    list.innerHTML = children.map(child => {
        const ageStr = formatChildAge(getChildAge(child, bot));
        const gIcon = child.gender === 'female' ? '\uD83D\uDC67' : child.gender === 'male' ? '\uD83D\uDC66' : '\uD83E\uDDD2';
        return `<div onclick="openChildBio('${child.id}')" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-main);border:1px solid #fcd34d33;border-radius:10px;cursor:pointer;margin-bottom:6px">
            <span style="font-size:22px">${gIcon}</span>
            <div style="flex:1">
                <div style="font-size:13px;font-weight:600">${child.name}</div>
                <div style="font-size:11px;color:var(--text-sub)">${ageStr} · tap to view bio</div>
            </div>
            <span style="font-size:16px;color:var(--text-sub)">\u203A</span>
        </div>`;
    }).join('');
}

function applyAnimeToForm() {
    var c = window._animePreviewData;
    if (!c) return;
    // Ensure we're in anime mode before applying
    if (_currentFormMode !== 'anime') graceSetMode('anime');

    function sv(id, val) {
        var el = document.getElementById(id);
        if (!el || val == null) return;
        el.value = String(val);
        if (typeof autoResize === 'function' && el.tagName === 'TEXTAREA') autoResize(el);
    }

    sv('bot-name', c.name);
    if (c.age != null) {
        var ageNum = String(c.age).match(/\d+/);
        sv('bot-age', ageNum ? ageNum[0] : '');
    }
    sv('bot-career', c.career || '');
    sv('bot-relation', c.relation || '');
    sv('bot-year', c.year || '');
    sv('bot-country', c.country || '');
    sv('bot-bio', c.bio || '');
    sv('bot-context', c.context || '');
    sv('bot-prompt', c.prompt || '');
    sv('bot-series', c.series || '');

    var g = document.getElementById('bot-gender');
    if (g && c.gender) g.value = c.gender;

    var img = document.getElementById('bot-img-style');
    if (img) img.value = 'anime';

    if (typeof initAppTags === 'function') initAppTags(c._finalAppearance || c.appearance || '');
    else sv('bot-app', c._finalAppearance || c.appearance || '');

    // Hide the preview box after applying
    var previewBox = document.getElementById('anime-preview-box');
    if (previewBox) previewBox.style.display = 'none';
    var statusEl = document.getElementById('anime-status');
    if (statusEl) statusEl.textContent = '';
    window._animePreviewData = null;

    var fc = document.querySelector('#sc-create .form-container');
    if (fc) setTimeout(function () { fc.scrollTop = 200; }, 200);
    showGrpToast('\u2705 ' + (c.name || 'Character') + ' applied!', '#0a1a0a', '#4ade80');
}

function getReplyLength() {
    return safeGetItem('reply_length') || 'medium';
}

function getReplyMaxTokens() {
    const l = getReplyLength();
    // Tokens need to cover large <think> blocks before generating actual response
    if (l === 'short') return 450;
    if (l === 'medium') return 600;
    if (l === 'long') return 850;
    if (l === 'verylong') return 1100;
    return 600; // default medium
}

function getReplyWordTarget() {
    const l = getReplyLength();
    if (l === 'short') return 'MANDATORY: Reply MUST be 30-40 words MAXIMUM. Count every word. NEVER exceed 40 words. Be concise and cut ruthlessly.';
    if (l === 'medium') return 'MANDATORY: Reply MUST be 55-70 words MAXIMUM. Count every word. NEVER exceed 70 words.';
    if (l === 'long') return 'MANDATORY: Reply MUST be 80-100 words MAXIMUM. Count every word. NEVER exceed 100 words.';
    if (l === 'verylong') return 'MANDATORY: Reply MUST be 130-150 words MAXIMUM. Count every word. NEVER exceed 150 words.';
    return 'MANDATORY: Reply MUST be 55-70 words MAXIMUM. Count every word. NEVER exceed 70 words.';
}
function enforceReplyWordLimit(text) {
    const l = getReplyLength();
    let maxWords = 70; // medium default
    if (l === 'short') maxWords = 40;
    if (l === 'medium') maxWords = 70;
    if (l === 'long') maxWords = 100;
    if (l === 'verylong') maxWords = 150;

    // Split by quotes to preserve dialogue structure
    const parts = text.split(/("(?:[^"\\]|\\.)*?")/g);
    let wordCount = 0;
    let result = [];

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isQuote = i % 2 === 1;

        if (isQuote) {
            // Count words in quote - don't truncate mid-quote
            const words = part.trim().split(/\s+/).filter(w => w.length > 0);
            // Only add complete quotes - if this quote would exceed limit, stop here
            if (wordCount + words.length > maxWords) {
                break; // Don't truncate mid-quote, just stop
            }
            result.push(part);
            wordCount += words.length;
        } else {
            // Action beat - count words and stop at sentence boundaries
            const sentences = part.match(/[^.!?]+[.!?]*/g) || [];
            for (const sentence of sentences) {
                const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);
                // Only add complete sentences - if this sentence would exceed limit, stop here
                if (wordCount + words.length > maxWords) {
                    break; // Don't truncate mid-sentence, just stop
                }
                result.push(sentence);
                wordCount += words.length;
            }
            if (wordCount >= maxWords) break;
        }
    }

    return result.join('').trim();
}
const _LEN_MAP = ['short', 'medium', 'long', 'verylong'];
function setReplyLengthSlider(val) {
    const len = _LEN_MAP[parseInt(val)] || 'medium';
    safeSetItem('reply_length', len);
    syncReplyLengthBtns();
}
function syncReplyLengthBtns() {
    const cur = getReplyLength();
    const idx = _LEN_MAP.indexOf(cur);
    const sliderVal = idx >= 0 ? idx : 1;
    const pct = (sliderVal / 3) * 100;  // 4 options = 0,1,2,3 â†’ divide by 3
    document.querySelectorAll('.reply-len-slider').forEach(s => {
        s.value = sliderVal;
        s.style.background = `linear-gradient(to right,#0084ff 0%,#0084ff ${pct}%,#333 ${pct}%,#333 100%)`;
    });
    document.querySelectorAll('.reply-len-opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.len === cur);
    });
}
document.addEventListener('DOMContentLoaded', syncReplyLengthBtns);

async function toggleInlineThought(btn, msgId, bot, speakerId, msgIdx) {

    const wrapper = btn.closest('.msg-content-wrapper');
    if (!wrapper) return;

    let bubble = wrapper.querySelector('.thought-inline');
    if (bubble) {

        bubble.remove();
        btn.style.color = '';
        btn.style.borderColor = '';
        return;
    }


    bubble = document.createElement('div');
    bubble.className = 'thought-inline';
    bubble.innerHTML = '<span class="thought-inline-loading"><i class="fas fa-spinner fa-spin"></i> Reading inner thoughts...</span>';
    wrapper.appendChild(bubble);
    btn.style.color = '#a855f7';
    btn.style.borderColor = '#a855f7';

    try {
        let thought = '';
        if (bot) {

            const b = bot;
            const idx = b.history.findIndex(m => (m.msgId || '') === msgId);
            const ctx = b.history.slice(Math.max(0, idx - 4), idx + 1);
            const histText = ctx.map(m => (m.role === 'user' ? 'User' : b.name) + ': ' + m.content.replace(/EMOTION::.*/g, '').replace(/\*/g, '').trim()).join('\n');
            const aiLang = getLang();
            const prompt = `You are ${b.name} (${b.gender}).\n[Personality]: ${b.prompt || ''}\n[Background]: ${b.bio || ''}\n\nBased on this conversation, write ${b.name}'s unfiltered INNER THOUGHTS at this moment - what they truly feel but won't say. Raw, honest, first-person. In ${aiLang}. 2-4 sentences.\n\nConversation:\n${histText}`;
            let data;
            try { data = await fetchGroq({ model: GROQ_THINK_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 180, temperature: 0.9 }); }
            catch (e) { data = await fetchGroq({ model: GROQ_GEN_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 180, temperature: 0.9 }); }
            thought = (data.choices?.[0]?.message?.content || '').trim();
        } else {

            const grp = groups.find(g => g.id === curGroupId);
            if (!grp) throw new Error('No group');
            const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
            const speaker = bots.find(b => b.id === speakerId) || members[0];
            if (!speaker) throw new Error('No speaker');
            const sliceStart = typeof msgIdx === 'number' ? Math.max(0, msgIdx - 4) : Math.max(0, grp.history.length - 5);
            const sliceEnd = typeof msgIdx === 'number' ? msgIdx + 1 : grp.history.length;
            const ctx = grp.history.slice(sliceStart, sliceEnd);
            const histText = ctx.map(m => {
                if (m.role === 'user') return 'User: ' + (m.content || '').replace(/\*/g, '').trim();
                const sp = members.find(mb => mb.id === m.speakerId);
                return (sp ? sp.name : 'Character') + ': ' + (m.content || '').replace(/\*/g, '').trim();
            }).join('\n');
            const aiLang = getLang();
            const prompt = `You are ${speaker.name} (${speaker.gender || 'Female'}).\n[Personality]: ${speaker.prompt || ''}\n[Background]: ${speaker.bio || ''}\n\nBased on this group conversation, write ${speaker.name}'s unfiltered INNER THOUGHTS - what they truly feel but won't say. Raw, honest, first-person. In ${aiLang}. 2-4 sentences.\n\nConversation:\n${histText}`;
            let data;
            try { data = await fetchGroq({ model: GROQ_THINK_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 180, temperature: 0.9 }); }
            catch (e) { data = await fetchGroq({ model: GROQ_GEN_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 180, temperature: 0.9 }); }
            thought = (data.choices?.[0]?.message?.content || '').trim();
        }
        if (thought) {
            bubble.innerHTML = escapeHTML(thought);
        } else {
            bubble.innerHTML = '<span class="thought-inline-err">\u26A0\uFE0F No response.</span>';
            btn.style.color = '';
            btn.style.borderColor = '';
        }
    } catch (e) {
        logError('toggleInlineThought', e.message);
        bubble.innerHTML = '<span class="thought-inline-err">\u26A0\uFE0F Could not read thoughts.</span>';
        btn.style.color = '';
        btn.style.borderColor = '';
    }
}

function rewindGroupChat() {
    if (!curGroupId) return;
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp || !grp.history.length) return;


    let removeCount = 0;
    const h = grp.history;


    let i = h.length - 1;
    while (i >= 0 && h[i].role === 'assistant') { removeCount++; i--; }

    if (i >= 0 && h[i].role === 'user') { removeCount++; }

    if (removeCount === 0) return;


    const removed = h.slice(-removeCount);
    const preview = removed.find(m => m.role === 'user');
    const previewText = preview ? '"' + (preview.content || '').substring(0, 60) + (preview.content.length > 60 ? '\u2026' : '') + '"' : '';
    if (!confirm('\u23EA Rewind last exchange?' + (previewText ? '\n\n' + previewText : '') + '\n\nThis will also trim memory if needed.')) return;

    grp.history = h.slice(0, h.length - removeCount);


    if (grp.memorySummary && grp.memorySummary.length > 0) {
        const sentences = grp.memorySummary.split(/(?<=[.!?])\s+/);

        const toRemove = Math.min(1, sentences.length - 1);
        if (toRemove > 0) {
            grp.memorySummary = sentences.slice(0, -toRemove).join(' ');
        }
    }

    saveGroups();
    renderGroupChat();
    if (typeof showGrpToast === 'function') showGrpToast('\u23EA Rewound last exchange', '#1a0505', '#f87171');
}

// â”€â”€ In-app confirm helpers (Update Background / Update Avatar) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function _showUpdateBgConfirm(htmlMsg) {
    return new Promise(resolve => {
        const overlay = document.getElementById('update-bg-confirm');
        const msgEl = document.getElementById('update-bg-confirm-msg');
        const yesBtn = document.getElementById('update-bg-confirm-yes');
        if (!overlay) { resolve(true); return; }
        msgEl.innerHTML = htmlMsg;
        overlay.style.display = 'flex';
        const cleanup = (val) => {
            overlay.style.display = 'none';
            yesBtn.onclick = null;
            resolve(val);
        };
        yesBtn.onclick = () => cleanup(true);
        // Cancel button is inline onclick="_closeUpdateBgConfirm()"
        window._updateBgResolve = cleanup;
    });
}
function _closeUpdateBgConfirm() {
    if (window._updateBgResolve) { window._updateBgResolve(false); window._updateBgResolve = null; }
    const el = document.getElementById('update-bg-confirm');
    if (el) el.style.display = 'none';
}

function _showUpdateAvConfirm(htmlMsg) {
    return new Promise(resolve => {
        const overlay = document.getElementById('update-av-confirm');
        const msgEl = document.getElementById('update-av-confirm-msg');
        const yesBtn = document.getElementById('update-av-confirm-yes');
        if (!overlay) { resolve(true); return; }
        msgEl.innerHTML = htmlMsg;
        overlay.style.display = 'flex';
        const cleanup = (val) => {
            overlay.style.display = 'none';
            yesBtn.onclick = null;
            resolve(val);
        };
        yesBtn.onclick = () => cleanup(true);
        window._updateAvResolve = cleanup;
    });
}
function _closeUpdateAvConfirm() {
    if (window._updateAvResolve) { window._updateAvResolve(false); window._updateAvResolve = null; }
    const el = document.getElementById('update-av-confirm');
    if (el) el.style.display = 'none';
}
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


// Ejaculation-inside keyword detection - only triggers on internal ejaculation, not general sex
// Pregnancy risk only exists when someone finishes inside
// Keyword trigger: ONLY explicit cum/ejaculate-inside phrases - broad terms (breed, fill, flood etc.) removed intentionally
const _INTIMACY_KW = /\b(cum(?:s|ming|med)? (?:inside|in(?:side)? (?:her|you|me|him))|came (?:inside|in(?:side)? (?:her|you|me|him))|cumming inside|finish(?:es|ed|ing)? inside|finished? (?:inside|in (?:her|you|me|him))|release(?:s|d|ing)? (?:inside|in (?:her|you|me|him))|ejaculat(?:e[ds]?|ing|ion) (?:inside|in(?:to)?)|shot? (?:it |his (?:load )?)?inside|creampie[ds]?|didn't pull (?:out|away)|don't pull out|not (?:pulling|gonna pull) out)\b/i;

function detectIntimacyKeyword(userMsg, botReply) {
    const combined = (userMsg + ' ' + botReply);
    if (!_INTIMACY_KW.test(combined)) return null;
    // Detect protected: condom/bao cao su keywords
    const protectedKw = /\b(condom|protection|protected|safe sex)\b/i;
    return { intercourse: true, protected: protectedKw.test(combined) };
}
let _intimacyCallback = null;
function showIntimacyConfirm(botOrName, onConfirm, isProtected) {
    _intimacyCallback = onConfirm;
    const overlay = document.getElementById('intimacy-confirm-overlay');
    const msg = document.getElementById('intimacy-confirm-msg');
    if (!overlay || !msg) { if (onConfirm) onConfirm(); return; }

    const bot = (typeof botOrName === 'object') ? botOrName : null;
    const name = bot ? bot.name : botOrName;
    const cd = bot ? bot.cycleData : null;

    // Build context line - now about ejaculation/conception risk
    var contextLine = '';
    var chanceLine = '';
    if (cd && cd.pregnant) {
        if (cd.isParasitePregnancy) {
            contextLine = 'Day ' + getParasiteWeek(bot) + '/15 of parasite gestation - already carrying';
        } else {
            const wk = getEffectivePregnancyWeek(bot) || '?';
            contextLine = 'Week ' + wk + ' pregnant - already carrying, no new conception possible';
        }
    } else if (cd) {
        const cycleDay = getCurrentCycleDay(bot);
        const phase = getCyclePhase(cycleDay);
        contextLine = 'Internal ejaculation detected · Cycle day ' + cycleDay + ' · Fertility: ' + (phase ? phase.fertility : '?');
        // Show conception chance
        if (!isProtected) {
            let chanceVal;
            if (cycleDay === 14) chanceVal = 30;
            else if (cycleDay >= 10 && cycleDay <= 16) chanceVal = 15;
            else if (cycleDay >= 8 && cycleDay < 10) chanceVal = 5;
            else chanceVal = 1;
            chanceLine = 'Conception chance: ~' + chanceVal + '%';
        } else {
            chanceLine = 'Protected - very low risk';
        }
    }

    var protTag = isProtected === true
        ? '<span style="color:#4ade80;font-size:11px">✓ Protected</span>'
        : isProtected === false
            ? '<span style="color:#f87171;font-size:11px">⚠ Unprotected</span>'
            : '';
    msg.innerHTML = '<b style="color:#e2e8f0">' + escapeHTML(name) + '</b>'
        + (protTag ? '&nbsp;' + protTag : '') + '<br>'
        + '<span style="font-size:12px;color:#94a3b8">' + escapeHTML(contextLine) + '</span>'
        + (chanceLine ? '<br><span style="font-size:11px;color:#fbbf24">' + escapeHTML(chanceLine) + '</span>' : '');

    overlay.style.display = 'flex';
    document.getElementById('intimacy-confirm-yes').onclick = function () {
        overlay.style.display = 'none';
        if (_intimacyCallback) { _intimacyCallback(); _intimacyCallback = null; }
    };
    document.getElementById('intimacy-confirm-no').onclick = function () {
        overlay.style.display = 'none';
        _intimacyCallback = null;
    };
}

async function detectIntercourseAI(userMsg, botReply) {
    if (!getGroqKeys().length) return null;
    const combined = (userMsg + ' ' + botReply).trim();
    if (!combined || combined.length < 10) return null;

    const prompt = `You are an AI assistant specialized in detecting INTERNAL EJACULATION in multilingual roleplay text.
    
Analyze the following snippet:
User: ${userMsg.substring(0, 400)}
Character reply: ${botReply.substring(0, 400)}

Did someone EJACULATE/CUM INSIDE (internal ejaculation, finishing inside the body) in this snippet?
This is NOT about general sex - only about whether someone finished/came/ejaculated INSIDE.
Consider any language (English, Vietnamese, Japanese, Korean, etc.).

Examples of YES: "came inside her", "filled her up", "released deep inside", "didn't pull out", "creampie", "came inside", "finished inside", "released inside"
Examples of NO: just having sex, kissing, foreplay, pulling out, using condom, oral sex, general intimacy without ejaculating inside

Answer "yes_unprotected" if internal ejaculation clearly happened without protection.
Answer "yes_protected" if ejaculation happened but with condom/protection mentioned.
Answer "no" if no internal ejaculation occurred (even if sex is happening).

When in doubt, answer "no".

Answer ONLY one of:
yes_unprotected
yes_protected
no

Answer:`;

    const modelsToTry = ['openai/gpt-oss-20b', GROQ_FAST_MODEL];
    for (const model of modelsToTry) {
        try {
            const key = getNextGroqKey();
            const res = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 10,
                    temperature: 0.0,
                    messages: [{ role: 'user', content: prompt }]
                }),
                signal: AbortSignal.timeout(8000)
            });
            const data = await res.json();
            if (data.error) { logError('detectIntercourseAI [' + model + ']', data.error.message); continue; }
            const answer = (data.choices?.[0]?.message?.content || '').trim().toLowerCase();
            if (answer.includes('yes_unprotected')) return { intercourse: true, protected: false };
            if (answer.includes('yes_protected')) return { intercourse: true, protected: true };
            return null; // got a valid "no" answer
        } catch (e) {
            logError('detectIntercourseAI [' + model + ']', e.message);
        }
    }
    return null;
}