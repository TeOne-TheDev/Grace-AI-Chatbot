/**
 * storage-shim.js
 * Catch and mock localStorage/sessionStorage for strict local environments (file:// protocol)
 * Prevents fatal SecurityErrors from halting script execution on mobile browsers.
 */

(function () {
    function createMockStorage() {
        let store = {};
        return {
            getItem: function (key) { return store[key] || null; },
            setItem: function (key, value) { store[key] = String(value); },
            removeItem: function (key) { delete store[key]; },
            clear: function () { store = {}; },
            key: function (i) { return Object.keys(store)[i] || null; },
            get length() { return Object.keys(store).length; }
        };
    }

    try {
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
    } catch (e) {
        Object.defineProperty(window, 'localStorage', {
            value: createMockStorage(),
            writable: false
        });
    }

    try {
        const testKey = '__storage_test__';
        window.sessionStorage.setItem(testKey, testKey);
        window.sessionStorage.removeItem(testKey);
    } catch (e) {
        Object.defineProperty(window, 'sessionStorage', {
            value: createMockStorage(),
            writable: false
        });
    }
})();

function timeStrToMinutes(str) {
    if (!str) return 9 * 60;
    const parts = str.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function formatBubbleContent(text) {
    if (text === null || text === undefined || typeof text !== 'string') return '';
    text = text.replace(/<\s+i\s*>/gi, '<i>').replace(/<\s*\/\s*i\s*>/gi, '</i>');
    text = text.replace(/\b_I\b/g, 'I');
    text = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
    text = text.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
    // text = text.replace(/\n*[A-Z][A-Z\s]{1,20}::[^:\n]{0,30}::[\s\S]*/g, '').trim(); // DISABLED - causing empty chat bubbles
    text = text.replace(/EMOTION::[\s\S]*/i, '').trim();
    text = text.replace(/([.!?])\s+([a-z])/g, (m, p, l) => p + ' ' + l.toUpperCase());
    text = text.charAt(0).toUpperCase() + text.slice(1);
    let cleaned = text.replace(/(\b\w{2,}\b)(\s+\1){4,}/gi, '$1...');
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '<b>$1</b>');
    cleaned = cleaned.replace(/_([^_\n]+)_/g, '<i>$1</i>');
    cleaned = cleaned.replace(/\*/g, '');
    cleaned = cleaned.replace(/\[([^\]]{1,150})\]/g, '<b>$1</b>');
    cleaned = cleaned.replace(/\(([^)\n]+)\)/g, (_, t) => '\x01T' + t + '\x01T');
    const iSegs = [];
    cleaned = cleaned.replace(/<(i|b)>([\s\S]*?)<\/\1>/gi, (_, tag, content) => {
        iSegs.push({ tag, content });
        return '\x01I' + (iSegs.length - 1) + '\x01';
    });
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function restoreI(s) {
        s = s.replace(/\x01L(\d+)\x01/g, (_, n) => {
            const item = iSegs[parseInt(n)];
            return `<${item.tag}>` + esc(item.content) + `</${item.tag}>`;
        });
        s = s.replace(/\x01I(\d+)\x01/g, (_, n) => {
            const item = iSegs[parseInt(n)];
            return `<${item.tag}>` + esc(item.content) + `</${item.tag}>`;
        });
        s = s.replace(/\x01T([^\x01]*)\x01T/g, (_, t) => '<span class="usr-thought" title="Inner thought — AI senses but cannot directly read">(' + esc(t) + ')</span>');
        return s;
    }
    // First, fix missing spaces after quotes: "word."Next -> "word." Next
    cleaned = cleaned.replace(/"([a-zA-Z])/g, '" $1');
    // Split on quoted text (dialogue) - trailing space is optional
    const splitParts = cleaned.split(/("(?:[^"]*)"\s*)/);
    let result = '';
    splitParts.forEach((part, i) => {
        // Skip empty parts
        if (!part || part === '""' || part === '"' || !part.trim()) return;
        if (i % 2 === 1) {
            // Dialogue - trim the trailing space we added
            result += '<span class="speech-text">' + restoreI(esc(part.trim())) + '</span>';
        } else {
            let _p = restoreI(esc(part));
            _p = _p.replace(/\n/g, '<br>'); // Handle newlines in action text
            result += '<span class="action-text">' + _p + '</span>';
        }
    });
    if (!result) {
        let _res = esc(cleaned);
        _res = _res.replace(/\n/g, '<br>');
        return _res;
    }
    return result;
}

function typewriterAnimate(bubble, rawText, onDone) {
    bubble.innerHTML = formatBubbleContent(rawText);
    bubble.style.opacity = '0';
    bubble.style.transition = 'opacity 0.35s ease';
    requestAnimationFrame(() => { requestAnimationFrame(() => { bubble.style.opacity = '1'; }); });
    if (onDone) setTimeout(onDone, 350);
}

const T = {
    English: {
        settingsTitle: 'Settings',
        apiKeyLabel: 'Groq API Key',
        langSelect: 'Interface & Chatbot Language',
        saveSettings: 'Save Settings',
        saved: 'Saved!',
        createTitle: 'Create Character',
        aiGen: 'Auto Generate with Llama 3.3',
        avatarLabel: 'Character Avatar',
        drawBtn: 'Gen',
        redrawBtn: 'Redraw',
        modelLabel: 'AI Model',
        genderLabel: 'Gender',
        genderM: 'Male',
        genderF: 'Female',
        nameLabel: 'Character Name',
        appLabel: 'Appearance',
        appPlaceholder: 'Ex: Tall with short black hair, sharp amber eyes, usually wears a dark jacket...',
        bioLabel: 'Background (Bio)',
        bioPlaceholder: 'Ex: A former detective who left the force after a controversial case...',
        promptLabel: 'Personality & Traits',
        promptPlaceholder: 'Ex: Cold and analytical but secretly caring. Speaks in short, direct sentences. Rarely smiles...',
        saveChar: 'Save Character',
        typing: 'AI is typing...',
        illustrate: ' Illustrate Scene',
        drawing: 'Drawing...',
        bioGender: 'Gender:',
        bioApp: 'Appearance:',
        bioBg: 'Background:',
        inputPlaceholder: 'Type a message...',
        needApp: 'Please describe the appearance first!',
        needName: 'Please enter a name!',
        needKey: 'Please set your API Key first!',
        errGen: 'Error generating character. Check API key.',
        errSend: 'Error sending message.',
        contextLabel: 'Meeting Context',
        contextHint: '(optional)',
        imgStyleLabel: '🎨 Image Style',
        portraitLabel: '🖼️ Chat Background (FHD 9:16)',
        portraitHint: 'Fill in: Gender + Name + Personality + Appearance first',
        portraitBtn: '🖼 Generate Chat Background',
        portraitDrawing: 'Drawing background...',
        useBgLabel: 'Use as chat background',
        polKeyLabel: 'Pollinations API Key',
        polKeyHint: 'Free tier - no key needed. Get key at auth.pollinations.ai',
        polKeyPlaceholder: 'Leave empty = use free tier',
        bgSettingLabel: '🖼️ Portrait Background',
        bgSettingDesc: 'When enabled, each character\'s portrait is used as their own chat background',
        bgToggleLabel: 'Use portrait as chat background',
        needFields: 'Please fill in: Gender + Name + Personality + Appearance first!',
    }
};

function getLang() {
    // Read from language picker or fallback to English
    const langSel = document.getElementById('ai-lang-select');
    if (langSel) return langSel.value;
    return safeGetItem('ai_lang', 'English');
}

function t(key) {
    const lang = getLang();
    return (T[lang] && T[lang][key]) ? T[lang][key] : (T['English'][key] || key);
}



function setText(id, val) {
    const el = document.getElementById(id);

    if (el && val !== undefined && val !== null) el.innerText = val;
}
function setAttr(id, attr, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.setAttribute(attr, val);
}
function safeParse(key, fallback) {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
    catch (e) { logError('Corrupt localStorage: ' + key + ' - reset to default', e.message); return fallback; }
}
let bots = safeParse('grace_bots_v6', []);

// ── Restore portrait URLs from separate storage ──
bots.forEach(bot => {
    if (bot.portraitUrl === '__stored__') {
        const restoredUrl = loadPortraitUrl(bot.id);
        if (restoredUrl) {
            bot.portraitUrl = restoredUrl;
        } else {
            delete bot.portraitUrl;
        }
    }
    // Restore illustration URLs from separate storage
    (bot.history || []).forEach(msg => {
        if (msg.illustUrl === '__stored__') {
            const restoredUrl = loadIllusUrl(msg.msgId);
            if (restoredUrl) {
                msg.illustUrl = restoredUrl;
            } else {
                delete msg.illustUrl;
            }
        }
    });
});

// ── Migration từ các key cũ sang v6 ──
if (!bots.length) {
    const _oldKeys = ['grace_bots_v5', 'grace_bots_v4', 'grace_bots_v3', 'grace_bots_v2', 'grace_bots_v1', 'grace_bots'];
    for (const _oldKey of _oldKeys) {
        try {
            const _oldData = safeParse(_oldKey, []);
            if (_oldData && _oldData.length) {
                bots = _oldData;
                safeSetItem('grace_bots_v6', JSON.stringify(bots));
                try { localStorage.removeItem(_oldKey); } catch (e) { }
                break;
            }
        } catch (e) { }
    }
}

// ── Migration: Convert Unicode escape sequences and fix corrupted emojis ──
function migrateEmotionUnicode() {
    let migrated = false;
    for (const bot of bots) {
        if (bot.emotion && typeof bot.emotion.icon === 'string') {
            // Convert Unicode escape sequences to actual emojis
            const oldIcon = bot.emotion.icon;
            bot.emotion.icon = decodeUnicode(oldIcon);
            if (oldIcon !== bot.emotion.icon) migrated = true;
        }
        if (bot.currentStatus && typeof bot.currentStatus.icon === 'string') {
            const oldIcon = bot.currentStatus.icon;
            bot.currentStatus.icon = decodeUnicode(oldIcon);
            if (oldIcon !== bot.currentStatus.icon) migrated = true;
        }
        // Also fix any corrupted status in currentStatus that might be corrupted
        if (bot.currentStatus && bot.currentStatus.icon && /ð|â|ï|¿|½|¼|¾|»|«/.test(bot.currentStatus.icon)) {
            // Find the correct emoji from STATUS_LIST by label
            const correctEmoji = getCorrectEmojiForStatus(bot.currentStatus.label);
            if (correctEmoji && correctEmoji !== bot.currentStatus.icon) {
                bot.currentStatus.icon = correctEmoji;
                migrated = true;
            }
        }
    }
    if (migrated) {
        safeSetItem('grace_bots_v6', JSON.stringify(bots));
        console.log('[Migration] Fixed corrupted emojis and Unicode sequences');
    }
}

// Helper function to get correct emoji for status label
function getCorrectEmojiForStatus(label) {
    const emojiMap = {
        'Fine': '😊', 'Happy': '😄', 'Excited': '🤩', 'In Love': '💖', 'Aroused': '🥵',
        'Flirty': '😉', 'Blushing': '😳', 'Shy': '😶', 'Sad': '😢', 'Crying': '😭',
        'Heartbroken': '💔', 'Lonely': '🏙️', 'Afraid': '😨', 'Nervous': '😰', 'Anxious': '😟',
        'Angry': '😠', 'Furious': '🤬', 'Jealous': '😤', 'Disgusted': '🤢', 'Surprised': '😲',
        'Confused': '😕', 'Suspicious': '🤨', 'Smug': '😏', 'Determined': '💪', 'Healthy': '💚',
        'Strong': '⚡', 'Weak': '😔', 'Exhausted': '😴', 'Ill': '🤒', 'Injured': '🤕',
        'In Pain': '😣', 'Drunk': '🥴', 'Hungover': '🤕', 'Hungry': '🍽️', 'Sleepy': '😴',
        'Pregnant': '🤰', 'Overdue': '⏳', 'On Period': '🩸', 'Fat': '🍔', 'Slim': '🏃',
        'Tied Up': '⛓️', 'Bored': '😒', 'Embarrassed': '😅', 'Guilty': '😔', 'Relieved': '😅',
        'Hopeful': '✨', 'Naughty': '😈'
    };
    return emojiMap[label];
}

migrateEmotionUnicode();

// ── Also convert on the fly for display ──
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

    // Handle \uXXXX escape sequences (including surrogate pairs)
    try {
        str = str.replace(/\\u([0-9A-Fa-f]{4})\\u([0-9A-Fa-f]{4})/g, (match, hi, lo) => {
            const high = parseInt(hi, 16);
            const low = parseInt(lo, 16);
            // Check if it's a surrogate pair
            if (high >= 0xD800 && high <= 0xDBFF && low >= 0xDC00 && low <= 0xDFFF) {
                return String.fromCodePoint(((high - 0xD800) << 10) + (low - 0xDC00) + 0x10000);
            }
            return String.fromCharCode(high) + String.fromCharCode(low);
        });
        str = str.replace(/\\u([0-9A-Fa-f]{4})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
    } catch (e) { /* leave str as-is if decode fails */ }

    // Handle percent-encoded emoji (e.g. %F0%9F%98%8A)
    if (str.includes('%')) {
        try { str = decodeURIComponent(str); } catch (e) { /* not valid percent-encoding, leave as-is */ }
    }

    return str;
}

let groups = safeParse('grace_groups_v1', []);

// ── Restore group illustration URLs from separate storage ──
groups.forEach(grp => {
    if (grp.history) {
        grp.history.forEach(msg => {
            if (msg.grpIllusUrl === '__stored__') {
                const restoredUrl = loadIllusUrl(msg.msgId || 'grp_' + Date.now());
                if (restoredUrl) {
                    msg.grpIllusUrl = restoredUrl;
                } else {
                    delete msg.grpIllusUrl;
                }
            }
        });
    }
});

let personas = safeParse('grace_personas_v1', []);
let folders = safeParse('grace_folders_v1', []); // [{id, name, icon, memberIds:[], collapsed:bool}]
let curId = null;
let curGroupId = null;
let _curGroupProfileBotId = null;

const RECENT_MSG_KEEP = 15;

// ── Group chat behaviour tuning ──
const BYSTANDER_CHANCE_HIGH = 0.58;  // emotional/long msg - chance a non-addressed member reacts
const BYSTANDER_CHANCE_LOW = 0.22;  // quiet msg - bystander reaction chance
const CHAIN_REACTOR_CHANCE = 0.75;  // chance a non-responder joins chain reaction
const CHAIN_RESPONDER_CHANCE = 0.45;  // chance an eligible member adds a follow-up reply
const PASSIVE_DRIFT_CHANCE = 0.05;  // chance a bot drifts to adjacent room each turn

function buildHistoryForAPI(bot) {
    const history = bot.history;
    if (!history || history.length === 0) return [];

    const all = history.map(m => {
        let baseContent = (m.role === 'user' && m.contentForAI !== undefined)
            ? m.contentForAI
            : m.content.replace(/EMOTION::[\s\S]*/i, '').trim();


        if (m.role === 'user') {
            baseContent = baseContent
                .replace(/\[User action:\s*/gi, '[')
                .replace(/\*([^*\n]+)\*/g, '[Action: $1]')
                .trim();
        }


        if (m.role === 'assistant') {
            baseContent = baseContent
                .replace(/EMOTION::[\s\S]*/i, '')
                .replace(/<[^>]+>/g, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
        }


        let content = baseContent;
        if (m.role === 'user' && m.innerThoughts && m.innerThoughts.length > 0) {
            const thoughtHint = decodeUnicode(m.innerThoughts.join(' / '));
            content = content
                ? content + `\n[Narrator note - his inner feeling, not spoken aloud: ${thoughtHint}]`
                : `[Narrator note - his inner feeling, not spoken aloud: ${thoughtHint}]`;
        }
        let finalContent = content.trim();
        if (m.role === 'user') {
            const pId = bot.personaId || '';
            const p = pId ? personas.find(x => x.id === pId) : null;
            if (p) finalContent = `<<${p.name}>>: ${finalContent}`;
        }
        return { role: m.role, content: finalContent };
    }).filter(m => m.content.length > 0);

    const recent = all.slice(-RECENT_MSG_KEEP);

    console.group(`[Solo AI History - Chatting with ${bot.name}]`);
    console.log(`Sending ${recent.length} recent messages:`);
    recent.forEach((m, i) => console.log(`${i + 1}. [${m.role.toUpperCase()}] ${m.content}`));
    console.groupEnd();


    if (bot.memorySummary && all.length > RECENT_MSG_KEEP) {
        return [
            { role: 'user', content: `[STORY MEMORY - events that happened before this conversation window. Treat as established fact - never contradict or forget these.]\n\n${bot.memorySummary}\n\n[END MEMORY - the most recent messages follow. Continue naturally from here.]` },
            { role: 'assistant', content: 'Understood. I remember everything. Continuing naturally.' },
            ...recent
        ];
    }

    return recent;
}

async function autoUpdateMemory(bot) {
    const keys = getGroqKeys();
    if (!keys.length) return;

    const all = bot.history;
    const totalAssistant = all.filter(m => m.role === 'assistant').length;

    // Trigger from message 4 onwards (2 exchanges minimum)
    if (totalAssistant < 2) return;

    // Don't re-summarize too often - wait for at least 2 new assistant messages since last summary
    const lastSummaryAt = bot.lastSummaryAt || 0;
    if (totalAssistant - lastSummaryAt < 2) return;

    // For early chats (under RECENT_MSG_KEEP), summarize ALL history
    // For mature chats, summarize only the unsummarized slice
    let msgsToSummarize;
    if (all.length <= RECENT_MSG_KEEP) {
        // Early chat: summarize everything from the start
        msgsToSummarize = all;
    } else {
        const currentCutoff = all.length - RECENT_MSG_KEEP;
        const prevCutoff = bot.lastSummaryCutoff || 0;
        msgsToSummarize = all.slice(prevCutoff, currentCutoff);
        if (msgsToSummarize.length < 2) return;
    }

    const newHistText = msgsToSummarize.map(m => {
        const display = m.content.replace(/EMOTION::[\s\S]*/i, '').replace(/<[^>]+>/g, '').trim();
        return (m.role === 'user' ? 'User' : bot.name) + ': ' + display;
    }).join('\n').substring(0, 3000);

    const prevSummary = bot.memorySummary
        ? `[Existing summary - update with new events below]\n${bot.memorySummary}\n\n[New events to integrate]\n`
        : '';

    try {
        const data = await fetchGroq({
            model: GROQ_GEN_MODEL,
            messages: [{
                role: 'system',
                content: `You are a story continuity engine. Produce a dense factual bullet-point log - events, established facts, current state - so the AI character never contradicts past events. No narrative prose, no emotional analysis.`
            }, {
                role: 'user',
                content: `${prevSummary}CHARACTER: ${bot.name} (${bot.gender})
Base relation with user: ${bot.relation || 'not specified'}

CONVERSATION TO SUMMARIZE:
${newHistText}

---
Write a bullet-point memory log for ${bot.name}. Each bullet = one fact. Specific (names, places, objects, quoted phrases). NO full narrative sentences.

Format:
- relationship: [current dynamic / stage]
- [event]: [what happened - specific, one clause]
- [milestone]: [confession / first / conflict - what exactly]
- state: [${bot.name}'s emotional state toward user right now]
- unresolved: [open threads, promises, tensions if any]

Rules: Past tense for events, present for state. Max 7 bullets. No preamble, no headers, no prose.`
            }],
            max_tokens: 1000,
            temperature: 0.3
        });
        const summary = data.choices?.[0]?.message?.content?.trim();
        if (summary && summary.length > 30) {
            bot.memorySummary = summary;
            bot.lastSummaryAt = totalAssistant;
            bot.lastSummaryCutoff = all.length <= RECENT_MSG_KEEP ? 0 : (all.length - RECENT_MSG_KEEP);
            saveBots();
            const bioModal = document.getElementById('bio-modal');
            if (bioModal && bioModal.style.display === 'flex') renderMemoryLogUI(bot);
        }
    } catch (e) { logError('autoUpdateMemory', e.message); }
}

function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || (e.message && e.message.includes('quota'))) {

            // Clean up illustration URLs
            const illusKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('grace_illus_')) illusKeys.push(k);
            }
            for (const ik of illusKeys) {
                localStorage.removeItem(ik);
                bots.forEach(bot => {
                    const msgId = ik.replace('grace_illus_', '');
                    const msg = (bot.history || []).find(m => m.msgId === msgId);
                    if (msg) delete msg.illustUrl;
                });
            }
            try { localStorage.setItem(key, value); return true; } catch (e2) { }

            // Clean up portrait URLs
            const portraitKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('grace_portrait_')) portraitKeys.push(k);
            }
            for (const pk of portraitKeys) {
                localStorage.removeItem(pk);
                const botId = pk.replace('grace_portrait_', '');
                const bot = bots.find(b => b.id === botId);
                if (bot) delete bot.portraitUrl;
            }
            try { localStorage.setItem(key, value); return true; } catch (e3) { }


            if (key === 'grace_bots_v6') {
                try {
                    const parsed = JSON.parse(value);
                    const trimmed = JSON.stringify(parsed.map(bot => ({
                        ...bot,
                        history: (bot.history || []).slice(-40)
                    })));
                    localStorage.setItem(key, trimmed);
                    logError('Storage quota: trimmed to 40 msgs/bot', '');
                    return true;
                } catch (e4) { }

                try {
                    const parsed = JSON.parse(value);
                    const trimmed = JSON.stringify(parsed.map(bot => ({
                        ...bot,
                        history: (bot.history || []).slice(-15)
                    })));
                    localStorage.setItem(key, trimmed);
                    logError('Storage quota: emergency trim to 15 msgs/bot', '');
                    return true;
                } catch (e5) { }
            }
            logError('Storage quota exceeded even after cleanup', key);
            return false;
        }
        logError('localStorage error', e.message);
        return false;
    }
}
function safeGetItem(key, fallback) {
    try { const v = localStorage.getItem(key); return v !== null ? v : (fallback !== undefined ? fallback : null); }
    catch (e) { return fallback !== undefined ? fallback : null; }
}
function safeRemoveItem(key) {
    try { localStorage.removeItem(key); } catch (e) { }
}
function saveIllusUrl(msgId, base64Url) {
    if (!msgId || !base64Url) return;
    safeSetItem('grace_illus_' + msgId, base64Url);
}
function loadIllusUrl(msgId) {
    if (!msgId) return null;
    return localStorage.getItem('grace_illus_' + msgId) || null;
}
function savePortraitUrl(botId, base64Url) {
    if (!botId || !base64Url) return;
    safeSetItem('grace_portrait_' + botId, base64Url);
}
function loadPortraitUrl(botId) {
    if (!botId) return null;
    return localStorage.getItem('grace_portrait_' + botId) || null;
}
function trimBotHistory(bot, maxLen) {
    maxLen = maxLen || 200;
    const minKeep = RECENT_MSG_KEEP * 2;
    const effectiveMax = Math.max(maxLen, minKeep);
    if ((bot.history || []).length > effectiveMax + 20) {
        bot.history = bot.history.slice(-(effectiveMax));
    }
}

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
        // Move portrait URL to separate storage if it's a data URL
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

