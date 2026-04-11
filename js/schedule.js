// js/schedule.js — Schedule system (partial legacy file)
// 
// NOTE: The following functions have been MOVED to schedule/ modules and removed here:
//   _keyForBot, _repairScheduleJSON, _sanitizeScheduleRooms, _normalizeVariants
//   → schedule/schedule_ui.js
//   toggleScheduleView, toggleGpScheduleView
//   → schedule/schedule_ui.js
//   generateScheduleAI, generateScheduleAIGroup
//   → schedule/schedule_generation.js
//
// The UNIQUE functions remaining here (not yet extracted to modules):
//   _getCurrentPregnancyStage, _hasPregnancyStageChanged, _processAutoUpdateQueue,
//   _forceScheduleUpdate, _queueAutoUpdate, _pickScheduleVariant,
//   _buildScheduleCharContext, _buildSchedulePrompt, _buildTimelineFromSchedule,
//   _getScheduleVariantKey, _autoUpdateScheduleIfNeeded, addMins, _isPersonalActivity,
//   _resolveDisplayRoom, _resolveRoom, _sanitizeDayList, toMins (module-scoped)
//
// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE SYSTEM v2
// 
// Schema per variant:
//   { wake, breakfast, lunch, dinner, sleep,
//     mon:[{name,room,start,end},...], tue:[...], wed, thu, fri, sat, sun }
//
// Variants: normal | period | follicular | ovulation | pms |
//           trimester1 | trimester2 | trimester3 |
//           hyper_t1 | hyper_t2 | hyper_t3 |
//           overdue | postpartum
//
// _pickScheduleVariant(bot, variants) → flat schedule for TODAY
// Reading order: variant → day-of-week → customActivities[]
// ═══════════════════════════════════════════════════════════════════════════

// Available rooms (mirrors PRESET_ROOMS + bot private bedrooms)
const SOLO_ROOMS = [
    { id:'bathroom',    name:'Bathroom' },
    { id:'bedroom',     name:'Bedroom' },
    { id:'living_room', name:'Living Room' },
    { id:'kitchen',     name:'Kitchen' },
    { id:'dining_room', name:'Dining Room' },
    { id:'nursery',     name:'Nursery' },
    { id:'study',       name:'Study / Office' },
    { id:'garden',      name:'Garden / Balcony' },
    { id:'outside',     name:'Outside (errands, gym, café, park…)' },
];

// Day index 0=Mon … 6=Sun
const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// ─────────────────────────────────────────────────────────────────────────────
// Auto-update schedule system with 60s delay to prevent concurrent updates
// ─────────────────────────────────────────────────────────────────────────────
const _AUTO_UPDATE_CONFIG = {
    minDelayMs: 60000,  // 60 seconds between auto-updates
    lastUpdateTime: 0,  // timestamp of last auto-update
    updateQueue: [],    // queue of bots waiting to update
    isProcessing: false // whether currently processing queue
};

// Track current pregnancy stage for each bot to detect changes
const _botPregnancyStage = new Map(); // botId -> {stage: string, week: number}

/**
 * Get current pregnancy stage key for a bot
 * Returns null if not pregnant, otherwise returns stage identifier
 */
function _getCurrentPregnancyStage(bot) {
    if (!bot || !bot.cycleData || !bot.cycleData.pregnant) return null;
    const cd = bot.cycleData;
    
    // Parasite pregnancy stages
    if (cd.isParasitePregnancy) {
        const pDay = (typeof getParasiteWeek === 'function') ? getParasiteWeek(bot) : 0;
        if (pDay < 3) return 'parasite_implantation';
        if (pDay < 6) return 'parasite_feeding';
        if (pDay < 9) return 'parasite_growth';
        if (pDay < 12) return 'parasite_maturation';
        return 'parasite_emergence';
    }
    
    // Normal pregnancy stages
    const weeks = (typeof getPregnancyWeek === 'function' ? getPregnancyWeek(bot) : 0) || 0;
    if (weeks >= 43 && (bot.disadvantages||[]).includes('Always Overdue')) return 'overdue';
    if (weeks <= 12) return 'trimester1';
    if (weeks <= 26) return 'trimester2';
    return 'trimester3';
}

/**
 * Check if pregnancy stage has changed for a bot
 */
function _hasPregnancyStageChanged(bot) {
    const currentStage = _getCurrentPregnancyStage(bot);
    if (!currentStage) {
        _botPregnancyStage.delete(bot.id);
        return false;
    }
    
    const prev = _botPregnancyStage.get(bot.id);
    if (!prev || prev.stage !== currentStage) {
        // Stage changed - update tracker
        const cd = bot.cycleData;
        let week = 0;
        if (cd.isParasitePregnancy) {
            week = (typeof getParasiteWeek === 'function') ? getParasiteWeek(bot) : 0;
        } else {
            week = (typeof getPregnancyWeek === 'function') ? getPregnancyWeek(bot) : 0;
        }
        _botPregnancyStage.set(bot.id, { stage: currentStage, week });
        return true;
    }
    return false;
}

/**
 * Process auto-update queue with 60s delay between each update
 */
