// Fast regex pre-check for time skips — handles common patterns without an AI call
function _detectTimeSkipRegex(txt, currentTime) {
    const t = txt.toLowerCase().trim();
    // Must contain a skip-intent word; bail early for plain conversation
    const skipWords = /\b(wait|skip|fast.?forward|advance|jump|rest|sleep|pass|until|till|til|to morning|to night|to evening|to afternoon|wake up|time skip|timeskip|next day|next morning|tomorrow|in \d|after \d|\d+ (hour|min|day|week|month))\b/;
    if (!skipWords.test(t)) return null;

    // Absolute clock: "wait until 10:30", "skip to 22h", "till 9am"
    const absMatch = t.match(/(?:wait|skip|until|till|til|to)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|h\b)?/);
    if (absMatch) {
        let h = parseInt(absMatch[1], 10);
        const min = absMatch[2] ? parseInt(absMatch[2], 10) : 0;
        const ampm = absMatch[3];
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        if (h >= 0 && h < 24 && min >= 0 && min < 60) {
            const targetMins = h * 60 + min;
            const [curH, curM] = (currentTime || '00:00').split(':').map(Number);
            const curTotalMins = curH * 60 + curM;
            const nextDay = targetMins <= curTotalMins;
            return { type: 'absolute', time: String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0'), nextDay };
        }
    }

    // Relative: "wait 2 hours", "rest 30 minutes", "sleep for 1 hour"
    const relMatch = t.match(/(\d+(?:\.\d+)?)\s*(hour|hr|h\b|minute|min|m\b)/);
    if (relMatch) {
        const n = parseFloat(relMatch[1]);
        const unit = relMatch[2];
        if (unit.startsWith('h')) return { type: 'relative', addMinutes: Math.round(n * 60) };
        return { type: 'relative', addMinutes: Math.round(n) };
    }

    // Days: "skip 3 days", "2 weeks later", "skip a month"
    const dayMatch = t.match(/(\d+)\s*(day|week|month)/);
    if (dayMatch) {
        const n = parseInt(dayMatch[1], 10);
        const unit = dayMatch[2];
        if (unit === 'week')  return { type: 'days', count: n * 7 };
        if (unit === 'month') return { type: 'days', count: n * 30 };
        return { type: 'days', count: n };
    }

    // Named shortcuts
    if (/\b(next day|tomorrow|skip to tomorrow)\b/.test(t)) return { type: 'absolute', time: '07:00', nextDay: true };
    if (/\b(to morning|next morning|wake up)\b/.test(t))    return { type: 'absolute', time: '07:00', nextDay: true };
    if (/\b(to night|tonight|to evening)\b/.test(t))        return { type: 'absolute', time: '20:00', nextDay: false };

    return null; // has skip-words but no clear number → fall through to AI
}

