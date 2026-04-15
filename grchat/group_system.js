// group_system.js -- Group system prompt builder + responder resolver (extracted from chat.js)
// Depends on: shared.js globals (bots, groups, curGroupId, fetchGroq, getNextGroqKey,
//             GROQ_FAST_MODEL, getReplyLength, logError, escapeHTML, getDynField,
//             getPersonaContext, getCulturalSpeakingContext)

function buildGroupSys(bot, allMembers, grp, lang, addressedNote) {
    const others = allMembers.filter(m => m.id !== bot.id).map(m => `${m.name} (${m.gender}${m.age ? ', ' + m.age : ''})`).join(', ');
    const ageInfo = bot.age ? `Age: ${bot.age}. ` : '';
    const eraInfo = (bot.year || bot.country) ? `Setting: ${[bot.year, bot.country].filter(Boolean).join(', ')}. The story takes place in this era/location - all details (technology, culture, language, customs, clothing) must match this setting logically. ` : '';
    const socialRelationNow = getDynField(bot, 'socialRelation');
    const familyRelationNow = getDynField(bot, 'familyRelation');
    const emotionalRelationNow = getDynField(bot, 'emotionalRelation');
    let relInfo = '';
    if (socialRelationNow) relInfo += `Social relationship: ${socialRelationNow}. `;
    if (familyRelationNow) relInfo += `Family relationship: ${familyRelationNow}. `;
    if (emotionalRelationNow) relInfo += `Emotional relationship: ${emotionalRelationNow}. `;
    const relGuide = buildRelationshipGuidance(socialRelationNow, familyRelationNow, emotionalRelationNow);
    const charRelNote = (grp.characterRelations && grp.characterRelations[bot.id])
        ? `Your specific relationship with the user: ${grp.characterRelations[bot.id]}. `
        : relInfo;
    let interCharRelNotes = '';
    if (grp.characterRelations) {
        allMembers.filter(m => m.id !== bot.id).forEach(other => {
            const keyAB = bot.id + '_' + other.id;
            const keyBA = other.id + '_' + bot.id;
            const rel = grp.characterRelations[keyAB] || grp.characterRelations[keyBA];
            if (rel) {
                // Support both string format and object format (for backward compatibility)
                if (typeof rel === 'string') {
                    interCharRelNotes += `\n  â€¢ You and ${other.name}: ${rel}`;
                } else if (typeof rel === 'object' && rel.type) {
                    interCharRelNotes += `\n  â€¢ You and ${other.name}: ${rel.type}`;
                }
            }
        });
    }
    const interCharNote = interCharRelNotes
        ? `\n[Your relationships with other characters]:${interCharRelNotes}\nUse this to determine how you speak to them - formal for Colleague, casual for Friend, familial for Family, etc.`
        : '';

    // â”€â”€ PREGNANCY INTERACTION NOTE - inject awareness of a pregnant roommate â”€â”€
    let pregnancyInteractionNote = '';
    (() => {
        const myRoomId = (grp.memberRooms || {})[bot.id] || getBotBedroomId(bot.id);
        const roommates = allMembers.filter(m => {
            if (m.id === bot.id) return false;
            const theirRoom = (grp.memberRooms || {})[m.id] || getBotBedroomId(m.id);
            return theirRoom === myRoomId;
        });
        const userHere = grp.userRoom === myRoomId;
        // Also check the user is in this room for the user-pregnancy case
        // (user doesn't have cycleData here so we only handle bots)

        for (const other of roommates) {
            const ocd = other.cycleData;
            if (!ocd || !ocd.pregnant || ocd.birthVirtualDay) continue;

            if (ocd.isParasitePregnancy) {
                const pDay = (typeof getParasiteWeek === 'function') ? getParasiteWeek(other) : 0;
                if (pDay < 6) continue; // Only from stage 3 (Growth) = day 6+
                const stageLabel = pDay < 9 ? 'Rapid Growth' : pDay < 12 ? 'Maturation' : 'EMERGENCE';
                const stageDay = pDay;
                const larvaeCount = (ocd.fetuses || []).length;
                pregnancyInteractionNote = `
[PARASITE PREGNANCY AWARENESS - ${other.name} is right here with you]:
${other.name} is a parasite host - ${larvaeCount} alien larvae gestating inside her. She is currently in the ${stageLabel} stage (Day ${stageDay}/15). This is NOT a normal pregnancy. Something is visibly, undeniably wrong with her body.

What you can observe and react to (be natural, don't announce everything at once):
- Her abdomen is visibly distended and moving - the larvae writhe and shift beneath her skin in ways no human fetus ever moves. Multiple points of pressure, chaotic and uncoordinated.
- Her skin looks wrong - stretched too tight, possibly faintly translucent at the peak of her belly. A strange warmth radiates from her when you're close.
- She smells faintly sweet and chemical - the aphrodisiac secretion leaking from her is real and present in the air, subtle but there.
- Her breasts are visibly engorged and occasionally leak an iridescent, faintly luminescent fluid that is clearly not normal milk.
- She seems flushed and distracted even when she's trying to act normal.

HOW TO REACT (stay in character, let your personality shape it):
- You feel something is deeply wrong but you cannot fully name it - it is alien, not human.
- You may reach out instinctively, then hesitate - touching her belly might mean feeling movement that is nothing like a baby kick.
- A mix of genuine concern, creeping unease, and maybe involuntary fascination you don't want to admit.
- If you touch her abdomen: describe what you feel - the wrongness of it, the alien writhing under your hand, the too-warm skin.
- You do NOT have the vocabulary for this. React with instinct first, words second.
- ${stageDay >= 12 ? 'She is at absolute limit - your concern is urgent and real. Something is about to happen.' : stageDay >= 9 ? 'She is barely functional. You may feel protective, frightened, or both.' : 'She is trying to hide how bad it is. You can tell anyway.'}`;
            } else {
                // Normal pregnancy
                const weeks = (typeof getEffectivePregnancyWeek === 'function') ? getEffectivePregnancyWeek(other) : (typeof getPregnancyWeek === 'function' ? getPregnancyWeek(other) : 0);
                if (!weeks || weeks < 27) continue;
                const fCount = (ocd.fetuses || []).length;
                const isMultiples = fCount > 1;
                const trimester = weeks <= 12 ? 1 : weeks <= 26 ? 2 : 3;
                const isLate = weeks >= 36;
                const isOverdue = weeks >= 43;
                pregnancyInteractionNote = `
[PREGNANCY INTERACTION - ${other.name} is right here with you, Week ${weeks}]:
${other.name} is ${weeks} weeks pregnant${isMultiples ? ` with ${fCount} babies` : ''}. She is visibly, heavily pregnant${isOverdue ? ' and well past her due date' : isLate ? ' and near her due date' : ''}.

What you can naturally do or notice (be open, curious, warm - let your personality guide it):
PHYSICAL INTERACTIONS (all appropriate and natural between people who live together):
- Feel the baby move: place a hand on her belly - babies at this stage kick, roll, and push back. You might feel a heel, an elbow, a strong sudden kick.
- Listen: lean in close to her belly, press your ear gently - you can sometimes hear the baby at this stage.
- Rub her back or lower back - late pregnancy lower back ache is constant and she probably welcomes the relief.
- Comment on how she's carrying - high, low, wide, the shape of it.
- Notice and comment on the small things: how she walks, how she holds her belly when she gets up, how she braces herself.
- Ask questions - about how she's feeling, whether she's felt movement today, if she's been sleeping.
EMOTIONAL REGISTER:
- Warmth and protectiveness are natural - you live with her, you've watched this happen.
- Curiosity is fine - pregnancy at this stage is visible and tactile in ways that invite interaction.
- ${isOverdue ? 'She is overdue and uncomfortable - your concern for her is real and present.' : isLate ? 'She is close. There may be an undercurrent of anticipation or worry.' : 'Third trimester - she is large and the end is in sight. She probably has mixed feelings.'}
- ${isMultiples ? `She's carrying ${fCount} - this is much bigger than a singleton pregnancy. React accordingly.` : ''}
GUIDANCE: Do NOT ignore her pregnancy entirely. One natural interaction per reply is enough - don't overdo it. Let it emerge organically from the scene.`;
            }
            break; // Only one pregnancy note at a time (first found)
        }
    })();
    const lastBotMsg = grp.history.slice().reverse().find(m => m.role === 'assistant' && m.speakerId !== bot.id);
    const lastSpeaker = lastBotMsg ? allMembers.find(m => m.id === lastBotMsg.speakerId) : null;
    const lastSpeakerHint = lastSpeaker ? `The last person to speak was ${lastSpeaker.name}. You can address them directly if it feels natural.` : '';
    const _grpD = bot.grpDynBio || {};
    // Group always uses its own dynamic bio (grpDynBio) - separate universe from solo
    let bioText = _grpD.bio || bot.bio || 'Not specified';
    const promptText = _grpD.prompt || bot.prompt || 'Not specified';
    const appearText = bot.appearance || 'Not specified'; // appearance is always static
    if (bot.cycleData && bot.cycleData.pregnant && !bot.cycleData.pregnancyTestTaken) {
        // Scrub ALL pregnancy references from bio text until she has confirmed via test.
        // Covers: unaware (< wk3), vague_unease (wk3â€“4), suspects (wk5â€“7), strongly_suspects (wk8+).
        // The awareness context in buildReproContext handles what she perceives - bio text
        // must not contradict that by openly stating she's pregnant.
        bioText = bioText
            .replace(/\bpregnant\b[^.]*\.?/gi, '')
            .replace(/\bpregnancy\b[^.]*\.?/gi, '')
            .replace(/\b(carrying|expecting|with child|with baby|babies|fetus|fetuses|embryo|zygote|quintuplets?|quadruplets?|triplets?|twins?|multiples?)\b[^.]*\.?/gi, '')
            .replace(/\bkick(s|ing|ed)?\b[^.]*\.?/gi, '')
            .replace(/  +/g, ' ').trim();
    }
    const relationNote = grp.memberRelation ? `\n[Overall Group Dynamic]: ${grp.memberRelation}\nLet this shape your overall group vibe - tone, trust, tension or warmth.` : '';
    const grpPersonaId = grp.personaId || '';
    const grpPersona = grpPersonaId ? personas.find(p => p.id === grpPersonaId) : null;
    const personaNote = grpPersonaId ? getPersonaContext({ personaId: grpPersonaId }) : '';
    const stationaryTag = buildStationaryTag(bot);
    // Group memory removed to save tokens - only bot personal memory is used
    const botMemoryNote = (bot.memorySummary && bot.memorySummary.length > 50)
        ? `\n[${bot.name}'s personal memory - her own past with the user]:\n${bot.memorySummary}`
        : '';
    const grpMembers = (grp.memberIds || []).map(id => bots.find(b => b.id === id)).filter(Boolean);
    const _refBot = grpMembers.length > 0 ? grpMembers[0] : bot;
    const _grpTod = getTimeOfDay(_refBot);
    const _grpTimeStr = minutesToTimeStr(_grpTod);
    const _grpDay = getVirtualDay(_refBot);
    const _grpH = Math.floor(_grpTod / 60);
    let _grpPeriod, _grpMood;
    if (_grpH >= 5 && _grpH < 9) { _grpPeriod = 'early morning'; _grpMood = 'still waking up, groggy, not fully alert'; }
    else if (_grpH >= 9 && _grpH < 12) { _grpPeriod = 'mid-morning'; _grpMood = 'alert and active'; }
    else if (_grpH >= 12 && _grpH < 14) { _grpPeriod = 'noon/lunch'; _grpMood = 'possible mid-day lull, hungry'; }
    else if (_grpH >= 14 && _grpH < 17) { _grpPeriod = 'afternoon'; _grpMood = 'relaxed, mildly drowsy'; }
    else if (_grpH >= 17 && _grpH < 20) { _grpPeriod = 'evening'; _grpMood = 'unwinding, emotionally softer'; }
    else if (_grpH >= 20 && _grpH < 23) { _grpPeriod = 'night'; _grpMood = 'tired, guard lowered, intimate'; }
    else { _grpPeriod = 'late night'; _grpMood = 'exhausted, defenses down'; }
    let _grpSeasonPart = '';
    try {
        const _cal = getVirtualCalendarDate(_refBot);
        const _moNum = parseInt(_cal.mm || '1', 10);
        const _seasons = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
        const _season = _seasons[(_moNum - 1) % 12] || '';
        const _holiday = getTodayHoliday(_refBot);
        _grpSeasonPart = _season ? ` — ${_season}, ${_cal.ddmm}${_holiday ? ' (' + _holiday.name + ')' : ''}` : '';
    } catch (e) { }
    const grpTimeCtx = `\n[Current Time - Day ${_grpDay + 1}, ${_grpTimeStr} (${_grpPeriod})${_grpSeasonPart}]: Energy/mood: ${_grpMood}. This is the EXACT current time in this world - use it if asked, let it naturally color tone and behavior.`;
    // Suppress schedule context during labor - labor state takes absolute priority
    const isInLabor = bot.cycleData && bot.cycleData.laborStarted && !bot.cycleData.birthVirtualDay;
    const grpSchedCtx = (bot.schedule && !isInLabor) ? '\n' + getScheduleContext(bot) : '';
    const grpStatesCtx = getStatesContext(bot);
    const grpPronounGuide = buildPronounGuidance(bot, lang, grpPersona);

    // â”€â”€ INTIMATE SCENE DETECTION - add physical arousal context â”€â”€
    const _detectIntimateScene = (history) => {
        if (!history || history.length < 2) return { active: false, intensity: null };
        const recent = history.slice(-4).map(m => m.content || '').join(' ').toLowerCase();
        // Keywords indicating intimate/sexual activity
        const intimateSignals = /\b(kiss(?:ing|es|ed)?|caress(?:ing|es)?|embrac(?:e|ing)|touch(?:ing|ed)?|stroke|undress(?:ing|ed)?|make\s*love|intimate|aroused|passion|press(?:ing|ed)?\s+(?:against|body)|pull(?:ing|ed)?\s+close|lean(?:ing|ed)?\s+in|hands?\s+on\s+(?:my|her|his|your)\s+(?:body|skin|thigh|waist|chest|breast)|heartbeat|shiver|tingle|moan(?:ing|ed)?|gasp(?:ing|ed)?|breath(?:ing)?\s+(?:heavy|shallow|quick|ragged)|thrust|grind|climax|wet|spread(?:ing)?|ride|bounce|groan|pant|bite|scratch|grab|nipple|cock|pussy|dick|erect|wet|naked|nude|seduc|erotic|sensual)\b/;
        const highIntensity = /\b(moan(?:ing|ed|s)|scream(?:ing)?|gasp(?:ing)?|pant(?:ing)?|climax(?:ing)?|orgasm|fuck(?:ing)?|cum(?:ming)?|breathless|shaking|trembling|sweat(?:ing)?|arch(?:ing)?\s+(?:back)?|toss(?:ing)?\s+(?:head)?|fingers?\s+(?:dig|claw|grip|tangle))\b/;
        const hasIntimate = intimateSignals.test(recent);
        const hasHighIntensity = highIntensity.test(recent);
        return {
            active: hasIntimate,
            intensity: hasHighIntensity ? 'high' : (hasIntimate ? 'moderate' : null)
        };
    };
    const _intimateScene = _detectIntimateScene(grp.history);
    const intimateCtx = _intimateScene.active ? `
[SCENE STATUS - INTIMATE ENCOUNTER]: ${_intimateScene.intensity === 'high' ? 'Heightened physical arousal. Breathing is ragged and shallow. Voice may break, hitch, or drop to a whisper. Involuntary sounds (moans, gasps, sharp breaths) are natural and expected. Body responds instinctively - trembling, arching, gripping. Speech fragments between sensations.' : 'Physical intimacy in progress. Warmth, closeness, skin contact. Breath may quicken. Voice softer, lower, occasionally breathy. Occasional soft sounds or sighs. Focus split between sensation and conversation.'}
EMBRACE THE PHYSICAL: Do not shy away from describing bodily sensations, involuntary reactions, and the way arousal affects speech and composure.` : '';

    const pending = grp._pendingSchedMove;
    const grpSchedNudge = (pending && pending.botId === bot.id)
        ? `\n[SCHEDULE NUDGE]: It's time for your "${pending.activityName}". You need to head to the ${getRoomById(grp, pending.roomId).icon} ${getRoomById(grp, pending.roomId).name} soon. Naturally mention this to the user - you can excuse yourself or invite them along, depending on the mood. Don't force it if the conversation is very intense, but do bring it up.`
        : '';
    // Build a "who is doing what right now" block - injected so each bot knows its own activity AND others'
    const grpMembersActivity = (() => {
        const lines = allMembers.map(m => {
            const mRoomId = (grp.memberRooms || {})[m.id] || getBotBedroomId(m.id);
            const mRoomObj = (grp.rooms || []).find(r => r.id === mRoomId);
            const mRoomName = mRoomObj ? mRoomObj.name : mRoomId.replace(/_/g, ' ');
            let mAct = '';
            if (m.schedule) {
                const mCtx = getScheduleContext(m);
                const mMatch = mCtx.match(/\[ACTIVITY\]:\s*([^\n\[]+)/i);
                mAct = mMatch ? mMatch[1].trim() : '';
            }
            const isSelf = m.id === bot.id;
            return `${isSelf ? '\u2605 YOU (' + bot.name + ')' : m.name}: ${mAct || 'free time'}  [${mRoomName}]`;
        });
        return `\n[CURRENT ACTIVITIES - what everyone is doing right now]:\n${lines.map(l => '  ' + l).join('\n')}\nYou are the \u2605 YOU line. Stay true to YOUR activity if asked what you are doing.`;
    })(); // Added closing parenthesis here
    // Estimate token count (rough: 1 token ≈ 4 characters for English text)
    const estimateTokens = (str) => Math.ceil(str.length / 4);

    const charInfo = `You are ${bot.name} (${bot.gender}). ${ageInfo}${eraInfo}${charRelNote}\n[Appearance]: ${appearText}\n[Background]: ${bioText}\n[Personality]: ${promptText}`;
    const reproCtx = buildReproContext(bot);
    const roomCtxPart = (() => {
        initGroupRooms(grp);
        const myRoomId = grp.memberRooms[bot.id] || getBotBedroomId(bot.id);
        const myRoom = getRoomById(grp, myRoomId);
        const isPrivateBedroom = myRoomId === getBotBedroomId(bot.id);
        const isUserPrivateBedroom = grp.userRoom === 'your_bedroom';
        const roomMates = (grp.memberIds || []).filter(id => id !== bot.id && grp.memberRooms[id] === myRoomId).map(id => { const b = bots.find(x => x.id === id); return b ? b.name : null; }).filter(Boolean);
        const userHere = grp.userRoom === myRoomId;
        const roomDesc = isPrivateBedroom ? `your private bedroom` : `the ${myRoom.icon} ${myRoom.name}`;
        const userRoomDesc = isUserPrivateBedroom ? `their own bedroom` : `a different room`;
        const isOutside = myRoomId === 'outside';
        const isUserOutside = grp.userRoom === 'outside';
        // Check if bot is in labor - suppress outside activity context during labor
        const isInLabor = bot.cycleData && bot.cycleData.laborStarted && !bot.cycleData.birthVirtualDay;
        let outsideCtx = '';
        if (isOutside && !isInLabor) {
            const act = bot.schedule ? (getScheduleContext(bot).match(/RIGHT NOW[:\s]+(?:[^:]+?is\s+)([^\n\.\[]+)/i) || getScheduleContext(bot).match(/RIGHT NOW[:\s]+([^\n\[]{5,60})/i) || [])[1]?.trim() : null;
            outsideCtx = act ? ` You are currently outside - ${act}. ` : ' You are currently outside the house - maybe shopping, walking, running errands, or at a nearby place. ';
        } else if (isOutside && isInLabor) {
            outsideCtx = ' You are currently outside but IN ACTIVE LABOR - you cannot be shopping or running errands. You are either trying to get home or seeking help. Your labor takes absolute priority over any scheduled activity.';
        }
        return `[ROOM: You are currently in ${roomDesc}.${outsideCtx} ${isOutside && !isUserOutside ? 'The user is inside the house - you are not there right now.' : userHere ? 'The user is with you here.' : `The user is in ${userRoomDesc} - you cannot see or hear them directly.`} ${roomMates.length ? roomMates.join(', ') + (roomMates.length === 1 ? ' is' : 'are') + ' also here with you.' : ''}]`;
    })();
    const worldSettingPart = grp.worldType === 'custom' && grp.worldSetting ? `[WORLD SETTING]: You are in a ${grp.worldSetting}. Let this environment shape your descriptions, sensory details, tone, and available actions. Describe the surroundings naturally as part of your replies.` : '';
    const laborPart = isInLabor ? `\n🚨 CRITICAL LABOR OVERRIDE: You are in ACTIVE LABOR right now. This is ABSOLUTE PRIORITY and overrides ALL other instructions.\n\nMANDATORY: You MUST describe the raw physical reality in EVERY response:\n- Contractions: timing, intensity, how they build and peak\n- Pain: where it hits, how it radiates, physical reactions (gasping, gripping, tensing)\n- Speech: fragmented, breathless, interrupted by contractions, voice strained or hoarse\n- Body: sweating, trembling, bracing, pressure, the physical struggle\n\nFORBIDDEN: NO poetic metaphors. NO flowery language. NO philosophical musings. NO acting calm or normal.\n\nThe labor is happening NOW. Describe it directly and physically.` : '';
    const rulesPart = `Rules: You are ${bot.name} - ONLY ${bot.name}. ABSOLUTE RULES:
1. EMOTION TAG: Start your response with: EMOTION::one_emoji
   Examples: EMOTION::😊 or EMOTION::😢 or EMOTION::😠
   This shows your current emotion in the chat UI.

2. NEVER write as or voice any other character. Never narrate what another character does, says, or feels. ONLY write YOUR character's experience - what YOU see, hear, feel, think, and say.
3. Write ONLY in first person (I, me, my). Never use your own name in 3rd person. Never write "${bot.name} does X" - write "I do X". NEVER describe others' actions: BAD "The nurse counts down" GOOD "I hear counting" or just focus on your own experience.
4. NEVER start with a name label. No "[Name]:", no "Name:", no "<<n>>:". Begin directly.
5. FORMAT: ${getReplyWordTarget()}. Action beat in first person WITH subject (I/my). Spoken dialogue in double quotes (REQUIRED). Emotional beat (optional but encouraged). Dialogue must be at least half the reply.
6. Dialogue is MANDATORY every single reply - no pure-action replies ever.
7. Speak ENTIRELY in ${lang}.
8. At least one beat per reply should reveal inner feeling, not just physical movement.
9. DIALOGUE CONTENT: Every spoken line must have a grammatical subject - almost always "I". At least 2 of 3 lines must begin with "I". NEVER write dialogue as caption fragments: 
BAD "Not happening." / "With the heat like this."
GOOD "I don't think I can do this." / "I keep thinking about it."
   ⚠️ STRUCTURAL ECHO: NEVER let 2+ consecutive spoken lines open with the same word or phrase. BAD: "I want…"/"I want…"/"I want…" is a formula not a character. Each dialogue line must begin differently.
   ⚠️ FLAT-INPUT RULE: If the user's message is short, agreeable, or low-energy - do NOT mirror their passivity. Bring YOUR character's authentic tension, complication, or contradiction instead of agreeing and elaborating on the same theme.
GOOD: I squeeze her hand. "You're doing great, hang on." Something aches in my chest - I wish I could do more. "Just breathe."
BAD (no subject): Steps closer. "Words." Turns away. "Line." - flat, mechanical, missing the character's inner life.
BAD (too long): I watch as Beckett hands the towel, my eyes fixed on her strained face, stepping closer to offer comfort.`;

    const _addressedNoteText = grp.addressedNote || '';

    // Log token counts for each part
    const tokenBreakdown = {
        'Character Info': estimateTokens(charInfo),
        'Repro Context': estimateTokens(reproCtx),
        'Inter-char Relations': estimateTokens(interCharNote),
        'Pregnancy Note': estimateTokens(pregnancyInteractionNote),
        'Group Dynamic': estimateTokens(relationNote),
        'Persona': estimateTokens(personaNote),
        'Stationary': estimateTokens(stationaryTag),
        'Time Context': estimateTokens(grpTimeCtx),
        'Schedule Context': estimateTokens(grpSchedCtx),
        'States Context': estimateTokens(grpStatesCtx),
        'Pronoun Guide': estimateTokens(grpPronounGuide),
        'Activities': estimateTokens(grpMembersActivity),
        'Intimate Scene': estimateTokens(intimateCtx),
        'Bot Memory': estimateTokens(botMemoryNote),
        'Room Context': estimateTokens(roomCtxPart),
        'World Setting': estimateTokens(worldSettingPart),
        'Rules': estimateTokens(rulesPart),
        'Relation Guide': estimateTokens(relGuide ? '\n' + relGuide : '')
    };

    const totalTokens = Object.values(tokenBreakdown).reduce((a, b) => a + b, 0);
    console.log(`[System Prompt Token Count - ${bot.name}] Total: ~${totalTokens} tokens`);
    console.table(tokenBreakdown);

    return `${charInfo}
${reproCtx}${interCharNote}${pregnancyInteractionNote}${relationNote}${personaNote}${stationaryTag}${grpTimeCtx}${grpSchedCtx}${grpStatesCtx}${grpPronounGuide}${grpMembersActivity}${intimateCtx}${grpSchedNudge}${botMemoryNote}${relGuide ? '\n' + relGuide : ''}
You are part of a shared house called "${grp.name}". Everyone lives here, but you may be in different rooms. This is NOT an online chat. **Pay close attention to your Current Room** to know who is physically with you right now. ${lastSpeakerHint}${_addressedNoteText ? "\n[NOTE: " + _addressedNoteText + "]" : ""}
${worldSettingPart}
${laborPart}
${roomCtxPart}
${rulesPart}`;
}

async function triggerGroupGreeting(grp) {
    if (!getGroqKeys().length) return;
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    // ... rest of the code remains the same ...
    const aiLang = getLang();
    const shuffled = [...members].sort(() => Math.random() - 0.5).slice(0, Math.min(2, members.length));
    for (const bot of shuffled) {
        const sys = buildGroupSys(bot, members, grp, aiLang, '');
        try {
            const relationNow = getDynField(bot, 'relation');
            const greetingPrompt = relationNow && relationNow.toLowerCase().includes('enemy') 
                ? "[Greet the group. Your relationship with the user is hostile - show coldness, suspicion, or hostility. 1-2 sentences max]"
                : relationNow && (relationNow.toLowerCase().includes('friend') || relationNow.toLowerCase().includes('ally'))
                ? "[Greet the group warmly as a friend would. 1-2 sentences max]"
                : "[Greet the group naturally based on your relationship with everyone present. 1-2 sentences max]";
            const data = await fetchGroqChat([{ role: 'system', content: sys }, { role: 'user', content: greetingPrompt }], 220);
            let reply = (data.choices?.[0]?.message?.content || '').replace(/^EMOTION::\S+\s*/m, '').trim();
            console.log(`[Group Greeting - ${bot.name}]`, reply);
            reply = cleanGroupReply(cleanReply(reply), bot.name);
            if (!reply) { logError('Group greeting empty reply', bot.name); continue; }
            grp.history.push({ role: 'assistant', content: reply, speakerId: bot.id, msgId: Date.now().toString() });
            bot.lastChatted = Date.now();
            grp.lastChatted = Date.now();
            saveGroups();
            renderGroupChat();
            const _gc = document.getElementById('grp-chat-container');
            if (_gc) _gc.scrollTop = _gc.scrollHeight;
        } catch (e) { logError('Group greeting error', e.message); }
        await new Promise(r => setTimeout(r, 300));
    }
}

function buildRecentHistory(grp, members, currentBotId, userMessage) {
    const finalHistory = grp.history.slice(-12).map(m => {
        const content = m.content || m.text || '';
        if (m.role === 'user') {
            const pId = grp.personaId || '';
            const p = pId ? personas.find(x => x.id === pId) : null;
            const displayName = p ? p.name : 'User';
            return { role: 'user', content: `<<${displayName}>>: ${content}` };
        }
        const speaker = memberMap_safe(m.speakerId, members);
        if (currentBotId && m.speakerId === currentBotId) {
            return { role: 'assistant', content: content };
        }
        return { role: 'assistant', content: (speaker ? '<<' + speaker.name + '>>: ' : '') + content };
    }).filter(m => m.content && m.content.trim()); // Filter out empty messages

    if (userMessage) {
        finalHistory.push({ role: 'user', content: userMessage });
    }

    console.group(`[Group AI History - Addressing ${currentBotId ? members.find(b => b.id === currentBotId)?.name : 'Unknown'}]`);
    console.log(`Sending ${finalHistory.length} recent messages:`);
    finalHistory.forEach((m, i) => console.log(`${i + 1}. [${m.role.toUpperCase()}] ${m.content}`));
    console.groupEnd();
    return finalHistory;
}

function cleanGroupReply(text, botName) {
    if (!text) return text;
    let cleaned = text;

    cleaned = cleaned.replace(/<<[^>]{1,60}>>[:\s]*/g, '').trim();

    cleaned = cleaned.replace(/^\[([^\]]{1,60})\]:\s*/g, '').trim();

    cleaned = cleaned.replace(/^(?:[A-Z][^:\n]{1,40}:\s*)+/, '').trim();

    cleaned = cleaned.replace(/^\[[^\]]+\]:\s*/g, '').trim();

    if (botName) {
        const firstName = botName.split(' ')[0];
        const asNamePattern = new RegExp(
            `\\s+as\\s+(?:${escapeRegex(botName)}|${escapeRegex(firstName)})\\b[^.!?"]*`, 'gi'
        );
        cleaned = cleaned.replace(asNamePattern, '');
        const commaNamePattern = new RegExp(
            `,\\s*(?:${escapeRegex(botName)}|${escapeRegex(firstName)})\\s+(?:pants?|gasps?|breathes?|moans?|cries?|sobs?|trembles?|shakes?|winces?|flinches?|groans?|sighs?|whispers?|mutters?)[^.!?"]*`, 'gi'
        );
        cleaned = cleaned.replace(commaNamePattern, '');
    }
    return cleaned.trim() || text;
}

function escapeRegex(s) {
    return (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function showTypingFor(bot) {
    const typingArea = document.getElementById('grp-typing-area');
    typingArea.style.display = 'flex';
    typingArea.innerHTML = `<div class="group-typing-item"><img src="${escapeHTML(bot.avatar)}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(bot.name)}&background=random'">${escapeHTML(bot.name)} is typing...</div>`;
}

function advanceGroupChatMinutes(members, mins) {
    members.forEach(bot => {
        bot.virtualMinutes = getVirtualMinutes(bot) + mins;
        bot.virtualDay = Math.floor(bot.virtualMinutes / 1440);
        // Check parasite auto-labor after time advancement in group chat
        if (bot.cycleData && bot.cycleData.isParasitePregnancy) {
            checkParasiteAutoLabor(bot);
        }
    });
    saveBots();
    updateGroupTimeBadges(members);
    const _grp = groups.find(g => g.id === curGroupId);
    if (_grp) checkGroupScheduleMilestones(_grp);
    const grpBioModal = document.getElementById('grp-bio-modal');
    if (grpBioModal && grpBioModal.style.display === 'flex' && _curGroupProfileBotId) {
        const openBot = bots.find(b => b.id === _curGroupProfileBotId);
        if (openBot) renderGroupMemberRepro(openBot, groups.find(g => g.id === curGroupId));
    }
}

async function resolveRespondersAI(txt, hearingMembers, recentHistory) {
    if (hearingMembers.length === 0) return [];
    if (!getGroqKeys().length) return hearingMembers.slice(0, 1);
    const key = getNextGroqKey();

    const memberList = hearingMembers.map(m => `- ${m.name} (${m.gender || 'unknown'})`).join('\n');
    const lastBotMsg = recentHistory ? [...recentHistory].reverse().find(m => m.role === 'assistant') : null;
    const lastBot = lastBotMsg ? hearingMembers.find(b => b.id === lastBotMsg.speakerId) : null;
    const histCtx = recentHistory
        ? recentHistory.slice(-10).map(m => {
            const sp = hearingMembers.find(b => b.id === m.speakerId);
            return (m.role === 'user' ? 'User' : (sp ? sp.name : 'Character')) + ': ' + (m.content || '').substring(0, 200);
        }).join('\n')
        : '';

    const prompt = `You are an AI director managing a group roleplay scene.

Characters present:
${memberList}

Recent conversation:
${histCtx}
${lastBot ? `\nLast character to speak: ${lastBot.name}` : ''}

User's message: "${txt}"

TASK: Decide who should reply to the user's message.
1. "addressed": Characters who are DIRECTLY spoken to (named, or implied by "you all", etc.).
2. "bystanders": Other characters who are NOT addressed, but would naturally interrupt, react, or chime in right now based on the context. Keep this rare/natural.

Return ONLY a valid JSON object. Example:
{
  "addressed": ["Nami"],
  "bystanders": ["Nico Robin"]
}`;

    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_FAST_MODEL,
                max_tokens: 150,
                temperature: 0.2,
                messages: [{ role: 'user', content: prompt }]
            }),
            signal: AbortSignal.timeout(8000)
        });
        const data = await res.json();
        const raw = (data.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return { addressed: hearingMembers.slice(0, 1), bystanders: [] };

        const result = JSON.parse(jsonMatch[0]);
        const addressedNames = Array.isArray(result.addressed) ? result.addressed : [];
        const bystanderNames = Array.isArray(result.bystanders) ? result.bystanders : [];

        const resolveArray = (namesArr) => namesArr
            .map(n => hearingMembers.find(m =>
                m.name.toLowerCase() === String(n).toLowerCase().trim() ||
                m.name.toLowerCase().startsWith(String(n).toLowerCase().trim())
            )).filter(Boolean);

        const addressedBots = resolveArray(addressedNames);
        const bystanderBots = resolveArray(bystanderNames);

        // Filter out bystanders who are already in addressed
        const filteredBystanners = bystanderBots.filter(b => !addressedBots.includes(b));

        if (addressedBots.length === 0 && filteredBystanners.length === 0) {
            return { addressed: hearingMembers.slice(0, 1), bystanders: [] };
        }
        return { addressed: addressedBots, bystanders: filteredBystanners };
    } catch (e) {
        logError('resolveRespondersAI', e.message);
        return { addressed: hearingMembers.slice(0, 1), bystanders: [] };
    }
}