async function _processAutoUpdateQueue() {
    if (_AUTO_UPDATE_CONFIG.isProcessing) return;
    _AUTO_UPDATE_CONFIG.isProcessing = true;
    
    while (_AUTO_UPDATE_CONFIG.updateQueue.length > 0) {
        const now = Date.now();
        const timeSinceLastUpdate = now - _AUTO_UPDATE_CONFIG.lastUpdateTime;
        
        // Wait if less than 60s since last update
        if (timeSinceLastUpdate < _AUTO_UPDATE_CONFIG.minDelayMs) {
            const waitTime = _AUTO_UPDATE_CONFIG.minDelayMs - timeSinceLastUpdate;
            await new Promise(r => setTimeout(r, waitTime));
        }
        
        // Get next bot from queue
        const bot = _AUTO_UPDATE_CONFIG.updateQueue.shift();
        if (!bot) continue;
        
        // Update the schedule
        try {
            await _forceScheduleUpdate(bot);
            _AUTO_UPDATE_CONFIG.lastUpdateTime = Date.now();
            logError('_processAutoUpdateQueue', `Auto-updated schedule for ${bot.name}`);
        } catch(e) {
            logError('_processAutoUpdateQueue', `Failed to update ${bot.name}: ${e.message}`);
        }
    }
    
    _AUTO_UPDATE_CONFIG.isProcessing = false;
}

/**
 * Force immediate schedule update for a bot (bypass variant check)
 */
async function _forceScheduleUpdate(bot) {
    if (!bot) return;
    const neededKey = _getScheduleVariantKey(bot);
    const key = _keyForBot(bot);
    if (!key) return;
    
    try {
        const _autoGrp = groups.find(g => g.memberIds && g.memberIds.includes(bot.id));
        const _autoGrpRooms = (_autoGrp && _autoGrp.rooms && _autoGrp.rooms.length) ? _autoGrp.rooms : null;
        const ctx = _buildScheduleCharContext(bot, _autoGrpRooms);
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_SCHEDULE_MODEL,
                max_tokens: 7000,
                temperature: 0.35,
                messages: [
                    { role: 'system', content: 'You are a schedule designer. Return ONLY valid compact JSON. No markdown, no explanation, no preamble.' },
                    { role: 'user',   content: _buildSchedulePrompt(ctx) }
                ]
            }),
            signal: AbortSignal.timeout(180000)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const msg = data.choices?.[0]?.message;
        let raw = (msg?.content || '').trim().replace(/```json|```/g, '').trim();
        if (!raw && msg?.reasoning) raw = msg.reasoning.trim();
        const _parsed = _repairScheduleJSON(raw);
        if (!_parsed) return;
        let variants = _normalizeVariants(_parsed);
        if (!variants) return;
        if (_autoGrpRooms) variants = _sanitizeScheduleRooms(variants, _autoGrpRooms);
        bot.scheduleVariants = Object.assign(bot.scheduleVariants || {}, variants);
        bot.schedule = _pickScheduleVariant(bot, bot.scheduleVariants);
        saveBots();
        // Refresh UI if bio panel is open
        if (document.getElementById('sched-view-text')) renderScheduleInBio(bot);
        if (document.getElementById('gp-sched-view-text')) renderGpSchedule(bot);
    } catch(e) {
        logError('_forceScheduleUpdate', e.message);
        throw e;
    }
}

/**
 * Queue bot for auto-update when pregnancy stage changes
 */
function _queueAutoUpdate(bot) {
    // Don't add duplicate
    if (_AUTO_UPDATE_CONFIG.updateQueue.find(b => b.id === bot.id)) return;
    _AUTO_UPDATE_CONFIG.updateQueue.push(bot);
    _processAutoUpdateQueue();
}

// ── _pickScheduleVariant ─────────────────────────────────────────────────────
// Returns a flat schedule object compatible with existing consumers:
//   { wake, breakfast, lunch, dinner, sleep, activities, customActivities[] }
// where customActivities is today's day-specific list (or base list fallback).
function _pickScheduleVariant(bot, variants) {
    if (!variants) return bot.schedule || null;

    const flatten = (v) => {
        if (!v) return null;
        // Resolve today's day key
        const dow  = ((getVirtualDay ? getVirtualDay(bot) : 0) % 7 + 7) % 7; // 0=Mon
        const isWeekend = dow === 5 || dow === 6; // Sat=5, Sun=6
        const dkey = DAY_KEYS[dow] || 'mon';
        // Support both old 7-day keys and new wkd/wkn compact format
        const todayActs = Array.isArray(v[dkey]) ? v[dkey]
            : isWeekend && Array.isArray(v.wkn) ? v.wkn
            : Array.isArray(v.wkd) ? v.wkd
            : (Array.isArray(v.customActivities) ? v.customActivities : []);
        return {
            wake:            v.wake            || '07:00',
            breakfast:       v.breakfast       || '07:30',
            lunch:           v.lunch           || '12:00',
            dinner:          v.dinner          || '18:30',
            sleep:           v.sleep           || '22:30',
            activities:      v.activities      || '',
            customActivities: todayActs,
            timeline:        v.timeline        || null,
        };
    };

    const cd = bot.cycleData;
    if (cd) {
        // Postpartum with newborn → use postpartum_newborn variant if available
        if (cd.postpartumStartDay != null && !cd.pregnant) {
            const _daysSinceBirth = bot.virtualDay !== undefined
                ? (getVirtualDay(bot) - (cd.postpartumStartDay || 0)) : 0;
            if (_daysSinceBirth <= 90 && variants.postpartum_newborn)
                return flatten(variants.postpartum_newborn);
            return flatten(variants.normal);
        }

        // Parasite pregnancy → stage-based variant
        if (cd.pregnant && !cd.birthVirtualDay && cd.isParasitePregnancy) {
            const pDay = (typeof getParasiteWeek === 'function') ? getParasiteWeek(bot) : 0;
            if (pDay < 3)  return flatten(variants.parasite_implantation || variants.normal);
            if (pDay < 6)  return flatten(variants.parasite_feeding      || variants.parasite_implantation || variants.normal);
            if (pDay < 9)  return flatten(variants.parasite_growth       || variants.parasite_feeding      || variants.normal);
            if (pDay < 12) return flatten(variants.parasite_maturation   || variants.parasite_growth       || variants.normal);
            return flatten(variants.parasite_emergence || variants.parasite_maturation || variants.normal);
        }

        // Normal/monster pregnancy
        if (cd.pregnant && !cd.birthVirtualDay) {
            const weeks = (typeof getPregnancyWeek === 'function' ? getPregnancyWeek(bot) : 0) || 0;
            const isOverdue = weeks >= 43 && (bot.disadvantages || []).includes('Always Overdue');
            if (isOverdue) return flatten(variants.overdue || variants.trimester3 || variants.normal);
            if (weeks <= 12) return flatten(variants.trimester1 || variants.normal);
            if (weeks <= 26) return flatten(variants.trimester2 || variants.normal);
            return flatten(variants.trimester3 || variants.normal);
        }
    }
    return flatten(variants.normal);
}