function deleteAllChatData() {
    if (!confirm('Are you absolutely sure you want to delete ALL characters, group chats, folders, and images? Your API keys and global settings will remain. This CANNOT be undone!')) return;

    // 1. Clear memory variables
    bots = [];
    groups = [];
    folders = [];
    curId = null;
    curGroupId = null;

    // 2. Remove items from storage
    safeRemoveItem('grace_bots_v6');
    safeRemoveItem('grace_bots'); // legacy
    safeRemoveItem('grace_groups_v1');
    safeRemoveItem('grace_folders_v1');

    // 3. Delete generated images and portraits
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('grace_illus_') || key.startsWith('grace_portrait_'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => safeRemoveItem(k));

    // 4. Update UI
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

function deleteEverything() {
    if (!confirm('⚠️ DANGER: This will delete ALL data including API keys, personas, and settings!\n\nThis is a COMPLETE factory reset. EVERYTHING will be lost.\n\nAre you absolutely sure?')) return;
    if (!confirm('🔥 FINAL WARNING: API keys, all characters, groups, folders, images, personas, and settings will be PERMANENTLY DELETED.\n\nType "DELETE EVERYTHING" in your mind to confirm...')) return;

    // 1. Do everything deleteAllChatData does
    bots = [];
    groups = [];
    folders = [];
    curId = null;
    curGroupId = null;

    // 2. Remove all chat data
    safeRemoveItem('grace_bots_v6');
    safeRemoveItem('grace_bots');
    safeRemoveItem('grace_groups_v1');
    safeRemoveItem('grace_folders_v1');

    // 3. Delete generated images and portraits
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('grace_illus_') || key.startsWith('grace_portrait_'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => safeRemoveItem(k));

    // 4. Delete API keys
    safeRemoveItem('groq_keys_list');
    safeRemoveItem('groq_key');
    safeRemoveItem('groq_key_2');
    safeRemoveItem('groq_key_3');
    safeRemoveItem('groq_key_idx');

    // 5. Delete personas
    safeRemoveItem('grace_personas_v1');
    personas = [];

    // 6. Delete settings/preferences
    safeRemoveItem('grace_lang');
    safeRemoveItem('grace_settings_v1');
    safeRemoveItem('img_style_override');
    safeRemoveItem('grace_last_screen');

    // 7. Update UI
    if (typeof showScreen === 'function') {
        showScreen('sc-home');
    }
    if (typeof renderBotList === 'function') {
        renderBotList();
    }
    if (typeof renderFolderList === 'function') {
        renderFolderList();
    }

    showToast('💥 EVERYTHING deleted. App reset to factory state.', '#1a0505', '#ef4444');
}

function savePersonas() {
    safeSetItem('grace_personas_v1', JSON.stringify(personas));
}
window.curEmo = { icon: '', label: 'NEUTRAL', text: 'Waiting for response' };

// Helper function to extract emotion from AI response and update window.curEmo
function extractAndSetEmotion(reply) {
    // Try pattern with 3 parts: EMOTION::emoji::label::text
    const emMatch = reply.match(/EMOTION::([^:\n]+)::([^:\n]+)::([^\n]+)/);
    if (emMatch) {
        window.curEmo = {
            icon: emMatch[1].trim(),
            label: emMatch[2].trim(),
            text: emMatch[3].trim()
        };
        console.log('[Emote] Extracted 3-part EMOTION:', window.curEmo);
        return;
    }
    // Try pattern with 2 parts: EMOTION::emoji::text
    const simpleMatch = reply.match(/EMOTION::([^:\n]+)::([^\n]+)/);
    if (simpleMatch) {
        window.curEmo = {
            icon: simpleMatch[1].trim(),
            label: simpleMatch[1].trim(),
            text: simpleMatch[2].trim()
        };
        console.log('[Emote] Extracted 2-part EMOTION:', window.curEmo);
        return;
    }
    // Try pattern with just emoji: EMOTION::emoji
    const emojiOnly = reply.match(/EMOTION::([^:\n]+)/);
    if (emojiOnly) {
        window.curEmo = {
            icon: emojiOnly[1].trim(),
            label: emojiOnly[1].trim(),
            text: ''
        };
        console.log('[Emote] Extracted emoji-only EMOTION:', window.curEmo);
        return;
    }
    console.log('[Emote] No EMOTION pattern found in reply');
}

// ── Bug Fix: scrollToTop — Home button in bottom nav ──────────────────────
function scrollToTop() {
    // Close any open chat/screen and return to home
    const home = document.getElementById('sc-home');
    if (!home) return;
    // Remove 'off' class to show home
    home.classList.remove('off');
    // Close all other screens
    document.querySelectorAll('.screen.active').forEach(s => {
        if (s.id !== 'sc-home') s.classList.remove('active');
    });
    // Scroll bot list to top
    const botList = document.getElementById('bot-list');
    if (botList) botList.scrollTop = 0;
}

// ── Bug Fix: Realistic Encounter toggles (solo chat) ─────────────────────
function toggleRealisticEncounter(e) {
    e.stopPropagation();
    const toggle = document.getElementById('life-events-toggle');
    if (!toggle) return;
    toggle.checked = !toggle.checked;
    const val = toggle.checked ? '1' : '0';
    safeSetItem('grace_life_events', val);
    safeSetItem('grace_schedule_events', val);
}
// Backwards-compat aliases
function toggleScheduleEvents(e) { toggleRealisticEncounter(e); }
function toggleLifeEvents(e) { toggleRealisticEncounter(e); }

// ── Bug Fix: Realistic Encounter toggles (group chat) ────────────────────
function toggleGroupRealisticEncounter(e) {
    e.stopPropagation();
    const toggle = document.getElementById('grp-life-events-toggle');
    if (!toggle) return;
    toggle.checked = !toggle.checked;
    const val = toggle.checked ? '1' : '0';
    safeSetItem('grace_life_events', val);
    safeSetItem('grace_schedule_events', val);
}
// Backwards-compat aliases
function toggleGroupLifeEvents(e) { toggleGroupRealisticEncounter(e); }
function toggleGroupScheduleEvents(e) { toggleGroupRealisticEncounter(e); }

// ── Bug Fix: addCustomActRow — Schedule editor custom activity rows ────────
function addCustomActRow(name = '', startTime = '', endTime = '') {
    const list = document.getElementById('bp-custom-acts-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'custom-act-row';
    row.innerHTML = `
        <input type="text"  class="custom-act-name" placeholder="Activity name…" value="${(name || '').replace(/"/g, '&quot;')}">
        <input type="time"  class="custom-act-time" value="${startTime || ''}" title="Start time">
        <span  class="custom-act-sep">→</span>
        <input type="time"  class="custom-act-time" value="${endTime || ''}"   title="End time">
        <button class="custom-act-del" onclick="this.closest('.custom-act-row').remove()" title="Remove">✕</button>
    `;
    list.appendChild(row);
}

// ── Bug Fix: escapeAttr — used by hint rendering to safely embed text in onclick ─
function escapeAttr(str) {
    return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ── Bug Fix: selectHintRaw / selectHintGroup — backwards-compat for old onclick generators ─
function selectHintRaw(el, rawText) {
    const inp = document.getElementById('msg-input');
    if (!inp) return;
    try { rawText = decodeURIComponent(rawText); } catch (e) { }
    inp.value = rawText;
    if (typeof autoResize === 'function') autoResize(inp);
    const overlay = document.getElementById('hint-overlay');
    if (overlay) overlay.style.display = 'none';
    inp.focus();
}
function selectHintGroup(el, rawText) {
    const inp = document.getElementById('grp-msg-input') || document.getElementById('msg-input');
    if (!inp) return;
    try { rawText = decodeURIComponent(rawText); } catch (e) { }
    inp.value = rawText;
    if (typeof autoResize === 'function') autoResize(inp);
    const overlay = document.getElementById('hint-overlay');
    if (overlay) overlay.style.display = 'none';
    inp.focus();
}

function getGroqKeys() {

    const listJson = localStorage.getItem('groq_keys_list');
    if (listJson) {
        try { return JSON.parse(listJson).filter(k => k && k.length > 5); } catch (e) { }
    }

    const legacy = [
        safeGetItem('groq_key', ''),
        safeGetItem('groq_key_2', ''),
        safeGetItem('groq_key_3', '')
    ].filter(k => k.length > 5);
    if (legacy.length > 0) {

        safeSetItem('groq_keys_list', JSON.stringify(legacy));
    }
    return legacy;
}
function getNextGroqKey() {
    const keys = getGroqKeys();
    if (!keys.length) return '';
    const idx = parseInt(safeGetItem('groq_key_idx', '0') || '0', 10);
    const key = keys[idx % keys.length];
    safeSetItem('groq_key_idx', ((idx + 1) % keys.length).toString());
    return key;
}
async function fetchGroq(body) {
    const keys = getGroqKeys();
    if (!keys.length) { alert(t('needKey')); throw new Error('No Groq key'); }
    const startIdx = parseInt(safeGetItem('groq_key_idx', '0') || '0', 10);
    let lastErr;
    for (let i = 0; i < keys.length; i++) {
        const idx = (startIdx + i) % keys.length;
        const key = keys[idx];
        try {
            const res = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(30000)
            });
            const data = await res.json();
            if (data.error) {
                throw new Error(data.error.message || JSON.stringify(data.error));
            }
            if (!data.choices?.[0]) {
                throw new Error('No choices');
            }
            // GPT-OSS: fallback reasoning_content → content
            const _m = data.choices[0].message;
            if (_m && (!_m.content || !_m.content.trim()) && _m.reasoning_content) {
                _m.content = _m.reasoning_content;
            }
            // Qwen3: strip <think> tags from content
            if (_m && _m.content) {
                const _origUtil = _m.content;
                const _bLen = _m.content.length;
                _m.content = _m.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                _m.content = _m.content.replace(/<think>[\s\S]*/gi, '').trim();
                // Fallback: if stripping emptied content, extract thinking text
                if (!_m.content && _origUtil) {
                    const _thinkM = _origUtil.match(/<think>([\s\S]*?)<\/think>/i);
                    _m.content = _thinkM ? _thinkM[1].trim() : _origUtil.replace(/<\/?think>/gi, '').trim();
                }
            }
            // Last resort: reasoning_content
            if (_m && !_m.content && _m.reasoning_content) {
                _m.content = _m.reasoning_content.replace(/<\/?think>/gi, '').trim();
            }
            safeSetItem('groq_key_idx', ((startIdx + i + 1) % keys.length).toString());
            if (typeof trackTokens === 'function') trackTokens(data.usage, !!window._grpTurnActive);
            return data;
        } catch (e) {
            lastErr = e;
            logError('Groq key #' + (idx + 1) + ' failed, trying next...', e.message);
        }
    }
    // Fallback: if compound-beta model failed on all keys, retry with GROQ_GEN_MODEL
    if (body.model === GROQ_COMPOUND_MODEL) {
        logError('fetchGroq', 'compound-beta failed on all keys, retrying with ' + GROQ_GEN_MODEL);
        return fetchGroq({ ...body, model: GROQ_GEN_MODEL });
    }
    throw lastErr;
}

function getActiveChatModel() {
    const id = safeGetItem('active_model_id', 'groq:llama-3.1-8b-instant');
    return id.replace(/^groq:/, '');
}
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_GEN_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_THINK_MODEL = 'llama-3.3-70b-versatile';
const HINT_MODEL = GROQ_GEN_MODEL;          // alias
const GROQ_FAST_MODEL = 'llama-3.1-8b-instant';   // fast/cheap tasks: routing, detection, short decisions
const GROQ_COMPOUND_MODEL = 'compound-beta';           // compound tasks: scene summary, schedule context
const GROQ_SCHEDULE_MODEL = 'llama-3.3-70b-versatile';          // complex JSON generation: schedules, analysis
const DYNBIO_MODEL = 'qwen/qwen3-32b';

// Shared intimate-scene detection regex — used by shout guard, movement guard, and prompt builder
const INTIMATE_SCENE_REGEX = /\b(kiss(?:ing|es|ed)?|caress(?:ing|es)?|embrac(?:e|ing)|naked|undress(?:ing|ed)?|make\s*love|making\s*love|intimate(?:ly)?|aroused|passion(?:ate)?|press(?:ing|ed)?\s+against|pull(?:ing|ed)?\s+close|lean(?:ing|ed)?\s+in|hands?\s+on\s+(?:my|her|his|your)\s+body|heartbeat|shiver(?:ing)?|tingle|undressing|strip(?:ping)?|moan(?:ing|ed)?|thrust(?:ing|s|ed)?|grind(?:ing|s|ed)?|climax(?:ing|ed)?|orgasm|inside\s+(?:her|him|me|you)|sex(?:ual)?|fuck(?:ing|ed|s)?|cock|pussy|dick|clit|nipple|breast|erect(?:ion)?|wet\s+(?:with|for)|spread(?:ing|s)?\s+(?:her|his|my|your)\s+legs?|ride(?:s|ing|rode)?|bounce(?:s|ing)?|groan(?:ing|s|ed)?|pant(?:ing|s|ed)?|gasp(?:ing|s|ed)?|bite(?:s|ing)?\s+(?:her|his|my|your)|scratch(?:ing|es|ed)?|grab(?:bing|bed|s)?\s+(?:her|his|my|your)\s+(?:hips?|waist|ass|butt|hair)|cum(?:s|ming|med)?|creampie|ejaculat|climax|penetrat|lick(?:ing|s|ed)?|suck(?:ing|s|ed)?|finger(?:ing|s|ed)?|strip(?:ping|s|ped)?|nude|exposed|erotic|sensual|seduct|foreplay|caress|fondle|seduce|seduc)\b/i;

// ── ANNUAL_HOLIDAYS — used by getTodayHoliday in life_events.js ───────────
const ANNUAL_HOLIDAYS = [
    { date: '01/01', name: "New Year's Day", themes: ['new beginnings', 'celebrations', 'resolutions', 'champagne', 'fireworks'] },
    { date: '14/02', name: "Valentine's Day", themes: ['romance', 'flowers', 'chocolate', 'love letters', 'candles'] },
    { date: '08/03', name: "International Women's Day", themes: ['empowerment', 'pride', 'community', 'flowers'] },
    { date: '01/04', name: "April Fools' Day", themes: ['pranks', 'laughter', 'jokes', 'surprises'] },
    { date: '22/04', name: "Earth Day", themes: ['nature', 'outdoors', 'planting', 'sustainability'] },
    { date: '01/05', name: "International Workers Day", themes: ['rest', 'parades', 'community'] },
    { date: '31/10', name: "Halloween", themes: ['costumes', 'pumpkins', 'candy', 'spooky atmosphere', 'jack-o-lanterns'] },
    { date: '11/11', name: "Singles Day / Veteran Day", themes: ['shopping', 'discounts', 'reflection', 'remembrance'] },
    { date: '25/12', name: "Christmas", themes: ['gifts', 'trees', 'snow', 'family', 'carols', 'hot chocolate'] },
    { date: '31/12', name: "New Year Eve", themes: ['countdown', 'fireworks', 'champagne', 'nostalgia', 'midnight'] },
];

// ── ACTIVITY_ROOM_MAP — used by schedule room resolver in shared.js ────────
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

// ── REL_PRESETS — used by grchat relationship card UI ─────────────────────
const REL_PRESETS = [
    { label: '💙 Friends', value: 'Close friends — warm, casual, comfortable with each other' },
    { label: '❤️ Lovers', value: 'Romantic partners — affectionate, intimate, emotionally close' },
    { label: '⚔️ Rivals', value: 'Rivals — competitive tension, mutual respect wrapped in friction' },
    { label: '👥 Coworkers', value: 'Coworkers or colleagues — professional, polite, not deeply personal' },
    { label: '🔥 Ex-lovers', value: 'Former lovers — complicated history, unresolved feelings' },
    { label: '👨‍👩‍👧 Family', value: 'Family members — deep bond, love mixed with tension' },
    { label: '🕵️ Strangers', value: 'Strangers — cautious, curious, no shared history yet' },
    { label: '🤝 Allies', value: 'Trusted allies — shared goals, mutual reliability and respect' },
];

function getDynField(bot, field) {
    // ── Solo and Group chat are now COMPLETELY SEPARATE universes ─────────────
    // grpDynBio = group chat bio (independent, no sync from solo)
    // dynBio    = solo chat bio (independent, no sync from group)
    // When in group context, grpDynBio takes precedence over dynBio for display only
    if (curGroupId) {
        const gd = bot.grpDynBio;
        if (gd && gd[field] !== undefined && gd[field] !== null && gd[field] !== '') {
            const val = gd[field];
            return typeof val === 'string' ? val : (typeof val === 'object' ? JSON.stringify(val) : String(val));
        }
    }
    const d = bot.dynBio;
    if (d && d[field] !== undefined && d[field] !== null && d[field] !== '') {
        const val = d[field];
        return typeof val === 'string' ? val : (typeof val === 'object' ? JSON.stringify(val) : String(val));
    }
    const base = bot[field];
    if (base === undefined || base === null) return '';
    return typeof base === 'string' ? base : String(base);
}

function buildRelationshipGuidance(socialRelation, familyRelation, emotionalRelation) {
    const core = [];
    
    // Social relation (static - professional, social roles)
    if (socialRelation) {
        core.push(`[SOCIAL RELATIONSHIP - static]: "${socialRelation}". This relationship type does not change during chat.`);
        const social = socialRelation.toLowerCase();
        const isWorkHierarchy = /\bboss|manager|employee|assistant|secretary|intern|supervisor|subordinate|colleague|coworker\b/.test(social);
        const isMentor = /\bmentor|mentee|teacher|student|professor|tutor|coach|trainee|master|apprentice\b/.test(social);
        const isCareRole = /\bdoctor|patient|nurse|caregiver|guardian|ward|therapist|client\b/.test(social);
        const isAuthority = /\bpolice|officer|detective|judge|lawyer|witness|suspect|commander|soldier\b/.test(social);
        
        if (isWorkHierarchy) {
            core.push('- Reflect status/power distance in word choice, initiative, and decision rights.');
            core.push('- Keep titles/pronouns/register consistent with hierarchy (professional when needed).');
        } else if (isMentor) {
            core.push('- Prioritize instruction, correction, challenge, and growth feedback.');
            core.push('- Address style should reflect pedagogy/authority, not peer flirtation.');
        } else if (isCareRole) {
            core.push('- Prioritize safety, assessment, reassurance, and practical care steps.');
            core.push('- Keep professional/ethical boundaries visible in tone and actions.');
        } else if (isAuthority) {
            core.push('- Keep procedural, cautious, and fact-oriented communication when relevant.');
            core.push('- Address terms should match official/procedural context.');
        }
    }
    
    // Family relation (static - family bonds)
    if (familyRelation && familyRelation.toLowerCase() !== 'none') {
        core.push(`[FAMILY RELATIONSHIP - static]: "${familyRelation}". This relationship type does not change during chat.`);
        const family = familyRelation.toLowerCase();
        const isFamilyParentChild = /\bmother|mom|mum|father|dad|parent|son|daughter|child|kid\b/.test(family);
        const isFamilySibling = /\bsister|brother|sibling|older sister|older brother|younger sister|younger brother|chị|em\b/.test(family);
        
        if (isFamilyParentChild) {
            core.push('- Prioritize care, protection, guidance, discipline, concern, and daily practical talk.');
            core.push('- Use familial warmth/tension, not courtship dynamics.');
            core.push('- Use kinship-appropriate address terms and respect family hierarchy in speech.');
            core.push('- ABSOLUTE: no sexual/romantic framing toward the user.');
        } else if (isFamilySibling) {
            core.push('- Use sibling energy: teasing, rivalry, protectiveness, shared history, petty arguments, loyalty.');
            core.push('- Address style should feel familial/sibling-like, not formal-romantic.');
            core.push('- Keep boundaries familial and non-romantic.');
            core.push('- ABSOLUTE: no sexual/romantic framing toward the user.');
        } else {
            core.push('- Use familial warmth, shared history, and appropriate family dynamics.');
            core.push('- Keep boundaries familial and non-romantic.');
        }
    }
    
    // Emotional relation (dynamic - can change during chat)
    if (emotionalRelation) {
        core.push(`[EMOTIONAL RELATIONSHIP - dynamic]: "${emotionalRelation}". This relationship can evolve based on conversation.`);
        const emotional = emotionalRelation.toLowerCase();
        const isRivalLike = /\brival|enemy|nemesis|hostile|adversar|hate|opponent|competitor\b/.test(emotional);
        const isRomanticLike = /\blover|girlfriend|boyfriend|wife|husband|fianc|romantic|dating|partner|spouse\b/.test(emotional);
        const isFriendLike = /\bfriend|best friend|ally|companion|buddy\b/.test(emotional);
        
        if (isRivalLike) {
            core.push('- Baseline tone: friction, challenge, guarded respect, competition, strategic push-pull.');
            core.push('- Do not default to tenderness or devotion.');
        } else if (isRomanticLike) {
            core.push('- Baseline may include intimacy, attachment, vulnerability, and chemistry.');
            core.push('- Keep romance specific to character voice; avoid generic sweet filler.');
        } else if (isFriendLike) {
            core.push('- Baseline tone: trust, familiarity, support, humor, shared references.');
            core.push('- Avoid extreme hostility or deep romance unless scene evidence builds it.');
        } else {
            core.push('- Infer boundaries and tone from the stated emotional dynamic and keep them consistent unless scene evidence supports gradual change.');
        }
        core.push('- Do not "role drift" just because the user sends a short/flirty line. If tone shifts, transition gradually and credibly.');
    }
    
    const hasFamilyRelation = familyRelation && familyRelation.toLowerCase() !== 'none';
    if (!socialRelation && !hasFamilyRelation && !emotionalRelation) {
        core.push('[RELATIONSHIP - GENERAL]: No specific relationship defined. Treat the user as a new acquaintance.');
    }
    
    core.push('- If user message conflicts with the established relationships, respond in-character by redirecting, setting boundaries, or reframing instead of instantly complying.');
    return core.join('\n');
}

function _relationBucket(relRaw) {
    const rel = (relRaw || '').toLowerCase();
    if (!rel) return 'neutral';
    if (/\bmother|mom|mum|father|dad|parent|son|daughter|child|kid\b/.test(rel)) return 'family_parent_child';
    if (/\bsister|brother|sibling|older sister|older brother|younger sister|younger brother|chị|em\b/.test(rel)) return 'family_sibling';
    if (/\bboss|manager|employee|assistant|secretary|intern|supervisor|subordinate\b/.test(rel)) return 'work_hierarchy';
    if (/\bmentor|mentee|teacher|student|professor|tutor|coach|trainee|master|apprentice\b/.test(rel)) return 'mentor';
    if (/\bdoctor|patient|nurse|caregiver|guardian|ward|therapist|client\b/.test(rel)) return 'care';
    if (/\bpolice|officer|detective|judge|lawyer|witness|suspect|commander|soldier\b/.test(rel)) return 'authority';
    if (/\brival|enemy|nemesis|hostile|adversar|opponent|competitor\b/.test(rel)) return 'hostile';
    if (/\blover|girlfriend|boyfriend|wife|husband|fianc|romantic|dating|partner|spouse\b/.test(rel)) return 'romantic';
    if (/\bfriend|best friend|ally|companion|buddy\b/.test(rel)) return 'friend';
    return 'neutral';
}

function resolveEvolvingRelation(currentRelation, candidateRelation, evidenceText) {
    const cur = (currentRelation || '').trim();
    const cand = (candidateRelation || '').trim();
    if (!cand) return cur;
    if (!cur) return cand;
    if (cur.toLowerCase() === cand.toLowerCase()) return cur;

    const curB = _relationBucket(cur);
    const candB = _relationBucket(cand);
    const ev = (evidenceText || '').toLowerCase();
    const romanceEvidence = /\b(love|adore|kiss|kissing|hug|holding|desire|flirt|blush|romantic|date|dating|want you|miss you)\b/.test(ev);
    const trustEvidence = /\b(trust|respect|opened up|protect|support|apolog|forgive|care about|lean on|there for you)\b/.test(ev);

    // Never auto-drift family relationships into romance.
    if ((curB === 'family_parent_child' || curB === 'family_sibling') && candB === 'romantic') return cur;

    // Role-bound relationships should be sticky unless the proposed relation is same bucket.
    const sticky = new Set(['family_parent_child', 'family_sibling', 'work_hierarchy', 'mentor', 'care', 'authority']);
    if (sticky.has(curB) && curB !== candB) return cur;

    // Hostile -> friend/romantic should be gradual and evidence-based.
    if (curB === 'hostile' && candB === 'romantic') {
        if (romanceEvidence && trustEvidence) return 'Rivals with growing attraction';
        if (trustEvidence) return 'Rivals with reluctant respect';
        return cur;
    }
    if (curB === 'hostile' && candB === 'friend') {
        if (trustEvidence) return 'Rivals with growing respect';
        return cur;
    }

    // Friend -> romantic needs explicit romance signals.
    if (curB === 'friend' && candB === 'romantic' && !romanceEvidence) return cur;

    return cand;
}


function _relationStateDefaults(currentRelation) {
    const b = _relationBucket(currentRelation || '');
    if (b === 'hostile') return { affection: 20, trust: 20, respect: 40, conflict: 75, commitment: 15 };
    if (b === 'friend') return { affection: 50, trust: 60, respect: 55, conflict: 25, commitment: 25 };
    if (b === 'romantic') return { affection: 78, trust: 68, respect: 58, conflict: 22, commitment: 52 };
    return { affection: 40, trust: 45, respect: 45, conflict: 35, commitment: 25 };
}

function _getRelationStore(bot, useGroupDynBio) {
    return useGroupDynBio ? (bot.grpDynBio || (bot.grpDynBio = {})) : (bot.dynBio || (bot.dynBio = {}));
}

function _clampStat(v) { return Math.max(0, Math.min(100, Math.round(v))); }

function _applyRelationDeltas(state, deltas) {
    if (!state || !deltas) return state;
    const scale = 4;
    ['affection', 'trust', 'respect', 'conflict', 'commitment'].forEach(k => {
        const dv = Number(deltas[k] || 0);
        if (!Number.isFinite(dv)) return;
        const clipped = Math.max(-3, Math.min(3, dv));
        state[k] = _clampStat((state[k] || 0) + clipped * scale);
    });
    return state;
}

function _deriveRelationFromState(currentRelation, state, hardEvents) {
    const cur = (currentRelation || '').trim();
    const bucket = _relationBucket(cur);
    const sticky = new Set(['family_parent_child', 'family_sibling', 'work_hierarchy', 'mentor', 'care', 'authority']);
    if (sticky.has(bucket)) return cur;

    const a = state.affection || 0;
    const t = state.trust || 0;
    const r = state.respect || 0;
    const c = state.conflict || 0;
    const m = state.commitment || 0;
    const marriageEvidence = !!(hardEvents && hardEvents.marriage_evidence);

    if (marriageEvidence && a >= 70 && t >= 68 && m >= 80) return 'Wife/Husband';
    if (a >= 72 && t >= 62 && c <= 35) return 'Lover';
    if (bucket === 'hostile' && t >= 55 && r >= 58 && c <= 48 && a < 65) return 'Rivals with growing respect';
    if (bucket === 'hostile' && a >= 62 && t >= 58 && c <= 45) return 'Rivals with growing attraction';
    if (t >= 62 && c <= 32 && a < 65) return 'Friend';
    if (c >= 72 && t <= 32) return 'Enemy';
    return cur;
}

async function detectRelationShiftAI(bot, historyText, currentRelation) {
    const keys = getGroqKeys();
    if (!keys.length) return null;
    try {
        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(12000),
            body: JSON.stringify({
                model: GROQ_COMPOUND_MODEL,
                temperature: 0.1,
                max_tokens: 220,
                response_format: { type: 'json_object' },
                messages: [{
                    role: 'system',
                    content: 'You are a relation-state analyzer. Return ONLY compact JSON.'
                }, {
                    role: 'user',
                    content: `Current relationship label: "${currentRelation || 'not set'}"
Analyze relation shift from this chat excerpt and return JSON:
{
  "confidence": 0.0-1.0,
  "deltas": { "affection": -3..3, "trust": -3..3, "respect": -3..3, "conflict": -3..3, "commitment": -3..3 },
  "signals": ["short tags"],
  "candidate_relation": "<optional short label>",
  "hard_events": { "marriage_evidence": true/false, "betrayal": true/false }
}
Rules: use small deltas; no large jumps from one short excerpt; only set marriage_evidence when explicit wedding/marry/spouse signals exist.

Chat:
${(historyText || '').substring(0, 1800)}`
                }]
            })
        });
        const data = await res.json();
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return null;
        const parsed = JSON.parse(match[0]);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch (e) {
        return null;
    }
}