// AI-powered time skip detector - returns null if no skip intent, or {type, time/addMinutes, nextDay}
async function detectTimeSkipAI(txt, currentTime) {
    // Try fast regex first — saves a Groq round-trip for common English patterns
    const quick = _detectTimeSkipRegex(txt, currentTime);
    if (quick) return quick;

    if (!getGroqKeys().length) return null;
    const key = getNextGroqKey();
    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_GEN_MODEL,
                max_tokens: 60,
                temperature: 0.0,
                messages: [{ role: 'system', content: `You are a time-skip detector for a roleplay app. The user may write in ANY language. Your job is to detect if the user wants to skip, wait, or fast-forward time - and by how much.

Current in-game time: ${currentTime}

RETURN ONLY valid JSON (no explanation, no markdown). Choose one format:
- Jump to a specific clock time: {"type":"absolute","time":"HH:MM","nextDay":false}
- Add relative time: {"type":"relative","addMinutes":NUMBER}
- Skip days/weeks/months: {"type":"days","count":NUMBER}
- No skip intent: null

RULES:
- "nextDay": true if the target time is earlier than current time (would wrap to next day)
- For weeks: count = weeks * 7. For months: count = months * 30.
- Only return null if the message is clearly normal conversation/action with NO time-skip intent.
- When in doubt and there is a time or duration mentioned with skip-like words, return the skip.

EXAMPLES of YES (return JSON):
English: "wait till 10h" \u2192 {"type":"absolute","time":"10:00","nextDay":false}
English: "wait until 22:30" \u2192 {"type":"absolute","time":"22:30","nextDay":false}
English: "take a 2-hour break" \u2192 {"type":"relative","addMinutes":120}
English: "wait 30 minutes" \u2192 {"type":"relative","addMinutes":30}
English: "skip to tomorrow morning" \u2192 {"type":"absolute","time":"07:00","nextDay":true}
English: "skip 3 days" \u2192 {"type":"days","count":3}
English: "rest 2 hours" \u2192 {"type":"relative","addMinutes":120}
English: "skip 2 weeks" \u2192 {"type":"days","count":14}
Japanese: "10\u6642\u307e\u3067\u5f85\u3064" \u2192 {"type":"absolute","time":"10:00","nextDay":false}
French: "attendre jusqu'\u00e0 9h" \u2192 {"type":"absolute","time":"09:00","nextDay":false}
Korean: "10\uc2dc\uae4c\uc9c0 \uae30\ub2e4\ub824" \u2192 {"type":"absolute","time":"10:00","nextDay":false}
Spanish: "esperar 2 horas" \u2192 {"type":"relative","addMinutes":120}

EXAMPLES of NO (return null):
"*kisses her*", "how are you?", "let's go to the park", "what time is it?", "I'm tired"` },
                { role: 'user', content: `User wrote: "${txt.substring(0, 300)}"` }]
            }),
            signal: AbortSignal.timeout(8000)
        });
        const data = await res.json();
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        if (!raw || raw === 'null' || /^null$/i.test(raw)) return null;
        const match = raw.match(/\{[\s\S]*?\}/);
        if (!match) return null;
        const parsed = JSON.parse(match[0]);
        if (parsed.type === 'absolute' && parsed.time) return parsed;
        if (parsed.type === 'relative' && typeof parsed.addMinutes === 'number' && parsed.addMinutes > 0) return parsed;
        if (parsed.type === 'days' && typeof parsed.count === 'number' && parsed.count > 0) return parsed;
        return null;
    } catch(e) {
        return null;
    }
}

// Detect when user shouts or broadcasts to get everyone's attention — pure regex, no AI needed
function detectShoutAI(txt) {
    if (!txt || txt.trim().length < 2) return false;
    const t = txt.toLowerCase();
    // Emote-style shout markers
    if (/\*(shout|yell|scream|call out|holler|bellow|shouts|yells|screams)\*/.test(t)) return true;
    // English
    if (/\b(everyone|everybody|everyone here|all of you|gather (round|around|up|here)|come (here|now|quick)|listen up|attention (everyone|all|please)|hey (everyone|everybody|all))\b/.test(t)) return true;
    // French
    if (/\b(tout le monde|venez tous|tous ici|attention (tout le monde|tout)|rassemblement)\b/.test(t)) return true;
    // Spanish / Portuguese
    if (/\b(todos (aqui|vengan|vienen|juntos)|vengan todos|atenci[oó]n todos|oigan todos|todo el mundo)\b/.test(t)) return true;
    // German
    if (/\b(alle (herkommen|her|zusammen|kommen)|achtung alle)\b/.test(t)) return true;
    // Japanese
    if (/みんな(来て|集まって|聞いて)|皆(来て|集まって|注目)|全員(来て|集まれ|聞け)/.test(txt)) return true;
    // Korean
    if (/모두|다들|여러분|전부\s*(여기|와|모여|들어)/.test(txt)) return true;
    // Chinese (Simplified/Traditional)
    if (/大家(都|来|过来|注意|听|聽)|所有人(来|过来|注意)/.test(txt)) return true;
    // Vietnamese
    if (/\b(t[aấ]t c[aả]|m[oọ]i ng[uư][oờ]i)\b/.test(t)) return true;
    return false;
}