// ── Build character + state context for schedule prompt ──────────────────────
function _buildScheduleCharContext(bot, groupRooms) {
    const cd = bot?.cycleData;
    const isPregnant  = !!(cd?.pregnant && !cd?.birthVirtualDay);
    const pregWeeks   = isPregnant && typeof getPregnancyWeek === 'function' ? (getPregnancyWeek(bot)||0) : 0;
    const fetusCount  = (cd?.fetusCount)||1;
    const isHyper     = isPregnant && fetusCount >= 4;
    const isMonster   = isPregnant && !!(cd?.isMonsterPregnancy || cd?.isParasitePregnancy);
    const isOverdue   = isPregnant && pregWeeks >= 43 && (bot?.disadvantages||[]).includes('Always Overdue');
    const isPostpartum= !!(cd?.postpartumStartDay != null && !cd?.pregnant);

    // Use group-specific rooms if provided - include the bot's OWN private bedroom, exclude others'
    const _myBedroomId = bot ? ('bedroom_' + bot.id) : null;
    const _roomSource = (groupRooms && groupRooms.length)
        ? groupRooms.filter(r => !r.private || r.id === _myBedroomId)
        : SOLO_ROOMS;
    const _privateBedroom = _myBedroomId ? (_roomSource.find(r => r.id === _myBedroomId) || null) : null;
    const rooms = _roomSource.map(r => `${r.id} (${r.name})`).join(', ');
    const personality = (bot ? (getDynField(bot,'prompt')||bot.prompt||'') : '').substring(0,200);
    const career  = (bot?.career||'').substring(0,60);
    const country = (bot?.country||'');
    const year    = (bot?.year||'');
    const setting = [year, country].filter(Boolean).join(', ');

    let stateBlock = '';
    if (cd && cd.isParasitePregnancy && cd.pregnant && !cd.birthVirtualDay) {
        const _pDay = getParasiteWeek(bot);
        const _pCount = (cd.fetuses||[]).length || '?';
        if (_pDay < 3)  { stateBlock = `\nSTATE: PARASITE - Implantation (Day ${_pDay}/15). ${_pCount} larvae burrowing in. Burning deep in pelvis, low fever, waves of nausea worse than morning sickness. Strange warmth spreading from womb. Nipples hypersensitive, chest aching. A crawling wrongness she cannot name - and an unsettling arousal she cannot explain, body responding to the parasite's first chemical signals. Dread overpowers peaceful activity.`; }
        else if (_pDay < 6)  { stateBlock = `\nSTATE: PARASITE - Feeding Phase (Day ${_pDay}/15). Ravenous hunger nothing satisfies. Dark veins spreading from lower abdomen. Breast tissue swelling rapidly, nipples leaking thin iridescent fluid - not milk, something stranger. The parasites are secreting aphrodisiacs directly into her bloodstream: she is flushed, slick, pulse racing, body in constant low heat she cannot cool down. Writhing inside her is unmistakable now. Prioritise eating and rest.`; }
        else if (_pDay < 9)  { stateBlock = `\nSTATE: PARASITE - Rapid Growth (Day ${_pDay}/15). Abdomen visibly distending, skin stretched taut. Multiple larvae writhing in alien uncoordinated patterns - clashing, coiling, nothing like fetal kicks. Breasts engorged and leaking a thick opalescent fluid with a faint sweet chemical smell - the parasite's aphrodisiac secretion, produced to keep the host docile and receptive. She is almost constantly aroused against her will, body slick and feverish. Barely functional.`; }
        else if (_pDay < 12) { stateBlock = `\nSTATE: PARASITE - Maturation (Day ${_pDay}/15). Crushing pressure on every organ. Larvae now moving in slow synchronized pulses - she can feel them organizing. Breasts heavy and leaking continuously, fluid now tinged faintly luminescent. Aphrodisiac saturation at peak - her body is in constant involuntary heat, oversensitive to every touch, soaking through any clothing, mind clouded with chemical haze. Bed rest mandatory, barely functional.`; }
        else                 { stateBlock = `\nSTATE: PARASITE - EMERGENCE IMMINENT (Day ${_pDay}/15). Host at absolute limit. Larvae thrashing in unison. Every contraction alien and violent. Body burning, soaked, oversensitive. No activities possible. Bed/bathroom only.`; }
    } else if (isMonster) {
        stateBlock = '\nSTATE: Monster pregnancy - host under significant physical stress. Limited mobility, dread, no peaceful activities.';
    }    else if (isHyper)
        stateBlock = `\nSTATE: Hyperpregnancy - ${fetusCount} fetuses (week ${pregWeeks}). Near-total physical incapacitation. Mostly bed rest, monitoring, tiny meals, compression.`;
    else if (isOverdue)
        stateBlock = `\nSTATE: Overdue pregnancy - week ${pregWeeks} (trait: Always Overdue). Extreme heaviness, induction attempts, early sleep (20:30), max discomfort.`;
    else if (isPregnant)
        stateBlock = `\nSTATE: Pregnant - week ${pregWeeks}. ` +
            (pregWeeks<=12 ? 'T1: nausea, fatigue, frequent snacks, early bed.' :
             pregWeeks<=26 ? 'T2: moderate energy, growing belly, prenatal care.' :
             'T3: heavy, slow, nesting urge, early bed, frequent rest.');
    else if (isPostpartum)
        stateBlock = `\nSTATE: Postpartum recovery. Wake very early (05:00-06:00) for feeds. Short activity windows, gentle movement only.`;

    // Determine current variant key for single-variant generation
    let currentVariant = 'normal';
    if (isPostpartum) currentVariant = 'normal';
    else if (isPregnant && cd?.isParasitePregnancy) {
        const _pDay2 = getParasiteWeek(bot);
        if (_pDay2 < 3)  currentVariant = 'parasite_implantation';
        else if (_pDay2 < 6)  currentVariant = 'parasite_feeding';
        else if (_pDay2 < 9)  currentVariant = 'parasite_growth';
        else if (_pDay2 < 12) currentVariant = 'parasite_maturation';
        else                  currentVariant = 'parasite_emergence';
    } else if (isPregnant) {
        const _isOverdue = pregWeeks >= 43 && (bot?.disadvantages||[]).includes('Always Overdue');
        if (_isOverdue)       currentVariant = 'overdue';
        else if (pregWeeks <= 12) currentVariant = 'trimester1';
        else if (pregWeeks <= 26) currentVariant = 'trimester2';
        else                      currentVariant = 'trimester3';
    }

    // Awareness note for schedule prompt
    const cd2 = bot?.cycleData;
    const _isPreg = !!(cd2 && cd2.pregnant && !cd2.birthVirtualDay);
    const _knows  = !!(cd2 && cd2.pregnancyTestTaken);
    let awarenessNote = '';
    if (_isPreg && !_knows) {
        awarenessNote = '\nAWARENESS: She does NOT know she is pregnant yet. Schedule must NOT include prenatal vitamins, belly care, baby prep, or anything that implies pregnancy awareness. Use generic self-care activities instead (e.g. "vitamins" not "prenatal vitamins", "body lotion" not "belly massage").';
    }

    return { rooms, personality, career, setting, stateBlock, currentVariant, awarenessNote, roomSource: _roomSource, privateBedroom: _privateBedroom };
}