function applyRelationEngineUpdate(bot, useGroupDynBio, analysis, fallbackCandidate, evidenceText) {
    const store = _getRelationStore(bot, useGroupDynBio);
    // Use emotionalRelation for dynamic updates, socialRelation and familyRelation remain static
    const currentRelation = store.emotionalRelation || bot.emotionalRelation || '';
    const state = store.relationState || _relationStateDefaults(currentRelation);
    const before = { ...state };
    store.relationState = state;

    if (analysis && analysis.deltas) _applyRelationDeltas(state, analysis.deltas);
    const candidate = (analysis && typeof analysis.candidate_relation === 'string' && analysis.candidate_relation.trim())
        ? analysis.candidate_relation.trim()
        : (fallbackCandidate || '');

    let next = currentRelation;
    if (candidate) next = resolveEvolvingRelation(currentRelation, candidate, evidenceText || '');
    const inferred = _deriveRelationFromState(next || currentRelation, state, analysis && analysis.hard_events);
    if (inferred) next = resolveEvolvingRelation(next || currentRelation, inferred, evidenceText || '');
    if (next && next !== currentRelation) store.emotionalRelation = next;
    const finalRelation = store.emotionalRelation || currentRelation || '';

    try {
        console.log('[RelationEngine]', {
            bot: bot && bot.name ? bot.name : '(unknown)',
            scope: useGroupDynBio ? 'group' : 'solo',
            emotional_relation_before: currentRelation || '(empty)',
            emotional_relation_after: finalRelation || '(empty)',
            candidate_fallback: fallbackCandidate || '',
            ai_confidence: analysis && typeof analysis.confidence === 'number' ? analysis.confidence : null,
            ai_signals: analysis && Array.isArray(analysis.signals) ? analysis.signals : [],
            ai_hard_events: analysis && analysis.hard_events ? analysis.hard_events : {},
            state_before: before,
            state_after: { ...state }
        });
    } catch (e) { }

    return finalRelation;
}

function getCurrentAge(bot) {
    const baseAge = parseInt(bot.age) || 0;
    if (!baseAge) return bot.age || '-';
    const vDay = getVirtualDay(bot);
    const startDay = bot.ageStartDay !== undefined ? bot.ageStartDay : 0;
    const daysElapsed = Math.max(0, vDay - startDay);
    const yearsElapsed = Math.floor(daysElapsed / 365);
    const currentAge = baseAge + yearsElapsed;
    if (yearsElapsed > 0) {
        return currentAge + ' (' + baseAge + '+' + yearsElapsed + 'yr)';
    }
    return String(currentAge);
}

async function fetchGroqChat(messages, maxTokens) {
    const keys = getGroqKeys();
    if (!keys.length) { alert('Please set up your Groq API Key in Settings first!'); throw new Error('No Groq key'); }
    const startIdx = parseInt(safeGetItem('groq_key_idx', '0') || '0', 10);
    let lastErr;
    for (let i = 0; i < keys.length; i++) {
        const idx = (startIdx + i) % keys.length;
        const key = keys[idx];
        try {
            const activeModel = getActiveChatModel();
            const isLlama = /llama/i.test(activeModel);
            const isKimi = /kimi/i.test(activeModel);

            let kimiMessages = messages;
            if (isKimi) {
                const KIMI_WARMTH = `CRITICAL VOICE DIRECTIVE: You are playing a warm, emotionally present human character. Your replies must feel alive - use sensory details, hesitations, physicality, warmth. NEVER sound clinical, formal, or robotic. Write with emotion: let her voice crack, laugh, whisper, ache. Short sentences. Real feelings. No AI cadence.`;
                kimiMessages = messages.map((m, idx) => {
                    if (m.role === 'system') return { ...m, content: m.content + '\n\n' + KIMI_WARMTH };
                    return m;
                });
            }
            const chatBody = {
                model: activeModel,
                max_tokens: maxTokens || getReplyMaxTokens(),
                messages: isKimi ? kimiMessages : messages,
                temperature: (() => {
                    const userTemp = parseFloat(safeGetItem('ai_temperature') || '0');
                    if (userTemp >= 0.1) return userTemp;
                    return isLlama ? 1.05 : isKimi ? 1.0 : 0.95;
                })(),
            };
            if (isLlama) {
                chatBody.frequency_penalty = 0.55;
                chatBody.presence_penalty = 0.45;
            }
            if (isKimi) {
                chatBody.frequency_penalty = 0.4;
                chatBody.presence_penalty = 0.35;
            }
            const res = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(chatBody),
                signal: AbortSignal.timeout(30000)
            });
            const data = await res.json();
            console.log('[Groq Raw Response]', JSON.stringify(data, null, 2));
            if (data.error) {
                throw new Error(data.error.message || JSON.stringify(data.error));
            }
            const _msg = data.choices?.[0]?.message;
            if (!_msg) {
                throw new Error('No message in response');
            }
            console.log('[Groq Message]', JSON.stringify(_msg, null, 2));


            // GPT-OSS models may return content in reasoning_content instead of content
            if ((!_msg.content || !_msg.content.trim()) && _msg.reasoning_content) {
                _msg.content = _msg.reasoning_content;
            }
            // Qwen3 models embed <think>...</think> in content - strip it
            if (_msg.content) {
                const _origContent = _msg.content;
                const _beforeStrip = _msg.content.length;
                // Handle closed <think>...</think> tags (greedy to catch nested/long blocks)
                _msg.content = _msg.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                // Handle unclosed <think> tag (model ran out of tokens before closing)
                _msg.content = _msg.content.replace(/<think>[\s\S]*/gi, '').trim();
                // Fallback: if stripping emptied content, extract text inside <think> tags
                if (!_msg.content && _origContent) {
                    const _thinkMatch = _origContent.match(/<think>([\s\S]*?)<\/think>/i);
                    _msg.content = _thinkMatch ? _thinkMatch[1].trim() : _origContent.replace(/<\/?think>/gi, '').trim();
                }
            }
            // Last resort: try reasoning_content again (GPT-OSS edge case)
            if (!_msg.content && _msg.reasoning_content) {
                _msg.content = _msg.reasoning_content.replace(/<\/?think>/gi, '').trim();
            }
            if (!_msg.content) {
                throw new Error('Empty response');
            }
            safeSetItem('groq_key_idx', ((startIdx + i + 1) % keys.length).toString());
            if (typeof trackTokens === 'function') trackTokens(data.usage, !!window._grpTurnActive);
            return data;
        } catch (e) {
            lastErr = e;
            logError('Groq key #' + (idx + 1) + ' failed, trying next...', e.message);
        }
    }
    throw lastErr;
}

function getRandomPollinationsKey() {
    let keys = [];
    try { keys = JSON.parse(safeGetItem('pol_keys_list', '[]')); } catch (e) { }
    if (!keys.length) keys = [safeGetItem('pollinations_key', ''), safeGetItem('pollinations_key_2', '')].filter(k => k.length > 5);
    else keys = keys.filter(k => k.length > 5);
    if (!keys.length) return '';
    return keys[Math.floor(Math.random() * keys.length)];
}

function getImageService() {
    return safeGetItem('image_service', 'pollinations');
}

function setImageService(service) {
    safeSetItem('image_service', service);
}

function maskApiKey(k) {
    if (!k || k.length === 0) return '';
    if (k.length <= 8) return k; // Too short to mask
    const first4 = k.slice(0, 4);
    const last4 = k.slice(-4);
    return `${first4}••••${last4}`;
}

function getImgModel() {
    const m = safeGetItem('pol_img_model') || 'zimage';
    // migrate old saves to new models
    if (m === 'flux' || m === 'flux-2-dev' || m === 'flux-realism' || m === 'gptimage') return 'zimage';
    return m;
}

function getImgStyleOverride() {
    return safeGetItem('img_style_override') || '';
}
function setImgStyleOverride(val) {
    safeSetItem('img_style_override', val);
    // sync both dropdowns
    ['chat-img-style-select', 'grp-img-style-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });
}
function syncImgStyleSelect() {
    const cur = getImgStyleOverride();
    ['chat-img-style-select', 'grp-img-style-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = cur;
    });
}

function selectImgModel(model) {
    safeSetItem('pol_img_model', model);
    syncImgModelBtns();
    syncChatImgModelBtns();
}

function syncChatImgModelBtns() {
    const cur = getImgModel();
    // Update dropdowns
    ['solo-img-model-picker', 'grp-img-model-picker'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.tagName === 'SELECT') el.value = cur;
    });
    // Update label spans (still present in header)
    const labelNames = {
        'zimage': 'Z-Image Turbo',
        'flux-schnell': 'Flux Schnell'
    };
    const label = labelNames[cur] || cur;
    ['solo-img-model-label', 'grp-img-model-label'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = label;
    });
    syncImgStyleSelect();
}
function syncImgModelBtns() {
    const model = getImgModel();
    document.querySelectorAll('.img-model-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.model === model);
    });
}

// ── Hiển thị danh sách bot NGAY khi DOM sẵn sàng, không chờ puter.js/external scripts ──
document.addEventListener('DOMContentLoaded', function () {
    renderBotList();
    renderSavedPersonas();
    refreshPersonaDropdown();
});

window.addEventListener('load', () => {
    renderGroqKeysList();
    renderPolKeysList();

    const savedImgModel = getImgModel();
    document.querySelectorAll('.img-model-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.model === savedImgModel);
    });
    const langSel = document.getElementById('ai-lang-select');
    if (langSel) langSel.value = safeGetItem('ai_lang', 'English');
    const theme = safeGetItem('grace_theme', 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    const globalBg = localStorage.getItem('grace_global_bg') === 'true';
    const gbToggle = document.getElementById('global-bg-toggle');
    if (gbToggle) gbToggle.checked = globalBg;



    let migrated = false;
    (bots || []).forEach(bot => {
        // ── Migration 1: clear false labor ──────────────────────────────────────
        if (bot.cycleData && bot.cycleData.laborStarted && !bot.cycleData.birthVirtualDay) {
            const weeks = getPregnancyWeek(bot) || 0;
            if (weeks < 36) {
                bot.cycleData.laborStarted = false;
                bot.cycleData.laborVirtualDay = null;
                bot.cycleData.laborVirtualMinutes = undefined;
                bot.cycleData.laborStartedRealTime = undefined;
                addReproEvent(bot, `\uD83D\uDD27 [Fix] False labor cleared - pregnancy was only Week ${weeks} (< 36w)`);
                updateReproductiveStatus(bot);
                migrated = true;
            }
        }

        // ── Migration 2: fix over-inflated fetus count from 'multiple'/'always multiples' keyword match ──
        if (bot.cycleData && bot.cycleData.pregnant && !bot.cycleData.isParasitePregnancy) {
            const safeText = ((bot.appearance || '') + ' ' + (bot.bio || '')).toLowerCase();
            const safeCount = detectFetusCountFromText(safeText);
            const currentCount = (bot.cycleData.fetuses || []).length;
            if (currentCount > safeCount && currentCount > 1) {
                const noIntercourse = !bot.cycleData.intercourseEvents || bot.cycleData.intercourseEvents.length === 0;
                const fromPromptKeyword = ((bot.prompt || '')).toLowerCase().includes('always multiples') ||
                    ((bot.prompt || '')).toLowerCase().includes('multiple');
                if (noIntercourse && fromPromptKeyword) {
                    bot.cycleData.fetusCount = safeCount;
                    bot.cycleData.fetuses = createFetusesArray(safeCount);
                    addReproEvent(bot, `\uD83D\uDD27 [Fix] Fetus count reset to ${safeCount} - was inflated by trait keyword scan`);
                    updateReproductiveStatus(bot);
                    migrated = true;
                }
            }
        }

        // ── Migration 3: clear false pregnancy set by bare 'pregnant' keyword in prompt/traits ──
        if (bot.cycleData && bot.cycleData.pregnant && !bot.cycleData.isParasitePregnancy) {
            const noIntercourse = !bot.cycleData.intercourseEvents || bot.cycleData.intercourseEvents.length === 0;
            const noConception = !bot.cycleData.conceptionVirtualDay || bot.cycleData.conceptionVirtualDay === 0;
            const conceptionFromScan = bot.cycleData.conceptionVirtualDay < 0 &&
                !bot.cycleData.eventLog?.some(e => e.text && (e.text.includes('Conception') || e.text.includes('PARASITE') || e.text.includes('Synced') || e.text.includes('MONSTER')));
            // Only clear if pregnancy was set purely from keyword scan (negative conceptionVirtualDay, no real event)
            if (noIntercourse && conceptionFromScan) {
                const scanText = ((bot.appearance || '') + ' ' + (bot.bio || '')).toLowerCase();
                const hasExplicitPreg = /\d+\s*month[s]?\s*pregnant|\d+\s*week[s]?\s*pregnant/.test(scanText);
                if (!hasExplicitPreg) {
                    bot.cycleData.pregnant = false;
                    bot.cycleData.conceptionVirtualDay = null;
                    bot.cycleData.fetusCount = 1;
                    bot.cycleData.fetuses = createFetusesArray(1);
                    addReproEvent(bot, `\uD83D\uDD27 [Fix] False pregnancy cleared - was triggered by keyword scan, no actual intercourse recorded`);
                    updateReproductiveStatus(bot);
                    migrated = true;
                }
            }
        }

        // ── Migration 4: strip Always Overdue / Always Multiples from Parasite Host bots ──
        if (typeof stripParasiteConflictTraits === 'function') {
            if (stripParasiteConflictTraits(bot)) migrated = true;
        }
    });
    if (migrated) saveBots();

    // renderBotList is already called from DOMContentLoaded above
    // Only re-render if migration happened (saveBots() already calls renderBotList inside)
    if (!migrated) renderBotList();
});
function logError(msg, detail) {
    // Log errors to browser console only (debug panel removed)
    console.error('[GraceAI] ' + msg + (detail ? ' | ' + detail : ''));
}

function logSync(msg, detail) {
    const log = document.getElementById('sync-log');
    const entries = document.getElementById('sync-entries');
    if (!log || !entries) return;
    log.style.display = 'block';
    const now = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.style.cssText = 'border-bottom:1px solid #2a1a5e;padding:3px 0;line-height:1.4';
    entry.innerHTML = '<span class="sync-time">' + now + '</span>' + escapeHTML(msg) + (detail ? '<br><span style="color:#c4b5fd;font-size:10px">' + escapeHTML(String(detail)) + '</span>' : '');
    entries.prepend(entry);
    while (entries.children.length > 20) entries.removeChild(entries.lastChild);
}
function diceSpin(btn) {
    btn.classList.remove('spin');
    void btn.offsetWidth;
    btn.classList.add('spin');
    setTimeout(() => btn.classList.remove('spin'), 400);
}

function setDiceLoading(btn, loading) {
    btn.disabled = loading;
    btn.innerHTML = loading ? '<i class="fas fa-spinner fa-spin" style="font-size:12px"></i>' : '🎲';
}

async function callLlama(systemPrompt, userPrompt, model, temperature, maxTokens) {
    const m = model || GROQ_GEN_MODEL;
    const isLlama = /llama/i.test(m);
    const temp = temperature || (isLlama ? 1.2 : 0.95);
    const tokens = maxTokens || 200;
    const data = await fetchGroq({
        model: m,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        max_tokens: tokens,
        temperature: temp
    });
    return (data.choices?.[0]?.message?.content || '').trim();
}

function getCharContext() {
    return {
        gender: document.getElementById('bot-gender').value || '',
        name: document.getElementById('bot-name').value.trim() || '',
        age: document.getElementById('bot-age')?.value.trim() || '',
        career: document.getElementById('bot-career')?.value.trim() || '',
        relation: document.getElementById('bot-relation')?.value.trim() || '',
        year: document.getElementById('bot-year')?.value.trim() || '',
        country: document.getElementById('bot-country')?.value.trim() || '',
        appearance: document.getElementById('bot-app').value.trim() || '',
        bio: document.getElementById('bot-bio').value.trim() || '',
        prompt: document.getElementById('bot-prompt').value.trim() || '',
        context: document.getElementById('bot-context').value.trim() || '',
        imgStyle: document.getElementById('bot-img-style')?.value || '',
    };
}

function getCultureHintFromFields(ctx) {
    if (ctx.country || ctx.year) {
        return [ctx.country, ctx.year].filter(Boolean).join(' / ');
    }
    return inferCultureHint(ctx);
}

function inferCultureHint(ctx) {
    const allText = [ctx.name, ctx.appearance, ctx.bio, ctx.prompt, ctx.context].join(' ').toLowerCase();
    if (/samurai|katana|kimono|shogun|edo|meiji|sakura|ninja|daimyo/.test(allText)) return 'Japanese feudal / samurai era';
    if (/hanbok|joseon|yangban|seoul|korean|goryeo/.test(allText)) return 'Korean / Joseon era';
    if (/qing|tang|ming|dynasty|wuxia|jianghu|xianxia|cultivation|imperial china|hanfu/.test(allText)) return 'Chinese historical / wuxia';
    if (/knight|castle|medieval|sorcerer|tavern|kingdom|sword|quest|magic|dragon|elf|dwarf/.test(allText)) return 'Western medieval / fantasy';
    if (/gothic|victorian|steampunk|empire|aristocrat|corset|19th century/.test(allText)) return 'Victorian / Gothic European';
    if (/viking|norse|fjord|odin|valhalla/.test(allText)) return 'Norse / Viking';
    if (/yakuza|anime|shibuya|harajuku|idol|maid|senpai/.test(allText)) return 'Modern Japanese / anime-style';
    if (/k-pop|idol|gang|seoul|manhwa|chaebol/.test(allText)) return 'Modern Korean / K-drama style';
    if (/mafia|mob|1920|prohibition|fedora|noir/.test(allText)) return 'American noir / 1920s gangster';
    if (/sci.fi|cyberpunk|space|android|future|neon|hacker|dystopia/.test(allText)) return 'Sci-fi / cyberpunk future';
    return '';
}

