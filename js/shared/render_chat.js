// render_chat.js -- Solo chat rendering (renderChat, NPC messages, model picker)
// Depends on: shared.js globals (bots, curId, groups, escapeHTML, formatBubbleContent, saveBots, loadIllusUrl)

function renderChat(animateLastBot = false) {
    const container = document.getElementById('chat-container');
    const bot = bots.find(b => b.id === curId);
    if (!bot) { if (container) container.innerHTML = ''; return; }
    container.innerHTML = '';

    if (bot.context && bot.history.length > 0) {
        showContextBubble(bot.context);
    }

    let lastBotIdx = -1;
    bot.history.forEach((msg, idx) => { if (msg.role === 'assistant') lastBotIdx = idx; });

    function shouldShowTimestamp(idx) {
        if (idx === 0) return true;
        const prev = bot.history[idx - 1];
        const curr = bot.history[idx];
        const prevTime = prev.msgId ? parseInt(prev.msgId) : 0;
        const currTime = curr.msgId ? parseInt(curr.msgId) : 0;
        return (currTime - prevTime) > 5 * 60 * 1000; // show if gap > 5 minutes
    }
    function formatTimestamp(msgId) {
        const ts = msgId ? parseInt(msgId) : Date.now();
        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
        if (isToday) return timeStr;
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[d.getDay()] + ' ' + timeStr;
    }

    bot.history.forEach((msg, idx) => {
        if (shouldShowTimestamp(idx) && msg.msgId) {
            const tsDiv = document.createElement('div');
            tsDiv.style.cssText = 'text-align:center;font-size:11px;color:var(--text-sub);padding:4px 0 8px;opacity:0.7;user-select:none';
            tsDiv.textContent = formatTimestamp(msg.msgId);
            container.appendChild(tsDiv);
        }

        const row = document.createElement('div');
        row.className = `msg-row ${msg.role === 'user' ? 'usr' : 'bot'}`;

        // Only render narrator style when explicitly enabled.
        // Keyword auto-detection was causing normal characters (e.g. doctor/nurse) to lose chat bubbles.
        const isNPC = msg.role === 'assistant' && bot.narrator === true;
        if (isNPC) {
            row.className = 'msg-row narrator-row';
            const narratorBubble = document.createElement('div');
            narratorBubble.className = 'bubble narrator';
            narratorBubble.innerHTML = formatBubbleContent(msg.content);
            row.appendChild(narratorBubble);
            container.appendChild(row);
            return;
        }

        if (msg.isNpcReply) {
            row.className = 'msg-row bot';
            const _isSystemNpc = /computer|system|terminal|kiosk|machine|atm|screen|printer|scanner|ai.*assistant|siri|alexa|jarvis|cortana|robot/i.test(msg.npcType || '');
            const npcAvCol = document.createElement('div');
            npcAvCol.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0';
            const npcAv = document.createElement('div');
            npcAv.className = 'msg-av npc-av';
            npcAv.textContent = _isSystemNpc ? '🖥' : '?';
            npcAv.title = msg.npcType ? msg.npcType.replace(/_/g, ' ') : 'NPC';
            npcAv.style.cssText = 'background:linear-gradient(135deg,#1a0030,#2d1060);border:1px solid #7c3aed;color:#c4b5fd;font-size:17px;display:flex;align-items:center;justify-content:center;font-weight:bold;border-radius:50%;width:36px;height:36px;flex-shrink:0;box-shadow:0 0 8px #7c3aed44;';
            npcAvCol.appendChild(npcAv);
            row.appendChild(npcAvCol);
            const npcWrapper = document.createElement('div');
            npcWrapper.className = 'msg-content-wrapper';
            npcWrapper.style.cssText = 'max-width:78%';
            const npcLabel = document.createElement('div');
            const _npcDisplayName = (msg.npcType || 'stranger').replace(/_/g, ' ');
            npcLabel.style.cssText = 'font-size:10px;color:#a78bfa;font-weight:bold;margin-bottom:4px;text-transform:capitalize;letter-spacing:0.4px;display:flex;align-items:center;gap:4px';
            npcLabel.innerHTML = (_isSystemNpc ? '🖥 ' : '👤 ') + _npcDisplayName;
            npcWrapper.appendChild(npcLabel);
            const npcBubble = document.createElement('div');
            npcBubble.className = 'bubble npc';
            npcBubble.style.cssText = 'background:linear-gradient(135deg,#12001f,#1e0840);border:1px solid #6d28d966;color:#ddd6fe;border-radius:4px 16px 16px 16px;font-size:14px;padding:10px 14px;line-height:1.55;' + (_isSystemNpc ? 'font-family:monospace;font-size:13px;color:#a5f3fc;background:linear-gradient(135deg,#001a1f,#002535);border-color:#0891b266;' : '');
            npcBubble.innerHTML = formatBubbleContent(msg.content);
            npcWrapper.appendChild(npcBubble);
            row.appendChild(npcWrapper);
            container.appendChild(row);
            return;
        }

        let avatarEl = null;
        if (msg.role === 'assistant') {
            const statusIcon = (bot.currentStatus && bot.currentStatus.icon) ? bot.currentStatus.icon : '';
            avatarEl = document.createElement('div');
            avatarEl.style.cssText = 'position:relative;display:inline-block;cursor:pointer;flex-shrink:0';
            avatarEl.title = 'View status';
            avatarEl.dataset.botid = bot.id;
            avatarEl.addEventListener('click', function (e) {
                e.stopPropagation();
                showAvatarStatus(e, this.dataset.botid);
            });
            const avImg = document.createElement('img');
            avImg.src = bot.avatar;
            avImg.className = 'msg-av';
            avImg.onerror = function () { this.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(bot.name) + '&background=random'; };
            avatarEl.appendChild(avImg);
            if (statusIcon) {
                const badge = document.createElement('span');
                badge.style.cssText = 'position:absolute;bottom:-2px;right:-2px;font-size:12px;background:var(--bg-main);border-radius:50%;padding:1px';
                badge.textContent = statusIcon;
                avatarEl.appendChild(badge);
            }
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'msg-content-wrapper';

        const bubble = document.createElement('div');
        bubble.className = `bubble ${msg.role === 'user' ? 'usr' : 'bot'}`;

        const isLastBot = (msg.role === 'assistant' && idx === lastBotIdx && animateLastBot);

        if (isLastBot) {
            // Will be animated — start empty, fill after appending
            bubble.innerHTML = '';
        } else if (msg.role === 'user') {
            // Use formatBubbleContent to handle I[...] and quoted speech and (...) as inner thought
            bubble.innerHTML = formatBubbleContent(msg.content);
        } else {
            bubble.innerHTML = formatBubbleContent(msg.content);
        }
        wrapper.appendChild(bubble);

        if (msg.role === 'assistant') {
            function copyBotText() {
                const plainText = msg.content.replace(/EMOTION::[^\n]*/i, '').trim();
                const ta = document.createElement('textarea');
                ta.value = plainText;
                ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
                document.body.appendChild(ta);
                ta.focus(); ta.select();
                try { document.execCommand('copy'); } catch (e) { }
                ta.remove();
                if (navigator.clipboard) navigator.clipboard.writeText(plainText).catch(() => { });
                const toast = document.createElement('div');
                toast.textContent = '✓ Copied';
                toast.style.cssText = 'position:fixed;bottom:110px;left:50%;transform:translateX(-50%);background:#22c55e;color:#fff;padding:8px 20px;border-radius:20px;font-size:14px;z-index:9999;pointer-events:none;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.4)';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 1800);
            }
            let pressTimer = null;
            bubble.addEventListener('touchstart', (e) => {
                pressTimer = setTimeout(() => {
                    pressTimer = null;
                    copyBotText();
                }, 650);
            }, { passive: true });
            bubble.addEventListener('touchend', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }, { passive: true });
            bubble.addEventListener('touchmove', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }, { passive: true });
            bubble.addEventListener('contextmenu', (e) => { e.preventDefault(); copyBotText(); });

            const storedIllus = msg.illustUrl === '__stored__' ? loadIllusUrl(msg.msgId) : msg.illustUrl;
            if (storedIllus) {
                const img = document.createElement('img');
                img.src = storedIllus;
                img.style.cssText = 'width:250px;max-width:100%;border-radius:12px;border:1px solid var(--border);margin-top:5px;display:block;cursor:pointer';
                img.onclick = () => openImgZoom(storedIllus);
                wrapper.appendChild(img);
            }
            if (idx === bot.history.length - 1) {
                const btnRow = document.createElement('div');
                btnRow.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:nowrap;margin-top:6px';

                if (!storedIllus) {
                    const illusBtn = document.createElement('button');
                    illusBtn.className = 'illus-btn';
                    illusBtn.innerHTML = '<i class="fas fa-camera"></i>';
                    illusBtn.title = 'Illustrate Scene';
                    const msgId = msg.msgId || String(idx);
                    illusBtn.onclick = () => illusByMsgId(illusBtn, msgId);
                    btnRow.appendChild(illusBtn);
                }

                const thoughtBtn = document.createElement('button');
                thoughtBtn.className = 'thought-btn';
                thoughtBtn.innerHTML = '💭';
                thoughtBtn.title = 'Inner thoughts';
                const capturedMsgId = msg.msgId || String(idx);
                thoughtBtn.onclick = () => toggleInlineThought(thoughtBtn, capturedMsgId, bot, null, null);
                btnRow.appendChild(thoughtBtn);

                const contBtn = document.createElement('button');
                contBtn.className = 'continue-btn';
                contBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                contBtn.title = 'Continue story';
                contBtn.onclick = continueStory;
                btnRow.appendChild(contBtn);

                const regenBtn = document.createElement('button');
                regenBtn.className = 'thought-btn';
                regenBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
                regenBtn.title = 'Regenerate reply';
                regenBtn.style.color = '#f59e0b';
                regenBtn.style.borderColor = '#f59e0b55';
                regenBtn.onclick = () => regenerateLastReply();
                btnRow.appendChild(regenBtn);

                wrapper.appendChild(btnRow);
            } else if (!storedIllus) {
                const btn = document.createElement('button');
                btn.className = 'illus-btn';
                btn.innerHTML = '<i class="fas fa-camera"></i>'; btn.title = "Illustrate Scene";
                const msgId = msg.msgId || String(idx);
                btn.onclick = () => illusByMsgId(btn, msgId);
                wrapper.appendChild(btn);
            }
        }

        if (msg.role === 'user') {
            row.appendChild(wrapper);
            const lastUserIdx = bot.history.map(m => m.role).lastIndexOf('user');
            if (idx === lastUserIdx) {
                const resendBtn = document.createElement('button');
                resendBtn.className = 'thought-btn';
                resendBtn.innerHTML = '<i class="fas fa-redo"></i>';
                resendBtn.title = 'Resend message';
                resendBtn.style.cssText = 'color:#60a5fa;border-color:#60a5fa55;margin-bottom:4px;flex-shrink:0;align-self:flex-end';
                const capturedContent = msg.content;
                resendBtn.onclick = () => resendMessage(capturedContent);
                row.appendChild(resendBtn);
            }
        } else {
            row.appendChild(avatarEl || document.createTextNode(''));
            row.appendChild(wrapper);
        }
        container.appendChild(row);

        if (isLastBot) {
            typewriterAnimate(bubble, msg.content, null);
            const prevMsg = bot.history[idx - 1];
            const prevIsUser = prevMsg && prevMsg.role === 'user';
            setTimeout(() => {
                if (prevIsUser) {
                    const rows = container.querySelectorAll('.msg-row');
                    let userRow = null;
                    for (let i = rows.length - 1; i >= 0; i--) {
                        if (rows[i].classList.contains('usr')) { userRow = rows[i]; break; }
                    }
                    if (userRow) userRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    container.scrollTop = container.scrollHeight;
                }
            }, 50);
        }
    });
    // Only auto-scroll to bottom if NOT animating a new bot reply
    if (!animateLastBot) {
        container.scrollTop = container.scrollHeight;
    }
    // Update emote badge after rendering
    if (typeof updateEmoteBadge === 'function') {
        updateEmoteBadge();
    }
}