// ── Prompt builders (one per batch) ─────────────────────────────────────────
// ── Single combined schedule prompt - gen all variants in one call ──
// Key rotates by bot index so each chatbot uses a different API key.
function _buildSchedulePrompt(ctx) {
    const hasMonster = ctx.stateBlock.includes('Monster');
    const isParasite = ctx.stateBlock.includes('PARASITE');
    // Use room list from context - with names for better AI understanding
    const _rooms = ctx.roomSource || SOLO_ROOMS;
    const roomList = _rooms.map(r => `${r.id} (${r.name})`).join(', ');
    // Outdoor-eligible rooms (id === outside or outside===true)
    const outsideRoomIds = _rooms.filter(r => r.id === 'outside' || r.outside).map(r => r.id).join(', ') || 'outside';
    // Bedroom ID hints
    const bedroomIds = _rooms.filter(r => r.id === 'bedroom' || r.id === 'your_bedroom' || r.id.startsWith('bedroom_')).map(r => r.id).join(', ') || 'bedroom';

    // Build per-room activity hints for the room-first prompt
    const _pbId = ctx.privateBedroom ? ctx.privateBedroom.id : null;
    const _roomHints = _rooms.map(r => {
        const rn = (r.name || r.id).toLowerCase();
        let hint = '';
        if (r.id === 'outside' || r.outside) hint = 'commuting, errands, class, lecture, work, gym, walks, outdoor activities';
        else if (rn.includes('bath')) hint = 'shower, morning hygiene, skincare, brushing teeth';
        else if (rn.includes('kitchen')) hint = 'cooking, snacks, meal prep, quick breakfast';
        else if (rn.includes('dining')) hint = 'breakfast, lunch, dinner';
        else if (rn.includes('living')) hint = 'watching TV, relaxing, socialising, reading, dancing';
        else if (_pbId && r.id === _pbId) hint = '★ YOUR PRIVATE ROOM - wake up, sleep, dressing, rest, wind-down, personal hygiene, skincare, intimate activities';
        else if (rn.includes('master') || rn.includes('bedroom')) hint = 'shared bedroom - use only for shared/romantic activities, NOT for your own sleep or wake-up';
        else if (rn.includes('library') || rn.includes('study') || rn.includes('office')) hint = 'reading, studying, homework, research, writing';
        else if (rn.includes('garden') || rn.includes('yard')) hint = 'gardening, exercise, fresh air, yoga';
        else if (rn.includes('pool')) hint = 'swimming, relaxing by pool, exercise';
        else if (rn.includes('gym')) hint = 'working out, stretching, exercise';
        else if (rn.includes('nursery')) hint = 'baby care, feeding baby, nursery prep';
        else if (rn.includes('foyer') || rn.includes('hall') || rn.includes('entrance')) hint = 'brief passing activities, greeting guests';
        return `  ${r.id} (${r.name})${hint ? ' - e.g. ' + hint : ''}`;
    }).join('\n');
    const _pbRule = _pbId
        ? `\nPRIVATE ROOM RULE: ${_pbId} is YOUR private bedroom. All personal activities (wake up, sleep, morning/night routine, dressing, getting ready, wind-down, rest, nap) MUST use room "${_pbId}". Do NOT use master_bedroom or any other room for these activities.`
        : '';

    return `You are a daily schedule designer for a roleplay character.

APPROACH - ROOM FIRST:
Look at each room below. Decide what activities this character naturally does in that room given their personality and career. Spread activities across the day morning to night. Each activity must be placed in one of the listed rooms.

CHARACTER:
- Personality: ${ctx.personality || 'calm, domestic'}
- Career: ${ctx.career || 'unspecified'}
- Setting: ${ctx.setting || 'modern'}${ctx.stateBlock}${ctx.awarenessNote}

YOUR ROOMS - use ONLY these room_id values, exactly as written:
${_roomHints}

RULES:
1. Use ONLY the room IDs listed above. Do NOT invent room IDs like "study", "office", "gym", or anything not in the list.${_pbRule}
2. Each day: 10-12 activities from wake to sleep, sorted by start time. Cover: hygiene, all meals, productive task, leisure, wind-down.
3. Times: non-overlapping, realistic. Every entry needs start AND end. No gap > 90 min.
4. Sat/Sun: more relaxed, vary at least 3 activities vs weekdays.
5. "activities": 2 favourite hobbies for free moments (just names, no room needed here).
6. ROOM IS REQUIRED: Every activity MUST include a "room" field using one of the allowed room IDs above. Never omit room.
7. BEFORE outputting: scan every "room" field - if any value is not in the list above, replace it with the closest listed room.

GENERATE exactly 1 variant key: "${ctx.currentVariant}"

OUTPUT SCHEMA (activities sorted by start time within each day):
{"${ctx.currentVariant}":{"wake":"HH:MM","breakfast":"HH:MM","lunch":"HH:MM","dinner":"HH:MM","sleep":"HH:MM","activities":"hobby1, hobby2","mon":[{"name":"activity name","room":"room_id","start":"HH:MM","end":"HH:MM"}],"tue":[...],"wed":[...],"thu":[...],"fri":[...],"sat":[...],"sun":[...]}}

VARIANT GUIDELINE for "${ctx.currentVariant}":
- normal: balanced day matching personality/career
- trimester1: nausea (bathroom/kitchen morning), frequent snacks, sleep 21:30
- trimester2: prenatal yoga (use living_room or pool area if listed), moderate pace, afternoon rest
- trimester3: nesting, birth prep, sleep 21:00, mostly bedroom
- overdue: sleep 20:30, induction walk (outside), birth ball (living room), hot compress (bathroom)
- postpartum_newborn: wake 05:00, nursing every 2-3h, nap when baby sleeps, gentle walk (outside) 2x/week
${hasMonster ? '- monster: dread/pacing (living room), fitful rest (bedroom), body inspection (bathroom). No joy.' : ''}
${isParasite ? `- parasite_implantation: mostly normal but cuts short. Frequent bathroom (nausea). Sleep 21:00.
- parasite_feeding: ravenous - kitchen every 2h. Bedroom rest between feedings. No outside. Sleep 21:00.
- parasite_growth: bed rest mandatory. Short kitchen trips. Bathroom frequently. Cannot work. Sleep 20:30.
- parasite_maturation: almost entirely bed/bathroom. Eating at bedside. Sleep 20:00.
- parasite_emergence: EMERGENCE IMMINENT. Bed/bathroom only. No structured activities.` : ''}

Return ONLY one compact JSON object. No markdown, no explanation.`;
}