const CULTURES = [
    'Japanese (feudal samurai era)',
    'Japanese (modern / anime style)',
    'Korean (Joseon dynasty)',
    'Korean (modern K-drama style)',
    'Chinese (ancient wuxia / xianxia)',
    'Chinese (modern)',
    'American (modern)',
    'American (1920s noir / gangster)',
    'British (modern)',
    'British (Victorian / Gothic)',
    'German / Austrian',
    'French',
    'Italian',
    'Russian / Eastern European',
    'Norse / Viking Scandinavian',
    'Western fantasy / medieval European',
    'Sci-fi / futuristic (any culture)',
    'Southeast Asian (Vietnamese, Thai, Filipino)',
    'Middle Eastern / Arabic',
    'Latin American / Spanish',
];
async function rollName(btn) {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    diceSpin(btn);
    setDiceLoading(btn, true);
    const ctx = getCharContext();
    const inferredCulture = inferCultureHint(ctx);


    let culturePick;
    if (ctx.country || ctx.year) {
        culturePick = [ctx.country, ctx.year].filter(Boolean).join(', ');
    } else if (inferredCulture) {
        culturePick = inferredCulture;
    } else {
        culturePick = CULTURES[Math.floor(Math.random() * CULTURES.length)];
    }


    const contextParts = [];
    if (ctx.age) contextParts.push(`age ${ctx.age}`);
    if (ctx.relation) contextParts.push(`relationship: ${ctx.relation}`);
    if (ctx.appearance) contextParts.push(`appearance: ${ctx.appearance.substring(0, 60)}`);
    if (ctx.bio) contextParts.push(`background: ${ctx.bio.substring(0, 60)}`);
    const contextHint = contextParts.length ? `\nKnown info: ${contextParts.join('; ')}.` : '';


    const _nseeds = ['uncommon', 'rare', 'distinctive', 'original', 'unusual', 'unexpected', 'obscure', 'lesser-known', 'traditional', 'historical'];
    const _nseed = _nseeds[Math.floor(Math.random() * _nseeds.length)];
    const _nexclude = ['Calanthe', 'Akira', 'Yuki', 'Hana', 'Sakura', 'Luna', 'Aria', 'Nova', 'Zoe', 'Emma', 'Mia', 'Ava', 'Lily', 'Kira', 'Nora', 'Elena', 'Maya', 'Sofia', 'Chloe', 'Mei', 'Yuna', 'Rin', 'Sora', 'Kaito', 'Liam', 'Noah', 'Ethan', 'Aiko', 'Rena', 'Haru', 'Lyra', 'Elara', 'Seraphina', 'Isolde', 'Evelyn'];
    const _nexcludeHint = `\nNEVER use these overused names: ${_nexclude.join(', ')}.`;

    const _letterSeed = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const _digitSeed = Math.floor(Math.random() * 9000 + 1000);
    try {
        const result = await callLlama(
            `You are a creative name generator for world cultures. Always pick ${_nseed} and lesser-known names - never the first or most obvious one from that culture.
Generate a single authentic full name for a ${ctx.gender} character from: ${culturePick}.${contextHint}${_nexcludeHint}
Explore uncommon given names, regional variants, historical names, or names from that culture's literary tradition. Be genuinely creative.
Return ONLY the name - no explanation, no quotes, no labels.`,
            `Generate one ${_nseed} authentic name from ${culturePick} - avoid cliches. Seed: ${_digitSeed}.`
        );
        // Extract only the name - remove quotes, take first line, remove explanatory text
        let cleanName = result
            .replace(/["\'.]/g, '')
            .split(/[\n\r]/)[0]
            .trim();
        // Remove common AI explanatory phrases
        cleanName = cleanName
            .replace(/\s*[-–].*$/i, '')
            .replace(/\s*\(.*$/i, '')
            .replace(/\s*\[.*$/i, '')
            .replace(/\s+lastname\s+.*$/i, '')
            .replace(/\s+full\s+name.*$/i, '')
            .trim();
        document.getElementById('bot-name').value = cleanName;
    } catch (e) {
        logError('rollName failed', e.message);
    }
    setDiceLoading(btn, false);
}

async function rollAppearance(btn) {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    diceSpin(btn);
    setDiceLoading(btn, true);
    const ctx = getCharContext();
    const cultureHint = getCultureHintFromFields(ctx) ? `Cultural/era/location context: ${getCultureHintFromFields(ctx)}.` : '';
    const bioHint = ctx.bio ? `Background: ${ctx.bio.substring(0, 80)}.` : '';
    const ageHint = ctx.age ? `Age: ${ctx.age}.` : '';
    const nameHint = ctx.name ? `Character name: "${ctx.name}".` : '';

    const hairLengths = ['long', 'medium-length', 'short', 'shoulder-length', 'very long', 'wavy mid-length', 'curly long', 'bob-length', 'straight past shoulders', 'layered'];
    const hairColors = ['blonde', 'brunette', 'dark brown', 'black', 'auburn', 'chestnut', 'honey blonde', 'strawberry blonde', 'ash blonde', 'deep red', 'light brown', 'sandy blonde', 'platinum blonde', 'warm brown'];
    const builds = ['slender', 'athletic', 'curvy', 'petite', 'tall and lean', 'average', 'hourglass', 'willowy', 'sturdy', 'statuesque', 'compact and toned'];
    const styles = ['casual chic', 'preppy', 'bohemian', 'smart casual', 'sporty', 'elegant', 'vintage-inspired', 'minimalist', 'feminine', 'classic American', 'outdoorsy', 'artsy', 'beachy relaxed', 'business casual'];
    const features = [
        'dimples when smiling', 'freckles across nose', 'high cheekbones', 'expressive eyebrows',
        'a warm infectious smile', 'sharp jawline', 'wide-set eyes', 'full lips', 'a small beauty mark',
        'long eyelashes', 'a gap between front teeth', 'natural rosy cheeks', 'a strong brow',
        'laugh lines', 'a button nose', 'defined collarbones', 'deep-set eyes', 'a graceful neck',
        'an easy confident posture', 'sun-kissed glow', 'bright expressive eyes', 'thick natural brows'
    ];
    const rHairLen = hairLengths[Math.floor(Math.random() * hairLengths.length)];
    const rHairCol = hairColors[Math.floor(Math.random() * hairColors.length)];
    const rBuild = builds[Math.floor(Math.random() * builds.length)];
    const rStyle = styles[Math.floor(Math.random() * styles.length)];
    const rFeature1 = features[Math.floor(Math.random() * features.length)];
    const rFeature2 = features.filter(f => f !== rFeature1)[Math.floor(Math.random() * (features.length - 1))];

    const heights = ['155cm', '158cm', '160cm', '162cm', '163cm', '165cm', '167cm', '168cm', '170cm', '172cm', '175cm', '178cm'];
    const skinTones = ['fair skin', 'light skin', 'medium skin', 'warm olive skin', 'tan skin', 'golden skin', 'light brown skin', 'brown skin'];
    const eyeColors = ['brown eyes', 'dark brown eyes', 'hazel eyes', 'green eyes', 'blue eyes', 'grey eyes', 'amber eyes'];
    const rHeight = heights[Math.floor(Math.random() * heights.length)];
    const rSkin = skinTones[Math.floor(Math.random() * skinTones.length)];
    const rEyes = eyeColors[Math.floor(Math.random() * eyeColors.length)];
    const localFallback = [rHeight, rSkin, rEyes, rBuild + ' build', rHairCol + ' ' + rHairLen + ' hair', rFeature1].join(', ');

    try {
        const result = await callLlama(
            `You are a creative character designer. Return ONLY a comma-separated appearance list for a ${ctx.gender} character. ${nameHint} ${ageHint} ${cultureHint} ${bioHint}
Build from these random seeds (use as inspiration, refine to fit character): ${rBuild} build, ${rHairCol} ${rHairLen} hair, ${rStyle} style, ${rFeature1}, ${rFeature2}.
Also include: exact height in cm, skin tone, eye color.
STRICT RULES:
- NO tattoos unless bio/background explicitly mentions them
- NO piercings unless the style clearly calls for it
- NO shaved sides or undercut unless requested
- Make it feel like a real, believable everyday person - not a stereotype or fantasy trope
- Vary from common AI defaults - avoid "short dark hair", "sleeve tattoos", "athletic build" as defaults
- Each descriptor must be 1-6 words max
- Output ONLY comma-separated list. No labels, no sentences, no intro text.`,
            'Generate diverse appearance descriptors.'
        );
        initAppTags(result);
    } catch (e) {
        logError('rollAppearance failed', e.message);
        initAppTags(localFallback);
        if (typeof showToast === 'function') showToast('\u26A0\uFE0F AI unavailable — used random seeds instead', '#1a0e00', '#f59e0b');
    }
    setDiceLoading(btn, false);
}

async function rollBio(btn) {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    diceSpin(btn);
    setDiceLoading(btn, true);
    const ctx = getCharContext();
    const cultureHint = getCultureHintFromFields(ctx) ? `Era/culture/location: ${getCultureHintFromFields(ctx)}.` : '';
    const nameHint = ctx.name ? `Name: "${ctx.name}".` : '';
    const appHint = ctx.appearance ? `Appearance: ${ctx.appearance.substring(0, 80)}.` : '';
    const ageHint = ctx.age ? `Age: ${ctx.age}.` : '';
    const personalityHint = ctx.prompt ? `Personality hints: ${ctx.prompt.substring(0, 80)}.` : '';
    const lang = getLang();
    try {
        const result = await callLlama(
            `You are a creative writer. Return ONLY a compelling background story (2-3 sentences) for a ${ctx.gender} character. ${nameHint} ${ageHint} ${appHint} ${cultureHint} ${personalityHint}
Cover their past, a key defining experience, and what drives them now. Must be logically consistent with all provided info including the country/era setting. Write in ${lang}. No intro, no label - just the bio.

AVOID these overused patterns:
- DO NOT always include a younger brother or sibling rescue storyline
- DO NOT default to family tragedy involving siblings
- VARIETY: Use diverse motivations: ambition, curiosity, betrayal, love, survival, revenge, discovery, escape, duty, forbidden desire, personal obsession, chance encounter
- VARIETY: The defining moment can be: a choice they made, someone they met, something they witnessed, a door they opened, a lie they told, a promise broken or kept
- VARIETY: The driving force can be: ambition, guilt, wanderlust, a secret, debt, an old letter, a scar, a talent, a mistake they are running from`,
            'Write the character background story.',
            GROQ_THINK_MODEL,
            1.1,
            400
        );
        const bioEl = document.getElementById('bot-bio');
        bioEl.value = result;
        autoResize(bioEl);
    } catch (e) {
        logError('rollBio failed', e.message);
    }
    setDiceLoading(btn, false);
}

async function rollBotCareer(btn) {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    diceSpin(btn); setDiceLoading(btn, true);
    const ctx = getCharContext();
    const cultureHint = getCultureHintFromFields(ctx) ? `Era/culture/location: ${getCultureHintFromFields(ctx)}.` : '';
    try {
        const result = await callLlama(
            `You are a creative character designer. Return ONLY a single career/occupation name (1-4 words) appropriate for the following setting: ${cultureHint}. 
Be creative but realistic for the era. NO modern tech jobs if the era is before 1990s. Return ONLY the career name, no explanation, no quotes.`,
            "Generate a random career.",
            GROQ_FAST_MODEL
        );
        document.getElementById('bot-career').value = result.replace(/["'.]/g, '').trim();
    } catch (e) {
        logError('rollBotCareer failed', e.message);
        const commonJobs = ['Software Engineer', 'Doctor', 'Teacher', 'Artist', 'Chef', 'Writer', 'Mechanic', 'Musician'];
        document.getElementById('bot-career').value = commonJobs[Math.floor(Math.random() * commonJobs.length)];
    }
    setDiceLoading(btn, false);
}

async function randomizeAllFields() {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    const dummyBtn = document.createElement('button');
    dummyBtn.style.display = 'none';
    document.body.appendChild(dummyBtn);
    showToast('🎲 Randomizing all fields...', '#1a0e00', '#f59e0b');
    try {
        // Step 1: Base traits first (Age, Year, Culture/Country, Relations)
        const botAge = Math.floor(Math.random() * 16 + 20);
        document.getElementById('bot-age').value = botAge;
        const socialRelations = ['Stranger', 'Friend', 'Colleague', 'Neighbor', 'Classmate', 'Rival', 'Boss', 'Employee'];
        
        // Gender & Age-dependent family relations (60% chance none, 40% family)
        const gender = document.getElementById('bot-gender')?.value || 'Female';
        const isFemale = gender !== 'Male';
        
        // Age-appropriate family relations
        let ageAppropriateRelations = ['None', 'None', 'None']; // 3 None = 60% no family
        
        if (botAge < 30) {
            // Young: can be sibling, child, niece/nephew, grandchild, cousin
            ageAppropriateRelations.push(
                isFemale ? 'Sister' : 'Brother',
                isFemale ? 'Step Sister' : 'Step Brother',
                'Cousin',
                isFemale ? 'Daughter' : 'Son',
                isFemale ? 'Niece' : 'Nephew',
                isFemale ? 'Granddaughter' : 'Grandson'
            );
        } else if (botAge < 45) {
            // Middle age: sibling, cousin, aunt/uncle, maybe parent if had kids young
            ageAppropriateRelations.push(
                isFemale ? 'Sister' : 'Brother',
                isFemale ? 'Step Sister' : 'Step Brother',
                'Cousin',
                isFemale ? 'Aunt' : 'Uncle',
                isFemale ? 'Niece' : 'Nephew',
                Math.random() < 0.3 ? (isFemale ? 'Mother' : 'Father') : (isFemale ? 'Aunt' : 'Uncle')
            );
        } else if (botAge < 60) {
            // Older: parent, step-parent, aunt/uncle, cousin, grandparent if had kids young
            ageAppropriateRelations.push(
                isFemale ? 'Mother' : 'Father',
                isFemale ? 'Step Mother' : 'Step Father',
                isFemale ? 'Aunt' : 'Uncle',
                'Cousin',
                Math.random() < 0.2 ? (isFemale ? 'Grandmother' : 'Grandfather') : (isFemale ? 'Aunt' : 'Uncle')
            );
        } else {
            // Elderly: grandparent, parent (had kids young), aunt/uncle
            ageAppropriateRelations.push(
                isFemale ? 'Grandmother' : 'Grandfather',
                isFemale ? 'Mother' : 'Father',
                isFemale ? 'Step Mother' : 'Step Father',
                isFemale ? 'Aunt' : 'Uncle'
            );
        }
        
        const emotionalRelations = ['neutral', 'friend', 'rival', 'enemy', 'curious', 'attracted'];
        document.getElementById('bot-social-relation').value = socialRelations[Math.floor(Math.random() * socialRelations.length)];
        document.getElementById('bot-family-relation').value = ageAppropriateRelations[Math.floor(Math.random() * ageAppropriateRelations.length)];
        document.getElementById('bot-emotional-relation').value = emotionalRelations[Math.floor(Math.random() * emotionalRelations.length)];
        const eras = ['2024', '2020s', '2010s', '1990s', '1980s', '1960s', '1940s', '1920s', '1900s'];
        document.getElementById('bot-year').value = eras[Math.floor(Math.random() * eras.length)];
        const commonCountries = ['Japan', 'South Korea', 'China', 'USA', 'UK', 'France', 'Germany', 'Brazil', 'Italy'];
        document.getElementById('bot-country').value = commonCountries[Math.floor(Math.random() * commonCountries.length)];

        // Step 2: Use Era & Culture to generate a realistic Career & Name
        await rollBotCareer(dummyBtn);
        await new Promise(r => setTimeout(r, 200));
        await rollName(dummyBtn);
        await new Promise(r => setTimeout(r, 200));

        // Let the name potentially align the country if an override is natural
        const nameValue = document.getElementById('bot-name').value.toLowerCase();
        if (/korean|kim|park|lee|yoon|jeong|choi/.test(nameValue)) document.getElementById('bot-country').value = 'South Korea';
        else if (/chinese|wang|li|zhang|chen|liu/.test(nameValue)) document.getElementById('bot-country').value = 'China';
        else if (/american|smith|johnson|williams/.test(nameValue)) document.getElementById('bot-country').value = 'USA';

        // Step 3: Now generate Appearance and Bio based on the full identity
        await rollAppearance(dummyBtn);
        await new Promise(r => setTimeout(r, 200));
        await rollBio(dummyBtn);
        await new Promise(r => setTimeout(r, 200));

        // Step 4: Generate meeting context
        await rollContext(dummyBtn);

        showToast('✅ All fields randomized sequentially!', '#0a1a0a', '#22c55e');
    } catch (e) {
        logError('randomizeAllFields failed', e.message);
        showToast('❌ Randomization failed', '#1a0e00', '#ef4444');
    } finally {
        dummyBtn.remove();
    }
}

function handleAvatarUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('❌ Please select an image file', '#1a0e00', '#ef4444');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        document.getElementById('av-preview').src = dataUrl;
        document.getElementById('bot-av-url').value = dataUrl;
        showToast('✅ Avatar uploaded!', '#0a1a0a', '#22c55e');
    };
    reader.onerror = function() {
        showToast('❌ Failed to read image', '#1a0e00', '#ef4444');
    };
    reader.readAsDataURL(file);
}

function openAvatarZoom() {
    const preview = document.getElementById('av-preview');
    const zoomImg = document.getElementById('av-zoom-img');
    const modal = document.getElementById('av-zoom-modal');
    if (!preview || !zoomImg || !modal) return;
    // Use current preview src or fall back to bot-av-url
    const avUrl = document.getElementById('bot-av-url')?.value;
    zoomImg.src = preview.src || avUrl || '';
    modal.style.display = 'flex';
}

function closeAvatarZoom() {
    const modal = document.getElementById('av-zoom-modal');
    if (modal) modal.style.display = 'none';
}

function minutesToTimeStr(mins) {
    const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
    const m = Math.floor(((mins % 1440) + 1440) % 1440 % 60);
    return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
}

function getLaborStartMinutes(bot) {
    const cd = bot && bot.cycleData;
    if (!cd) return getVirtualMinutes(bot);
    if (typeof cd.laborVirtualMinutes === 'number' && cd.laborVirtualMinutes >= 0) {
        return cd.laborVirtualMinutes;
    }
    if (typeof cd.laborVirtualDay === 'number' && cd.laborVirtualDay !== null) {
        const healed = cd.laborVirtualDay * 1440 + 540;
        cd.laborVirtualMinutes = healed;
        return healed;
    }
    const fallback = Math.max(0, getVirtualMinutes(bot) - 1);
    cd.laborVirtualMinutes = fallback;
    return fallback;
}

let _laborTimerInterval = null;
function startLaborTimerRefresh(bot, isGroup) {
    stopLaborTimerRefresh();
    _laborTimerInterval = setInterval(() => {
        if (isGroup) {
            const modal = document.getElementById('grp-bio-modal');
            if (!modal || modal.style.display !== 'flex') { stopLaborTimerRefresh(); return; }
            const grp = groups.find(g => g.id === curGroupId);
            if (grp) renderGroupMemberRepro(bot, grp);
        } else {
            const modal = document.getElementById('bio-modal');
            if (!modal || modal.style.display !== 'flex') { stopLaborTimerRefresh(); return; }
            renderReproHealth(bot);
        }
    }, 30000);
}
function stopLaborTimerRefresh() {
    if (_laborTimerInterval) { clearInterval(_laborTimerInterval); _laborTimerInterval = null; }
}

function getLaborElapsedMinutes(bot, currentGroupMins) {
    const cd = bot && bot.cycleData;
    if (!cd || !cd.laborStarted) return 0;

    // Dùng virtual time - chính xác hơn real time trong roleplay
    const laborVirtMin = getLaborStartMinutes(bot);
    const refMins = (typeof currentGroupMins === 'number') ? currentGroupMins : getVirtualMinutes(bot);
    const virtElapsed = Math.max(0, refMins - laborVirtMin);

    // Guard against stale labor timestamps (e.g. labor flag left on while story time advanced days).
    // In that case we re-base the labor start near "now" so UI does not show impossible durations.
    const STALE_LABOR_MAX_MINUTES = 72 * 60; // 72h safety cap
    if (virtElapsed > STALE_LABOR_MAX_MINUTES) {
        cd.laborVirtualMinutes = Math.max(0, refMins - 59);
        cd.laborVirtualDay = Math.floor(cd.laborVirtualMinutes / 1440);
        if (typeof saveBots === 'function') saveBots();
        return 59;
    }
    return virtElapsed;
}

function getVirtualMinutes(bot) {
    return typeof bot.virtualMinutes === 'number' ? bot.virtualMinutes : 540;
}

function getTimeOfDay(bot) {
    const total = getVirtualMinutes(bot);
    return ((total % 1440) + 1440) % 1440;
}

function getTimeContext(bot) {
    const tod = getTimeOfDay(bot);
    const h = Math.floor(tod / 60);
    const m = tod % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    let period, mood;
    if (h >= 5 && h < 9) { period = 'early morning'; mood = 'still groggy, yawning, hair messy - not fully awake yet'; }
    else if (h >= 9 && h < 12) { period = 'mid-morning'; mood = 'alert and functional, getting things done'; }
    else if (h >= 12 && h < 14) { period = 'noon/lunch'; mood = 'hungry, possible mid-day lull'; }
    else if (h >= 14 && h < 17) { period = 'afternoon'; mood = 'relaxed, attention drifting, mildly drowsy'; }
    else if (h >= 17 && h < 20) { period = 'evening'; mood = 'unwinding, emotionally softer and more open'; }
    else if (h >= 20 && h < 23) { period = 'night'; mood = 'tired, guard lowered, quiet and intimate'; }
    else { period = 'late night'; mood = 'exhausted, bare and unguarded - defenses nearly gone'; }

    let seasonPart = '';
    try {
        const cal = getVirtualCalendarDate(bot);
        const mo = cal.month || cal.mm;
        const monthNum = parseInt(mo, 10);
        const seasons = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
        const season = seasons[(monthNum - 1) % 12] || '';
        const holiday = getTodayHoliday(bot);
        seasonPart = season ? ` — ${season}, ${cal.ddmm || (String(cal.day || '').padStart(2, '0') + '/' + String(monthNum).padStart(2, '0'))}${holiday ? ' (' + holiday.name + ')' : ''}` : '';
    } catch (e) { }

    return '[Time]: It is ' + hh + ':' + mm + ' (' + period + ')' + seasonPart + '. Her energy: ' + mood + '.';
}

function getVirtualDay(bot) {

    if (typeof bot.virtualMinutes === 'number') {
        return Math.floor(bot.virtualMinutes / 1440);
    }
    return bot.virtualDay || 0;
}

function setVirtualDay(bot, day) {

    const tod = getTimeOfDay(bot);
    bot.virtualMinutes = day * 1440 + tod;
    bot.virtualDay = Math.max(0, day);
    saveBots();
    renderVirtualDateBadge(bot);
    renderVirtualClockBadge(bot);
}

function advanceVirtualMinutes(bot, minutes) {
    const prev = getVirtualMinutes(bot);
    bot.virtualMinutes = prev + Math.round(minutes);
    bot.virtualDay = Math.floor(bot.virtualMinutes / 1440);
    saveBots();
    renderVirtualDateBadge(bot);
    renderVirtualClockBadge(bot);

    checkBirthButton(bot);
}

function checkBirthButton(bot) {
    const wrap = document.getElementById('birth-btn-wrap');
    if (!wrap) return;
    if (!bot || bot.id !== curId) return;
    const cd = bot.cycleData;
    if (!cd || !cd.laborStarted || cd.birthVirtualDay !== null) {
        wrap.style.display = 'none';
        return;
    }
    const laborMinutes = getLaborElapsedMinutes(bot);
    const laborHours = Math.floor(laborMinutes / 60);
    if (laborHours >= 3) {
        wrap.style.display = 'block';
        const label = document.getElementById('birth-btn-label');
        if (label) label.textContent = 'DELIVER BABY - ' + laborHours + 'h in labor';
    } else {
        wrap.style.display = 'none';
    }
}

function resetLaborToFullTerm() {
    const bot = bots.find(b => b.id === curId);
    if (!bot || !bot.cycleData) return;
    const cd = bot.cycleData;

    if (!confirm('Reset labor for ' + bot.name + ' and restore full-term pregnancy (week 39)?')) return;

    cd.laborStarted = false;
    cd.laborStartedRealTime = undefined;
    cd.laborVirtualDay = null;
    cd.laborVirtualMinutes = undefined;
    cd.laborProgress = {};
    cd.waterBroke = false;

    cd.pregnant = true;
    cd.birthVirtualDay = null;
    cd.postpartumStartDay = null;
    cd.newbornPresent = false;


    const currentVDay = getVirtualDay(bot);
    cd.conceptionVirtualDay = currentVDay - Math.round((39 * 7) / PREGNANCY_SPEED);

    addReproEvent(bot, '\u21A9\uFE0F Labor reset \u2014 restored to full-term pregnancy (week 39).');
    saveBots();

    const bwrap = document.getElementById('birth-btn-wrap');
    if (bwrap) bwrap.style.display = 'none';

    const lp = document.getElementById('solo-labor-progress');
    if (lp) lp.style.display = 'none';

    updateReproductiveStatus(bot);
    refreshBioPanelIfOpen(bot);
    renderReproHealth(bot);

    showToast('\u21A9\uFE0F Labor reset \u2014 full-term pregnancy restored.', '#0a1a0a', '#22c55e');
}

async function triggerBirth() {
    const bot = bots.find(b => b.id === curId);
    if (!bot || !bot.cycleData || !bot.cycleData.laborStarted) return;
    const cd = bot.cycleData;
    const aiLang = getLang();

    const wrap = document.getElementById('birth-btn-wrap');
    if (wrap) wrap.style.display = 'none';
    showTypingIndicator(bots.find(b => b.id === curId) || null);

    const laborHours = Math.round(getLaborElapsedMinutes(bot) / 60);
    const pregWeeks = getEffectivePregnancyWeek(bot) || 40;
    const fCount = cd.fetuses ? cd.fetuses.length : 1;
    const isTwins = fCount > 1;
    const isMonsterLabor = !!(cd.isMonsterPregnancy);
    const compSection = isMonsterLabor ? `\n🐾 MONSTER LABOR - this birth is CATASTROPHICALLY more painful than any normal birth. The thing inside is not being born, it is fighting its way out. Pain is on another level entirely - savage, tearing, alien. She screams. She cannot reason through it.` : '';

    const sys = `You are ${bot.name} (${bot.gender})${bot.age ? ', ' + bot.age + ' years old' : ''}.
[Appearance]: ${bot.appearance || 'Not specified'}
[Background]: ${bot.bio || 'Not specified'}
[Personality]: ${bot.prompt || 'Not specified'}

SITUATION: ${bot.name} is giving birth RIGHT NOW, after ${laborHours} hours of labor. Pregnancy week: ${pregWeeks}. Carrying: ${fCount} ${fCount === 1 ? 'baby' : 'babies'}.${compSection}

<think>
Write a visceral, realistic birth scene. MANDATORY structure - do NOT skip any phase:

PHASE 1 - PUSHING BEGINS (2-3 sentences):
The first pushes. Enormous effort. The head is descending but NOT yet visible. Her body bears down involuntarily. Pain is total. Between pushes she collapses, gasping.

PHASE 2 - CROWNING (2-3 sentences):
After multiple pushes, the head is crowning. The "ring of fire" - a searing, burning sensation at the peak of stretch. She must BREATHE and NOT push here, no matter how overwhelming the urge. This is agonizing. The head retreats slightly between contractions.

PHASE 3 - DELIVERY (1-2 sentences):
One final controlled push. The head clears. Then the body follows - a rush of relief and release. ${isTwins ? 'But there is another baby - the work is not done.' : ''}

PHASE 4 - FIRST MOMENTS (2-3 sentences):
The first cry. The shift from agony to overwhelming disbelief and love. Her body collapses. She is shaking, tears streaming, utterly destroyed and utterly alive. Holding her ${isTwins ? 'babies' : 'baby'} for the first time.

Make it viscerally human - sweat, shaking, involuntary sounds, the physical reality of a body doing something enormous. NOT clinical. NOT romantic. Real.
</think>

Rules:
1. You ONLY play ${bot.name}. Write her physical experience + spoken lines in quotes. No "you" actions.
2. Follow the 4-phase structure above. Do NOT rush to delivery - the pushing and crowning phases must take effort across multiple attempts.
3. Be emotionally raw. Exhaustion, disbelief, overwhelming love, grief, relief - all at once. NOT a triumphant movie birth.
4. Write entirely in ${aiLang}.
`;

    try {
        const data = await fetchGroqChat([
            { role: 'system', content: sys },
            ...buildHistoryForAPI(bot),
            { role: 'user', content: '[The baby is coming - final push]' }
        ], 700);
        let reply = data.choices?.[0]?.message?.content || '';
        extractAndSetEmotion(reply);
        reply = reply.replace(/EMOTION::[\s\S]*/, '').trim();
        reply = cleanReply(reply);

        cd.birthVirtualDay = getVirtualDay(bot);
        cd.pregnant = false;
        cd.postpartumStartDay = getVirtualDay(bot);
        cd.newbornPresent = true;
        cd.laborStarted = false;
        cd.waterBroke = false;
        cd.isParasitePregnancy = false;
        cd.isMonsterPregnancy = false;
        if (!cd.children) cd.children = [];
        const _birthDay = getVirtualDay(bot);
        const _fetuses = cd.fetuses && cd.fetuses.length > 0 ? cd.fetuses : [{ gender: 'unknown', nickname: '' }];
        _fetuses.forEach(function (fetus, fi) {
            const childNum = cd.children.length + 1;
            const childGender = fetus.gender && fetus.gender !== 'unknown' ? fetus.gender : (Math.random() < 0.5 ? 'female' : 'male');
            // Roll random traits for child (3-5 traits)
            const _traitPool = typeof ALL_TRAITS !== 'undefined' ? ALL_TRAITS.filter(t => t.mutable) : [];
            const _rolled = [];
            const _shuffled = _traitPool.slice().sort(() => Math.random() - 0.5);
            const _count = 3 + Math.floor(Math.random() * 3); // 3-5
            for (let _ti = 0; _ti < Math.min(_count, _shuffled.length); _ti++) _rolled.push(_shuffled[_ti].name);
            cd.children.push({
                id: 'child_' + Date.now() + '_' + fi,
                name: fetus.nickname || (childGender === 'female' ? 'Baby Girl ' : 'Baby Boy ') + childNum,
                gender: childGender,
                birthDay: _birthDay,
                motherId: bot.id,
                motherName: bot.name,
                traits: _rolled,
                states: ['nursing'],
                notes: '',
            });
        });
        // Auto-move bot to nursery after birth
        setBotState(bot, 'postpartum', true);
        setBotState(bot, 'nursing', true);
        setBotState(bot, 'lactating', true);

        const bornCount = cd.fetuses ? cd.fetuses.length : 1;
        addReproEvent(bot, `🍼 ${bornCount > 1 ? bornCount + ' babies' : 'Baby'} born after ${laborHours}h of labor! Postpartum begins.`);

        cd.fetusCount = 1;
        cd.fetuses = [{ gender: 'unknown', nickname: '' }];

        bot.history.push({ role: 'assistant', content: reply, msgId: Date.now().toString() });
        bot.lastChatted = Date.now();
        trimBotHistory(bot);
        saveBots();
        updateReproductiveStatus(bot);
        renderChat(true);
        setTimeout(updateEmoteBadge, 100);
    } catch (e) {
        logError('triggerBirth error', e.message);
    }
    hideTypingIndicator();
}
function formatVirtualDate(bot) {
    const cal = getVirtualCalendarDate(bot);
    const holiday = getTodayHoliday(bot);
    const seasonEmoji = getSeasonEmoji(cal.month);
    const base = `${seasonEmoji} ${cal.dayShort} ${String(cal.day).padStart(2, '0')}/${String(cal.month).padStart(2, '0')}/${cal.year}`;
    return holiday ? `${base} 🎉` : base;
}

function renderVirtualDateBadge(bot) {
    const badge = document.getElementById('virtual-date-badge');
    if (!badge) return;
    badge.textContent = formatVirtualDate(bot);
    badge.style.display = 'inline-block';
}

function showWeekCalendar(e) {
    e.stopPropagation();
    const popup = document.getElementById('week-calendar-popup');
    if (!popup) return;

    if (popup.style.display !== 'none') { popup.style.display = 'none'; return; }

    let bot;
    if (curGroupId) {
        const grp = groups.find(g => g.id === curGroupId);
        if (grp && grp.memberIds && grp.memberIds.length > 0) {
            bot = bots.find(b => b.id === grp.memberIds[0]);
        }
    } else {
        bot = bots.find(b => b.id === curId);
    }

    if (!bot) return;

    const cal = getVirtualCalendarDate(bot);
    const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    document.getElementById('cal-month-label').textContent = `${MONTHS[cal.month - 1]} ${cal.year}`;

    const grid = document.getElementById('cal-week-grid');
    grid.innerHTML = '';

    const vDay = getVirtualDay(bot);
    let startYear = new Date().getFullYear();
    if (bot.year) { const ym = String(bot.year).match(/(\d{4})/); if (ym) startYear = parseInt(ym[1]); }
    const startDate = new Date(startYear, 0, 1);

    const todayDate = new Date(startDate.getTime() + vDay * 86400000);

    // Show 7 days starting from today (current day + 6 future days)
    for (let i = 0; i < 7; i++) {
        const cellDate = new Date(todayDate.getTime() + i * 86400000);
        const dayNum = Math.floor((cellDate.getTime() - startDate.getTime()) / 86400000);
        const isToday = dayNum === vDay;

        const cell = document.createElement('div');
        cell.style.cssText = `
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            padding:8px;border-radius:8px;transition:all 0.2s;
            ${isToday ? 'background:#9333ea;color:#fff;cursor:default' :
                'background:#1a1a1a;color:#fff;cursor:pointer'};
            border:1px solid ${isToday ? '#9333ea' : '#4ade80'};
            opacity:1;
        `;
        cell.innerHTML = `
            <span style="font-size:10px;color:${isToday ? '#fff' : '#4ade80'}">${DAYS_SHORT[cellDate.getDay()]}</span>
            <span style="font-size:16px;font-weight:bold">${cellDate.getDate()}</span>
        `;
        if (!isToday) {
            cell.onclick = () => {
                const daysToSkip = dayNum - vDay;
                skipToDayWithDays(daysToSkip);
            };
        }
        grid.appendChild(cell);
    }

    popup.style.display = 'block';

    setTimeout(() => {
        const close = (ev) => {
            if (!popup.contains(ev.target)) { popup.style.display = 'none'; document.removeEventListener('click', close); }
        };
        document.addEventListener('click', close);
    }, 100);
}

function showTimePicker(e) {
    e.stopPropagation();
    const isGroup = !!curGroupId;
    const popupId = isGroup ? 'grp-time-picker-popup' : 'time-picker-popup';
    const popup = document.getElementById(popupId);
    if (!popup) return;

    if (popup.style.display !== 'none') { popup.style.display = 'none'; return; }

    // Reset clock time to current bot time
    resetClockTime();

    popup.style.display = 'block';

    setTimeout(() => {
        const close = (ev) => {
            if (!popup.contains(ev.target)) { popup.style.display = 'none'; document.removeEventListener('click', close); }
        };
        document.addEventListener('click', close);
    }, 100);
}

function skipToDayWithDays(daysToSkip) {
    const isGroup = !!curGroupId;
    let botsToSkip;

    if (isGroup) {
        const grp = groups.find(g => g.id === curGroupId);
        if (grp && grp.memberIds && grp.memberIds.length > 0) {
            botsToSkip = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
        }
    } else {
        const bot = bots.find(b => b.id === curId);
        if (bot) botsToSkip = [bot];
    }

    if (!botsToSkip || botsToSkip.length === 0) return;

    botsToSkip.forEach(bot => {
        const currentDay = getVirtualDay(bot);
        const currentMinsOfDay = getTimeOfDay(bot);
        const prev = getVirtualMinutes(bot);

        bot.virtualDay = currentDay + daysToSkip;
        bot.virtualMinutes = bot.virtualDay * 1440 + currentMinsOfDay;

        evaluateCycleAfterTimeSkip(bot, daysToSkip);
        checkScheduleMilestones(bot, prev, bot.virtualMinutes);
    });

    saveBots();

    if (isGroup) {
        const grp = groups.find(g => g.id === curGroupId);
        if (grp) {
            const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
            updateGroupTimeBadges(members);
        }
    } else {
        const bot = bots.find(b => b.id === curId);
        if (bot) {
            renderVirtualDateBadge(bot);
            renderVirtualClockBadge(bot);
            refreshBioPanelIfOpen(bot);
        }
    }

    document.getElementById('week-calendar-popup').style.display = 'none';
    showToast(`⏩ Skipped ${daysToSkip} day${daysToSkip > 1 ? 's' : ''}`, '#0a1a0a', '#7c3aed');
}

// Clock time tracking for skip time UI
let _clockHour = 12;
let _clockMinute = 0;

function updateClockDisplay() {
    const isGroup = !!curGroupId;
    const clockTimeId = isGroup ? 'grp-clock-time' : 'clock-time';
    const timeStr = String(_clockHour).padStart(2, '0') + ':' + String(_clockMinute).padStart(2, '0');
    const clockTimeEl = document.getElementById(clockTimeId);
    if (clockTimeEl) clockTimeEl.textContent = timeStr;
}

function addHour(delta) {
    _clockHour = (_clockHour + delta) % 24;
    if (_clockHour < 0) _clockHour += 24;
    updateClockDisplay();
}

function addMinute(delta) {
    _clockMinute = (_clockMinute + delta) % 60;
    if (_clockMinute < 0) _clockMinute += 60;
    updateClockDisplay();
}

function resetClockTime() {
    const isGroup = !!curGroupId;
    let currentMins = 720; // Default to 12:00

    if (isGroup) {
        const grp = groups.find(g => g.id === curGroupId);
        if (grp && grp.memberIds && grp.memberIds.length > 0) {
            const bot = bots.find(b => b.id === grp.memberIds[0]);
            if (bot) currentMins = getTimeOfDay(bot);
        }
    } else {
        const bot = bots.find(b => b.id === curId);
        if (bot) currentMins = getTimeOfDay(bot);
    }

    _clockHour = Math.floor(currentMins / 60);
    _clockMinute = currentMins % 60;
    updateClockDisplay();
}

function skipToTime() {
    const isGroup = !!curGroupId;
    let botsToSkip;

    if (isGroup) {
        const grp = groups.find(g => g.id === curGroupId);
        if (grp && grp.memberIds && grp.memberIds.length > 0) {
            botsToSkip = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
        }
    } else {
        const bot = bots.find(b => b.id === curId);
        if (bot) botsToSkip = [bot];
    }

    if (!botsToSkip || botsToSkip.length === 0) return;

    const popupId = isGroup ? 'grp-time-picker-popup' : 'time-picker-popup';

    // Use clock time variables instead of input fields
    const hour = _clockHour;
    const minute = _clockMinute;

    const targetMins = hour * 60 + minute;

    botsToSkip.forEach(bot => {
        const currentMins = getTimeOfDay(bot);
        const currentDay = getVirtualDay(bot);
        const prev = getVirtualMinutes(bot);

        let newDay = currentDay;
        if (targetMins < currentMins) {
            newDay = currentDay + 1;
        }

        bot.virtualDay = newDay;
        bot.virtualMinutes = newDay * 1440 + targetMins;

        const daysAdvanced = newDay - currentDay;
        if (daysAdvanced > 0) {
            evaluateCycleAfterTimeSkip(bot, daysAdvanced);
        }
        checkScheduleMilestones(bot, prev, bot.virtualMinutes);
        
        // Check parasite auto-labor after time skip (even within same day)
        if (bot.cycleData && bot.cycleData.isParasitePregnancy) {
            checkParasiteAutoLabor(bot);
        }
    });

    saveBots();

    if (isGroup) {
        const grp = groups.find(g => g.id === curGroupId);
        if (grp) {
            const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
            updateGroupTimeBadges(members);
            // Check schedule-based movement after time skip
            checkGroupScheduleMilestones(grp);
        }
    } else {
        const bot = bots.find(b => b.id === curId);
        if (bot) {
            renderVirtualDateBadge(bot);
            renderVirtualClockBadge(bot);
            refreshBioPanelIfOpen(bot);
        }
    }

    document.getElementById(popupId).style.display = 'none';
    const timeStr = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
    showToast(`⏰ Skipped to ${timeStr}`, '#1a0e00', '#f59e0b');
}

function renderVirtualClockBadge(bot) {
    const badge = document.getElementById('virtual-clock-badge');
    if (!badge) return;
    const timeStr = minutesToTimeStr(getTimeOfDay(bot));
    badge.textContent = '⏰ ' + timeStr;
    badge.style.display = 'inline-block';
}


function updateGroupTimeBadges(members) {
    const refBot = members && members[0];
    const dateBadge = document.getElementById('grp-virtual-date-badge');
    const clockBadge = document.getElementById('grp-virtual-clock-badge');
    const seasonBadge = document.getElementById('grp-virtual-season-badge');
    if (!dateBadge || !clockBadge) return;
    if (refBot) {
        dateBadge.textContent = formatVirtualDate(refBot);
        dateBadge.style.display = 'inline-block';
        const timeStr = minutesToTimeStr(getTimeOfDay(refBot));
        clockBadge.textContent = '⏰ ' + timeStr;
        clockBadge.style.display = 'inline-block';
        if (seasonBadge) {
            const cal = getVirtualCalendarDate(refBot);
            seasonBadge.textContent = getSeasonEmoji(cal.month);
            seasonBadge.style.display = 'inline-block';
        }
    } else {
        dateBadge.style.display = 'none';
        clockBadge.style.display = 'none';
        if (seasonBadge) seasonBadge.style.display = 'none';
    }
}

function _checkOverdueLaborTrigger(bot) {
    if (!bot.cycleData || !bot.cycleData.pregnant || bot.cycleData.laborStarted) return;
    const wk = getEffectivePregnancyWeek(bot);
    const alwaysOD = (bot.geneticTraits || []).includes('Always Overdue');
    const startW = alwaysOD ? 43 : 40;
    const baseW = alwaysOD ? 42 : 39;
    if (wk >= startW) {
        if (Math.random() < 0.4 * (wk - baseW)) {
            const vDay = getVirtualDay(bot);
            bot.cycleData.laborStarted = true;
            bot.cycleData.laborStartedRealTime = Date.now();
            bot.cycleData.laborVirtualDay = vDay;
            bot.cycleData.laborVirtualMinutes = Math.max(0, getVirtualMinutes(bot) - 1);
            addReproEvent(bot, '\uD83D\uDEA8 Labor has begun! Contractions starting...');
            updateReproductiveStatus(bot);
            saveBots();
        }
    }
}


function getScheduleMilestones(bot) {
    if (!bot.schedule) return [];
    const s = bot.schedule;
    const customs = s.customActivities || [];
    const milestones = [];

    const add = (key, mins, type, label, prompts, room) => {
        if (!mins || isNaN(mins)) return;
        milestones.push({ key, mins, type, label, prompts, room: room || null });
    };

    add('wake', timeStrToMinutes(s.wake || '07:00'), 'wake', 'waking up', [
        `${bot.name} wakes up. Describe her first moments - groggy, reaching for phone, noticing the morning light. 1-2 sentences, no dialogue needed.`,
        `${bot.name} stirs awake. Her alarm just went off or her body woke her naturally. Show the small physical details of waking. 1-2 sentences.`,
    ], 'bedroom');
    add('breakfast', timeStrToMinutes(s.breakfast || '07:30'), 'meal', 'having breakfast', [
        `${bot.name} is making or eating breakfast. Show what she's having, the sounds, the smell. 1-2 sentences.`,
        `${bot.name} sits down for breakfast. Describe the morning meal scene naturally. 1-2 sentences.`,
    ], 'kitchen');
    add('lunch', timeStrToMinutes(s.lunch || '12:00'), 'meal', 'lunchtime', [
        `It's lunchtime. ${bot.name} takes a break to eat - show where she is and what she's eating. 1-2 sentences.`,
        `${bot.name} pauses for lunch. Describe the midday meal moment. 1-2 sentences.`,
    ], 'kitchen');
    add('dinner', timeStrToMinutes(s.dinner || '18:30'), 'meal', 'having dinner', [
        `${bot.name} sits down for dinner. Describe the evening meal - the food, the setting, her mood after the day. 1-2 sentences.`,
        `It's dinnertime. ${bot.name} is eating - show the atmosphere and what's on the table. 1-2 sentences.`,
    ], 'dining_room');
    add('sleep', timeStrToMinutes(s.sleep || '22:30'), 'sleep', 'getting ready for bed', [
        `${bot.name} is getting ready for bed - brushing teeth, changing clothes, winding down. 1-2 sentences.`,
        `It's bedtime. ${bot.name} prepares to sleep - show her nightly routine, her tiredness, the quiet of the night. 1-2 sentences.`,
    ], 'bedroom');

    customs.forEach((a, i) => {
        if (!a.name || (!a.startTime && !a.start)) return;
        const mins = timeStrToMinutes(a.start || a.startTime);
        // Room from stored value (new schema uses .room directly)
        const room = a.room || ACTIVITY_ROOM_MAP[a.name] || null;
        add('custom_' + i, mins, 'custom', a.name, [
            `It's time for ${bot.name}'s ${a.name}. She transitions into this - show her physically moving to or starting it. 1-2 sentences.`,
            `${bot.name} starts her ${a.name} now. Describe the shift in scene and what she does first. 1-2 sentences.`,
        ], room);
    });

    return milestones;
}

function checkScheduleMilestones(bot, prevMins, newMins) {
    if (!bot.schedule) return;

    // ── Auto-update schedule when pregnancy/cycle stage changes ──
    if (typeof _hasPregnancyStageChanged === 'function' && typeof _queueAutoUpdate === 'function') {
        if (_hasPregnancyStageChanged(bot)) {
            const currentStage = _getCurrentPregnancyStage(bot);
            if (currentStage) {
                // Queue for immediate auto-update (no cooldown)
                _queueAutoUpdate(bot);
                logError('checkScheduleMilestones', `Stage changed to ${currentStage} for ${bot.name}, queued auto-update`);
            }
        }
    }

    // ── Auto-sync pregnancy states based on current stage ──
    if (typeof syncPregnancyStates === 'function') {
        syncPregnancyStates(bot);
    }

    // Auto-generate new variant if state changed (e.g. entered new trimester)
    const _neededVariant = _getScheduleVariantKey(bot);
    if (!bot.scheduleVariants || !bot.scheduleVariants[_neededVariant]) {
        _autoUpdateScheduleIfNeeded(bot); // fire-and-forget background gen
    }

    if (bot.scheduleVariants) {
        const freshSched = _pickScheduleVariant(bot, bot.scheduleVariants);
        if (freshSched) {
            // Always refresh customActivities to match current day-of-week
            const dayChanged = JSON.stringify(freshSched.customActivities) !== JSON.stringify(bot.schedule.customActivities);
            if (freshSched.wake !== bot.schedule.wake || dayChanged) {
                bot.schedule = freshSched;
                bot._schedCtxCache = null; // invalidate cache on day/variant change
                saveBots();
            }
        }
    }
    if (localStorage.getItem('grace_schedule_events') !== '1') return;
    if (newMins <= prevMins) return;

    const milestones = getScheduleMilestones(bot);
    const prevDay = Math.floor(prevMins / 1440);
    const newDay = Math.floor(newMins / 1440);


    for (const m of milestones) {
        const prevTod = prevMins - prevDay * 1440;
        const newTod = newMins - newDay * 1440;

        let crossed = false;
        if (prevDay === newDay) {

            crossed = prevTod < m.mins && newTod >= m.mins;
        } else {

            crossed = prevTod < m.mins || newTod >= m.mins;
        }

        if (!crossed) continue;


        const coolKey = `sched_evt_${bot.id}_${newDay}_${m.key}`;
        if (sessionStorage.getItem(coolKey)) continue;
        sessionStorage.setItem(coolKey, '1');


        injectScheduleEvent(bot, m);
        break;
    }
}

async function injectScheduleEvent(bot, milestone) {
    const keys = getGroqKeys();
    if (!keys.length) return;

    // ── Fix 3: If user is actively chatting, ask Llama 3.1 whether to interrupt ──
    const lastUserMsg = bot.history.slice().reverse().find(m => m.role === 'user');
    const lastMsgRealTime = lastUserMsg?._sentAt || 0;
    const secondsSinceLast = (Date.now() - lastMsgRealTime) / 1000;
    const isActiveConvo = lastMsgRealTime > 0 && secondsSinceLast < 900; // active = last user msg < 15 min ago

    if (isActiveConvo) {
        // Build context: last 4 user msgs + last 4 bot msgs (max 8 total)
        const recentSlice = bot.history.slice(-12);
        const last4User = recentSlice.filter(m => m.role === 'user').slice(-4);
        const last4Bot = recentSlice.filter(m => m.role === 'assistant').slice(-4);
        // Interleave in chronological order
        const combined = bot.history.slice(-8).map(m =>
            (m.role === 'user' ? 'User' : bot.name) + ': ' +
            (m.content || '').replace(/EMOTION::.*/g, '').trim().substring(0, 100)
        ).join('\n');

        try {
            const checkKey = getNextGroqKey();
            const checkRes = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${checkKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: GROQ_FAST_MODEL,
                    max_tokens: 5,
                    temperature: 0.0,
                    messages: [{
                        role: 'user',
                        content: `In this roleplay conversation, is ${bot.name} currently in an active, engaged exchange with the user that would be interrupted by ${bot.name} suddenly leaving to do "${milestone.label}"?

Conversation:
${combined}

Answer ONLY "yes" (conversation is active, would feel jarring) or "no" (natural pause, ok to transition).`
                    }]
                }),
                signal: AbortSignal.timeout(5000)
            });
            const checkData = await checkRes.json();
            const answer = (checkData.choices?.[0]?.message?.content || '').trim().toLowerCase();
            if (answer.startsWith('yes')) {
                // Conversation too active - skip this milestone, reschedule +20 min
                const coolKey = `sched_evt_${bot.id}_${getVirtualDay(bot)}_${milestone.key}_defer`;
                sessionStorage.setItem(coolKey, '1');
                return; // will retry next time milestones are checked
            }
        } catch (e) { /* If check fails, proceed with injection */ }
    } else if (milestone.key === 'sleep') {
        // Original sleep guard: don't inject sleep if active convo (already covered above, but keep for non-active case)
        if (isActiveConvo) return;
    }

    const aiLang = getLang();
    const dayCtx = getDayContext(bot);
    const holiday = getTodayHoliday(bot);
    const cal = getVirtualCalendarDate(bot);
    const recentChat = getRecentChatSnippet(bot.history, bot.name, 4);
    const bioSnip = (getDynField(bot, 'bio') || bot.bio || '').substring(0, 130);
    const prompt = milestone.prompts[Math.floor(Math.random() * milestone.prompts.length)];

    try {
        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
                model: GROQ_GEN_MODEL,
                messages: [{
                    role: 'system',
                    content: `You write brief immersive scene moments for a roleplay character.\n\nCharacter: ${bot.name} (${bot.gender || 'female'})${bot.age ? ', age ' + bot.age : ''}.\nBackground: ${bioSnip}\nToday: ${dayCtx}${holiday ? `\nHOLIDAY: It is ${holiday.name} - weave this into the scene subtly.` : ''}\n${cal.isWeekend ? 'It is the weekend - more relaxed pace.' : ''}\n\nRecent chat:\n${recentChat}\n\nRules: 1-2 sentences only. In ${aiLang}. No asterisks. Dialogue in "double quotes". No EMOTION tag. Third-person close. Fit today's mood.`
                }, {
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 80,
                temperature: 0.88
            })
        });
        const data = await res.json();
        const eventText = (data.choices?.[0]?.message?.content || '').replace(/EMOTION::.*/g, '').trim();
        if (!eventText || eventText.length < 10) return;
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 1500));
        bot.history.push({ role: 'assistant', content: eventText, msgId: 'sched_' + Date.now(), isLifeEvent: true, schedMilestone: milestone.label });
        bot.lastChatted = Date.now();

        // ── Fix 2: Auto-move bot to correct room based on milestone room ──────
        if (milestone.room) {
            bot._cachedLocation = milestone.room.replace(/_/g, ' ');
            const badge = document.getElementById('chat-location-badge');
            if (badge) { badge.textContent = '\uD83D\uDCCD ' + bot._cachedLocation; badge.style.display = 'block'; }
        }

        saveBots();
        renderChat(true);
    } catch (e) { }
}