function cleanReply(text) {
    text = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
    text = text.replace(/<<[^>]{1,60}>>[:\s]*/g, '').trim(); // Remove internal speaker tags
    text = text.replace(/^[^: \n]{1,30}:\s*/, '').trim(); // Remove common Name: labels
    text = text.replace(/\n*[A-Z][A-Z\s]{1,20}::[^:\n]{0,30}::[\s\S]*/g, '').trim();
    text = text.replace(/EMOTION::[^\n]*/i, '').trim();
    text = text.replace(/\n+[A-Z]{3,}[\W]{0,5}\s*$/g, '').trim();
    text = text.replace(/(\b[\w']{2,}\b)(\W+\1){5,}/gi, (match, word) => word + '...');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/\s*\*+\s*$/, '').trim();
    text = text.replace(/[^.!?]*\byou\s+(ask|say|whisper|reply|answer|smile|laugh|look|lean|move|reach|take|grab|nod|shake|turn|walk|stand|sit|touch|pull|push|kiss|hug|hold|suggest|add|continue|tease|joke|wonder)[^.!?"]*[.!?]?/gi, '').trim();
    text = text.replace(/["""][^"""]*["""]\s*,?\s*you\s+\w+[^.!?]*[.!?]?/gi, '').trim();
    text = text.replace(/\s{2,}/g, ' ').replace(/^[,;\s]+/, '').trim();
    text = text.replace(/\bthe user\b/gi, 'you');
    text = text.replace(/\bthe User\b/g, 'you');

    text = text.replace(/,\s*quotes\s+(")/gi, '. $1');
    text = text.replace(/\bquotes\s+(")/gi, '$1');
    text = text.replace(/\bin quotes\b\s*/gi, '');
    text = text.replace(/\bquote:\s*/gi, '');

    text = text.replace(/""/g, '"');
    text = text.replace(/"'([^"'\n]+)'"/g, '"$1"');
    text = text.replace(/"'/g, '"').replace(/([.!?,])'"/g, '$1"');


    return text;
}

const ROOM_MANAGER_MODEL = GROQ_COMPOUND_MODEL; // room movement AI - needs reasoning for possessive disambiguation
const MODEL_LIST = [
    { id: 'groq:llama-3.1-8b-instant', label: 'Llama 3.1 8B', sub: 'Fast · Light · Free tier', color: '#22c55e', req: 'groq' },
    { id: 'groq:meta-llama/llama-4-maverick-17b-128e-instruct', label: 'Llama 4 Maverick', sub: 'Currently unavailable', color: '#888888', req: 'groq', disabled: true },
    { id: 'groq:moonshotai/kimi-k2-instruct-0905', label: 'Kimi K2', sub: 'Moonshot AI · Strong reasoning', color: '#f97316', req: 'groq' },
    { id: 'groq:qwen/qwen3-32b', label: 'Qwen3 32B', sub: 'Qwen · Strong reasoning · Free tier', color: '#a855f7', req: 'groq' },
    { id: 'groq:openai/gpt-oss-20b', label: 'GPT-OSS 20B', sub: 'OpenAI · Compact · Free tier', color: '#3b82f6', req: 'groq' },
];

function getActiveModelId() {
    return safeGetItem('active_model_id', 'groq:llama-3.1-8b-instant');
}
function updateModelBadge() {
    const m = MODEL_LIST.find(m => m.id === getActiveModelId());
    if (!m) return;
    const el = document.getElementById('c-model');
    if (el) { el.textContent = m.label; el.style.color = m.color; el.style.borderColor = m.color + '44'; }
    const grpEl = document.getElementById('grp-c-model');
    if (grpEl) { grpEl.textContent = m.label; grpEl.style.color = m.color; }
}

function toggleModelPicker() {
    const picker = document.getElementById('model-picker');
    const list = document.getElementById('model-picker-list');
    const grKey = getNextGroqKey();
    const activeId = getActiveModelId();
    const curTemp = parseFloat(safeGetItem('ai_temperature') || '1.0');

    list.innerHTML = MODEL_LIST.map(m => {
        const hasKey = grKey.length >= 10;
        const isActive = m.id === activeId;
        const isDisabled = !!m.disabled;
        const clickHandler = isDisabled ? '' : `onclick="selectModel('${m.id}')"`;
        return `<div ${clickHandler} style="
            display:flex;align-items:center;gap:12px;padding:12px 14px;
            border-radius:12px;margin-bottom:8px;
            cursor:${isDisabled ? 'not-allowed' : 'pointer'};
            background:${isActive ? m.color + '22' : 'var(--input-bg)'};
            border:1px solid ${isActive ? m.color : isDisabled ? '#333' : 'var(--border)'};
            opacity:${isDisabled ? '0.4' : hasKey ? '1' : '0.55'}">
            <div style="flex:1">
                <div style="font-size:14px;font-weight:bold;color:${isDisabled ? '#555' : m.color}">${m.label}${isDisabled ? ' 🚫' : ''}</div>
                <div style="font-size:11px;color:var(--text-sub);margin-top:2px">${m.sub}${!hasKey && !isDisabled ? ' · ⚠️ No key' : ''}</div>
            </div>
            ${isActive ? `<i class="fas fa-check-circle" style="color:${m.color};font-size:16px"></i>` : ''}
        </div>`;
    }).join('');

    list.innerHTML += `
        <div style="margin-top:6px;padding:12px 14px;background:var(--input-bg);border:1px solid var(--border);border-radius:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div>
                    <div style="font-size:13px;font-weight:bold;color:var(--text-main)">🌡️ Creativity / Temperature</div>
                    <div style="font-size:10px;color:var(--text-sub);margin-top:2px">Low = focused · High = creative & unpredictable</div>
                </div>
                <span id="temp-display" style="font-size:15px;font-weight:bold;color:#f97316;min-width:32px;text-align:right">${curTemp.toFixed(1)}</span>
            </div>
            <input type="range" id="temp-slider" min="0.1" max="2.0" step="0.1" value="${curTemp}"
                oninput="document.getElementById('temp-display').textContent=parseFloat(this.value).toFixed(1)"
                onchange="safeSetItem('ai_temperature',this.value)"
                style="width:100%;accent-color:#f97316;cursor:pointer">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-sub);margin-top:4px">
                <span>0.1 Precise</span><span>1.0 Balanced</span><span>2.0 Wild</span>
            </div>
        </div>`;

    picker.style.display = 'flex';
}

function selectModel(id) {
    safeSetItem('active_model_id', id);
    document.getElementById('model-picker').style.display = 'none';
    const bioModal = document.getElementById('bio-modal');
    if (bioModal) bioModal.style.display = 'none';
    updateModelBadge();
    if (curId) {
        const bot = bots.find(b => b.id === curId);
        if (bot && bot.history && bot.history.length > 0) {
            renderChat();
            forceSummaryForModelSwitch(bot);
        }
    }
}

async function forceSummaryForModelSwitch(bot) {
    if (!bot.history || bot.history.length < 2) return;
    const keys = getGroqKeys();
    if (!keys.length) return;

    const histText = bot.history.map(m =>
        (m.role === 'user' ? 'User' : bot.name) + ': ' +
        m.content.replace(/EMOTION::[^\n]*/i, '').replace(/<[^>]+>/g, '').trim()
    ).join('\n').substring(0, 4000);

    const prevSummary = bot.memorySummary
        ? '[Existing summary - update with new events below]\n' + bot.memorySummary + '\n\n[New events to integrate]\n'
        : '';

    try {
        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
                model: GROQ_GEN_MODEL,
                messages: [
                    { role: 'system', content: `You are a story continuity engine. Produce a dense factual log - events, established facts, current state - so the AI character never contradicts past events. No narrative prose, no emotional analysis.` },
                    {
                        role: 'user', content: `${prevSummary ? prevSummary : ''}CHARACTER: ${bot.name} (${bot.gender})

ROLEPLAY HISTORY:
${histText}

Write a bullet-point memory log. Each bullet = one fact. Be specific (names, places, objects, quoted phrases). NO full narrative sentences.

Format:
- relationship: [current dynamic / stage]
- [event]: [what happened - specific, one clause]
- [milestone]: [confession / first / conflict - what exactly]
- state: [${bot.name}'s emotional state toward user right now]
- unresolved: [open threads, promises, tensions if any]

Rules: Past tense for events, present for state. Max 6 bullets. No preamble, no headers, no prose.` }
                ],
                max_tokens: 350,
                temperature: 0.3
            })
        });
        const data = await res.json();
        const summary = data.choices?.[0]?.message?.content?.trim();
        if (summary && summary.length > 30) {
            bot.memorySummary = summary;
            bot.lastSummaryAt = bot.history.filter(m => m.role === 'assistant').length;
            saveBots();
        }
    } catch (e) { }
}

async function showThoughts(msgId) {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    const overlay = document.getElementById('thought-overlay');
    const content = document.getElementById('thought-content');
    const nameEl = document.getElementById('thought-char-name');
    nameEl.textContent = bot.name + ' thinks...';
    content.innerHTML = '<div class="thought-loading"><i class="fas fa-spinner fa-spin"></i> Reading inner thoughts...</div>';
    overlay.style.display = 'flex';

    const msgIndex = bot.history.findIndex(m => (m.msgId || '') === msgId);
    const contextSlice = bot.history.slice(Math.max(0, msgIndex - 4), msgIndex + 1);
    const historyText = contextSlice.map(m =>
        (m.role === 'user' ? 'User' : bot.name) + ': ' + m.content.replace(/EMOTION::.*/g, '').replace(/\*/g, '').trim()
    ).join('\n');

    const aiLang = getLang();
    const soloThinkPrompt = `You are ${bot.name} (${bot.gender}).
[Personality]: ${bot.prompt || ''}
[Background]: ${bot.bio || ''}

Based on the conversation below, write ${bot.name}'s unfiltered INNER THOUGHTS and feelings at this exact moment - what they are truly thinking but would never say out loud. Include: genuine emotions, hidden desires, secret observations, what they really think of the user and the situation. Be raw, honest, introspective. Write in first person as ${bot.name}. Write in ${aiLang}. 3-5 sentences max.

Conversation:
${historyText}`;
    try {
        let data;
        try {
            data = await fetchGroq({ model: GROQ_THINK_MODEL, messages: [{ role: 'user', content: soloThinkPrompt }], max_tokens: 200, temperature: 0.9 });
        } catch (e1) {
            data = await fetchGroq({ model: GROQ_GEN_MODEL, messages: [{ role: 'user', content: soloThinkPrompt }], max_tokens: 200, temperature: 0.9 });
        }
        const thought = (data.choices?.[0]?.message?.content || '').trim();
        content.innerHTML = `<div class="thought-body">${escapeHTML(thought)}</div>`;
    } catch (e) {
        logError('showThoughts error', e.message);
        content.innerHTML = '<div class="thought-loading" style="color:#ff6666">⚠️ Could not read thoughts.</div>';
    }
}

async function showGroupThoughts(speakerId, msgIdx) {
    if (!curGroupId) return;
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;

    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    let speaker = bots.find(b => b.id === speakerId);
    if (!speaker) {
        const lastAss = [...grp.history].reverse().find(m => m.role === 'assistant' && m.speakerId);
        speaker = lastAss ? bots.find(b => b.id === lastAss.speakerId) : members[0];
    }
    if (!speaker) return;

    const overlay = document.getElementById('thought-overlay');
    const content = document.getElementById('thought-content');
    const nameEl = document.getElementById('thought-char-name');
    if (!overlay || !content || !nameEl) return;
    nameEl.textContent = speaker.name + ' thinks...';
    content.innerHTML = '<div class="thought-loading"><i class="fas fa-spinner fa-spin"></i> Reading inner thoughts...</div>';
    overlay.style.display = 'flex';

    const sliceStart = typeof msgIdx === 'number' ? Math.max(0, msgIdx - 4) : Math.max(0, grp.history.length - 5);
    const sliceEnd = typeof msgIdx === 'number' ? msgIdx + 1 : grp.history.length;
    const contextSlice = grp.history.slice(sliceStart, sliceEnd);
    const historyText = contextSlice.map(m => {
        if (m.role === 'user') return 'User: ' + (m.content || '').replace(/\*/g, '').trim();
        const sp = members.find(mb => mb.id === m.speakerId);
        return (sp ? sp.name : 'Character') + ': ' + (m.content || '').replace(/\*/g, '').trim();
    }).join('\n');

    const aiLang = getLang();
    const thinkPrompt = `You are ${speaker.name} (${speaker.gender || 'Female'}).
[Personality]: ${speaker.prompt || ''}
[Background]: ${speaker.bio || ''}

Based on the group conversation below, write ${speaker.name}'s unfiltered INNER THOUGHTS at this exact moment - what they truly think but won't say out loud. Include genuine emotions, hidden feelings, secret observations about other characters and the situation. Be raw, honest, introspective. Write in first person as ${speaker.name}. Write in ${aiLang}. 3-5 sentences max.

Conversation:
${historyText}`;
    try {
        let data;
        try {
            data = await fetchGroq({ model: GROQ_THINK_MODEL, messages: [{ role: 'user', content: thinkPrompt }], max_tokens: 200, temperature: 0.9 });
        } catch (e1) {
            data = await fetchGroq({ model: GROQ_GEN_MODEL, messages: [{ role: 'user', content: thinkPrompt }], max_tokens: 200, temperature: 0.9 });
        }
        const thought = (data.choices?.[0]?.message?.content || '').trim();
        content.innerHTML = thought
            ? `<div class="thought-body">${escapeHTML(thought)}</div>`
            : '<div class="thought-loading" style="color:#ff6666">⚠️ No response from AI.</div>';
    } catch (e) {
        logError('showGroupThoughts error', e.message);
        content.innerHTML = '<div class="thought-loading" style="color:#ff6666">⚠️ Could not read thoughts. Check your Groq key.</div>';
    }
}

let _isSending = false;

// ── Typing indicator helpers ──────────────────────────────────────────────
function showTypingIndicator(bot) {
    const el = document.getElementById('typing');
    const av = document.getElementById('typing-av');
    if (!el) return;
    if (av && bot) {
        av.src = bot.avatar || '';
        av.onerror = function () { this.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent((bot.name || 'Bot')) + '&background=555&color=fff'; };
    }
    el.style.display = 'flex';
}
function hideTypingIndicator() {
    const el = document.getElementById('typing');
    if (el) el.style.display = 'none';
}
function getBotSleepTiredness(bot) {
    if (!bot || !bot.schedule) return 'awake';
    const s = bot.schedule;
    const tod = getTimeOfDay(bot);
    const wake = timeStrToMinutes(s.wake || '07:00');
    const sleep = timeStrToMinutes(s.sleep || '22:30');

    if (tod < wake) {
        const minsBeforeWake = wake - tod;
        if (minsBeforeWake > 75) return 'asleep';
        if (minsBeforeWake > 30) return 'very_tired';
        return 'tired'; // almost waking up
    }

    if (tod >= sleep) {
        const pastSleep = tod - sleep;
        if (pastSleep < 30) return 'tired';       // 0-30 min: responds but mentions being sleepy
        if (pastSleep < 75) return 'very_tired';  // 30-75 min: very drowsy, short replies
        return 'asleep';                           // 75+ min: hard block
    }

    return 'awake';
}

function isBotSleeping(bot) {
    return getBotSleepTiredness(bot) === 'asleep';
}