// ── Key rotation by bot index ─────────────────────────────────────────────────
// Bot 0 → key[0], Bot 1 → key[1], ... cycles if fewer keys than bots.

// _keyForBot() moved to schedule/ modules




// _repairScheduleJSON() moved to schedule/ modules
\]])/g, '$1');

    // Remove JS comments
    s = s.replace(/\/\/[^\r\n]*/g, '');
    s = s.replace(/\/\*[\s\S]*?\*\//g, '');

    // Fix unescaped control chars inside string values
    let fixed = '';
    let inStr = false, esc = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (esc) { fixed += c; esc = false; continue; }
        if (c === '\\') { fixed += c; esc = true; continue; }
        if (c === '"') { inStr = !inStr; fixed += c; continue; }
        if (inStr) {
            if (c === '\n') { fixed += '\\n'; continue; }
            if (c === '\r') { fixed += '\\r'; continue; }
            if (c === '\t') { fixed += '\\t'; continue; }
        }
        fixed += c;
    }
    s = fixed;

    // Fix unquoted property values
    s = s.replace(/"(\w+)"\s*:\s*(?!true|false|null|-?\d|"|\[|\{)([A-Za-z_][\w_-]*)/g, '"$1": "$2"');

    // Fix single quotes
    s = s.replace(/'([^']*)'/g, '"$1"');

    // Attempt 1: direct parse
    try { return JSON.parse(s); } catch(e1) {
        const pos = parseInt((e1.message.match(/position (\d+)/)||[])[1]) || 0;
        logError('_repairScheduleJSON', 'pos=' + pos + ' ctx=[' + s.substring(Math.max(0,pos-40),pos+40) + ']');

        // Attempt 2: rebuild by skipping broken top-level keys
        try {
            const topKeys = [];
            const topRx = /"(\w+)"\s*:/g;
            let km;
            while ((km = topRx.exec(s)) !== null) topKeys.push({key: km[1], pos: km.index});
            let rebuilt = '{', first = true;
            for (let ki = 0; ki < topKeys.length; ki++) {
                const kStart = topKeys[ki].pos;
                const kEnd = ki + 1 < topKeys.length ? topKeys[ki+1].pos : s.length - 1;
                const chunk = s.substring(kStart, kEnd).replace(/,\s*$/, '');
                try {
                    JSON.parse('{' + chunk + '}');
                    rebuilt += (first ? '' : ',') + chunk;
                    first = false;
                } catch(skip) { logError('_repairScheduleJSON', 'skipped key: ' + topKeys[ki].key); }
            }
            rebuilt += '}';
            const r2 = JSON.parse(rebuilt);
            logError('_repairScheduleJSON', 'Recovered by key rebuild');
            return r2;
        } catch(e2) { /* fall through */ }

        // Attempt 3: truncate at last valid closing brace
        for (let i = s.length - 1; i > 100; i--) {
            if (s[i] === '}') {
                try { return JSON.parse(s.substring(0, i + 1)); } catch(e3) { continue; }
            }
        }
        throw new Error('JSON repair failed: ' + e1.message);
    }
}