function getStatesContext(bot) {
    if (!bot) return '';
    const baseStates = bot.states || [];
    
    // Auto-inject labor state based on cycleData
    const cd = bot.cycleData;
    const autoStates = [];
    if (cd && cd.laborStarted && !cd.birthVirtualDay) {
        autoStates.push('in_labor');
    }
    
    const allStateIds = [...new Set([...baseStates, ...autoStates])];
    if (allStateIds.length === 0) return '';
    
    const labels = allStateIds
        .map(id => (typeof ALL_STATES !== 'undefined' ? ALL_STATES.find(s => s.id === id) : null))
        .filter(Boolean)
        .map(s => `${s.icon} ${s.label}: ${s.desc}`);
    if (!labels.length) return '';
    return `\n[Current States - actively shape her behavior, mood, and body right now]:\n${labels.map(l => '- ' + l).join('\n')}`;
}

function getScheduleContext(bot) {
    if (!bot.schedule) return '';

    const _curTod = getTimeOfDay(bot);
    const _curVday = getVirtualDay(bot);
    // In group chat, messages go to grp.history not bot.history, so also count group messages
    const _grpForBot = (typeof groups !== 'undefined') ? groups.find(g => g.memberIds && g.memberIds.includes(bot.id)) : null;
    const _grpMsgCount = _grpForBot ? (_grpForBot.history || []).filter(m => m.speakerId === bot.id || m.role === 'user').length : 0;
    const _totalMsgCount = (bot.history || []).length + _grpMsgCount;
    const _cacheValid = bot._schedCtxCache
        && bot._schedCtxCache.msgCount >= (_totalMsgCount - 2)
        && Math.abs((bot._schedCtxCache.tod || 0) - _curTod) < 20
        && (bot._schedCtxCache.vday || 0) === _curVday;  // invalidate on day change
    if (_cacheValid) return bot._schedCtxCache.text;

    // ── Helper: convert snake_case / underscore names to natural language ──
    const _humanName = (raw) => {
        if (!raw) return '';
        return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    const s = bot.schedule;
    const tod = _curTod;
    const timeStr = minutesToTimeStr(tod);
    const wake = timeStrToMinutes(s.wake || '07:00');
    const breakfast = timeStrToMinutes(s.breakfast || '07:30');
    const lunch = timeStrToMinutes(s.lunch || '12:00');
    const dinner = timeStrToMinutes(s.dinner || '18:30');
    const sleep = timeStrToMinutes(s.sleep || '22:30');

    // ── ALWAYS get fresh TODAY's activities from variants (fixes stale day bug) ──
    let customs = s.customActivities || [];
    if (bot.scheduleVariants) {
        const freshSched = _pickScheduleVariant(bot, bot.scheduleVariants);
        if (freshSched && freshSched.customActivities) {
            customs = freshSched.customActivities;
            // Update bot.schedule so other code also sees correct day
            if (bot.schedule) bot.schedule.customActivities = customs;
        }
    }

    const activeCustom = customs.find(a => {
        const st = a.start || a.startTime;
        const et = a.end || a.endTime;
        if (!st || !et) return false;
        return tod >= timeStrToMinutes(st) && tod < timeStrToMinutes(et);
    });

    // Room name map
    const ROOM_NAMES = {
        bedroom: 'bedroom', bathroom: 'bathroom', kitchen: 'kitchen',
        living_room: 'living room', study: 'study', outside: 'outside', dining_room: 'dining room'
    };

    // Pregnancy awareness
    const cd = bot.cycleData;
    const isPregnant = !!(cd && cd.pregnant && !cd.birthVirtualDay);
    const knowsPregnant = !!(cd && cd.pregnancyTestTaken);

    let activity, detail, currentRoom = null;
    if (activeCustom) {
        const _humanAct = _humanName(activeCustom.name);
        activity = _humanAct;
        currentRoom = activeCustom.room || null;
        // Validate stored room exists in bot's group - prevents AI referencing non-existent rooms (e.g. 'study' in AI-gen worlds)
        if (currentRoom && typeof groups !== 'undefined') {
            const _botGrp = groups.find(g => g.memberIds && g.memberIds.includes(bot.id));
            if (_botGrp && _botGrp.rooms && !_botGrp.rooms.find(r => r.id === currentRoom)) currentRoom = null;
        }
        const _actStart = activeCustom.start || activeCustom.startTime || '';
        const _actEnd = activeCustom.end || activeCustom.endTime || '';
        const roomStr = currentRoom ? ` in the ${ROOM_NAMES[currentRoom] || currentRoom.replace(/_/g, ' ')}` : '';
        detail = `${bot.name} is ${_humanAct}${roomStr} (${_actStart}–${_actEnd}).`;
    } else if (tod < wake) {
        const minsBeforeWake = wake - tod;
        if (minsBeforeWake <= 30) {
            activity = 'stirring awake'; currentRoom = 'bedroom';
            detail = `${bot.name} is half-awake in bed - drowsy but starting to stir.`;
        } else {
            activity = 'sleeping'; currentRoom = 'bedroom';
            detail = `${bot.name} is asleep in her bedroom.`;
        }
    } else if (tod < breakfast) {
        activity = 'morning routine'; currentRoom = 'bathroom';
        detail = `${bot.name} just woke up - doing her morning routine in the bathroom.`;
    } else if (tod < breakfast + 45) {
        activity = 'eating breakfast'; currentRoom = 'kitchen';
        detail = `${bot.name} is having breakfast in the kitchen.`;
    } else if (tod >= lunch && tod < lunch + 60) {
        activity = 'eating lunch'; currentRoom = 'kitchen';
        detail = `${bot.name} is having lunch.`;
    } else if (tod >= dinner && tod < dinner + 75) {
        activity = 'eating dinner'; currentRoom = 'dining_room';
        detail = `${bot.name} is having dinner.`;
    } else if (tod >= sleep) {
        const pastSleep = tod - sleep;
        if (pastSleep < 30) {
            activity = 'winding down for bed'; currentRoom = 'bedroom';
            detail = `${bot.name} is tired and winding down for bed - still awake and responsive but getting sleepy.`;
        } else {
            activity = 'very drowsy, almost asleep'; currentRoom = 'bedroom';
            detail = `${bot.name} is very drowsy - replies are short and groggy. She can still respond.`;
        }
    } else {
        const free = (s.activities || '').split(',').map(a => a.trim()).filter(Boolean);
        const freeList = free.length > 0 ? free : ['relaxing', 'reading', 'listening to music'];
        const _seed = (_curVday * 31 + (bot.id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % freeList.length;
        activity = _humanName(freeList[_seed]);
        currentRoom = 'living_room';
        detail = `${bot.name} has free time and is ${activity} in the living room.`;
    }

    // Build today's full schedule as a readable numbered list
    const _todayList = customs.length > 0
        ? '\n[TODAY\'S FULL SCHEDULE]:\n' + customs.map(a => {
            const st = a.start || a.startTime || '?';
            const en = a.end || a.endTime || '?';
            const rm = a.room ? ` (${ROOM_NAMES[a.room] || a.room})` : '';
            return `  ${st}–${en}: ${_humanName(a.name)}${rm}`;
        }).join('\n')
        : '';

    // Awareness filter note
    let awarenessNote = '';
    if (isPregnant && !knowsPregnant) {
        awarenessNote = '\n[PREGNANCY AWARENESS]: She does NOT yet know she is pregnant. She must NOT reference pregnancy, prenatal care, or baby-related thoughts.';
    } else if (isPregnant && knowsPregnant) {
        awarenessNote = '\n[PREGNANCY AWARENESS]: She knows she is pregnant and can reference it naturally.';
    }

    const roomNote = currentRoom ? `\n[Current room]: ${ROOM_NAMES[currentRoom] || currentRoom}` : '';

    // Active states
    const _activeStateIds = bot.states || [];
    const _activeStateLabels = _activeStateIds.map(id => {
        const st = typeof ALL_STATES !== 'undefined' ? ALL_STATES.find(x => x.id === id) : null;
        return st ? st.icon + ' ' + st.label : null;
    }).filter(Boolean);
    const _stateNote = _activeStateLabels.length > 0
        ? '\n[ACTIVE STATES]: ' + _activeStateLabels.join(', ') + ' - these actively affect her mood, body, and behavior right now.'
        : '';

    const _ctxResult =
        `[SCHEDULE - MUST FOLLOW - ${timeStr}]:
[ACTIVITY]: ${activity}
\u26A1 RIGHT NOW: ${detail}${roomNote}${_todayList}
[RULE]: This is her REAL daily routine. She is PHYSICALLY doing this activity at this moment. If asked "what are you doing?" or "where are you?", she MUST answer based on the above - never invent a different activity. She lives by this schedule and references it naturally without announcing the time.${awarenessNote}${_stateNote}`;

    bot._schedCtxCache = { text: _ctxResult, msgCount: _totalMsgCount, tod: tod, vday: _curVday };
    return _ctxResult;
}

async function fetchScheduleContextCompound(bot, userMsg) {
    if (!bot.schedule) return;
    const keys = getGroqKeys();
    if (!keys.length) return;

    const s = bot.schedule;
    const timeStr = minutesToTimeStr(getTimeOfDay(bot));
    const recentHistory = bot.history.slice(-6).map(m =>
        (m.role === 'user' ? 'User' : bot.name) + ': ' + m.content.replace(/EMOTION::.*/g, '').replace(/<[^>]+>/g, '').trim().substring(0, 120)
    ).join('\n');
    const freeActivities = s.activities || 'unspecified';
    const customActsNote = (s.customActivities && s.customActivities.length > 0)
        ? '\n  Custom scheduled: ' + s.customActivities.map(a => `${a.name} (${a.start || a.startTime || ''}–${a.end || a.endTime || ''})`).join(', ')
        : '';

    try {
        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
                model: GROQ_COMPOUND_MODEL,
                messages: [{
                    role: 'user',
                    content: `You are a story context engine. Based on the character's daily schedule and recent chat history, determine exactly what "${bot.name}" is doing RIGHT NOW and write a vivid 2-sentence context note for the character.

Current story time: ${timeStr}
Daily schedule:
  Wake up: ${s.wake}
  Breakfast: ${s.breakfast}
  Lunch: ${s.lunch}
  Dinner: ${s.dinner}
  Bedtime: ${s.sleep}
  Free time activities: ${freeActivities}${customActsNote}

Recent chat:
${recentHistory}

New user message: "${userMsg.substring(0, 150)}"

Write ONLY a short, vivid 2-sentence note about what ${bot.name} is doing at ${timeStr} that fits the schedule and chat context. Be specific. Example: "It is 13:20. Mia is finishing her lunch, chopsticks still in hand, a half-eaten bowl of noodles on the table in front of her." Return ONLY the 2 sentences, no extra text.`
                }],
                max_tokens: 80,
                temperature: 0.7
            })
        });
        const data = await res.json();
        const detail = (data.choices?.[0]?.message?.content || '').trim();
        if (!detail) return;
        const ctxText = `[Current Time & Daily Routine - ${timeStr}]:
- ${detail}
[SCHEDULE NOTE]: This is her ACTUAL daily routine - she lives by this schedule. Her current activity shapes what she's doing right now, her energy, her mood, and what she might naturally reference. She follows this schedule realistically unless interrupted by a compelling reason. Do NOT announce the time unprompted, but let her current activity be evident in her actions and words.`;

        const _grpForBotC = (typeof groups !== 'undefined') ? groups.find(g => g.memberIds && g.memberIds.includes(bot.id)) : null;
        const _grpMsgCountC = _grpForBotC ? (_grpForBotC.history || []).filter(m => m.speakerId === bot.id || m.role === 'user').length : 0;
        const _totalMsgCountC = (bot.history || []).length + _grpMsgCountC;
        bot._schedCtxCache = { text: ctxText, msgCount: _totalMsgCountC };
    } catch (e) { }
}