// Standalone group time-skip handler - called from sendGroupMsg regardless of room occupancy
async function applyGroupTimeSkip(txt, members) {
    if (!members || members.length === 0) return false;
    const _refBot = members[0];
    const _curTodStr = minutesToTimeStr(getTimeOfDay(_refBot));
    const _aiSkip = await detectTimeSkipAI(txt, _curTodStr);
    if (!_aiSkip) {
        // No intentional skip - just advance a few minutes per exchange
        const baseMins = 4 + Math.floor(Math.random() * 4);
        advanceGroupChatMinutes(members, baseMins);
        return false;
    }

    members.forEach(bot => {
        const _prevMin = getVirtualMinutes(bot);
        const _curDay = getVirtualDay(bot);
        let _newMins;

        if (_aiSkip.type === 'absolute') {
            const _targetMins = timeStrToMinutes(_aiSkip.time);
            const _nextDay = _aiSkip.nextDay || (_targetMins <= getTimeOfDay(bot));
            const _destDay = _nextDay ? _curDay + 1 : _curDay;
            _newMins = _destDay * 1440 + _targetMins;
            if (_destDay > _curDay) evaluateCycleAfterTimeSkip(bot, _destDay - _curDay);
        } else if (_aiSkip.type === 'relative') {
            _newMins = _prevMin + _aiSkip.addMinutes;
            const _daysDiff = Math.floor(_newMins / 1440) - _curDay;
            if (_daysDiff > 0) evaluateCycleAfterTimeSkip(bot, _daysDiff);
        } else if (_aiSkip.type === 'days') {
            const _skipDays = _aiSkip.count;
            _newMins = (_curDay + _skipDays) * 1440 + getTimeOfDay(bot);
            evaluateCycleAfterTimeSkip(bot, _skipDays);
        } else {
            return; // unknown type - skip this bot
        }

        bot.virtualMinutes = _newMins;
        bot.virtualDay = Math.floor(_newMins / 1440);
        checkScheduleMilestones(bot, _prevMin, _newMins);
        saveBots();
    });

    updateGroupTimeBadges(members);
    return true;
}

function _relationStatusGuardLabel(bot, label, evidenceText) {
    if (!label) return false;
    const rel = (getDynField(bot, 'relation') || '').toLowerCase();
    const hostile = /\brival|enemy|nemesis|hostile|adversar|opponent\b/.test(rel);
    const family = /\bmother|mom|mum|father|dad|parent|son|daughter|child|kid|sister|brother|sibling|chị|em\b/.test(rel);
    const romanticSet = new Set(['In Love', 'Blushing', 'Flirty', 'Aroused']);
    if (!romanticSet.has(label)) return true;
    if (family) return false;
    if (!hostile) return true;
    return /\b(love|adore|kiss|kissing|hug|want you|miss you|desire|crush|blush(?:ing)?|flirt|romantic)\b/i.test(evidenceText || '');
}