// Known variant keys - used to detect if AI returned nested variants or a flat single schedule
const KNOWN_VARIANT_KEYS = ['normal','trimester1','trimester2','trimester3','overdue','postpartum_newborn','parasite_implantation','parasite_feeding','parasite_growth','parasite_maturation','parasite_emergence'];
const KNOWN_SCHED_FIELDS = ['wake','breakfast','lunch','dinner','sleep'];

// ── _sanitizeScheduleRooms ────────────────────────────────────────────────────
// Replaces any room_id in a parsed variants object that doesn't exist in validRooms
// with the closest semantically valid room from that list.

// _sanitizeScheduleRooms() moved to schedule/ modules



// _normalizeVariants() moved to schedule/ modules



// Build a display timeline from schedule data (customActivities + fixed meals)
// Returns array of {icon, name, start, end} sorted by time, 10-12 entries
function _buildTimelineFromSchedule(s, validRooms) {
    if (!s) return [];
    const toMins = function(t) { if (!t) return 9999; var p = t.split(':').map(Number); return p[0]*60+(p[1]||0); };
    // Build a fast resolver for stored rooms that may not exist in the group
    const _validIds = validRooms ? new Set(validRooms.map(r => r.id)) : null;
    // Detect this bot's private bedroom from validRooms (private + id starts with bedroom_)
    const _dispPrivBed = validRooms ? validRooms.find(r => r.private && r.id.startsWith('bedroom_')) : null;
    const _dispPrivBedId = _dispPrivBed ? _dispPrivBed.id : null;
    const _fallbackChainsDisplay = { study:['library','living_room','outside'], office:['library','living_room','outside'], nursery:['master_bedroom','your_bedroom','bedroom'], garden:['pool_area','balcony','outside'], gym:['outside'], home_gym:['outside'], swimming_pool:['pool_area','outside'] };
    // Remap generic bedroom refs to the private bedroom if one exists
    if (_dispPrivBedId) {
        _fallbackChainsDisplay.bedroom = [_dispPrivBedId];
        _fallbackChainsDisplay.your_bedroom = [_dispPrivBedId];
    }
    const _resolveDisplayRoom = (room) => {
        if (!_validIds || !room || _validIds.has(room)) return room;
        const chain = _fallbackChainsDisplay[room] || [];
        for (const alt of chain) { if (_validIds.has(alt)) return alt; }
        const lower = room.replace(/_/g,' ');
        const matched = validRooms.find(r => !r.private && (r.id.includes(lower) || (r.name||'').toLowerCase().includes(lower)));
        return matched ? matched.id : (validRooms.find(r => !r.private && r.id !== 'outside') || validRooms[0] || {id:room}).id;
    };
    // Keywords that mark a personal/private activity that must go in the bot's own bedroom
    const _isPersonalActivity = (name) => {
        const n = (name||'').toLowerCase();
        return n.includes('wake') || n.includes('sleep') || n.includes('wind-down') || n.includes('wind down')
            || n.includes('get dressed') || n.includes('getting dressed') || n.includes('dressing')
            || n.includes('night routine') || n.includes('morning routine') || n.includes('bedtime')
            || n.includes('get ready') || n.includes('getting ready') || n.includes('nap')
            || (n.includes('rest') && !n.includes('restaurant'));
    };
    const addMins = function(t, m) {
        var total = toMins(t) + m;
        return String(Math.floor(total/60)).padStart(2,'0') + ':' + String(total%60).padStart(2,'0');
    };

    var entries = [];

    // Fixed anchors with estimated durations
    if (s.wake)      entries.push({ icon:'🌅', name:'Wake up',   start: s.wake,      end: null });
    if (s.wake)      entries.push({ icon:'🚿', name:'Morning routine', start: s.wake, end: addMins(s.wake, 30) });
    if (s.breakfast) entries.push({ icon:'🍳', name:'Breakfast', start: s.breakfast,  end: addMins(s.breakfast, 30) });
    if (s.lunch)     entries.push({ icon:'�-', name:'Lunch',     start: s.lunch,      end: addMins(s.lunch, 45) });
    if (s.dinner)    entries.push({ icon:'🍽️', name:'Dinner',    start: s.dinner,     end: addMins(s.dinner, 45) });
    if (s.sleep)     entries.push({ icon:'🌙', name:'Bed',       start: s.sleep,      end: null });

    // Merge in customActivities (room-based, already have start+end)
    var customs = s.customActivities || [];
    var ROOM_ICONS = { bedroom:'🛏️', your_bedroom:'🛏️', bathroom:'🚿', kitchen:'🍳', living_room:'🛋️', study:'📚', outside:'🌳', dining_room:'🍽️', nursery:'🍼', garden:'🌿', garage:'🔧' };
    customs.forEach(function(a) {
        var st = a.start || a.startTime || '';
        var en = a.end   || a.endTime   || '';
        if (!st) return;
        var nameLower = (a.name || '').toLowerCase();
        var icon = ROOM_ICONS[a.room] || '📌';
        if (nameLower.includes('shower') || nameLower.includes('bath')) icon = '🚿';
        else if (nameLower.includes('yoga')) icon = '🧘';
        else if (nameLower.includes('walk') || nameLower.includes('run') || nameLower.includes('jog')) icon = '🚶';
        else if (nameLower.includes('nap') || nameLower.includes('rest') || nameLower.includes('sleep')) icon = '😴';
        else if (nameLower.includes('read')) icon = '📖';
        else if (nameLower.includes('vitamin') || nameLower.includes('medicine') || nameLower.includes('prenatal')) icon = '💊';
        else if (nameLower.includes('work') || nameLower.includes('meeting') || nameLower.includes('grading')) icon = '💼';
        else if (nameLower.includes('cook') || nameLower.includes('prepar')) icon = '👩‍🍳';
        else if (nameLower.includes('shop') || nameLower.includes('errand')) icon = '🛒';
        else if (nameLower.includes('skincare') || nameLower.includes('brush')) icon = '✨';
        else if (a.room === 'outside') icon = '🌆';
        // Use AI-assigned room - resolve against valid rooms first, then only override for hygiene/sleep
        var room = _resolveDisplayRoom(a.room || '');
        if (nameLower.includes('shower') || nameLower.includes('bath') || nameLower.includes('hygiene') || nameLower.includes('freshen') || nameLower.includes('brush')) {
            room = room || 'bathroom'; // only set if not already assigned
        }
        // Personal activities always go in the private bedroom if one exists
        if (_dispPrivBedId && _isPersonalActivity(a.name)) room = _dispPrivBedId;
        // Remap your_bedroom → private bedroom (or generic bedroom in solo)
        if (room === 'your_bedroom') room = _dispPrivBedId || 'bedroom';
        // Remap generic 'bedroom' → private bedroom in group context
        if (room === 'bedroom' && _dispPrivBedId) room = _dispPrivBedId;
        // Infer only if completely unset - never hardcode 'study'
        if (!room) {
            if (nameLower.includes('skincare') || nameLower.includes('hygiene') || nameLower.includes('shower') || nameLower.includes('brush')) room = 'bathroom';
            else if (nameLower.includes('sleep') || nameLower.includes('nap') || nameLower.includes('rest') || nameLower.includes('wake')) room = 'bedroom';
            else if (nameLower.includes('cook') || nameLower.includes('prepar') || nameLower.includes('snack')) room = 'kitchen';
            else if (nameLower.includes('lunch') || nameLower.includes('dinner') || nameLower.includes('breakfast') || nameLower.includes('eat') || nameLower.includes('meal')) room = 'dining_room';
            else if (nameLower.includes('tv') || nameLower.includes('relax') || nameLower.includes('watch') || nameLower.includes('lounge')) room = 'living_room';
            else if (nameLower.includes('walk') || nameLower.includes('run') || nameLower.includes('jog') || nameLower.includes('errand') || nameLower.includes('shop') || nameLower.includes('lecture') || nameLower.includes('class') || nameLower.includes('work') || nameLower.includes('school')) room = 'outside';
        }
        // Always show room label using room name if possible
        const _rlObj = validRooms ? validRooms.find(r => r.id === room) : null;
        var roomLabel = room ? (' · ' + (_rlObj ? _rlObj.name : room.replace(/_/g,' '))) : '';
        entries.push({ icon: icon, name: a.name + roomLabel, start: st, end: en, _rawName: a.name, room: room });
    });

    // If we used AI timeline, prefer it
    if (s.timeline && s.timeline.length >= 5) return s.timeline;

    var DEFAULT_NAMES = ['Wake up','Morning routine','Breakfast','Lunch','Dinner','Bed'];

    // Build set of base names covered by custom activities
    var customBaseNames = {};
    customs.forEach(function(a) { if (a.name) customBaseNames[a.name.toLowerCase()] = true; });

    var hasShowerCustom = customs.some(function(a) {
        return a.name && (a.name.toLowerCase().includes('shower') || a.name.toLowerCase().includes('bath'));
    });

    // Index custom start times
    var customStarts = {};
    customs.forEach(function(a) {
        var st = a.start || a.startTime || '';
        if (st) customStarts[st] = true;
    });

    // Remove defaults superseded by a custom with same name or same start time
    entries = entries.filter(function(e) {
        var isDefault = DEFAULT_NAMES.indexOf(e.name) !== -1;
        if (!isDefault) return true;
        if (hasShowerCustom && e.name === 'Morning routine') return false;
        if (customBaseNames[e.name.toLowerCase()]) return false;
        if (e.start && customStarts[e.start]) return false;
        return true;
    });

    // Sort by time
    entries.sort(function(a, b) { return toMins(a.start) - toMins(b.start); });

    // Final pass: drop remaining defaults that overlap within 15 min of any non-default
    var cleaned = [];
    for (var i = 0; i < entries.length; i++) {
        var cur = entries[i];
        var isDefault = DEFAULT_NAMES.indexOf(cur.name) !== -1;
        var tooClose = cleaned.some(function(prev) {
            return Math.abs(toMins(cur.start) - toMins(prev.start)) < 15;
        });
        if (tooClose && isDefault) continue;
        cleaned.push(cur);
    }

    return cleaned;
}