// Returns the target time-of-day in minutes when a "morning" skip is requested
const CYCLE_LENGTH = 14;

function openScreen(id) {
    document.getElementById(id).classList.add('active');
    if (id !== 'sc-chat') document.getElementById('sc-home').classList.add('off');
    history.pushState({ screen: id }, '', location.pathname + '#' + id);
    if (id === 'sc-create') {
        refreshPersonaDropdown();
        initPersonalityTags();
        const hasName = (document.getElementById('bot-name')?.value || '').trim();
        if (!hasName) initAppTags('');
    }
    if (id === 'sc-create-persona') {
        renderSavedPersonas();
    }
    if (id === 'sc-chat') {
        const bot = bots.find(b => b.id === curId);
        if (bot) {
            renderVirtualDateBadge(bot);
            const menuBgToggle = document.getElementById('menu-bg-toggle');
            if (menuBgToggle) menuBgToggle.checked = !!(bot.useBg || localStorage.getItem('grace_global_bg') === 'true');
            const lifeEventsToggle = document.getElementById('life-events-toggle');
            if (lifeEventsToggle) lifeEventsToggle.checked = safeGetItem('grace_life_events') === '1';
            renderVirtualClockBadge(bot);
            initScrollBottomBtn();
            checkBirthButton(bot);
            if (bot.history.length === 0) {
                triggerFirstGreeting(bot);
            } else {
                // Time advancement handled by estimateTimePassed() per turn
                // Do nothing on chat open
            }
        }
    }
}

function closeScreen(id) {
    document.getElementById(id).classList.remove('active');
    document.getElementById('sc-home').classList.remove('off');
}

// ── ANDROID BACK BUTTON - ROBUST WEBVIEW FIX ──
// Root cause: pushState('') is a no-op in Android WebView → canGoBack()=false → app exits.
// Fix: always push a real URL fragment (#app). Re-push FIRST in popstate so the stack
// never drains. For actual exit, drain with history.go(-99) to unblock the wrapper.

var _APP_URL = location.pathname + location.search + '#app';

function _pushAppState() {
    history.pushState({ _grace: Date.now() }, '', _APP_URL);
}

window._confirmExit = function () {
    document.getElementById('exit-confirm-overlay').style.display = 'none';
    // Drain the history stack so Android WebView's canGoBack() returns false
    // → the APK wrapper calls Activity.finish() and exits cleanly.
    history.go(-99);
};

window.addEventListener('popstate', function (e) {
    // ★ Re-push IMMEDIATELY at the top - before any logic.
    // This ensures canGoBack() is always true from the WebView's perspective,
    // no matter what we do below. Without this, the stack drains and Android exits.
    _pushAppState();

    function _isVis(id) {
        const el = document.getElementById(id);
        if (!el) return false;
        if (el.classList.contains('open')) return true;
        const d = el.style.display;
        return d === 'flex' || d === 'block';
    }
    function _hide(id) {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.classList.remove('open'); }
    }

    if (_isVis('exit-confirm-overlay')) { document.getElementById('exit-confirm-overlay').style.display = 'none'; return; }
    if (_isVis('img-zoom-overlay')) { _hide('img-zoom-overlay'); return; }
    if (_isVis('folder-modal-overlay')) { if (typeof closeFolderModal === 'function') closeFolderModal(); else _hide('folder-modal-overlay'); return; }
    if (_isVis('card-ctx-overlay')) { if (typeof closeCardCtx === 'function') closeCardCtx(); else _hide('card-ctx-overlay'); return; }
    if (_isVis('grp-ctx-overlay')) { if (typeof closeGrpCtx === 'function') closeGrpCtx(); else _hide('grp-ctx-overlay'); return; }
    if (_isVis('chat-settings-menu')) { if (typeof closeChatSettings === 'function') closeChatSettings(); return; }
    if (_isVis('grp-settings-menu')) { const m = document.getElementById('grp-settings-menu'); if (m) { m.classList.remove('open'); } const ov = document.getElementById('grp-settings-overlay'); if (ov) ov.classList.remove('open'); return; }
    if (_isVis('add-member-modal')) { _hide('add-member-modal'); return; }
    if (_isVis('week-calendar-popup')) { _hide('week-calendar-popup'); return; }
    if (_isVis('body-meas-modal')) { _hide('body-meas-modal'); return; }
    if (_isVis('trait-picker-overlay')) { if (typeof closeTraitPicker === 'function') closeTraitPicker(); else _hide('trait-picker-overlay'); return; }
    if (_isVis('persona-trait-picker-overlay')) { if (typeof closePersonaTraitPicker === 'function') closePersonaTraitPicker(); else _hide('persona-trait-picker-overlay'); return; }
    if (_isVis('pw-overlay')) { if (typeof closePwOverlay === 'function') closePwOverlay(); else _hide('pw-overlay'); return; }
    const grpMemberDD = document.getElementById('grp-member-list-dropdown');
    if (grpMemberDD && grpMemberDD.style.display !== 'none' && grpMemberDD.style.display !== '') { grpMemberDD.style.display = 'none'; return; }
    if (_isVis('grp-bio-modal')) { _hide('grp-bio-modal'); return; }
    if (_isVis('bio-modal')) { _hide('bio-modal'); return; }
    if (_isVis('hint-overlay')) { _hide('hint-overlay'); return; }
    if (_isVis('grp-hint-overlay')) { _hide('grp-hint-overlay'); return; }
    if (_isVis('persona-quick-overlay')) { _hide('persona-quick-overlay'); return; }
    if (_isVis('grp-persona-quick-overlay')) { _hide('grp-persona-quick-overlay'); return; }
    if (_isVis('thought-overlay')) { _hide('thought-overlay'); return; }
    if (_isVis('model-picker')) { document.getElementById('model-picker').style.display = 'none'; return; }

    const screens = ['sc-settings', 'sc-group-create', 'sc-group-chat', 'sc-hidden', 'sc-create', 'sc-create-persona', 'sc-chat'];
    for (const sid of screens) {
        const el = document.getElementById(sid);
        if (el && el.classList.contains('active')) {
            if (sid === 'sc-chat') closeChat();
            else if (sid === 'sc-group-chat') closeGroupChat();
            else if (sid === 'sc-hidden') closeHiddenScreen();
            else closeScreen(sid);
            return;
        }
    }

    // On home screen - nothing open. Show exit confirm dialog.
    const overlay = document.getElementById('exit-confirm-overlay');
    if (overlay) overlay.style.display = 'flex';
});


