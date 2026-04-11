// ─────────────────────────────────────────────────────────────────────────────
// ENHANCED PREGNANCY INTERACTION AUTO-SCENE SYSTEM
// Fires in various scenarios to create natural, emotional pregnancy interactions.
// Triggers: Room entry, private moments, schedule changes, symptom flares.
// Max 3 triggers per pregnant bot per virtual day.
// ─────────────────────────────────────────────────────────────────────────────
async function maybeInjectPregnancyInteraction(grp, members, triggerType = 'room_entry') {
    if (!grp || !members.length) return;
    const keys = getGroqKeys();
    if (!keys.length) return;

    // Determine context and bots in scene
    let sceneBots = [];
    let sceneType = 'room_entry';
    let isPrivateScene = false;

    if (triggerType === 'room_entry') {
        const userRoomId = grp.userRoom;
        if (!userRoomId) return;

        // Get bots in this room
        sceneBots = members.filter(m => {
            const r = (grp.memberRooms || {})[m.id] || getBotBedroomId(m.id);
            return r === userRoomId;
        });
        if (sceneBots.length < 2) return; // need at least 2 bots for room entry
    } else if (triggerType === 'private_moment') {
        // Private scenes: just 2 bots having a quiet moment
        sceneBots = members.slice(0, 2); // First 2 bots
        isPrivateScene = true;
        sceneType = 'private';
    } else if (triggerType === 'symptom_flare') {
        // Symptom-based: bots reacting to a pregnancy symptom
        sceneBots = members.slice(0, Math.min(3, members.length)); // Up to 3 bots
        sceneType = 'symptom';
    } else if (triggerType === 'schedule_change') {
        // Schedule-based: pregnancy affecting daily routine
        sceneBots = members.slice(0, Math.min(4, members.length)); // Up to 4 bots
        sceneType = 'schedule';
    }

    // Find pregnant bots that qualify (expanded criteria)
    const pregnantBots = sceneBots.filter(m => {
        const cd = m.cycleData;
        if (!cd || !cd.pregnant || cd.birthVirtualDay) return false;

        if (cd.isParasitePregnancy) {
            const pDay = (typeof getParasiteWeek === 'function') ? getParasiteWeek(m) : 0;
            return pDay >= 3; // Include earlier parasite stages
        }

        const weeks = (typeof getEffectivePregnancyWeek === 'function') ? getEffectivePregnancyWeek(m) :
                      (typeof getPregnancyWeek === 'function' ? getPregnancyWeek(m) : 0);

        // Expanded pregnancy stage triggers
        if (triggerType === 'symptom_flare') return weeks >= 6;  // Include 1st trimester symptoms
        if (triggerType === 'private_moment') return weeks >= 12; // Include 2nd trimester bonding
        return weeks >= 20; // Earlier than before for room entries
    });

    if (!pregnantBots.length) return;

    const refBot = members[0];
    const todayVirtualDay = getVirtualDay(refBot);
    const aiLang = getLang();
    const currentHour = Math.floor(getTimeOfDay(refBot) / 60); // 0-23

    // Check per-bot daily limit (increased to 3, with trigger type consideration)
    if (!grp._pregInteractLog) grp._pregInteractLog = {};
    const eligiblePregnant = pregnantBots.filter(pb => {
        const log = grp._pregInteractLog[pb.id] || { day: -1, count: 0 };
        if (log.day !== todayVirtualDay) return true; // new day - reset
        const maxPerDay = triggerType === 'private_moment' ? 1 : 3; // Private moments are rarer
        return log.count < maxPerDay;
    });
    if (!eligiblePregnant.length) return;

    // Pick one pregnant bot as the focus (weighted by pregnancy stage - later stages more likely)
    const focusPreg = eligiblePregnant.sort((a,b) => {
        const getStage = (bot) => {
            const cd = bot.cycleData;
            if (cd.isParasitePregnancy) return (typeof getParasiteWeek === 'function') ? getParasiteWeek(bot) : 0;
            return (typeof getEffectivePregnancyWeek === 'function') ? getEffectivePregnancyWeek(bot) :
                   (typeof getPregnancyWeek === 'function' ? getPregnancyWeek(bot) : 0);
        };
        return getStage(b) - getStage(a); // Later stages first
    })[0];

    const focusCd = focusPreg.cycleData;
    const isParasite = !!(focusCd && focusCd.isParasitePregnancy);

    // Determine participants based on scene type
    let commenters, sceneParticipants;
    if (sceneType === 'private') {
        // Private moment: just 2 bots, more intimate
        sceneParticipants = sceneBots.slice(0, 2);
        commenters = sceneParticipants.filter(m => m.id !== focusPreg.id);
    } else {
        // Room scenes: all bots except focus can comment
        sceneParticipants = sceneBots;
        commenters = sceneBots.filter(m => m.id !== focusPreg.id);
    }

    // If multiple pregnant bots, they can interact with each other
    const otherPregnant = pregnantBots.filter(m => m.id !== focusPreg.id);

    // Build enhanced pregnancy state description with current mood and symptoms
    let pregDesc = '';
    const focusStates = (focusPreg.states || []).filter(id => ALL_STATES.some(s => s.id === id));
    const focusMoods = focusStates.filter(id => ALL_STATES.find(s => s.id === id)?.type === 'system' && [
        'content', 'happy', 'excited', 'relaxed', 'satisfied', 'playful',
        'irritable', 'frustrated', 'annoyed', 'grumpy', 'worried', 'stressed', 'overwhelmed',
        'lonely', 'bored', 'disappointed', 'flirty', 'affectionate', 'romantic'
    ].includes(id)).map(id => ALL_STATES.find(s => s.id === id)?.label).filter(Boolean);

    if (isParasite) {
        const pDay = getParasiteWeek(focusPreg);
        const larvaeCount = (focusCd.fetuses || []).length;
        const stageLabel = pDay < 6 ? 'Feeding Phase' : pDay < 9 ? 'Rapid Growth' : pDay < 12 ? 'Maturation' : 'EMERGENCE';
        const stageDesc = pDay < 6 ? 'constant hunger, chemical arousal, breast changes' :
                         pDay < 9 ? 'extreme bloating, alien movements, overwhelming sensations' :
                         pDay < 12 ? 'crushing pressure, synchronized thrashing, aphrodisiac haze' :
                         'absolute limit, violent contractions, burning agony';

        pregDesc = `${focusPreg.name} is a PARASITE HOST - ${larvaeCount} alien larvae gestating inside her body. She is in the ${stageLabel} stage (Day ${pDay}/15).
Physical state: abdomen visibly writhing with alien multi-point movement, skin stretched tight, faint warmth, breasts engorged leaking iridescent fluid, experiencing ${stageDesc}.
Current mood: ${focusMoods.length ? focusMoods.join(', ') : 'deeply unsettled, trying to cope with the horror'}.
Emotional state: aware something profoundly wrong is happening to her body, experiencing waves of denial mixed with unavoidable physical reality.`;
    } else {
        const weeks = (typeof getEffectivePregnancyWeek === 'function') ? getEffectivePregnancyWeek(focusPreg) :
                      (typeof getPregnancyWeek === 'function' ? getPregnancyWeek(focusPreg) : 27);
        const fCount = (focusCd.fetuses || []).length;
        const isMultiples = fCount > 1;
        const isOverdue = weeks >= 43;
        const isLate = weeks >= 36;

        // Determine trimester and associated symptoms/moods
        let trimester, physicalState, emotionalState;
        if (weeks < 13) {
            trimester = '1st Trimester';
            physicalState = 'early pregnancy symptoms - morning sickness, breast tenderness, fatigue';
            emotionalState = focusMoods.length ? focusMoods.join(', ') : 'adjusting to pregnancy, mix of excitement and worry';
        } else if (weeks < 27) {
            trimester = '2nd Trimester';
            physicalState = 'visible bump, fetal movement, increased energy, possible back pain';
            emotionalState = focusMoods.length ? focusMoods.join(', ') : 'feeling more confident, bonding with baby';
        } else {
            trimester = '3rd Trimester';
            physicalState = 'heavy and uncomfortable, frequent movement, swelling, nesting urges';
            emotionalState = focusMoods.length ? focusMoods.join(', ') : 'eager for birth but physically exhausted';
        }

        pregDesc = `${focusPreg.name} is in her ${trimester} (${weeks} weeks pregnant${isMultiples ? ` with ${fCount} babies` : ''}).${isOverdue ? ' She is overdue and anxious.' : isLate ? ' She is near her due date and nesting.' : ''}
Physical state: ${physicalState}.
Current mood: ${emotionalState}.
She is visibly pregnant and physically present in her changing body.`;
    }

    const commenterDescs = commenters.map(m => {
        const mcd = m.cycleData;
        let extra = '';
        if (mcd && mcd.pregnant && !mcd.birthVirtualDay) {
            if (mcd.isParasitePregnancy) {
                const pd = (typeof getParasiteWeek === 'function') ? getParasiteWeek(m) : 0;
                if (pd >= 6) extra = ` [also a parasite host, Day ${pd}/15 - they share this strange experience]`;
            } else {
                const wk = (typeof getEffectivePregnancyWeek === 'function') ? getEffectivePregnancyWeek(m) :
                           (typeof getPregnancyWeek === 'function' ? getPregnancyWeek(m) : 0);
                if (wk >= 27) extra = ` [also pregnant, ${wk} weeks - they can relate to each other]`;
            }
        }
        const bio = (getDynField(m,'prompt') || m.prompt || '').substring(0, 80);
        return `${m.name} (${m.gender || 'female'}${m.age ? ', '+m.age : ''}${extra}): ${bio}`;
    }).join('\n');

    const focusBio = (getDynField(focusPreg,'prompt') || focusPreg.prompt || '').substring(0, 100);
    const recentChat = getRecentChatSnippet(grp.history, 'character');
    const key = getNextGroqKey();

    const sceneDescription = isParasite
        ? 'The commenters react to the alien, unsettling signs of her parasite gestation - with a mix of concern, unease, fascination, and maybe an instinct to comfort her even though they do not understand what is happening. Comments are NOT celebratory - they are complicated, tense, empathetic. The pregnant bot replies with vulnerability and a mix of denial and unavoidable physical reality.'
        : otherPregnant.length > 0
            ? 'Both pregnant characters can interact warmly - noticing each other\'s belly, swapping how they feel, one might reach out to feel the other\'s baby move if they are close. Warm and intimate between them. Commenters may observe or join in. The scene is affectionate and mutually supportive.'
            : 'The commenters naturally notice, reach out, and interact with the pregnancy - feeling the baby move, commenting on how she looks, rubbing her back. Warm, genuine, curious. The pregnant bot responds naturally - pleased, maybe a little self-conscious, physically present in her discomfort.';

    const prompt = `You are writing a spontaneous, natural group scene. Write ${commenters.length + 1} separate messages - ${commenters.map(m => m.name).join(', ')} each say/do something to ${focusPreg.name}, then ${focusPreg.name} responds.

SETTING: Everyone is in the same room. The user just walked in.

PREGNANT CHARACTER:
${pregDesc}
Personality: ${focusBio}

OTHERS IN THE ROOM:
${commenterDescs}

RECENT CHAT CONTEXT:
${recentChat}

SCENE DIRECTION:
${sceneType}

FORMAT - output exactly ${commenters.length + 1} messages in this structure:
[${commenters[0].name}]: *action* "dialogue" *feeling*
${commenters.length > 1 ? commenters.slice(1).map(m => `[${m.name}]: *action* "dialogue" *feeling*`).join('\n') + '\n' : ''}[${focusPreg.name}]: *action* "dialogue" *inner feeling or reaction*

RULES:
- Each message: 1 action beat + 1-2 spoken lines + 1 emotional/physical beat. Full length like normal chat.
- Physical contact with the belly is encouraged for normal pregnancy. For parasite - hesitant touch, recoiling slightly at what they feel.
- NEVER write "[User]" - the user just arrived, they are silent observers.
- All in ${aiLang}. No EMOTION tag. No asterisks inside dialogue. Keep character voices distinct.
- For parasite: reactions should feel ALIEN and disturbing, not cute.
- For normal: reactions should feel WARM and intimate, not clinical.`;

    try {
        showTypingFor(commenters[0]); // show typing for first commenter
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_SCHEDULE_MODEL,
                max_tokens: 1200,
                temperature: 0.8,
                messages: [
                    { role: 'system', content: 'You are a creative roleplay scene writer. Write natural, in-character group scenes. Follow the format exactly.' },
                    { role: 'user', content: prompt }
                ]
            }),
            signal: AbortSignal.timeout(60000)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const raw = (data.choices?.[0]?.message?.content || '').replace(/```[\s\S]*?```/g,'').trim();
        if (!raw || raw.length < 30) return;

        // Parse the [Name]: ... blocks
        const allBots = [...commenters, focusPreg];
        const msgRegex = /\[([^\]]+)\]:\s*([\s\S]*?)(?=\[|$)/g;
        let match;
        const parsed = [];
        while ((match = msgRegex.exec(raw)) !== null) {
            const name = match[1].trim();
            const content = match[2].trim();
            if (!content) continue;
            const speaker = allBots.find(b => b.name.toLowerCase() === name.toLowerCase() ||
                                              name.toLowerCase().startsWith(b.name.toLowerCase().split(' ')[0].toLowerCase()));
            if (speaker) parsed.push({ bot: speaker, content });
        }

        if (!parsed.length) {
            // Fallback: inject raw as single message from first commenter
            grp.history.push({ role: 'assistant', content: raw, speakerId: commenters[0].id, msgId: 'pregint_' + Date.now(), isPregInteract: true });
            commenters[0].lastChatted = Date.now();
            grp.lastChatted = Date.now();
        } else {
            for (let i = 0; i < parsed.length; i++) {
                const { bot: speaker, content } = parsed[i];
                const delay = i * 1200;
                await new Promise(r => setTimeout(r, delay));
                grp.history.push({ role: 'assistant', content, speakerId: speaker.id, msgId: 'pregint_' + Date.now() + '_' + i, isPregInteract: true });
                speaker.lastChatted = Date.now();
                grp.lastChatted = Date.now();
                saveGroups();
                renderGroupChat();
            }
        }

        // Update daily counter for the focus pregnant bot
        const prevLog = grp._pregInteractLog[focusPreg.id] || { day: -1, count: 0 };
        grp._pregInteractLog[focusPreg.id] = {
            day: todayVirtualDay,
            count: prevLog.day === todayVirtualDay ? prevLog.count + 1 : 1
        };
        saveGroups();
        renderGroupChat();
    } catch(e) {
        logError('maybeInjectPregnancyInteraction', e.message);
    } finally {
        const typingArea = document.getElementById('grp-typing-indicator');
        if (typingArea) typingArea.style.display = 'none';
    }
}