// Auto-update schedule when state changes (pregnancy trimester, overdue, postpartum)
function _getScheduleVariantKey(bot) {
    // Return normal for Male bots - no reproductive schedule variants
    const isFemale = (bot.gender || '').toLowerCase().includes('female') || 
                     (bot.gender || '').toLowerCase().includes('woman') || 
                     (bot.gender || '').toLowerCase() === 'f';
    if (!isFemale) return 'normal';
    
    const cd = bot.cycleData;
    if (!cd) return 'normal';
    if (cd.postpartumStartDay != null && !cd.pregnant) return 'normal';
    if (cd.pregnant && !cd.birthVirtualDay) {
        // Parasite pregnancy → stage-based key
        if (cd.isParasitePregnancy) {
            const pDay = (typeof getParasiteWeek === 'function') ? getParasiteWeek(bot) : 0;
            if (pDay < 3)  return 'parasite_implantation';
            if (pDay < 6)  return 'parasite_feeding';
            if (pDay < 9)  return 'parasite_growth';
            if (pDay < 12) return 'parasite_maturation';
            return 'parasite_emergence';
        }
        const weeks = (typeof getPregnancyWeek === 'function' ? getPregnancyWeek(bot) : 0) || 0;
        if (weeks >= 43 && (bot.disadvantages||[]).includes('Always Overdue')) return 'overdue';
        if (weeks <= 12) return 'trimester1';
        if (weeks <= 26) return 'trimester2';
        return 'trimester3';
    }
    return 'normal';
}