function openChat(id) {
    try {
        // Close any open bio modal before opening chat
        const bioModal = document.getElementById('bio-modal');
        if (bioModal) bioModal.style.display = 'none';
        const grpBioModal = document.getElementById('grp-bio-modal');
        if (grpBioModal) grpBioModal.style.display = 'none';

        curId = id;
        curGroupId = null; // Clear group context when entering solo chat
        const bot = bots.find(b => b.id === id);
        bot.lastChatted = Date.now();
        // Strip Always Overdue / Always Multiples if bot has Parasite Host
        stripParasiteConflictTraits(bot);
        _sessionTokens = { prompt: 0, completion: 0 };
        const tb = document.getElementById('session-token-badge');
        if (tb) tb.textContent = '';
        const tbRow = document.getElementById('solo-token-menu-row');
        if (tbRow) tbRow.style.display = 'none';
        // Always show bot name in c-name element
        const cNameEl = document.getElementById('c-name');
        cNameEl.innerText = bot.name;
        cNameEl.style.fontSize = '19px';
        cNameEl.style.fontWeight = 'bold';
        cNameEl.style.opacity = '1';

        // Show location in location badge (not bot name - that's already in c-name)
        const locBadge = document.getElementById('chat-location-badge');
        if (locBadge) {
            if (bot._cachedLocation) {
                locBadge.textContent = '\uD83D\uDCCD ' + bot._cachedLocation;
                locBadge.style.display = 'block';
            } else {
                locBadge.style.display = 'none';
            }
            if (!bot._cachedLocation && !bot.context && bot.history && bot.history.length >= 4) {
                detectAndUpdateLocation(bot, false);
            }
        }
        updateModelBadge();
        openScreen('sc-chat');
        const chatContainer = document.getElementById('chat-container');
        const scChat = document.getElementById('sc-chat');
        const globalBg = localStorage.getItem('grace_global_bg') === 'true';
        if (bot.portraitUrl && (bot.useBg || globalBg)) {
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
        renderChat();

        renderVirtualDateBadge(bot);
        const menuBgToggle = document.getElementById('menu-bg-toggle');
        if (menuBgToggle) menuBgToggle.checked = !!(bot.useBg || localStorage.getItem('grace_global_bg') === 'true');
        const lifeEventsToggle = document.getElementById('life-events-toggle');
        if (lifeEventsToggle) lifeEventsToggle.checked = safeGetItem('grace_life_events') === '1';
        renderVirtualClockBadge(bot);
        initScrollBottomBtn();
        checkBirthButton(bot);
        // triggerFirstGreeting is called in openScreen when history is empty
    } catch (e) { console.error('openChat error:', e); alert('Error opening chat: ' + e.message); }
}

// advanceTimeOnChatOpen DISABLED - time advancement is handled by estimateTimePassed() per turn
// Kept as empty stub for compatibility
async function advanceTimeOnChatOpen(bot) {
    // Time advancement now handled in estimateTimePassed() after each message turn
    // This prevents duplicate API calls
    return;
}

async function triggerFirstGreeting(bot) {
    if (!getGroqKeys().length) return;
    const aiLang = getLang();
    if (bot.context) { showContextBubble(bot.context); }
    showTypingIndicator(bot);
    // ... (rest of the code remains the same)
    const ageInfo = bot.age ? `Age: ${bot.age}. ` : '';
    const careerInfo = bot.career ? `Occupation: ${bot.career}. ` : '';
    const eraInfo = (bot.year || bot.country) ? `Setting: ${[bot.year, bot.country].filter(Boolean).join(', ')}. The story takes place in this era/location - all details (technology, culture, language, customs, clothing) must match this setting logically. ` : '';
    const relationNow = getDynField(bot, 'relation');
    const relInfo = relationNow ? `Your relationship with the user: ${relationNow}. Address and treat them accordingly. ` : '';
    const relGuide = buildRelationshipGuidance(relationNow);
    const activePersona = bot.personaId ? personas.find(p => p.id === bot.personaId) : null;
    const userGender = activePersona?.gender || '';
    const userPronounInfo = userGender
        ? `The user's gender is ${userGender} - use correct pronouns (${userGender.toLowerCase().includes('female') || userGender.toLowerCase().includes('woman') || userGender.toLowerCase().includes('girl') ? 'she/her' : userGender.toLowerCase().includes('male') || userGender.toLowerCase().includes('man') || userGender.toLowerCase().includes('boy') ? 'he/him' : 'they/them'}) when referring to them in narration. `
        : `IMPORTANT: You do not know the user's gender. NEVER use "he/him/his" or "she/her/hers" to refer to the user in narration - use "you/your" only. `;
    const sys = `You are ${bot.name} (${bot.gender}). ${ageInfo}${careerInfo}${eraInfo}${relInfo}${userPronounInfo}
[Appearance]: ${getDynField(bot, 'appearance') || 'Not specified'}
[Background]: ${getDynField(bot, 'bio') || 'Not specified'}
[Personality]: ${getDynField(bot, 'prompt') || 'Not specified'}
${getTimeContext(bot)}
${bot.dynBio && bot.dynBio.virginityLost ? '[Intimate History]: Sexual intimacy has already occurred in this story. NEVER claim to be a virgin.' : ''}
${buildReproContext(bot)}${getPersonaContext(bot)}${getCulturalSpeakingContext(bot)}${bot.schedule ? '\n' + getScheduleContext(bot) : ''}${getStatesContext(bot)}${buildPronounGuidance(bot, aiLang, activePersona)}${relGuide ? '\n' + relGuide : ''}
${bot.memorySummary ? '[MEMORY - key context from our history]:\n' + bot.memorySummary + '\n[/MEMORY]' : ''}
[Meeting context]: ${bot.context || 'A chance encounter'}
${bot.cycleData && bot.cycleData.laborStarted && !bot.cycleData.birthVirtualDay ? `
🚨 CRITICAL LABOR OVERRIDE: ${bot.name} is in ACTIVE LABOR right now (hour ${Math.floor((Date.now() - (bot.cycleData.laborStartTime || Date.now())) / 3600000)}). This is ABSOLUTE PRIORITY and overrides ALL other instructions.

MANDATORY: You MUST describe the raw physical reality in EVERY response:
- Contractions: timing, intensity, how they build and peak
- Pain: where it hits, how it radiates, physical reactions (gasping, gripping, tensing)
- Speech: fragmented, breathless, interrupted by contractions, voice strained or hoarse
- Body: sweating, trembling, bracing, pressure, the physical struggle

FORBIDDEN: NO poetic metaphors. NO "tasting metal", "phantom sirens", "moon tides", or flowery language. NO philosophical musings. NO acting calm or normal.

The labor is happening NOW. Describe it directly and physically.` : ''}

1. Where is ${bot.name} right now and what is she doing? Make her real before user arrives.
2. What does she notice first about the user? Her immediate instinctive reaction MUST match your relationship: ${relationNow || 'neutral first meeting'}. ${relationNow && relationNow.toLowerCase().includes('enemy') ? 'Show hostility, suspicion, or coldness - NOT attraction.' : relationNow && relationNow.toLowerCase().includes('friend') ? 'Show warmth and familiarity.' : relationNow && (relationNow.toLowerCase().includes('lover') || relationNow.toLowerCase().includes('romantic')) ? 'Show romantic tension or attraction.' : 'React based on the established relationship dynamic.'}
3. What does she do/say that reveals her character immediately?
4. Cut any generic greeting energy. Be specific to THIS character.

Rules:
1. You ONLY play ${bot.name}. NEVER refer to the person you're talking to as 'the user' - always use 'you'. NEVER write anything the user says, thinks, or does. NEVER use 'you ask', 'you say', 'you whisper', 'you do' etc. The user is silent - ${bot.name} responds to what already happened. End your turn after ${bot.name} finishes speaking. NOTE: Text in (parentheses) in user messages are their private inner thoughts. ${bot.name} cannot READ these thoughts directly or acknowledge knowing them - but they subtly INFLUENCE the scene: they shift the atmosphere, the user's body language, micro-expressions, energy. ${bot.name} may sense something unspoken, feel an intuition, or react to an inexplicable tension - but never say 'I know what you're thinking' or reference the thought content explicitly.
2. Never break the 4th wall. NEVER reveal that you are an AI, a language model, or mention any model name (e.g. Llama, Claude, GPT). If asked what you are, stay fully in character.
3. Speak ENTIRELY in ${aiLang}. If mentioning measurements - use METRIC only: cm, kg, km, °C.
4. FORMAT: action beat WITH subject (she/her). "Words she says aloud." action beat. "More words." - alternate throughout. No asterisks, no italic tags.
   ✅ Example: She glances up, surprised. "Oh - I didn't hear you come in." Her pulse quickens slightly. "Can I help you?"
5. This is your OPENING LINE - greet the user naturally based on the meeting context. Be vivid and immersive.
7. MANDATORY: subject+action. "line." emotion beat. "line." subject+action. "line." - at least 3 dialogue lines, ${getReplyWordTarget()}, end on dialogue.
   ⚠️ "double quotes" = ONLY actual words spoken out loud. NEVER put physical actions inside quotes. NEVER write action beats without a subject pronoun (she/her/I).
   ⚠️ NEVER write beats like "Steps closer." "Turns away." "Eyes drop." - these have NO SUBJECT and read flat. Always: "She steps closer." "She turns away." "Her eyes drop."
⚠️ CRITICAL: She must speak at least 3 lines from the very start.
`;
    try {
        const data = await fetchGroqChat([{ role: "system", content: sys }, { role: "user", content: "[Start the scene]" }], 450);
        let reply = data.choices?.[0]?.message?.content || '';
        reply = reply.replace(/EMOTION::[\s\S]*/, '').trim(); reply = cleanReply(reply);
        if (!reply || !reply.trim()) {
            reply = `She glances up as you enter, her expression settling into something measured. "You're here." A brief pause follows. "What do you want?"`;
        }
        bot.history.push({ role: 'assistant', content: reply, msgId: Date.now().toString() });
        bot.lastChatted = Date.now();
        saveBots();
        renderChat(true);
    } catch (e) { logError('triggerFirstGreeting error', e.message); }
    hideTypingIndicator();
}

function showContextBubble(contextText) {
    const container = document.getElementById('chat-container');
    const bubble = document.createElement('div');
    bubble.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 1px solid #0f3460;
        border-radius: 12px;
        padding: 12px 16px;
        margin: 0 10px 20px 10px;
        font-size: 12px;
        color: #a8b8d8;
        font-style: italic;
        text-align: center;
        line-height: 1.5;
    `;
    const shortContext = contextText.length > 160 ? contextText.substring(0, 157) + '...' : contextText; bubble.innerHTML = `<span style="color:#4a9eff;font-size:11px;font-weight:bold;display:block;margin-bottom:4px;letter-spacing:1px">📍 SCENE</span>${shortContext}`;
    container.appendChild(bubble);
}

async function detectAndUpdateLocation(chatObj, isGroup) {
    const keys = typeof getGroqKeys === 'function' ? getGroqKeys() : [];
    if (!keys.length) return;

    const history = chatObj.history;
    if (!history || history.length < 2) return;

    // ── SOLO: fast keyword-based room mapping from the latest bot reply ──────
    // Run before AI call - catches the majority of moves instantly (no API needed).
    if (!isGroup) {
        const bot = chatObj;
        const cd = bot.cycleData;
        // Never move a bot who is in active labor
        if (cd && cd.laborStarted && !cd.birthVirtualDay) return;

        const lastBotMsg = history.slice().reverse().find(m => m.role === 'assistant');
        const lastUserMsg = history.slice().reverse().find(m => m.role === 'user');
        const combined = [
            (lastUserMsg?.content || '').replace(/EMOTION::.*/g, '').toLowerCase(),
            (lastBotMsg?.content || '').replace(/EMOTION::.*/g, '').toLowerCase(),
        ].join(' ');

        // Only update room automatically when text implies actual movement/position change.
        // This prevents false positives like "talking about the nursery" from changing location.
        const hasMoveIntent = /\b(go|going|went|come|coming|arrive|arrived|enter|entered|walk|walked|head(?:ing)?\s+to|move|moved|step(?:ped)?\s+into|in\s+the|inside|at\s+the|to\s+the|leave|left|back\s+to|return(?:ed)?\s+to)\b/i.test(combined);
        const hasTopicOnlyCue = /\b(nursery|kitchen|bathroom|bedroom|living room|study|office|garden)\b.{0,30}\b(color|paint|prepare|planning|plan|decorate|decor|idea|theme|room)\b/i.test(combined);

        // Room keyword map - ordered by specificity (more specific first)
        const ROOM_MAP = [
            // Bathroom / toilet
            { room: 'bathroom', kws: ['shower', 'bath', 'washing up', 'brush.*teeth', 'toilet', 'rinse off', 'freshen up', 'scrub', 'soak in', 'washroom', 'powder room', 'into the bath'] },
            // Kitchen / cooking
            { room: 'kitchen', kws: ['kitchen', 'cook', 'cooking', 'making.*food', 'making.*coffee', 'boiling', 'frying', 'baking', 'dish.*wash', 'stove', 'refrigerator', 'fridge', 'pour.*drink'] },
            // Bedroom
            { room: 'bedroom', kws: ['bed', 'bedroom', 'lying down', 'lie.*down', 'fall.*asleep', 'going to sleep', 'going to bed', 'nap', 'wake.*up', 'under the sheets', 'under.*covers', 'pillow', 'mattress'] },
            // Living room
            { room: 'living room', kws: ['sofa', 'couch', 'living room', 'tv', 'television', 'coffee table', 'armchair', 'sitting room', 'lounge', 'watching.*together'] },
            // Gym / exercise
            { room: 'gym', kws: ['gym', 'workout', 'exercise', 'lifting weights', 'treadmill', 'training', 'stretching.*gym', 'yoga', 'pilates', 'push.?up', 'sit.?up', 'dumbbell'] },
            // Dining room
            { room: 'dining room', kws: ['dining room', 'dinner table', 'eating together', 'set.*table', 'sit.*down to eat', 'dinner is ready', 'breakfast is ready', 'lunch is ready'] },
            // Garden / outside
            { room: 'garden', kws: ['garden', 'backyard', 'outside', 'porch', 'balcony', 'terrace', 'yard', 'fresh air', 'sunlight', 'outdoors', 'outdoor', 'back.*door', 'front.*door.*step'] },
            // Study / office
            { room: 'study', kws: ['study', 'office', 'desk', 'working from home', 'laptop', 'reading.*desk', 'bookshelf', 'writing.*desk'] },
            // Nursery
            { room: 'nursery', kws: ['nursery', 'baby.*room', 'crib', 'cradle', 'feeding.*baby', 'putting.*baby.*down'] },
        ];

        for (const { room, kws } of ROOM_MAP) {
            for (const kw of kws) {
                const re = new RegExp(kw, 'i');
                if (re.test(combined)) {
                    // If there's no movement/position cue, treat this as topical mention.
                    // Keep current location stable unless we don't have one yet.
                    if (!hasMoveIntent && (chatObj._cachedLocation || hasTopicOnlyCue)) {
                        continue;
                    }
                    if (chatObj._cachedLocation !== room) {
                        chatObj._cachedLocation = room;
                        saveBots();
                        const badge = document.getElementById('chat-location-badge');
                        if (badge) { badge.textContent = '\uD83D\uDCCD ' + room; badge.style.display = 'block'; }
                    }
                    return; // matched - no AI call needed
                }
            }
        }
        // No keyword match - fall through to AI detection for subtle moves
    }

    // ── AI-based detection (for subtle / narrative movement, and group chats) ─
    const recentMsgs = history.slice(-8);   // reduced from 10 - faster
    let histText;
    if (isGroup) {
        const grp = chatObj;
        const memberMap = {};
        (grp.memberIds || []).forEach(id => { const b = bots.find(b2 => b2.id === id); if (b) memberMap[id] = b; });
        histText = recentMsgs.map(m => {
            if (m.role === 'user') return 'User: ' + (m.content || '').substring(0, 120);
            const spk = memberMap[m.speakerId];
            return (spk ? spk.name : 'Character') + ': ' + (m.content || '').replace(/EMOTION::.*/g, '').substring(0, 120);
        }).join('\n');
    } else {
        const bot = chatObj;
        histText = recentMsgs.map(m =>
            (m.role === 'user' ? 'User' : bot.name) + ': ' + (m.content || '').replace(/EMOTION::.*/g, '').substring(0, 120)
        ).join('\n');
    }
    const prevLocation = chatObj._cachedLocation || null;
    const isFirstDetection = !prevLocation;

    let conditionNote = '';
    if (!isGroup) {
        const bot = chatObj;
        const cd = bot.cycleData;
        if (cd && cd.pregnant) {
            const pregWeeks = typeof getPregnancyWeek === 'function' ? getPregnancyWeek(bot) : 0;
            if (pregWeeks >= 36) conditionNote = `\nNOTE: Character is heavily pregnant (${pregWeeks} weeks) - moves slowly but CAN walk to nearby rooms.`;
            else if (pregWeeks > 0) conditionNote = `\nNOTE: Character is pregnant (${pregWeeks} weeks) - can move freely.`;
        }
    }

    // Richer prompt: include activity examples for better inference
    const locationPrompt = isFirstDetection
        ? `Conversation:\n${histText}\n\nWhere is this scene taking place? Return ONLY 1-4 words (e.g. "living room", "bathroom", "kitchen", "bedroom", "garden", "gym", "café", "park"). If truly unknown: unknown`
        : `Current location: "${prevLocation}"${conditionNote}\n\nConversation:\n${histText}\n\nDid the characters PHYSICALLY move or start an activity in a different room? Consider actions like showering→bathroom, cooking→kitchen, sleeping→bedroom, exercising→gym.\nIf clearly moved: return the new location in 1-4 words.\nIf same or unclear: return exactly: same`;

    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${keys[0]}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_FAST_MODEL,
                max_tokens: 20,
                temperature: 0.0,
                messages: [{ role: 'user', content: locationPrompt }]
            }),
            signal: AbortSignal.timeout(8000)
        });
        const data = await res.json();
        const raw = (data.choices?.[0]?.message?.content || '').trim().replace(/[."'*]/g, '').toLowerCase();
        if (!raw || raw.length < 2 || raw === 'same' || raw.startsWith('same') || raw === 'unknown') {
            if (prevLocation) {
                const badgeId = isGroup ? 'grp-location-badge' : 'chat-location-badge';
                const badge = document.getElementById(badgeId);
                if (badge) { badge.textContent = '\uD83D\uDCCD ' + prevLocation; badge.style.display = 'block'; }
            }
            return;
        }
        const loc = raw.substring(0, 30);
        chatObj._cachedLocation = loc;
        if (isGroup) {
            saveGroups();
            const badge = document.getElementById('grp-location-badge');
            if (badge) { badge.textContent = '\uD83D\uDCCD ' + loc; badge.style.display = 'block'; }
        } else {
            saveBots();
            const badge = document.getElementById('chat-location-badge');
            if (badge) { badge.textContent = '\uD83D\uDCCD ' + loc; badge.style.display = 'block'; }
        }
    } catch (e) { }
}

function closeChat() {
    const scChatClose = document.getElementById('sc-chat');
    if (scChatClose) {
        scChatClose.classList.remove('has-bg'); scChatClose.style.backgroundImage = '';

    }
    closeScreen('sc-chat');
    curId = null;
    document.getElementById('emo-badge').style.display = 'none';
    const bw = document.getElementById('birth-btn-wrap');
    if (bw) bw.style.display = 'none';
    renderBotList(); // re-sort with updated lastChatted
}

function clearChatHistory() {
    if (!curId) return;
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    if (!confirm('Clear all chat history with ' + bot.name + '?\n\n\u26A0\uFE0F Cycle / pregnancy data, dynamic bio changes, and virtual time will also be fully reset.')) return;

    bot.history = [];

    bot.memorySummary = null;
    bot.lastSummaryAt = 0;
    bot.kickData = null;
    bot.lastSummaryCutoff = 0;

    bot.virtualDay = 0;
    bot.virtualMinutes = 540; // 9:00 AM
    bot.ageStartDay = 0;      // reset age reference point

    bot.cycleData = null;
    initCycleData(bot); // Re-init cycle (random start day)

    if (bot.currentEmotion !== undefined) bot.currentEmotion = null;
    if (bot.emotionState !== undefined) bot.emotionState = null;

    bot.dynBio = {};

    // Restore first data if available
    restoreFirstData(bot);

    // Reset persona lock so user can repick after clearing chat
    bot.personaLocked = false;

    saveBots();
    document.getElementById('chat-container').innerHTML = '';

    triggerFirstGreeting(bot);
}

function saveFirstData(bot) {
    // Capture current state as the "first data" baseline
    bot.firstData = {
        appearance: bot.appearance,
        age: bot.age,
        gender: bot.gender,
        career: bot.career,
        year: bot.year,
        country: bot.country,
        bio: bot.bio,
        prompt: bot.prompt,
        relation: bot.relation,
        dynBio: JSON.parse(JSON.stringify(bot.dynBio || {})),
        schedule: bot.schedule ? JSON.parse(JSON.stringify(bot.schedule)) : null,
        personaId: bot.personaId,
        // Body measurements
        height: bot.height,
        weight: bot.weight,
        bust: bot.bust,
        waist: bot.waist,
        hips: bot.hips,
        // States
        states: bot.states ? [...bot.states] : [],
        // Cycle/repro data (capture initial pregnancy/cycle state)
        cycleData: bot.cycleData ? JSON.parse(JSON.stringify(bot.cycleData)) : null
    };
    console.log('[First Data] Saved initial state for', bot.name);
}

function restoreFirstData(bot) {
    if (!bot.firstData) {
        console.log('[First Data] No saved first data for', bot.name);
        return;
    }
    const fd = bot.firstData;
    // Restore core attributes
    if (fd.appearance !== undefined) bot.appearance = fd.appearance;
    if (fd.age !== undefined) bot.age = fd.age;
    if (fd.gender !== undefined) bot.gender = fd.gender;
    if (fd.career !== undefined) bot.career = fd.career;
    if (fd.year !== undefined) bot.year = fd.year;
    if (fd.country !== undefined) bot.country = fd.country;
    if (fd.bio !== undefined) bot.bio = fd.bio;
    if (fd.prompt !== undefined) bot.prompt = fd.prompt;
    if (fd.relation !== undefined) bot.relation = fd.relation;
    if (fd.dynBio !== undefined) bot.dynBio = JSON.parse(JSON.stringify(fd.dynBio));
    if (fd.schedule !== undefined) bot.schedule = fd.schedule ? JSON.parse(JSON.stringify(fd.schedule)) : null;
    if (fd.personaId !== undefined) bot.personaId = fd.personaId;
    // Restore body measurements
    if (fd.height !== undefined) bot.height = fd.height;
    if (fd.weight !== undefined) bot.weight = fd.weight;
    if (fd.bust !== undefined) bot.bust = fd.bust;
    if (fd.waist !== undefined) bot.waist = fd.waist;
    if (fd.hips !== undefined) bot.hips = fd.hips;
    // Restore states
    if (fd.states !== undefined) bot.states = [...fd.states];
    // Restore cycle/repro data (completely reset to first state)
    if (fd.cycleData !== undefined) {
        bot.cycleData = fd.cycleData ? JSON.parse(JSON.stringify(fd.cycleData)) : null;
    }
    console.log('[First Data] Restored initial state for', bot.name);
}

async function rollContext(btn) {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    diceSpin(btn);
    setDiceLoading(btn, true);
    const gender = document.getElementById('bot-gender').value;
    const name = document.getElementById('bot-name').value || gender + ' character';
    const personality = document.getElementById('bot-prompt').value || '';
    const lang = getLang();

    const categories = [
        'an unexpected workplace or professional situation',
        'a late-night urban setting (bar, rooftop, subway, 24h diner)',
        'a travel or transit scenario (airport, train, foreign city)',
        'an outdoor or nature setting (hiking trail, beach, park at dusk)',
        'a tense or dramatic circumstance (accident, argument nearby, storm)',
        'a quirky or unusual situation (wrong door, mix-up, power outage)',
        'a domestic or neighborhood scenario (neighbor, building hallway, market)',
        'a creative or cultural space (gallery, bookstore, concert, festival)',
        'a health or crisis adjacent moment (hospital waiting room, pharmacy, emergency)',
        'a digital-to-physical crossover (met online, game event, fan meetup)',
        'a chance encounter in transit (bus stop, elevator, waiting room)',
        'a shared interest scenario (library, gym, hobby shop, class)',
        'a seasonal or weather-based moment (rain shelter, snow clearing, heat wave)',
        'a service interaction (café, retail, delivery, repair shop)',
        'a quiet public space (library, park bench, empty train car)',
        'a social gathering edge (party outskirts, wedding guest, event staff)',
    ];
    const pick = categories[Math.floor(Math.random() * categories.length)];

    try {
        const result = await callLlama(
            `You are a creative scene writer. Write a vivid first-meeting scenario (1 sentence only) for a ${gender} character named "${name}".
Setting category you MUST use: ${pick}.
${personality ? `Character personality hint: ${personality.substring(0, 120)}` : ''}
Rules:
- Be SPECIFIC: name a real place, time of day, one sensory detail
- Start IN the moment - no backstory
- Avoid generic openers like "You meet at a café" or "You bump into"
- English only. Exactly 1 sentence, 15-25 words.`,
            'Write the meeting scenario now.'
        );
        document.getElementById('bot-context').value = result;
    } catch (e) {
        logError('rollContext failed', e.message);
    }
    setDiceLoading(btn, false);
}

function autoResize(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
}

let _lastSendTime = 0;
const _SEND_COOLDOWN_MS = 1200; // minimum ms between sends

function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const now = Date.now();
        if (now - _lastSendTime < _SEND_COOLDOWN_MS) return; // block rapid-fire
        _lastSendTime = now;
        sendMsg();
    }
}

function insertActionStar() {
    const inp = document.getElementById('msg-input');
    const start = inp.selectionStart;
    const end = inp.selectionEnd;
    const text = inp.value;
    if (start === end) {
        inp.value = text.substring(0, start) + "**" + text.substring(end);
        inp.focus();
        inp.selectionStart = inp.selectionEnd = start + 1;
    } else {
        const selectedText = text.substring(start, end);
        inp.value = text.substring(0, start) + "*" + selectedText + "*" + text.substring(end);
        inp.focus();
        inp.selectionStart = inp.selectionEnd = end + 2;
    }
    autoResize(inp);
}

function insertThought() {
    const inp = document.getElementById('msg-input');
    const start = inp.selectionStart;
    const end = inp.selectionEnd;
    const text = inp.value;
    if (start === end) {
        inp.value = text.substring(0, start) + "()" + text.substring(end);
        inp.focus();
        inp.selectionStart = inp.selectionEnd = start + 1;
    } else {
        const selected = text.substring(start, end);
        inp.value = text.substring(0, start) + "(" + selected + ")" + text.substring(end);
        inp.focus();
        inp.selectionStart = inp.selectionEnd = end + 2;
    }
    autoResize(inp);
}

function renderFetusesInBio(bot) {
    const badge = document.getElementById('fetus-count-badge');
    const infoEl = document.getElementById('pw-fetus-info');

    const cd = bot.cycleData;
    if (!cd || !cd.pregnant || !cd.fetuses || cd.fetuses.length === 0) {
        if (infoEl) infoEl.style.display = 'none';
        return;
    }

    const week = getPregnancyWeek(bot) || 0;
    const fCount = cd.fetuses.length;
    const multStr = fCount === 1 ? 'Singleton' : fCount === 2 ? '\uD83D\uDC6F Twins' : fCount === 3 ? '\uD83D\uDC6F\u200D\u2640\uFE0F Triplets' : `${fCount} Multiples`;
    if (badge) badge.textContent = multStr;

    if (!infoEl) return;

    const sizeRef = getFetusSize(week);
    const milestone = getFetusMilestone(week);
    const canRevealGender = week >= 18;

    if (canRevealGender) {
        let changed = false;
        cd.fetuses.forEach(fetus => {
            if (fetus.gender === 'unknown' || !fetus.gender) {
                fetus.gender = Math.random() < 0.5 ? 'male' : 'female';
                changed = true;
            }
        });
        if (changed) saveBots();
    }

    const lines = cd.fetuses.map((fetus, i) => {
        const lengthStr = getFetusLengthStr(sizeRef.lengthCm, fCount, i);
        const weightStr = getFetusWeightStr(sizeRef.weightG, fCount, i);
        const gIcon = fetus.gender === 'male' ? '\u2642\uFE0F' : fetus.gender === 'female' ? '\u2640\uFE0F' : '\u2753';
        const gColor = getGenderColor(fetus.gender);

        const gBtns = canRevealGender
            ? `<span style="margin-left:4px">
                <button onclick="setFetusGender(${i},'male')" style="background:${fetus.gender === 'male' ? '#1e3a5f' : 'transparent'};border:1px solid #3b82f644;color:#60a5fa;border-radius:4px;padding:1px 5px;font-size:9px;cursor:pointer">\u2642</button>
                <button onclick="setFetusGender(${i},'female')" style="background:${fetus.gender === 'female' ? '#4a1a3a' : 'transparent'};border:1px solid #ec489944;color:#f472b6;border-radius:4px;padding:1px 5px;font-size:9px;cursor:pointer">\u2640</button>
               </span>`
            : `<span style="font-size:9px;color:#666;margin-left:4px">gender at wk18</span>`;

        const prefix = fCount > 1 ? `<b style="color:#a855f7">${(cd.isParasitePregnancy) ? 'Larva' : 'Baby'} ${i + 1}</b> ` : '';
        return `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
            ${prefix}<span style="color:${gColor}">${gIcon}</span>
            <span>📏 ${lengthStr}</span>
            <span>⚖️ ${weightStr}</span>
            ${gBtns}
        </div>`;
    });

    const milestoneHtml = milestone
        ? `<div style="color:#a855f7;font-style:italic;margin-top:2px;font-size:9px">${milestone}</div>`
        : '';

    infoEl.innerHTML = lines.join('') + milestoneHtml;
    infoEl.style.display = 'block';
}

function setFetusGender(idx, gender) {
    const bot = bots.find(b => b.id === curId);
    if (!bot || !bot.cycleData || !bot.cycleData.fetuses) return;
    bot.cycleData.fetuses[idx].gender = gender;
    saveBots();
    renderFetusesInBio(bot);
    const gStr = gender === 'male' ? 'Boy ♂️' : gender === 'female' ? 'Girl ♀️' : 'Unknown';
    addReproEvent(bot, `🔬 Fetus ${idx + 1} gender set: ${gStr}`);
    renderReproHealth(bot);
}

function openBodyMeasModal() {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    if (!bot.bodyMeasurements) initBodyMeasurements(bot);
    const bm = bot.bodyMeasurements;
    document.getElementById('bm-bust').value = bm.bustBase || 88;
    document.getElementById('bm-waist').value = bm.waistBase || 63;
    document.getElementById('bm-hips').value = bm.hipsBase || 90;
    document.getElementById('bm-height').value = bm.height || 165;
    document.getElementById('bm-weight').value = bm.weight || 53;
    const braEl = document.getElementById('bm-bra');
    braEl.value = bm.bra || 'B';
    document.getElementById('body-meas-modal').style.display = 'flex';
}
function closeBodyMeasModal() {
    document.getElementById('body-meas-modal').style.display = 'none';
}
function syncMeasurementsFromAppearance() {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    delete bot.bodyMeasurements;
    initBodyMeasurements(bot);
    const bm = bot.bodyMeasurements;
    document.getElementById('bm-bust').value = bm.bustBase || 88;
    document.getElementById('bm-waist').value = bm.waistBase || 63;
    document.getElementById('bm-hips').value = bm.hipsBase || 90;
    document.getElementById('bm-height').value = bm.height || 165;
    document.getElementById('bm-weight').value = bm.weight || 53;
    document.getElementById('bm-bra').value = bm.bra || 'B';
    const _syncToast = showToast('🔄 Synced from appearance: ' + bm.bra + ' cup detected', '#0a1a30', '#60a5fa');
    setTimeout(() => _syncToast.remove(), 1500);
}
function saveBodyMeasurements() {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    if (!bot.bodyMeasurements) initBodyMeasurements(bot);
    const bm = bot.bodyMeasurements;
    bm.bustBase = parseInt(document.getElementById('bm-bust').value) || 88;
    bm.waistBase = parseInt(document.getElementById('bm-waist').value) || 63;
    bm.hipsBase = parseInt(document.getElementById('bm-hips').value) || 90;
    bm.height = parseInt(document.getElementById('bm-height').value) || 165;
    bm.weight = parseFloat(document.getElementById('bm-weight').value) || 53;
    bm.bra = document.getElementById('bm-bra').value || 'B';
    bm.bustCup = bm.bra;
    bm.lastUpdatedDay = getVirtualDay(bot);
    saveBots();
    closeBodyMeasModal();
    renderBodyMeasurements(bot);
}

async function aiExtractBodyMeasurementsAuto(bot) {
    const appearance = (bot.appearance || '').trim();
    const bio = (bot.bio || '').trim();
    if (!appearance && !bio) return;
    try {
        const key = getNextGroqKey();
        if (!key) return;
        const prompt = `You are a precise body measurement estimator for anime/fiction characters.
Read the character description below and return a single JSON object with realistic measurements.

Character name: ${bot.name || 'Unknown'}
Gender: ${bot.gender || 'Female'}
Age: ${bot.age || 'unknown'}
Appearance: ${appearance.substring(0, 400)}
Bio: ${bio.substring(0, 200)}

Return ONLY this JSON (no markdown, no explanation):
{"bust":<int cm>,"waist":<int cm>,"hips":<int cm>,"height":<int cm>,"weight":<number kg>,"bra":"<AA|A|B|C|D|DD|E|F|G|H>"}

Rules: Use actual numbers if stated. Infer from body type descriptors. Anime character archetypes apply.`;
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: GROQ_GEN_MODEL, max_tokens: 120, temperature: 0.1, messages: [{ role: 'user', content: prompt }] }),
            signal: AbortSignal.timeout(20000)
        });
        const data = await res.json();
        let raw = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
        const mx = raw.match(/\{[\s\S]*\}/);
        if (!mx) return;
        const p = JSON.parse(mx[0]);
        const clampI = (v, mn, mx) => Math.min(mx, Math.max(mn, Math.round(Number(v) || mn)));
        const validCups = ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G', 'H', 'I', 'J'];
        const bra = validCups.includes(String(p.bra || '').toUpperCase()) ? String(p.bra).toUpperCase() : 'B';
        if (!bot.bodyMeasurements) bot.bodyMeasurements = {};
        const bm = bot.bodyMeasurements;
        bm.bustBase = clampI(p.bust, 60, 160);
        bm.waistBase = clampI(p.waist, 40, 120);
        bm.hipsBase = clampI(p.hips, 60, 160);
        bm.height = clampI(p.height, 130, 220);
        bm.weight = Math.min(200, Math.max(30, parseFloat(p.weight) || 53));
        bm.bra = bra;
        bm.bustCup = bra;
        bm.lastUpdatedDay = getVirtualDay(bot);
        saveBots();
        renderBodyMeasurements(bot);
    } catch (e) { }
}

async function aiExtractBodyMeasurements() {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    const keys = getGroqKeys();
    if (!keys.length) {
        const s = document.getElementById('bm-ai-status');
        s.style.display = 'block'; s.style.color = '#ef4444';
        s.textContent = '⚠️ No Groq API key - add one in Settings first.';
        return;
    }
    const appearance = (bot.appearance || getDynField(bot, 'appearance') || '').trim();
    const bio = (bot.bio || getDynField(bot, 'bio') || '').trim();
    if (!appearance && !bio) {
        const s = document.getElementById('bm-ai-status');
        s.style.display = 'block'; s.style.color = '#f59e0b';
        s.textContent = '⚠️ No appearance or bio text found to analyse.';
        return;
    }
    const btn = document.getElementById('bm-ai-btn');
    const statusEl = document.getElementById('bm-ai-status');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI is reading appearance...';
    statusEl.style.display = 'block'; statusEl.style.color = '#a855f7';
    statusEl.textContent = 'Analysing character appearance...';

    const prompt = `You are a precise body measurement estimator for anime/fiction characters.
Read the character description below and return a single JSON object with realistic measurements.

Character name: ${bot.name || 'Unknown'}
Gender: ${bot.gender || 'Female'}
Age: ${bot.age || 'unknown'}
Appearance: ${appearance.substring(0, 400)}
Bio: ${bio.substring(0, 200)}

Return ONLY this JSON (no markdown, no explanation):
{
  "bust": <integer cm, e.g. 88>,
  "waist": <integer cm, e.g. 63>,
  "hips": <integer cm, e.g. 90>,
  "height": <integer cm, e.g. 165>,
  "weight": <number kg, e.g. 53>,
  "bra": "<cup letter: AA|A|B|C|D|DD|E|F|G|H>",
  "confidence": "<low|medium|high>"
}

Rules:
- Use actual numbers mentioned in the text if any
- Infer from body type descriptors (petite, curvy, athletic, slender, busty, etc.)
- For anime characters: use typical anime proportions for their archetype
- "shy/petite" → smaller measurements; "athletic/warrior" → toned medium; "voluptuous/curvy" → larger
- confidence = "high" if numbers explicitly stated, "medium" if body type mentioned, "low" if guessing`;

    try {
        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_GEN_MODEL,
                max_tokens: 200,
                temperature: 0.1,
                messages: [{ role: 'user', content: prompt }]
            }),
            signal: AbortSignal.timeout(20000)
        });
        const data = await res.json();
        let raw = (data.choices?.[0]?.message?.content || '').trim()
            .replace(/```json|```/g, '').trim();
        const mx = raw.match(/\{[\s\S]*\}/);
        if (!mx) throw new Error('No JSON in response');
        const parsed = JSON.parse(mx[0]);

        const clampI = (v, mn, mx) => Math.min(mx, Math.max(mn, Math.round(Number(v) || mn)));
        const validCups = ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G', 'H', 'I', 'J'];
        const bra = validCups.includes(String(parsed.bra).toUpperCase()) ? String(parsed.bra).toUpperCase() : 'B';

        document.getElementById('bm-bust').value = clampI(parsed.bust, 60, 160);
        document.getElementById('bm-waist').value = clampI(parsed.waist, 40, 120);
        document.getElementById('bm-hips').value = clampI(parsed.hips, 60, 160);
        document.getElementById('bm-height').value = clampI(parsed.height, 130, 220);
        document.getElementById('bm-weight').value = Math.min(200, Math.max(30, parseFloat(parsed.weight) || 53)).toFixed(1);
        document.getElementById('bm-bra').value = bra;

        const conf = parsed.confidence || 'medium';
        const confColor = conf === 'high' ? '#22c55e' : conf === 'medium' ? '#f59e0b' : '#888';
        statusEl.style.color = confColor;
        statusEl.textContent = `✅ AI filled all fields (confidence: ${conf}). Review and save.`;
    } catch (e) {
        statusEl.style.color = '#ef4444';
        statusEl.textContent = '❌ ' + (e.message || 'AI fill failed. Try again.');
        logError('aiExtractBodyMeasurements', e.message);
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-robot"></i> AI Fill from Appearance';
}

function renderChildrenInBio(bot) { renderFetusesInBio(bot); }

async function scanChildrenFromHistory() {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;

    const keys = getGroqKeys();
    if (!keys.length) { alert('Groq API key required in Settings.'); return; }

    const btn = document.getElementById('children-scan-btn');
    const statusEl = document.getElementById('children-scan-status');
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...'; btn.disabled = true; }
    if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = '🔍 Scanning chat history for births...'; }

    try {
        const history = (bot.history || []).slice(-120);
        if (history.length === 0) {
            if (statusEl) statusEl.textContent = '⚠️ No chat history.';
            return;
        }

        const historyText = history.map(m => {
            const role = m.role === 'user' ? 'User' : bot.name;
            return role + ': ' + m.content.replace(/EMOTION::[\s\S]*/i, '').replace(/<[^>]+>/g, '').trim().substring(0, 150);
        }).join('\n');

        const virtualDay = getVirtualDay(bot);

        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_GEN_MODEL,
                max_tokens: 400,
                temperature: 0.1,
                messages: [
                    { role: 'system', content: 'You are a precise story timeline analyzer. Extract ONLY factual birth events from roleplay chat history. Return ONLY valid JSON.' },
                    {
                        role: 'user', content: `Analyze this roleplay chat for a character named "${bot.name}".
Current virtual story day: Day ${virtualDay + 1}

Chat history:
---
${historyText}
---

Count how many times ${bot.name} has given birth/delivered a baby in this story. For each birth, estimate on which virtual day it occurred (if "a week later" or time skips are mentioned, account for them).

Return ONLY this JSON:
{
  "births": [
    {"babyNumber": 1, "estimatedVirtualDay": <number 0-based or null if unknown>, "notes": "<any name given to baby or details>"}
  ],
  "confidence": <0-100>
}

If no births occurred, return: {"births": [], "confidence": 90}` }
                ]
            }),
            signal: AbortSignal.timeout(30000)
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        let raw = (data.choices?.[0]?.message?.content || '').trim();
        raw = raw.replace(/^\`\`\`json\n?|^\`\`\`\n?|\`\`\`$/g, '').trim();
        const analysis = JSON.parse(raw);

        if (!analysis.births || analysis.births.length === 0) {
            if (!bot.cycleData) initCycleData(bot);
            bot.cycleData.children = [];
            saveBots();
            renderChildrenInBio(bot);
            if (statusEl) statusEl.textContent = '✓ No births found in history. (Confidence: ' + analysis.confidence + '%)';
            return;
        }

        if (!bot.cycleData) initCycleData(bot);
        const cd = bot.cycleData;
        cd.children = analysis.births.map((b, i) => ({
            born: b.estimatedVirtualDay !== null ? b.estimatedVirtualDay : Math.max(0, virtualDay - (analysis.births.length - i) * 30),
            name: (b.notes && b.notes.length < 30 && b.notes.trim()) ? b.notes.trim() : ('Baby ' + b.babyNumber)
        }));

        saveBots();
        renderChildrenInBio(bot);
        if (statusEl) statusEl.textContent = `✓ Found ${cd.children.length} birth(s). (Confidence: ${analysis.confidence}%)`;

    } catch (e) {
        if (statusEl) statusEl.textContent = '⚠️ Scan failed: ' + e.message;
        logError('scanChildrenFromHistory error', e.message);
    } finally {
        if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> Scan'; btn.disabled = false; }
    }
}

function _showBioError(e) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;z-index:9999;background:#1a0000;border:2px solid #ff4444;color:#ff8888;padding:12px;border-radius:8px;font-size:12px;font-family:monospace;white-space:pre-wrap;word-break:break-all';
    d.textContent = 'Bio Error: ' + e.message + '\n' + (e.stack || '').split('\n')[1];
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 15000);
    console.error('Bio error:', e);
}

function showBioPopup() {
    try {
        const bot = bots.find(b => b.id === curId);
        if (!bot) { console.warn('showBioPopup: curId=' + curId + ' not found in bots'); return; }
        if (bot.age && bot.ageStartDay === undefined) {
            bot.ageStartDay = 0;  // treat current day as start
        }
        document.getElementById('p-name').innerText = bot.name;
        document.getElementById('p-gen-badge').innerHTML = (bot.gender || 'Unknown') + ' · Human';

        const pbioEl = document.getElementById('p-bio');
        if (pbioEl) { pbioEl.classList.remove('bio-text-expanded'); pbioEl.classList.add('bio-text-collapsed'); }
        const pbioHint = pbioEl ? pbioEl.nextElementSibling : null;
        if (pbioHint && pbioHint.classList.contains('bio-expand-hint')) pbioHint.textContent = '▼ Show more';
        const pbio = document.getElementById('p-bio');
        let bioText = getDynField(bot, 'bio') || '-';
        if (bot.cycleData && bot.cycleData.pregnant && typeof getPregnancyWeek === 'function') {
            const currentWeek = getPregnancyWeek(bot) || 0;
            if (currentWeek > 0) {
                const patched = bioText
                    .replace(/\b\d{1,2}\s*weeks?\s*pregnant/gi, `${currentWeek} weeks pregnant`)
                    .replace(/currently\s+\d{1,2}\s*w(?:eeks?)?\s+pregnant/gi, `currently ${currentWeek} weeks pregnant`)
                    .replace(/(\bweek\s*)\d{1,2}(\s*(?:pregnant|of\s*pregnancy))/gi, `$1${currentWeek}$2`);
                if (patched !== bioText) {
                    bioText = patched;
                    // Solo chat bio popup: ONLY write to bot.dynBio, never bot.grpDynBio
                    // curGroupId should always be null in solo chat context (set by openChat)
                    if (!curGroupId) {
                        const targetBio = bot.dynBio || (bot.dynBio = {});
                        const fieldSrc = (targetBio.bio || bot.bio || '');
                        const patchedStored = fieldSrc
                            .replace(/\b\d{1,2}\s*weeks?\s*pregnant/gi, `${currentWeek} weeks pregnant`)
                            .replace(/currently\s+\d{1,2}\s*w(?:eeks?)?\s+pregnant/gi, `currently ${currentWeek} weeks pregnant`)
                            .replace(/(\bweek\s*)\d{1,2}(\s*(?:pregnant|of\s*pregnancy))/gi, `$1${currentWeek}$2`);
                        targetBio.bio = patchedStored;
                        saveBots();
                    }
                }
            }
        }
        if (pbio) pbio.innerText = bioText;

        const page = document.getElementById('p-age');
        if (page) page.innerText = getCurrentAge(bot);
        const ageDynBadge = document.getElementById('p-age-dyn-badge');
        if (ageDynBadge) ageDynBadge.style.display = parseInt(bot.age) ? 'inline' : 'none';

        const prel = document.getElementById('p-rel');
        if (prel) {
            const relations = [];
            const socialRel = getDynField(bot, 'socialRelation');
            const familyRel = getDynField(bot, 'familyRelation');
            // Emotional relation hidden - still in development
            if (socialRel) relations.push(`Social: ${socialRel}`);
            relations.push(`Family: ${familyRel || 'none'}`);
            prel.innerText = relations.join(' | ');
        }
        const pcareer = document.getElementById('p-career');
        const pcareerBox = document.getElementById('p-career-box');
        if (pcareer && pcareerBox) {
            if (bot.career) { pcareer.innerText = bot.career; pcareerBox.style.display = ''; }
            else { pcareerBox.style.display = 'none'; }
        }

        // Solo chat bio sync status - ONLY reads from dynBio (solo), never grpDynBio (group)
        const syncStatus = document.getElementById('dynbio-sync-status');
        if (syncStatus) {
            if (bot.dynBio && bot.dynBio.lastSyncAt) {
                const msgsSince = bot.history.length - bot.dynBio.lastSyncAt;
                syncStatus.textContent = msgsSince > 0 ? `solo: +${msgsSince} msg ago` : 'solo: up to date';
            } else {
                syncStatus.textContent = 'solo: not synced yet';
            }
        }

        // --- NEW: Populate Personality & Traits ---
        const ppersonality = document.getElementById('p-personality');
        if (ppersonality) {
            let pText = getDynField(bot, 'prompt') || bot.prompt || '';
            const allTraits = bot.geneticTraits || [];

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
                ppersonality.innerHTML = `
                    <div style="font-style:italic;color:var(--text-sub);margin-bottom:6px;">No personality configured.</div>
                    <button id="p-random-trait-btn" onclick="randomizeBotPersonalityInBio('${bot.id}'); event.stopPropagation();" style="background:#b259ff22;border:1px solid #b259ff55;color:#b259ff;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px">
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
                ppersonality.innerHTML = html || '-';
            }
        }

        const pTraitsBox = document.getElementById('p-traits-box');
        const pTraitsChips = document.getElementById('p-traits-chips');
        if (pTraitsBox && pTraitsChips) {
            const traits = bot.geneticTraits || [];
            // Filter to only show genetic traits, not personality traits
            const validTraits = traits.filter(t => {
                const traitObj = typeof ALL_TRAITS !== 'undefined' ? ALL_TRAITS.find(tr => tr.name === t) : null;
                return traitObj !== null && traitObj.category === 'genetic';
            });
            if (validTraits.length > 0) {
                pTraitsBox.style.display = 'block';
                pTraitsChips.innerHTML = validTraits.map(t => {
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
                pTraitsBox.style.display = 'none';
                pTraitsChips.innerHTML = '';
            }
        }
        // ------------------------------------------

        const isFemale = (bot.gender || '').toLowerCase().includes('female')
            || (bot.gender || '').toLowerCase().includes('woman')
            || (bot.gender || '').toLowerCase() === 'f';
        const measDiv = document.getElementById('p-app-measures');
        if (measDiv) measDiv.style.display = isFemale ? 'block' : 'none';
        const statusEl = document.getElementById('p-status-badge');
        if (statusEl) {
            if (bot.currentStatus) {
                statusEl.style.display = 'flex';
                statusEl.innerHTML = `<span style="font-size:18px">${decodeUnicode(bot.currentStatus.icon)}</span><span style="font-size:12px;font-weight:bold;color:${bot.currentStatus.color}">${(bot.currentStatus.label || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
            } else {
                statusEl.style.display = 'none';
            }
        }

        const portrait = document.getElementById('p-portrait');
        const ph = document.getElementById('p-portrait-ph');
        if (bot.portraitUrl) {
            portrait.src = bot.portraitUrl;
            portrait.style.display = 'block';
            ph.style.display = 'none';
        } else {
            portrait.style.display = 'none';
            ph.style.display = 'flex';
        }
        window._bioModalGuard = true;
        document.getElementById('bio-modal').style.display = 'flex';
        setTimeout(() => { window._bioModalGuard = false; }, 600);
        if (!bot.bodyMeasurements) {
            const _hasKey = (function () { try { const k = JSON.parse(safeGetItem('groq_keys_list', '[]')); return k.some(x => x && x.length > 5) || (safeGetItem('groq_key', '')).length > 5; } catch (e) { return false; } })();
            if (isFemale && _hasKey) {
                initBodyMeasurements(bot); // init defaults first so display shows something
                renderBodyMeasurements(bot);
                aiExtractBodyMeasurementsAuto(bot);
            } else {
                initBodyMeasurements(bot);
            }
        }
        if (typeof renderReproHealth === 'function') renderReproHealth(bot);
        if (typeof renderChildrenInBio === 'function') renderChildrenInBio(bot);
        if (typeof renderScheduleInBio === 'function') renderScheduleInBio(bot);
        if (typeof renderMemoryLogUI === 'function') renderMemoryLogUI(bot);
        if (typeof renderKickCounterUI === 'function') renderKickCounterUI(bot);
    } catch (_bioErr) { _showBioError(_bioErr); }
}

function detectKicksInReply(replyText) {
    const t = replyText.toLowerCase();
    const patterns = [
        /(kicks?|kicking)/,
        /(baby|they|the baby).{0,30}(mov|kick|push|jab|roll|flutter|bump|nudge|squirm|wriggle)/,
        /(feel|felt|feeling).{0,30}(mov|kick|push|flutter|bump|nudge|roll)/,
        /(flutter|quickening|movement|nudge|jab|push|roll|tumble|hiccup).{0,20}(inside|belly|womb|tummy|stomach)/,
        /(inside|belly|womb).{0,30}(flutter|mov|kick|push|nudge|roll|bump)/,
        /rubs?.{0,15}(belly|stomach|bump).{0,40}(feel|felt|mov|kick)/,
        /(little one|baby).{0,20}(active|stirring|awake|lively)/,
    ];
    const count = patterns.filter(p => p.test(t)).length;
    if (count === 0) return 0;
    if (count >= 3) return 2;
    return 1;
}

function recordKickEvents(bot, count, timeStr) {
    const kd = getKickData(bot);
    const dayKey = getTodayKey(bot);
    let today = kd.sessions.find(s => s.dayKey === dayKey);
    if (!today) {
        today = { dayKey, kicks: [], day: getVirtualDay(bot) };
        kd.sessions.push(today);
        if (kd.sessions.length > 14) kd.sessions = kd.sessions.slice(-14);
    }
    for (let i = 0; i < count; i++) {
        const desc = KICK_DESCRIPTIONS[Math.floor(Math.random() * KICK_DESCRIPTIONS.length)];
        today.kicks.push({ time: timeStr, desc });
    }
    kd.totalAllTime = (kd.totalAllTime || 0) + count;
    saveBots();
}

function getKickData(bot) {
    if (!bot.kickData) bot.kickData = { sessions: [], totalAllTime: 0 };
    return bot.kickData;
}

function getTodayKey(bot) {
    return 'day_' + getVirtualDay(bot);
}

function renderKickCounterUI(bot) {
    const section = document.getElementById('kick-counter-section');
    if (!section) return;

    const pregWeeks = getPregnancyWeek ? getPregnancyWeek(bot) : 0;
    const isPregnant = bot.cycleData && bot.cycleData.pregnant;
    if (!isPregnant || !pregWeeks || pregWeeks < 18) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';

    const kd = getKickData(bot);
    const dayKey = getTodayKey(bot);
    const today = kd.sessions.find(s => s.dayKey === dayKey);
    const todayKicks = today ? today.kicks : [];
    const count = todayKicks.length;

    const countEl = document.getElementById('kick-count-today');
    if (countEl) countEl.textContent = count;

    const sessEl = document.getElementById('kick-count-session');
    if (sessEl) sessEl.textContent = 'total: ' + (kd.totalAllTime || 0);

    const lastEl = document.getElementById('kick-last-time');
    if (lastEl) lastEl.textContent = todayKicks.length > 0 ? todayKicks[todayKicks.length - 1].time : '-';

    const dateEl = document.getElementById('kick-counter-date');
    if (dateEl) dateEl.textContent = 'Week ' + pregWeeks;

    const timelineEl = document.getElementById('kick-timeline');
    if (timelineEl) {
        const dots = todayKicks.map((k, i) => {
            const isRecent = i >= todayKicks.length - 3;
            return `<div class="kick-dot${isRecent ? ' recent' : ''}" title="${k.time}"></div>`;
        }).join('');
        timelineEl.innerHTML = dots || '<span style="font-size:10px;color:var(--text-sub);font-style:italic">No kicks logged today - tap 👣 to log</span>';
    }

    const statusEl = document.getElementById('kick-status');
    if (statusEl) {
        if (count === 0) {
            statusEl.textContent = 'Log 10 kicks within 2 hours - healthy benchmark.';
            statusEl.className = 'kick-status';
        } else if (count < 10) {
            statusEl.textContent = `${10 - count} more kicks to reach the 10-kick goal.`;
            statusEl.className = 'kick-status low';
        } else {
            statusEl.textContent = `✓ Great! ${count} kicks logged - very active baby.`;
            statusEl.className = 'kick-status good';
        }
    }
}

function renderScheduleInBio(bot) {
    const s = bot.schedule;
    const viewEl = document.getElementById('sched-view-text');
    const badgeEl = document.getElementById('sched-variant-badge');
    if (!viewEl) return;

    // Variant badge → render in header row
    const VARIANT_LABELS = { normal: 'Normal', trimester1: '\uD83E\uDD30 Trimester 1', trimester2: '\uD83E\uDD30 Trimester 2', trimester3: '\uD83E\uDD30 Trimester 3', overdue: '\u23F3 Overdue', parasite_implantation: '\uD83D\uDC7D Implantation', parasite_feeding: '\uD83E\uDDA0 Feeding Phase', parasite_growth: '\uD83D\uDCA5 Rapid Growth', parasite_maturation: '\u26A0\uFE0F Maturation', parasite_emergence: '\uD83D\uDEA8 EMERGENCE' };
    if (badgeEl) {
        if (bot.scheduleVariants) {
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
        viewEl.innerHTML = '<span style="color:var(--text-sub);font-style:italic">No schedule set. Click ✏️ Edit to add one.</span>';
        return;
    }

    // Build sorted time entries
    const toMins = function (t) { if (!t) return 9999; var p = t.split(':').map(Number); return p[0] * 60 + (p[1] || 0); };
    var entries = [];
    if (s.wake) entries.push({ mins: toMins(s.wake), icon: '\uD83C\uDF05', label: 'Wake', time: s.wake });
    if (s.breakfast) entries.push({ mins: toMins(s.breakfast), icon: '\uD83C\uDF73', label: 'Breakfast', time: s.breakfast });
    if (s.lunch) entries.push({ mins: toMins(s.lunch), icon: '\uD83C\uDF7D\uFE0F', label: 'Lunch', time: s.lunch });
    if (s.dinner) entries.push({ mins: toMins(s.dinner), icon: '\uD83C\uDF7D\uFE0F', label: 'Dinner', time: s.dinner });
    if (s.sleep) entries.push({ mins: toMins(s.sleep), icon: '\uD83C\uDF19', label: 'Bed', time: s.sleep });

    if (s.customActivities && s.customActivities.length > 0) {
        s.customActivities.forEach(function (a) {
            var st = a.start || a.startTime || '';
            var en = a.end || a.endTime || '';
            entries.push({ mins: toMins(st), icon: '\uD83D\uDCCC', label: a.name, time: st ? (st + '–' + en) : '-', isCustom: true });
        });
    }
    entries.sort(function (a, b) { return a.mins - b.mins; });

    const _rsiGrp = groups.find(g => g.memberIds && g.memberIds.includes(bot.id));
    const _rsiBedId = 'bedroom_' + bot.id;
    const _rsiRooms = (_rsiGrp && _rsiGrp.rooms && _rsiGrp.rooms.length)
        ? _rsiGrp.rooms.filter(r => !r.private || r.id === _rsiBedId)
        : null;
    var timeline = _buildTimelineFromSchedule(s, _rsiRooms);
    var finalHtml = '';
    if (timeline.length > 0) {
        finalHtml = timeline.map(function (e, i) {
            var timeStr = e.end ? (e.start + '–' + e.end) : e.start;
            var isEdge = !e.end; // Wake / Bed have no end
            return '<div style="display:grid;grid-template-columns:20px 1fr auto;align-items:center;gap:8px;padding:5px 2px;' +
                (i < timeline.length - 1 ? 'border-bottom:1px solid var(--border)' : '') + '">' +
                '<span style="font-size:13px;line-height:1">' + (e.icon || '•') + '</span>' +
                '<span style="font-size:12px;color:var(--text-main);font-weight:' + (isEdge ? '700' : '500') + '">' + e.name + '</span>' +
                '<span style="font-size:12px;font-weight:700;white-space:nowrap;color:' + (isEdge ? '#f59e0b' : '#e2b96a') + '">' + timeStr + '</span>' +
                '</div>';
        }).join('');
    }

    var activitiesHtml = s.activities
        ? '<div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--border);font-size:11px;color:var(--text-sub);font-style:italic">🎨 ' + s.activities + '</div>'
        : '';

    viewEl.innerHTML = finalHtml || '<span style="color:var(--text-sub);font-style:italic">No schedule set.</span>';
    if (activitiesHtml) viewEl.innerHTML += activitiesHtml;
}

function toggleScheduleEdit() {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    const editMode = document.getElementById('sched-edit-mode');
    const viewMode = document.getElementById('sched-view-mode');
    const btn = document.getElementById('sched-edit-btn');
    const isOpen = editMode.style.display !== 'none';
    if (!isOpen) {
        const s = bot.schedule || {};
        const tod = minutesToTimeStr(getTimeOfDay(bot));
        document.getElementById('bp-wake').value = s.wake || '07:00';
        document.getElementById('bp-breakfast').value = s.breakfast || '07:30';
        document.getElementById('bp-lunch').value = s.lunch || '12:00';
        document.getElementById('bp-dinner').value = s.dinner || '18:30';
        document.getElementById('bp-sleep').value = s.sleep || '22:30';
        document.getElementById('bp-curtime').value = tod;
        document.getElementById('bp-activities').value = s.activities || '';
        const listEl = document.getElementById('bp-custom-acts-list');
        listEl.innerHTML = '';
        const customs = (s.customActivities || []);
        customs.forEach(a => addCustomActRow(a.name, a.start || a.startTime || '', a.end || a.endTime || ''));
        editMode.style.display = 'block';
        viewMode.style.display = 'none';
        btn.textContent = '✕';
    } else {
        editMode.style.display = 'none';
        viewMode.style.display = 'block';
        btn.textContent = '✏️ Edit';
    }
}

function saveScheduleFromBio() {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    const wake = document.getElementById('bp-wake').value || '07:00';
    const breakfast = document.getElementById('bp-breakfast').value || '07:30';
    const lunch = document.getElementById('bp-lunch').value || '12:00';
    const dinner = document.getElementById('bp-dinner').value || '18:30';
    const sleep = document.getElementById('bp-sleep').value || '22:30';
    const activities = document.getElementById('bp-activities').value || '';
    const curtime = document.getElementById('bp-curtime').value || '09:00';

    const customActivities = [];
    document.querySelectorAll('#bp-custom-acts-list .custom-act-row').forEach(row => {
        const name = row.querySelector('.custom-act-name').value.trim();
        const start = row.querySelectorAll('.custom-act-time')[0].value;
        const end = row.querySelectorAll('.custom-act-time')[1].value;
        if (name && start && end) {
            // FIX-5: Infer room from activity name so manual schedules also drive movement.
            // getRoomFromScheduleActivity uses ACTIVITY_ROOM_MAP keyword matching.
            const inferredRoom = getRoomFromScheduleActivity(name.toLowerCase()) || null;
            customActivities.push({ name, start, startTime: start, end, endTime: end, room: inferredRoom });
        }
    });

    bot.schedule = { wake, breakfast, lunch, dinner, sleep, activities, customActivities };
    const currentDay = getVirtualDay(bot);
    bot.virtualMinutes = currentDay * 1440 + timeStrToMinutes(curtime);
    saveBots();

    renderVirtualClockBadge(bot);
    renderVirtualDateBadge(bot);
    renderScheduleInBio(bot);

    document.getElementById('sched-edit-mode').style.display = 'none';
    document.getElementById('sched-view-mode').style.display = 'block';
    document.getElementById('sched-edit-btn').textContent = '✏️ Edit';
}

// Function to update emote badge display - DISABLED
function updateEmoteBadge() {
    // Emote badge disabled - do nothing
    return;
}

// → saveBot + renderBotList: see js/shared/bot_form.js
// → renderChat + model picker: see js/shared/render_chat.js
