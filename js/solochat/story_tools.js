async function continueStory() {
    const key = getNextGroqKey();
    if (!key || !curId) return;
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    const aiLang = getLang();
    const activePersona = bot.personaId ? personas.find(p => p.id === bot.personaId) : null;

    showTypingIndicator(bots.find(b=>b.id===curId)||null);

    
    const lastBotMsg = [...bot.history].reverse().find(m => m.role === 'assistant');
    const lastBotText = lastBotMsg ? lastBotMsg.content.replace(/EMOTION::.*/g,'').trim() : '';

    
    const lastQuotes = (lastBotText.match(/"([^"]{3,})"/g) || []).map(q => q.replace(/"/g,'')).slice(0,3);
    const lastActions = lastBotText.split(/(\"[^\"]*\")/g)
        .filter((_,i) => i % 2 === 0)
        .join(' ')
        .replace(/[^a-zA-Z\s]/g,' ')
        .trim()
        .split(/\s+/)
        .slice(0, 12)
        .join(' ');
    const banList = lastQuotes.length > 0 ? `\nBANNED - do NOT repeat these phrases from your last reply:\n${lastQuotes.map(q=>`- "${q}"`).join('\n')}` : '';

    const sys = `You are ${bot.name} (${bot.gender}).${buildPronounGuidance(bot, aiLang, activePersona)}
[Appearance]: ${getDynField(bot, 'appearance') || bot.appearance || 'Not specified'}
[Background]: ${getDynField(bot, 'bio') || bot.bio || 'Not specified'}
[Personality]: ${getDynField(bot, 'prompt') || bot.prompt || 'Not specified'}
${buildTraitContext(bot)}
${getTimeContext(bot)}
${bot.dynBio && bot.dynBio.virginityLost ? '[Intimate History]: Sexual intimacy has already occurred in this story.' : ''}
${buildReproContext(bot)}${getPersonaContext(bot)}${bot.schedule ? '\n' + getScheduleContext(bot) : ''}${getStatesContext(bot)}

SITUATION: The user pressed "Continue" - advance the scene forward through PHYSICAL ACTION. Do NOT repeat or paraphrase anything you already said. Focus on what ${bot.name} DOES - body movement, environment interaction, sensory details, shifts in posture or breathing. Dialogue is secondary; let actions carry the scene.
${banList}

RULES:
1. NEVER repeat phrases, lines, or actions from your previous reply. The story moves FORWARD only.
2. ACTIONS FIRST - Lead with what she physically does: moves, touches, shifts weight, interacts with objects, reacts to sounds/smells/textures. Show the scene through her body, not her words.
3. Dialogue is optional and minimal - if she speaks, keep it short and grounded (1-2 lines max). Let silence, gestures, and physical reactions speak louder.
4. Play ONLY ${bot.name}. Never write user actions.
5. Language: ${aiLang}. Metric units only.
6. FORMAT: FIRST PERSON ONLY. Use "My" and "I" for all action beats - NEVER "She" or "Her". Physical detail. Environmental detail. Brief dialogue only if natural. NEVER subjectless beats like "Steps closer." - always "I step closer."
   - Action beats: first person (My/I), plain prose, vivid and specific. No asterisks.
   - "double quotes" = ONLY actual spoken words.
   - ${getReplyWordTarget()}.
7. ANTI-ECHO: Her new actions and lines must be entirely original - not a rephrasing of what she just did.
${bot.cycleData && bot.cycleData.laborStarted && !bot.cycleData.birthVirtualDay ? `
\u{1F6A8} LABOR OVERRIDE - she is in ACTIVE LABOR. No calm dialogue. Short broken fragments between contractions. Raw physical reality only.` : ''}
`;

    const historyForContinue = buildHistoryForAPI(bot);
    const continueNudge = `[Continue the scene through physical action - what does she do next? Show movement, body language, environment interaction. Dialogue is secondary. Do NOT repeat anything from your last reply.]`;

    try {
        const data = await fetchGroqChat([
                {role:'system', content: sys},
                ...historyForContinue,
                {role:'user', content: continueNudge}
            ], getReplyMaxTokens());
        let reply = data.choices?.[0]?.message?.content || '';

        const similarity = lastQuotes.filter(q => reply.includes(q)).length;
        const countDialogue = (s) => (s.match(/"[^"]{2,}"/g) || []).length;

        if (countDialogue(reply) < 2 || similarity >= 2) {
            const retryData = await fetchGroqChat([
                {role:'system', content: `You are ${bot.name}. Advance the scene to the NEXT beat - do NOT repeat anything already said. Write something entirely new: a new action, new thought, new dialogue. At least 3 spoken lines in "quotes". Format: she+action. "I-subject line." she+emotion. "I-subject line." she+action. "I-subject line." Dialogue lines MUST have subjects - at least 2 must begin with "I". BAD: "Not happening." GOOD: "I don't think I can do this." ${getReplyWordTarget()}.${banList}`},
                ...historyForContinue,
                {role:'user', content: `[Next beat - move forward, nothing repeated, all new content]`}
            ], getReplyMaxTokens());
            reply = retryData.choices?.[0]?.message?.content || reply;
        }

        
        function trimActionBlocksCont(text) {
            const parts = text.split(/("(?:[^"\\]|\\.)*?")/g);
            return parts.map((part, i) => {
                if (i % 2 === 1) return part;
                return part.replace(/([^.!?]+[.!?])/g, (sentence) => {
                    const words = sentence.trim().split(/\s+/);
                    if (words.length > 18) return ' ' + words.slice(0, 15).join(' ') + '. ';
                    return sentence;
                });
            }).join('');
        }
        reply = reply.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
        reply = reply.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

        const emMatch = reply.match(/EMOTION::([^:]+)::([^:]+)::(.+)/);
        reply = trimActionBlocksCont(reply.replace(/EMOTION::[\s\S]*/, '').trim());

        if (emMatch) {
            curEmo = { icon: emMatch[1].trim(), label: emMatch[2].trim(), text: emMatch[3].trim() };
        }
        reply = reply.replace(/EMOTION::[\s\S]*/, '').trim();
        reply = cleanReply(reply);
        bot.history.push({role: 'assistant', content: reply, msgId: Date.now().toString()});
        bot.lastChatted = Date.now();
        saveBots();
        renderChat(true);
        estimateTimePassed(bot, '[Story continues - character acts and speaks]', reply);
        maybeInjectLifeEvent(bot);
    } catch(e) {
        logError('continueStory error', e.message);
    }
    hideTypingIndicator();
}

async function showHints() {
    const key = getNextGroqKey();
    if (!key || !curId) return;
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    const aiLang = getLang();

    const overlay = document.getElementById('hint-overlay');
    const content = document.getElementById('hint-content');
    overlay.style.display = 'flex';
    content.innerHTML = '<div class="hint-loading"><i class="fas fa-spinner fa-spin"></i> Generating suggestions...</div>';

    const recentHistory = bot.history.slice(-8);
    const historyText = recentHistory.map(m =>
        (m.role === 'user' ? 'User' : bot.name) + ': ' + m.content.replace(/EMOTION::.*/g,'').trim()
    ).join('\n');

    try {
        const hintsData = await fetchGroq({
                model: HINT_MODEL,
                messages: [{
                    role: 'user',
                    content: `You are writing 3 possible next messages the USER could send in this roleplay, in ${aiLang}.

CRITICAL FORMAT - must match chatbot style exactly:
- Physical actions: *wrap in asterisks like this*
- Spoken dialogue: "wrap in quotes like this"
- Mix: *action* "then speech"
- 3 options, varied in tone (bold / tender / playful). 1-2 sentences each.

Return ONLY a JSON array of exactly 3 strings. No explanation, no markdown.

Conversation:
${historyText}`
                }],
                max_tokens: 300,
                temperature: 1.0
            });
        const raw = hintsData.choices?.[0]?.message?.content?.trim() || '[]';
        let options = [];
        try {
            const cleaned = raw.replace(/```json|```/g,'').trim();
            options = JSON.parse(cleaned);
        } catch(e) {
            const matches = raw.match(/"([^"]+)"/g);
            if (matches) options = matches.slice(0,3).map(s => s.replace(/"/g,''));
        }

        if (!options.length) throw new Error('No options parsed');

        renderHintOptions(content, options, 'msg-input', 'hint-overlay');
    } catch(e) {
        logError('showHints error', e.message);
        content.innerHTML = '<div class="hint-loading" style="color:#ff6666">\u26a0\ufe0f Could not generate suggestions. Try again.</div>';
    }
}

function applyHintToInput(inputId, overlayId, encodedText) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    let nextText = String(encodedText || '');
    try { nextText = decodeURIComponent(nextText); } catch(e) { }
    inp.value = nextText;
    autoResize(inp);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    const overlay = document.getElementById(overlayId);
    if (overlay) overlay.style.display = 'none';
    inp.focus();
    const len = inp.value.length;
    if (typeof inp.setSelectionRange === 'function') inp.setSelectionRange(len, len);
}

function renderHintOptions(contentEl, options, inputId, overlayId) {
    contentEl.innerHTML = '';
    options.forEach((opt) => {
        const optionEl = document.createElement('div');
        optionEl.className = 'hint-option';
        optionEl.innerHTML = formatBubbleContent(opt)
            .replace(/class="action-text"/g, 'class="hint-action"')
            .replace(/class="speech-text"/g, 'style="color:var(--text-main)"');
        optionEl.addEventListener('click', function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            applyHintToInput(inputId, overlayId, opt);
        });
        contentEl.appendChild(optionEl);
    });
}