async function updateGroupMemberStatuses(members, grp) {
    const _quickStatus = (txt) => {
        txt = txt.toLowerCase().replace(/\*/g,'');
        const checks = [
            {kws:["i'm fine","i am fine","feeling fine","i'm okay","i'm ok","i am okay","i am ok","i'm good","i am good","i'm alright","everything's fine"], label:'Fine'},
            {kws:["i'm happy","so happy","i am happy","feeling happy","so pleased","so glad"], label:'Happy'},
            {kws:["so excited","i'm excited","i am excited","can't wait","cannot wait","thrilled"], label:'Excited'},
            {kws:["i love you","i'm in love","falling for you","head over heels"], label:'In Love'},
            {kws:["so aroused","turned on","feeling hot","i'm aroused"], label:'Aroused'},
            {kws:["i'm flirting","feeling flirty","being flirty"], label:'Flirty'},
            {kws:["i'm blushing","my cheeks are red","my face is red","cheeks flushed"], label:'Blushing'},
            {kws:["i'm shy","feeling shy","so shy","a little shy"], label:'Shy'},
            {kws:["i'm sad","so sad","i am sad","feeling sad","feel down","feeling down"], label:'Sad'},
            {kws:["i'm crying","tears streaming","tears down","started crying","can't stop crying"], label:'Crying'},
            {kws:["my heart is broken","heartbroken","i'm heartbroken"], label:'Heartbroken'},
            {kws:["i'm so alone","feeling lonely","i'm lonely","no one is here"], label:'Lonely'},
            {kws:["i'm scared","i'm afraid","so frightened","terrified","filled with fear"], label:'Afraid'},
            {kws:["i'm nervous","feeling nervous","so nervous","jittery"], label:'Nervous'},
            {kws:["i'm anxious","so anxious","feeling anxious","on edge","filled with dread"], label:'Anxious'},
            {kws:["i'm angry","i am angry","so angry","i'm mad","so mad"], label:'Angry'},
            {kws:["i'm furious","so furious","i am furious","seething","i'm raging"], label:'Furious'},
            {kws:["i'm jealous","feeling jealous","so jealous"], label:'Jealous'},
            {kws:["i'm disgusted","that's disgusting","feeling sick","feel sick"], label:'Disgusted'},
            {kws:["i'm surprised","what a surprise","can't believe it","shocked"], label:'Surprised'},
            {kws:["i'm confused","so confused","don't understand","what's happening"], label:'Confused'},
            {kws:["something's off","i'm suspicious","not sure about this"], label:'Suspicious'},
            {kws:["i'm smug","feeling smug","quite pleased with myself"], label:'Smug'},
            {kws:["i'm determined","so determined","i will do this","not giving up"], label:'Determined'},
            {kws:["feeling healthy","i'm healthy","in great shape"], label:'Healthy'},
            {kws:["feeling strong","so strong","never been stronger"], label:'Strong'},
            {kws:["i'm weak","feeling weak","so weak","barely standing"], label:'Weak'},
            {kws:["exhausted","i'm tired","i am tired","so tired","worn out","completely drained"], label:'Exhausted'},
            {kws:["i'm sick","feeling ill","i am ill","not feeling well","coming down with"], label:'Ill'},
            {kws:["i'm injured","i got hurt","so hurt","in pain","hurts so much","it hurts"], label:'In Pain'},
            {kws:["i'm drunk","feeling drunk","tipsy","had too much"], label:'Drunk'},
            {kws:["hangover","hungover","head is pounding","still drunk from"], label:'Hungover'},
            {kws:["i'm starving","so hungry","feeling hungry","haven't eaten"], label:'Hungry'},
            {kws:["i'm sleepy","so sleepy","can barely keep my eyes open","falling asleep","need sleep"], label:'Sleepy'},
        ];
        for (const c of checks) if (c.kws.some(k=>txt.includes(k))) return c.label;
        return null;
    };
    for (const bot of members) {
        const lastBotMsg = grp.history.slice().reverse().find(m => m.role === 'assistant' && m.speakerId === bot.id);
        if (lastBotMsg) {
            const ql = _quickStatus(lastBotMsg.content);
            if (ql) {
                const m2 = STATUS_LIST.find(s => s.label === ql);
                if (m2 && _relationStatusGuardLabel(bot, m2.label, lastBotMsg.content || '')) {
                    bot.currentStatus = m2;
                    bot.emotion = { icon: m2.icon, label: m2.label, desc: m2.label };
                    continue;
                }
            }
        }
        const recentHistory = grp.history.slice(-6).map(m => {
            const sp = members.find(mb => mb.id === m.speakerId);
            return m.role === 'user' ? 'User: ' + m.content : (sp ? sp.name : 'Char') + ': ' + m.content;
        }).join('\n');
        const statusLabels = STATUS_LIST.map(s => s.label).join(', ');
        const keys = getGroqKeys();
        if (!keys.length) return;
        try {
            const res = await fetch(GROQ_API_URL, {
                method:'POST', headers:{'Authorization':`Bearer ${getNextGroqKey()}`,'Content-Type':'application/json'},
                body:JSON.stringify({model:GROQ_GEN_MODEL,messages:[{role:'user',content:`Pick current status for "${bot.name}" from: ${statusLabels}. Return ONLY the label.\n${recentHistory}`}],max_tokens:10,temperature:0.3}),
            signal: AbortSignal.timeout(30000)
            });
            const data = await res.json();
            const raw = (data.choices?.[0]?.message?.content||'').trim().replace(/[^a-zA-Z ]/g,'');
            const matched = STATUS_LIST.find(s => raw.toLowerCase().includes(s.label.toLowerCase()));
            if (matched && _relationStatusGuardLabel(bot, matched.label, recentHistory)) {
                bot.currentStatus = matched;
                bot.emotion = { icon: matched.icon, label: matched.label, desc: matched.label };
            }
        } catch(e) {  }
    }
    saveBots();
}

function memberMap_safe(speakerId, members) {
    return members.find(m => m.id === speakerId) || null;
}