async function _autoUpdateScheduleIfNeeded(bot) {
    if (!bot) return;
    const neededKey = _getScheduleVariantKey(bot);
    // Only regenerate if this variant hasn't been generated yet
    if (bot.scheduleVariants && bot.scheduleVariants[neededKey]) return;
    const key = _keyForBot(bot);
    if (!key) return;
    // Silent background generation
    try {
        const _autoGrp = groups.find(g => g.memberIds && g.memberIds.includes(bot.id));
        const _autoGrpRooms = (_autoGrp && _autoGrp.rooms && _autoGrp.rooms.length) ? _autoGrp.rooms : null;
        const ctx = _buildScheduleCharContext(bot, _autoGrpRooms);
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_SCHEDULE_MODEL,
                max_tokens: 7000,
                temperature: 0.35,
                messages: [
                    { role: 'system', content: 'You are a schedule designer. Return ONLY valid compact JSON. No markdown, no explanation, no preamble.' },
                    { role: 'user',   content: _buildSchedulePrompt(ctx) }
                ]
            }),
            signal: AbortSignal.timeout(180000)
        });
        const data = await res.json();
        if (data.error) { logError('_autoUpdateSchedule', data.error.message); return; }
        const msg = data.choices?.[0]?.message;
        let raw = (msg?.content || '').trim().replace(/```json|```/g, '').trim();
        if (!raw && msg?.reasoning) raw = msg.reasoning.trim();
        const _parsed = _repairScheduleJSON(raw);
        if (!_parsed) return;
        let variants = _normalizeVariants(_parsed);
        if (!variants) return;
        if (_autoGrpRooms) variants = _sanitizeScheduleRooms(variants, _autoGrpRooms);
        bot.scheduleVariants = Object.assign(bot.scheduleVariants || {}, variants);
        bot.schedule = _pickScheduleVariant(bot, bot.scheduleVariants);
        saveBots();
        // Refresh UI if bio panel is open
        if (document.getElementById('sched-view-text')) renderScheduleInBio(bot);
        if (document.getElementById('gp-sched-view-text')) renderGpSchedule(bot);
        logError('_autoUpdateSchedule', 'Generated variant: ' + neededKey);
    } catch(e) { logError('_autoUpdateSchedule', e.message); }
}


// toggleScheduleView() moved to schedule/ modules



// toggleGpScheduleView() moved to schedule/ modules



// generateScheduleAI() moved to schedule/ modules



// generateScheduleAIGroup() moved to schedule/ modules

