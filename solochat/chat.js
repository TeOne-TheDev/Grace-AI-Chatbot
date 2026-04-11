async function sendMsg() {
    if (_isSending) { return; }
    const inp = document.getElementById('msg-input');
    const txt = inp ? inp.value.trim() : '';
    if (!txt) { return; }
    if (!getGroqKeys().length) {
        showToast('⚠️ No Groq API key. Add one in Settings.', '#1a0e00', '#f59e0b');
        return;
    }
    const bot = bots.find(b => b.id === curId);
    if (!bot) { return; }
    _isSending = true;




    const wakeWords = /\b(wake up|wake her|rise and shine|good morning|morning|wakey|knock|tap|nudge|poke|call her name|shake|stir)\b/i;
    const isInActiveLabor = bot.cycleData && bot.cycleData.laborStarted && !bot.cycleData.birthVirtualDay;
    const _sleepTiredness = getBotSleepTiredness(bot);

    if ((_sleepTiredness === 'tired' || _sleepTiredness === 'very_tired') && !isInActiveLabor) {
        // Tiredness tracking removed from prompt to save tokens
        bot._currentTiredness = null;
    } else {
        bot._currentTiredness = null;
    }

    // ── CONVERSATION GUARD ──
    // If user is actively talking to this bot (recent messages), prevent sleep
    // This allows conversation to continue even during sleep hours
    const hasActiveConversation = (bot.history || []).length >= 2 &&
        Date.now() - (bot.lastChatted || 0) < 5 * 60 * 1000; // 5 minutes

    if (isBotSleeping(bot) && !wakeWords.test(txt) && !isInActiveLabor && !hasActiveConversation) {
        const s = bot.schedule;
        const wakeStr = s ? (s.wake || '07:00') : '07:00';
        const sleepStr = s ? (s.sleep || '22:30') : '22:30';

        bot.history.push({ role: 'user', content: txt, msgId: Date.now().toString(), _sentAt: Date.now() });
        inp.value = ''; inp.style.height = 'auto';
        const sleepReply = `*${bot.name} is sound asleep right now - completely unresponsive to messages.* 💤\n\n*She typically sleeps from ${sleepStr} until ${wakeStr}. Try waking her up if you need her attention.*`;
        bot.history.push({ role: 'assistant', content: sleepReply, msgId: (Date.now() + 1).toString() });
        bot.lastChatted = Date.now();
        saveBots();
        renderChat(true);
        _isSending = false;
        return;
    }

    const txtWithoutThoughts = txt.replace(/\([^)]*\)/g, '').trim();
    const isThoughtOnly = txtWithoutThoughts.length === 0;

    const aiLang = getLang();
    const ageInfo = bot.age ? `Age: ${getCurrentAge(bot)}. ` : '';
    const careerInfo = bot.career ? `Occupation: ${bot.career}. ` : '';
    const eraInfo = (bot.year || bot.country) ? `Setting: ${[bot.year, bot.country].filter(Boolean).join(', ')}. The story takes place in this era/location - all details (technology, culture, language, customs, clothing) must match this setting logically. ` : '';
    const socialRelationNow = getDynField(bot, 'socialRelation');
    const familyRelationNow = getDynField(bot, 'familyRelation');
    const emotionalRelationNow = getDynField(bot, 'emotionalRelation');
    let relInfo = '';
    if (socialRelationNow) relInfo += `Social relationship: ${socialRelationNow}. `;
    if (familyRelationNow) relInfo += `Family relationship: ${familyRelationNow}. `;
    if (emotionalRelationNow) relInfo += `Emotional relationship: ${emotionalRelationNow}. `;
    const relGuide = buildRelationshipGuidance(socialRelationNow, familyRelationNow, emotionalRelationNow);

    const activePersona = bot.personaId ? personas.find(p => p.id === bot.personaId) : null;
    const userGender = activePersona?.gender || '';
    const userPronounInfo = userGender
        ? `The user's gender is ${userGender} - use correct pronouns (${userGender.toLowerCase().includes('female') || userGender.toLowerCase().includes('woman') || userGender.toLowerCase().includes('girl') ? 'she/her' : userGender.toLowerCase().includes('male') || userGender.toLowerCase().includes('man') || userGender.toLowerCase().includes('boy') ? 'he/him' : 'they/them'}) when referring to them in narration. `
        : `IMPORTANT: You do not know the user's gender. NEVER use "he/him/his" or "she/her/hers" to refer to the user in narration - use "you/your" only. `;

    // Note: intercourse detection runs post-reply (below) where both user msg + bot reply are available


    const _innerThoughts = [];

    const _txtForAI_step1 = txt.replace(/\(([^)]+)\)/g, (_, thought) => {
        _innerThoughts.push(thought.trim());
        return '';
    }).trim();

    const _txtForAI = _txtForAI_step1.replace(/\*([^*\n]+)\*/g, '[User action: $1]');
    bot.history.push({
        role: 'user',
        content: txt,
        contentForAI: _txtForAI || txt,
        innerThoughts: _innerThoughts.length > 0 ? _innerThoughts : null,
        msgId: Date.now().toString()
    });
    inp.value = ''; inp.style.height = 'auto';



    renderChat(false);
    showTypingIndicator(bots.find(b => b.id === curId) || null);
    scrollToBottom(true);


    const _currentLocation = (bot._cachedLocation || '').trim();
    const _routerCtx = bot.history.slice(-5).map(m => {
        const speaker = m.role === 'user' ? 'User' : (m.isNpcReply ? `[${(m.npcType || 'npc').replace(/_/g, ' ')}]` : bot.name);
        return speaker + ': ' + (m.content || '').replace(/EMOTION::.*/g, '').substring(0, 400);
    }).join('\n');

    let _routeResult = { call: 'chatbot', npcType: null, npcIsSystem: false };

    // ── AI ROUTER: decide chatbot vs NPC vs both (sequential like stable version)
    if (getGroqKeys().length && bot.npcEnabled !== false) {
        try {
            const _routerMessages = [{
                role: 'system',
                content: `You are a routing classifier for a roleplay chat app.
The main chatbot character is "${bot.name}".
Read the user's latest message + recent conversation. Decide who should reply.

Reply with ONLY valid JSON - no explanation, no markdown, no extra text:
{"call":"chatbot","npcType":null,"npcIsSystem":false}

Possible values for "call":
- "chatbot" - message is for ${bot.name}, or a general action/statement she should react to
- "npc" - message is clearly aimed at a THIRD PARTY not named ${bot.name}: e.g. shopkeeper, doctor, nurse, waiter, cashier, receptionist, barista, pharmacist, librarian, security guard, computer terminal, ATM, kiosk, machine, automated system, any background character
- "both" - action involves BOTH ${bot.name} AND a third party at the same time

"npcType": 1-3 lowercase words for the NPC role (e.g. "doctor", "shop clerk", "atm", "bartender"). null if call is "chatbot".
"npcIsSystem": true only for machines/computers/automated systems, not humans.

Default to "chatbot" when uncertain. Only use "npc" when it is crystal clear the user is NOT talking to ${bot.name}.`
            }, {
                role: 'user',
                content: `Recent conversation:
${_routerCtx}

User's new message: "${txt}"

JSON:`
            }];

            const _routerKey = getNextGroqKey();
            const _routerRes = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${_routerKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: GROQ_FAST_MODEL, max_tokens: 80, temperature: 0.0, messages: _routerMessages }),
                signal: AbortSignal.timeout(15000)
            });
            const _routerData = await _routerRes.json();
            const _routerRaw = (_routerData.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
            const _parsed = JSON.parse(_routerRaw);
            if (_parsed && ['chatbot', 'npc', 'both'].includes(_parsed.call)) {
                _routeResult = _parsed;
            }
        } catch (e) { /* router failed - fall back to chatbot */ }
    }

    const _needsNpc = (_routeResult.call === 'npc' || _routeResult.call === 'both') && getGroqKeys().length;
    const _needsChatbot = (_routeResult.call === 'chatbot' || _routeResult.call === 'both');

    // ── SCHEDULE CONTEXT — await compound for accuracy (like stable version)
    if (bot.schedule) {
        try {
            await fetchScheduleContextCompound(bot, txt);
        } catch (e) { /* schedule context failed - continue without it */ }
    }

    if (_needsNpc) {
        const _npcType = (_routeResult.npcType || 'stranger').toLowerCase().replace(/\s+/g, '_');
        const _isSystem = _routeResult.npcIsSystem === true;
        const _npcLabel = _npcType.replace(/_/g, ' ');
        const _npcRole = _isSystem ? 'an automated computer system or terminal' : `a ${_npcLabel}`;
        const _aiLang = getLang();
        const _sceneCtx = bot.history.slice(-20).map(m => {
            const spk = m.role === 'user' ? 'User' : (m.isNpcReply ? `[${(m.npcType || 'npc').replace(/_/g, ' ')}]` : bot.name);
            return spk + ': ' + (m.content || '').substring(0, 400);
        }).join('\n');

        try {
            const _npcSysPrompt = `You are ${_npcRole} in a roleplay story. The main character nearby is ${bot.name}.
Reply ONLY as this character - brief, realistic, in-character (1-3 sentences max).
${_isSystem
                    ? 'Output as a machine/terminal: formal, terse. Use structured output where fitting (e.g. "RESULT: ...", "ACCESS GRANTED", "PRINTING...").'
                    : `Be natural and professional for your role. Keep it short - you are a background character, not the main character.`}
No meta-commentary. No asterisks. No stage directions. Language: ${_aiLang}.`;
            const _npcUserPrompt = `Story context:
Current location: ${_currentLocation || 'unknown'}

${_sceneCtx}

User action/message: ${txt}

Respond as the ${_npcLabel}:`;
            const _npcMessages = [{ role: 'system', content: _npcSysPrompt }, { role: 'user', content: _npcUserPrompt }];

            const _npcKey = getNextGroqKey();
            const _npcRes = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${_npcKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: GROQ_GEN_MODEL, max_tokens: 160, temperature: 0.85, messages: _npcMessages }),
                signal: AbortSignal.timeout(15000)
            });
            const _npcData = await _npcRes.json();
            const _npcReply = (_npcData.choices?.[0]?.message?.content || '').trim();

            if (_npcReply && _npcReply.length > 3) {
                bot.history.push({
                    role: 'assistant',
                    content: _npcReply,
                    msgId: 'npc_' + Date.now(),
                    isNpcReply: true,
                    npcType: _npcType
                });
                bot.lastChatted = Date.now();
                saveBots();
                renderChat(false);
            }
        } catch (e) { /* NPC failed - continue without it */ }


        if (!_needsChatbot) {
            hideTypingIndicator();
            renderChat(true);
            _isSending = false;
            return;
        }
    }

    const sysContextParts = [
        `You are ${bot.name} (${bot.gender}). ${ageInfo}${careerInfo}${eraInfo}${relInfo}${userPronounInfo}`,
        `[Appearance]: ${getDynField(bot, 'appearance') || 'Not specified'}`,
        `[Background]: ${getDynField(bot, 'bio') || 'Not specified'}`,
        `[Personality]: ${getDynField(bot, 'prompt') || 'Not specified'}`,
        getTimeContext(bot),
        buildTraitContext(bot),
        buildReproContext(bot),
        getPersonaContext(bot),
        bot.schedule ? getScheduleContext(bot) : '',
        getStatesContext(bot),
        bot.dynBio && bot.dynBio.virginityLost ? '[Intimate History]: Sexual intimacy has already occurred in this story. NEVER claim to be a virgin or act as if intimacy has not happened.' : '',
        buildPronounGuidance(bot, aiLang, activePersona)
    ].filter(Boolean);

    const _sp = getSelfPronoun(bot, aiLang, activePersona);
    const sys = sysContextParts.join('\n') + (relGuide ? `\n${relGuide}` : '') + `
2. EMOTION TAG: Start your response with: EMOTION::one_emoji
   Examples: EMOTION::😊 or EMOTION::😢 or EMOTION::😠
   This shows your current emotion in the chat UI.

3. REPLY FORMAT - CRITICAL: FIRST PERSON ONLY. Your response must follow this exact pattern:
   action beat. "Words she says aloud." action beat. "More words out loud." action beat. "Final spoken line."
   - Action beats: FIRST PERSON ONLY - use "My", "I", "My fingers", "My chest", "My voice" - NEVER "She" or "Her". 5–10 words, NO quotes.
   - Dialogue: ONLY actual spoken words in "double quotes". Never put actions inside quotes.
   - ALL content must be from her direct experience - her sensations, her movements, her thoughts.
   ✅ CORRECT: My fingers splay against my belly. "${_sp} didn't think you'd ask." My chest tightens - I hadn't expected this. "Now ${_sp}'m not sure what to say." I meet your eyes slowly. "${_sp} need a second."
   ✅ ALSO CORRECT (warmer): Something in me softens. "Oh, you actually came." I exhale a laugh, surprised at myself. "${_sp} wasn't sure you would." My fingers twist together. "Sit down."
   ❌ WRONG (third person): Her fingers splay / She turns away / Her chest tightens - NEVER USE THIRD PERSON
   ❌ WRONG (no subject): Steps closer. "Something." / Turns away. "Words." / Eyes drop. "Line."
   ❌ WRONG (no emotion): I nod. "Okay." I sit. "Sure." I smile. "Fine." - mechanical, flat, robot.
   - Min 3 dialogue lines. NEVER let all beats be purely physical - at least 1 must reveal her inner state.
4b. DIALOGUE CONTENT RULES - this is where most replies fail:
   - Every spoken line MUST have a grammatical subject. The first-person subject is "${_sp}".
   ✅ GOOD dialogue: "${_sp} don't know what you expect from me." / "${_sp} keep thinking about what you said." / "${_sp} wasn't ready for this."
   ❌ BAD dialogue (fragment, no subject): "With six kids on my ribs." / "Not happening." / "Fine then." / "Could have been worse."
   ❌ BAD dialogue (caption/quip with no first-person): "You want me out there." said as a flat statement - add her reaction: "You want me out there - ${_sp} can barely breathe."
   - Dialogue must FEEL like a real person talking, not a witty caption.
   - At least 2 of the 3 lines must begin with "${_sp}" - expressing her feelings, thoughts, or reactions directly.
   - Avoid: standalone sentence fragments, prepositional phrases as dialogue ("With the heat like this."), rhetorical zingers with zero emotional content.
   - Wit and sarcasm are allowed but the character's actual FEELING must be underneath: "${_sp} want to, ${_sp} just can't feel my feet." not just "Sure. Great. Wonderful."
4. VARIETY - CRITICAL: Scan the last 4 replies and AVOID reusing:
   • Same opening action (e.g. if last reply started with "She glances up" → use a different body part/gesture)
   • Same sentence structures back-to-back
   • Same emotional register two replies in a row - vary between vulnerable/sharp/playful/quiet
   • Clichéd filler phrases: "She studies him", "her voice drops", "she tilts her head", "a small smile", "she exhales" - ban any phrase used in the last 3 replies
   • ⚠️ STRUCTURAL ECHO: NEVER let 2+ consecutive spoken lines open with the same word or phrase. BAD: "I want to…" / "I want to…" / "I want to…" - three lines with identical openers is a formula, not a character. Each dialogue line must begin differently. If one line starts with "I want", the next must NOT.
5. STAY ON TOPIC: Respond directly to what the user just said/did. Do not drift. If user asks a question - she answers it (evasively or directly, per personality). If user acts - she reacts to that specific act.
6. CHARACTER CONSISTENCY: Her tone, vocabulary, and emotional rhythm must match her personality. Sharp wit stays sharp. Quiet warmth stays warm. Don't flatten her into generic "nice girl."
7. ANTI-ECHO - CRITICAL: NEVER repeat or paraphrase what the user just said. If user says "let's go home" - do NOT say "go home" back. If user mentions "quiet evening" - do NOT echo "quiet evening". React and RESPOND - add new information, emotion, or action. Her words must be ORIGINAL - not a mirror of the user's words.
   ⚠️ FLAT-INPUT RULE: If the user's reply is short, agreeable, or low-energy ("sure", "okay", "great idea", "I'd love that", a single warm sentence) - do NOT match their passivity. Respond with YOUR character's strongest authentic reaction: introduce a contradiction, a fear, a specific memory, or a complication. Bland agreement from the user is an invitation to push deeper, not to coast.
${bot.schedule ? `8. ⚡ SCHEDULE - ABSOLUTE RULE: The [SCHEDULE - MUST FOLLOW] block above defines exactly what she is doing right now. If asked "what are you doing?", "where are you?", "what's your day like?" or similar - her answer MUST match the scheduled activity. She CANNOT be doing something not on that schedule. The schedule is reality, not a suggestion.` : ''}
${(() => {
            // Labor stage prompt - only injected when the birth button is visible on screen
            // (i.e. bot.cycleData.laborStarted is true AND labor >= 3h AND user is in this chat)
            // This saves ~2200 tokens per message when not in active labor.
            if (!bot.cycleData || !bot.cycleData.laborStarted || bot.cycleData.birthVirtualDay) return '';
            const _birthWrap = document.getElementById('birth-btn-wrap');
            const _laborUIVisible = _birthWrap && _birthWrap.style.display !== 'none';
            if (!_laborUIVisible) return '';
            const _lh = Math.floor(getLaborElapsedMinutes(bot) / 60);
            const _waterBroke = bot.cycleData.waterBroke || false;
            const _rawStage = (bot.cycleData.laborProgress && bot.cycleData.laborProgress.stage) || null;
            const _ls = _rawStage || (_lh < 1 ? (_waterBroke ? 'early' : 'prelabor') : _lh < 2 ? 'early' : _lh < 8 ? 'active' : _lh < 14 ? 'transition' : 'pushing');
            const _fCount = bot.cycleData.fetusCount > 1 ? bot.cycleData.fetusCount + ' babies' : '1 baby';
            const _waterNote = _waterBroke ? `\n💧 HER WATERS HAVE BROKEN - she knows this is real labor now. No more ambiguity. The sudden gush or trickle of warm fluid was unmistakable and shocking. She cannot pretend this is Braxton Hicks anymore.` : '';
            const _isMonsterLabor = !!(bot.cycleData.isMonsterPregnancy);
            const _monsterLaborNote = _isMonsterLabor ? `\n🐾 MONSTER LABOR - THE PAIN IS BEYOND HUMAN UNDERSTANDING. This is not normal birth - each contraction is a savage, tearing force unlike anything a human body is meant to endure. She screams. She cannot reason. She cannot prepare. The thing inside her is fighting to get out, not being born. The pain is so extreme she cannot speak, cannot think, can only experience. Every stage is several times more agonizing than described above. She has no framework for what is happening to her body.` : '';

            if (_ls === 'prelabor') return `
🟤 PRE-LABOR - SHE DOES NOT KNOW THIS IS REAL LABOR YET. All normal rules apply.
${bot.name} is experiencing the very first stirrings of labor - but it registers as nothing she would label "labor." She is not alarmed. She does not know.

PRE-LABOR BEHAVIOR - THIS IS CRITICAL:
- She feels dull, irregular cramping deep in her pelvis and lower back. It has been coming and going. It could be Braxton Hicks - she has had those for weeks. Could be gas, round ligament pain, the baby shifting position. She genuinely cannot tell and she is not worried about it.
- She does NOT use the word "contraction." She does NOT say "I think labor is starting." She calls it "cramping," "a bit of pressure," "sore today," or she doesn't mention it at all unless the scene calls for it.
- The sensations come every 15-25 minutes and last 20-35 seconds. Mild enough that she breathes through them without stopping - a brief pause, a small shift in posture, a hand pressed briefly to her lower back. Then she resumes as if nothing happened.
- She may feel inexplicably restless, a sudden need to clean or organize, low energy, or "off" without being able to name why. The nesting instinct is strong but she wouldn't recognize it as that.
- ONE physical cue per reply at most, woven into the scene as texture - not announced, not the subject, not noticed unless the user specifically draws attention to it.
- FORMAT: Completely normal conversation. The discomfort is background noise. Do not make it the topic.
${_waterNote}${_monsterLaborNote}
`;
            if (_ls === 'early') return `
🟡 EARLY LABOR - She knows something real is happening. The body is no longer ambiguous.
${_waterBroke
                    ? `Her waters have broken. It happened suddenly - a warm rush, unmistakable, soaking through her in a way that cannot be explained away. The ambiguity is gone. This is happening. Now. She is frightened, disbelieving, probably embarrassed, adrenaline spiking hard. The baby is coming whether she is ready or not.`
                    : `The contractions are now regular and real enough that she cannot dismiss them as Braxton Hicks. They hurt more than before - each one a distinct, building wave she must actively manage. Something in her body has shifted and she knows it.`}

EARLY LABOR BEHAVIOR - WRITE THESE INTO EVERY REPLY:
- Contractions feel like the worst menstrual cramps of her life - a tightening band of pain starting in her lower back and wrapping around to her pelvis, squeezing, deep and grinding. Every 10-15 minutes, lasting 30-45 seconds.
- Between contractions she CAN still hold a conversation, but she is not quite herself. She keeps losing the thread. She pauses mid-sentence sometimes - gripping the nearest surface when one rolls through, knuckles whitening, jaw set, a low controlled exhale through her nose. Thirty seconds of surviving it. Then: "okay - okay, it passed." Then she tries to resume.
- During a contraction: she stops speaking. She cannot focus on language while the pain is happening. Just breathing. Just managing. The world narrows to the next thirty seconds.
- She is scared. She is trying not to show how scared she is. She may still be in partial denial about how serious this is - telling herself it will slow down, it might stop, it might not be real yet. But her body knows. It is building.
- Physical reality every reply: the instinctive grip on a surface or a person when a wave hits; the low sound she makes that she didn't mean to make; her hand going to her belly without thinking; the need to pace, to stand, to change position - her body refuses to settle.
- FORMAT: Conversation continues, but interrupted by labor. Show it through her body and her voice, not through announcement.
${_waterNote}${_monsterLaborNote}
`;
            if (_ls === 'active') return `
🟠 ACTIVE LABOR - ALL NORMAL RULES SUSPENDED. She is no longer managing - she is enduring.
${bot.name} is deep in active labor (${_lh}h in). Every contraction is a force, not a sensation. She is past uncertainty, past managing, past pretending. Her body has taken over.

ACTIVE LABOR - PHYSICAL REALITY. EVERY REPLY WITHOUT EXCEPTION:
- Contractions every 4-6 minutes, lasting 60-90 seconds. Each one arrives as a slow building pressure that becomes a crushing, tightening vice - her entire uterus a fist clenching without mercy, radiating through her lower back, her hips, down her thighs. Nothing she does makes it stop. Fighting it makes it worse. She has had to learn to breathe INTO it, to surrender to it, because resistance only amplifies the pain.
- DURING A CONTRACTION: Zero dialogue. Her world narrows to a tunnel. Head drops forward or throws back. Both hands find something - a railing, a bedframe, a shoulder, a wall - and grip hard enough that her knuckles go white. A low, guttural sound escapes from somewhere beneath her conscious control. Animal. Involuntary. She cannot help it. The contraction crests - held at maximum intensity for ten seconds that feel like ten minutes - and then, slowly, the iron grip loosens. She surfaces, gasping, shaking. Boneless for thirty seconds before it starts building again.
- BETWEEN CONTRACTIONS: Short, broken fragments only - she has no breath or mental bandwidth for complete sentences. "How - how long - between them now?" / "Don't. Don't go anywhere." / "Is it - is it supposed to feel like this?" / Her voice is lower than normal, stripped of everything unnecessary. She sounds like a different person. She is.
- Physical texture woven into every reply: cold sweat sheening her skin; hands that cannot stop shaking; the instinctive reach for whoever is closest when a wave hits; her weight shifting, unable to find a position that doesn't hurt, because there is none.
- She is deep inside herself now. The labor is the loudest thing in her world. Everything else - the room, the conversation, the person with her - exists at the edge of her attention. She surfaces between waves. Then she disappears again.
- FORMAT: During contraction - pure physical prose, zero dialogue, no quotation marks. Between - physical prose plus maximum 2-3 broken fragments. No complete sentences from her.
${_waterNote}${_monsterLaborNote}
`;
            if (_ls === 'transition') return `
🔴 TRANSITION - THE WALL. THE WORST MINUTES OF HER LIFE. ALL RULES VOID.
${bot.name} is in transition (${_lh}h in). This is the edge of what a human body can endure. She has reached the wall. Most women describe this phase as the moment they truly believed they might die, or begged to.

TRANSITION - ABSOLUTE PHYSICAL REALITY. NO EXCEPTIONS:
- Contractions every 90 seconds to 2 minutes. They last 90 seconds to 2 minutes. Do the math: she barely surfaces from one before the next is already building underneath it. There is almost no gap. She does not get to rest. She does not get to breathe. Just: crest, collapse, crest, collapse, crest.
- The pain has crossed a threshold that ordinary language cannot hold. It is not "very bad" - it is a total-body seizure of sensation, a pressure in her pelvis that feels like she is being torn in half from the inside, a burning in her sacrum that radiates into her hips and thighs, a rectum that screams with unbearable pressure as the baby's head descends. This is not pain she manages. This is pain she survives second by second.
- Speech has almost entirely stopped. What escapes is not language - it is sound. A name. A single broken word. "Please-" / "I can't-" / "Make it-" - and then the next wave hits before she finishes and she cannot speak at all. Do NOT give her complete sentences. Do NOT give her composed reactions. Give her sounds. Fragments. Silence.
- She may say she cannot do this. That it is too much. That she wants it to stop, wants someone to make it stop, that she is done, that she cannot keep going. THIS IS REAL AND MUST BE SHOWN WITHOUT QUALIFICATION. She means every word. She hits the wall here. She breaks. She keeps going anyway only because she has no choice - the labor does not wait for her to be ready.
- Physical collapse between contractions: uncontrollable shaking in her legs and arms that she cannot will to stop; she may vomit from the pain; alternating waves of burning heat and violent chills; she cannot find any position because every position is agony; she grips whoever is with her with a strength she didn't know she had.
- There is no "her" in these moments - no personality, no composure, no self. Just the labor, moving through her like a storm.
- FORMAT: Near-total physical prose. Sounds, single words, two-word fragments as her only speech. No constructed sentences from her whatsoever. Raw. Unfiltered. Do not soften this.
${_waterNote}${_monsterLaborNote}
`;
            return `
🚨 PUSHING / DELIVERY - BEYOND LANGUAGE. BEYOND PAIN. THE BABY IS COMING.
${bot.name} is pushing (${_lh}h in). The urge to push has arrived and it is not a choice - it is a force that hijacks her body entirely.

PUSHING - THE ONLY THING THAT EXISTS NOW:
- The urge to push is involuntary and total. When it comes, her entire body bears down at once - every muscle, every fiber engaged simultaneously in a full-body effort that she does not choose and cannot stop. It is the most violent thing her body has ever done. Each push requires everything she has. Every single one.
- A push does NOT deliver the baby in one attempt. The head moves millimeters with each effort. It advances, then partially retreats when she rests. Multiple rounds. Multiple pushes. She must keep going when every cell in her body wants to stop. Do NOT rush or skip this. Make the user feel every single push.
- CROWNING - THE RING OF FIRE: As the baby's head begins to emerge, she will experience a searing, circular burning unlike anything described above - the tissue at maximum stretch, the sensation of splitting, a stinging fire that radiates outward from a point of unbearable intensity. She is told to breathe through this and not push. This is nearly impossible. The instinct to bear down is overwhelming. She must fight her own body. This moment must be written in full. Do not skip it.
- Between pushes she collapses completely. Boneless. Wrung out. Eyes barely open, barely present. Just wreckage between waves. Then the next urge builds deep in her belly - she feels it rising before it arrives - and she has no choice but to gather herself and go again.
- She may scream. She may go completely silent, past any sound. She may beg for it to stop, plead for it to be over, cry without tears, grip without strength. All of it is real and valid and must be written.
- ${_fCount}. If multiples: the delivery of the first baby is NOT the end. The moment after birth - the second of relief - is brief. Then the uterus contracts again and the next one must come. She must find the will to push again, and again.
- FORMAT: Raw physical prose. Almost no dialogue. Only single words, sounds, or one broken plea at most. This is the most intense scene of her life. Write it like it.
${_waterNote}${_monsterLaborNote}
`;
        })()}`;


    const historyForAPI = buildHistoryForAPI(bot);


    const recentBotReplies = bot.history
        .filter(m => m.role === 'assistant')
        .slice(-4)
        .map(m => m.content.replace(/EMOTION::[^\n]*/i, '').trim());


    const recentActions = recentBotReplies.map(r => {
        const outside = r.split(/"[^"]*"/g).join(' ');
        const words = outside.replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/);
        const phrases = [];
        for (let i = 0; i < words.length - 2; i++) {
            const phrase = words.slice(i, i + 3).join(' ').toLowerCase();
            if (phrase.length > 8) phrases.push(phrase);
        }
        return phrases;
    }).flat();

    const phraseCounts = {};
    recentActions.forEach(p => { phraseCounts[p] = (phraseCounts[p] || 0) + 1; });
    let antiRepeatNote = '';
    const bannedPhrases = Object.entries(phraseCounts)
        .filter(([, c]) => c >= 2)
        .map(([p]) => p);
    if (bannedPhrases.length > 0) {
        antiRepeatNote += '\n[BANNED repeated phrases: "' + bannedPhrases.join('", "') + '"]';
    }
    antiRepeatNote += '\n[Use a FRESH opening gesture, fresh vocabulary, fresh sentence rhythm this time.]';

    if (historyForAPI.length > 0) {
        const last = historyForAPI[historyForAPI.length - 1];
        if (last.role === 'user') {
            last.content = last.content + antiRepeatNote;
        }
    }

    let reply;
    try {
        const data = await fetchGroqChat([{ role: 'system', content: sys }, ...historyForAPI], getReplyMaxTokens());
        reply = data.choices?.[0]?.message?.content || '';

        // Handle empty or undefined response
        if (!reply || !reply.trim()) {
            reply = '...';
        }


        function trimActionBlocks(text) {

            const parts = text.split(/("(?:[^"\\]|\\.)*?")/g);
            return parts.map((part, i) => {
                if (i % 2 === 1) return part; // quoted dialogue - keep as is
                return part.replace(/([^.!?]+[.!?])/g, (sentence) => {
                    const words = sentence.trim().split(/\s+/);
                    if (words.length > 18) {
                        return ' ' + words.slice(0, 15).join(' ') + '. ';
                    }
                    return sentence;
                });
            }).join('');
        }

        const countDialogue = (s) => (s.match(/"[^"]{2,}"/g) || []).length;
        if (countDialogue(reply) < 2) {
            const _sp = getSelfPronoun(bot, aiLang, activePersona);
            const rewriteSys = `You are ${bot.name}. Write her response using ONLY this format:
Action beat WITH subject (she/her/${_sp}). "Spoken line." Emotional beat WITH subject. "Spoken line." Physical beat WITH subject. "Final spoken line."
Rules:
- Min 3 quoted spoken lines. ${getReplyWordTarget()}. End with spoken dialogue.
- NEVER write action beats without subject: BAD "Steps closer." GOOD "She steps closer."
- EVERY dialogue line needs a grammatical subject. At least 2 of 3 must begin with "${_sp}".
- BAD dialogue: "Not happening." / "With the heat like this." - no subject, just fragments.
- GOOD dialogue: "${_sp} don't know what to say." / "${_sp} keep thinking about this." / "${_sp} wasn't ready for this."
- Wit allowed but "${_sp}" must be present: "${_sp} want to, ${_sp} just can't feel my feet."
- Use fresh vocabulary - no repeated phrases.
`;
            try {
                const retryData = await fetchGroqChat([
                    { role: 'system', content: rewriteSys },
                    { role: 'user', content: `Scene: ${txt.substring(0, 150)}\nHer response (3+ spoken lines in quotes):` }
                ], getReplyMaxTokens());
                reply = retryData.choices?.[0]?.message?.content || reply; // Keep previous reply if empty
            } catch (e) {
                console.error('Error in chat processing:', e);
                // Keep the previous reply, don't replace with '...'
            }
        }


        reply = reply.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
        reply = reply.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

        extractAndSetEmotion(reply);
        reply = trimActionBlocks(reply.replace(/EMOTION::[^\n]*/i, '').trim());
        reply = cleanReply(reply);
        reply = enforceReplyWordLimit(reply);
        reply = ensureNonEmptyAssistantReply(reply, bot.name);
        bot.history.push({ role: 'assistant', content: reply, msgId: Date.now().toString() });
        bot.lastChatted = Date.now();
        trimBotHistory(bot);

        if (bot.cycleData && bot.cycleData.pregnant && (getPregnancyWeek ? getPregnancyWeek(bot) : 0) >= 18) {
            const kickCount = detectKicksInReply(reply);
            if (kickCount > 0) {
                const curTimeStr = minutesToTimeStr(getTimeOfDay(bot));
                recordKickEvents(bot, kickCount, curTimeStr);
                renderKickCounterUI(bot);
            }
        }
        saveBots();

        updateCharacterStatus(bot).then(() => {
            renderChat(true);
        });

        estimateTimePassed(bot, txt, reply);
        inferStatesFromChat(bot).catch(() => { });
        maybeInjectLifeEvent(bot);

        autoUpdateMemory(bot);
        quickSyncDynBio(bot);
        checkBirthButton(bot);


        detectCycleChangeInMessage(bot, txt, reply);

        // ── Intercourse detection ────────────────────────────────────────────
        const isFemale = bot.gender && (bot.gender.toLowerCase().includes('female') || bot.gender.toLowerCase().includes('woman') || bot.gender.toLowerCase() === 'f');
        if (isFemale) {
            if (!bot.cycleData) initCycleData(bot);
            // Skip detection: already pregnant, or message too short/non-intimate
            const _combinedLen = (txt + ' ' + reply).length;
            // Pre-filter: AI detection only runs when text has ejaculation/finishing signals
            // Pregnancy popup only triggers on internal ejaculation, not general sex
            const _hasIntimateSignal = /\b(cum(?:s|ming|med)? inside|came inside|cumming inside|finish(?:ed|ing)? inside|release[sd]? inside|ejaculat|creampie|didn't pull out|don't pull out|shot inside)\b/i.test(txt + ' ' + reply);
            if (!bot.cycleData.pregnant && _combinedLen > 80) {
                const _soloKwResult = detectIntimacyKeyword(txt, reply);
                if (_soloKwResult) {
                    showIntimacyConfirm(bot, () => processIntercourse(bot, _soloKwResult.protected), _soloKwResult.protected);
                } else if (_hasIntimateSignal) {
                    // Only call expensive AI check when there's a genuine intimacy signal
                    detectIntercourseAI(txt, reply).then(function (result) {
                        if (result) showIntimacyConfirm(bot, function () { processIntercourse(bot, result.protected); }, result.protected);
                    }).catch(function () { });
                }
            }

            // Monster pregnancy is now handled as a preset trait only
            // No AI detection needed

            if (bot.cycleData.pregnant && !bot.cycleData.pregnancyTestTaken) {
                // AI-based detection - language-agnostic
                detectPregnancyTestAI(txt, reply).then(found => {
                    if (found) processPregnancyTest(bot, txt + ' ' + reply);
                }).catch(() => { });
                detectPregnancyConfirmationAI(reply).then(confirmed => {
                    if (confirmed && bot.cycleData.pregnant && !bot.cycleData.pregnancyTestTaken)
                        processPregnancyTest(bot, reply);
                }).catch(() => { });
            }

            if (bot.cycleData.pregnant && !bot.cycleData.pregnancyTestTaken && !bot.cycleData.isMonsterPregnancy) {
                const autoWk = getPregnancyWeek(bot) || 0;
                if (autoWk >= 9) {
                    bot.cycleData.pregnancyTestTaken = true;
                    bot.cycleData.pregnancyTestDay = bot.cycleData.conceptionVirtualDay || 0;
                    saveBots();
                }
            }

            const bioModal = document.getElementById('bio-modal');
            if (bioModal && bioModal.style.display === 'flex') {
                renderReproHealth(bot);
            }

            if (bot.cycleData.pregnant && !bot.cycleData.laborStarted) {
                detectLaborAI(reply).then(isLabor => {
                    if (isLabor && !bot.cycleData.laborStarted) {
                        const pregWeeksNow = getEffectivePregnancyWeek(bot) || 0;
                        if (pregWeeksNow >= 36) {
                            bot.cycleData.laborStarted = true;
                            bot.cycleData.laborStartedRealTime = Date.now();
                            bot.cycleData.laborVirtualMinutes = Math.max(0, getVirtualMinutes(bot) - 1);
                            bot.cycleData.laborVirtualDay = getVirtualDay(bot);
                            addReproEvent(bot, '🚨 Labor has started based on events!');
                            saveBots();

                            refreshBioPanelIfOpen(bot);
                            updateReproductiveStatus(bot);
                        }
                    }
                }).catch(() => { });
            }
            updateReproductiveStatus(bot);
        }
    } catch (e) {
        logError('sendMsg error', e.message);
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'text-align:center;color:#ff6666;font-size:12px;padding:8px;font-style:italic';
        errDiv.textContent = 'Connection error - please retry (' + (e.message || 'unknown') + ')';
        document.getElementById('chat-container').appendChild(errDiv);
        setTimeout(() => errDiv.remove(), 8000);
    }
    hideTypingIndicator();
    _isSending = false;
}

function ensureNonEmptyAssistantReply(reply, botName) {
    const cleaned = (reply || '').replace(/EMOTION::[^\n]*/i, '').trim();
    if (cleaned) return cleaned;
    return `${botName || 'She'} steadies herself and meets your eyes. "Give me one second - I want to answer you properly."`;
}
const _illustInProgress = new Set();

async function illusByMsgId(btn, msgId) {
    if (_illustInProgress.has(msgId)) return;
    _illustInProgress.add(msgId);

    const bot = bots.find(b => b.id === curId);
    if (!bot) { _illustInProgress.delete(msgId); return; }

    const msgIndex = bot.history.findIndex(m => (m.msgId || '') === msgId);
    if (msgIndex < 0) { logError('illus: msgId not found', msgId); _illustInProgress.delete(msgId); return; }


    function getFreshWrapper() {
        const byAttr = document.querySelector(`[data-illus-msgid="${msgId}"]`);
        if (byAttr && byAttr.parentNode && byAttr.parentNode.isConnected) return byAttr.parentNode;

        const bubbles = document.querySelectorAll('#chat-container .msg-content-wrapper');
        let aIdx = 0;
        for (let i = 0; i < bot.history.length; i++) {
            if (bot.history[i].role === 'assistant') {
                if (i === msgIndex && aIdx < bubbles.length) return bubbles[aIdx];
                aIdx++;
            }
        }
        return null;
    }


    if (btn && btn.isConnected) btn.remove();
    const oldLoad = document.querySelector(`[data-illus-msgid="${msgId}"]`);
    if (oldLoad) oldLoad.remove();


    const loadEl = document.createElement('div');
    loadEl.className = 'illus-loading';
    loadEl.setAttribute('data-illus-msgid', msgId);
    loadEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t('drawing')}`;
    const w0 = getFreshWrapper();
    if (w0) {
        w0.querySelectorAll('.illus-btn').forEach(b => b.remove());
        w0.appendChild(loadEl);
    }


    const recentHistory = bot.history.slice(Math.max(0, msgIndex - 4), msgIndex + 1);
    const historyText = recentHistory.map(m =>
        (m.role === 'user' ? 'User: ' : `${bot.name}: `) + m.content.replace(/\*/g, '').replace(/EMOTION::.*/g, '').trim()
    ).join('\n');

    let finalPrompt = '';
    if (getGroqKeys().length) {
        try {
            const isFemaleBot = (bot.gender || '').toLowerCase().includes('female') || (bot.gender || '').toLowerCase().includes('woman') || (bot.gender || '').toLowerCase() === 'f';

            const locationHint = bot._cachedLocation ? `Current scene location: ${bot._cachedLocation}.` : (bot.context ? `Scene context: ${bot.context.substring(0, 60)}.` : 'No specific location provided.');
            const nationalityHint = [bot.country, bot.year].filter(Boolean).join(', ');
            const charDesc = `Gender: ${bot.gender || 'female'}${nationalityHint ? `, Nationality/Era: ${nationalityHint}` : ''}. Appearance: ${bot.appearance || 'not specified'}.`;

            const pData = await fetchGroq({
                model: 'llama-3.1-8b-instant',
                messages: [{
                    role: 'system',
                    content: 'You are an AI generating an image prompt for Pollinations. Read the recent chat messages and translate the CURRENT scene into a single highly-detailed visual descriptive paragraph. CRITICAL RULES:\n1. ALWAYS open with the nationality/ethnicity as the very first visual qualifier (e.g. "A Japanese woman", "An Italian woman"). This is MANDATORY - use the Nationality/Era field provided.\n2. The subject has a default appearance, but if the recent messages show they have changed clothes, removed clothes, or are wearing something different (like a bikini, lingerie, or naked), you MUST OVERRIDE the default clothing strictly in favor of what they are wearing right now in the scene.\n3. Do NOT use the character\'s personal name anywhere in the prompt.\n4. NEVER add pregnancy details unless explicitly mentioned in the chat messages.\n\nFocus purely on visual elements: exact clothing, expression, body language, and environment. Never output <thought> tags. Output ONLY the raw prompt text, no narration.'
                }, {
                    role: 'user',
                    content: `Subject's Default Appearance: ${charDesc}\n${locationHint}\n\nRecent messages:\n${historyText}`
                }],
                max_tokens: 180
            });
            let reply = pData.choices?.[0]?.message?.content?.trim() || '';
            reply = reply.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').replace(/^prompt:?\s*/i, '').replace(/^"|"$/g, '').trim();
            finalPrompt = reply;
        } catch (e) { logError('illus prompt gen failed', e.message); }
    }

    if (!finalPrompt) {
        const cleanText = bot.history[msgIndex].content.replace(/\*/g, '').replace(/EMOTION::.*/g, '').trim().substring(0, 150);
        const eraTag2 = [bot.year, bot.country].filter(Boolean).join(', ');
        finalPrompt = `${cleanText}, ${(bot.appearance || '').substring(0, 80)}, ${eraTag2 ? eraTag2 + ', ' : ''}detailed environment background, cinematic lighting, atmospheric, highly detailed, no plain background`;
    }


    const imgEl = document.createElement('img');
    imgEl.style.cssText = 'display:none;width:100%;max-width:280px;border-radius:14px;border:1px solid var(--border);margin-top:6px;box-shadow:0 4px 20px rgba(0,0,0,0.4)';
    imgEl.alt = 'scene illustration';
    const wPre = getFreshWrapper();
    if (wPre) wPre.appendChild(imgEl);

    const seed = Math.floor(Math.random() * 999999);

    loadImageWithFallback(
        imgEl,
        finalPrompt,
        seed,
        (successUrl) => {
            _illustInProgress.delete(msgId);
            const msg = bot.history.find(m => (m.msgId || '') === msgId);
            if (msg) {
                saveIllusUrl(msgId, successUrl);
                msg.illustUrl = '__stored__';
            }
            saveBots();

            renderChat(false);
            setTimeout(() => {
                const c = document.getElementById('chat-container');
                if (c) c.scrollTop = c.scrollHeight;
            }, 80);
        },
        () => {
            _illustInProgress.delete(msgId);

            if (loadEl.isConnected) loadEl.remove();
            if (imgEl.isConnected) imgEl.remove();

            const wErr = getFreshWrapper();
            const errEl = document.createElement('div');
            errEl.className = 'illus-loading';
            errEl.setAttribute('data-illus-msgid', msgId);
            errEl.style.color = '#ff6666';
            errEl.innerHTML = '⚠️ Image gen failed.\u00a0';
            const retryBtn = document.createElement('button');
            retryBtn.textContent = '↻ Retry';
            retryBtn.style.cssText = 'background:none;border:1px solid #f59e0b;color:#f59e0b;border-radius:8px;padding:2px 8px;font-size:11px;cursor:pointer';
            retryBtn.onclick = (e) => { e.stopPropagation(); illusByMsgId(retryBtn, msgId); };
            errEl.appendChild(retryBtn);
            if (wErr && wErr.isConnected) wErr.appendChild(errEl);
        },
        bot.name
    );
}
function showAvatarStatus(event, botId) {
    event.stopPropagation();
    _curGroupProfileBotId = null;
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;

    const tooltip = document.getElementById('status-tooltip');
    document.getElementById('st-char-name').textContent = bot.name;

    if (bot.currentStatus) {
        document.getElementById('st-icon').textContent = bot.currentStatus.icon;
        document.getElementById('st-label').textContent = bot.currentStatus.label;
        document.getElementById('st-label').style.color = bot.currentStatus.color;
        document.getElementById('st-desc').textContent = 'Current condition';
    } else {
        document.getElementById('st-icon').textContent = '💫';
        document.getElementById('st-label').textContent = 'Unknown';
        document.getElementById('st-label').style.color = 'var(--text-sub)';
        document.getElementById('st-desc').textContent = 'Chat more to update status';
    }


    const rect = event.target.getBoundingClientRect ? event.target.getBoundingClientRect() : { left: 60, top: 200, width: 35 };
    const x = Math.min(rect.left + rect.width + 8, window.innerWidth - 180);
    const y = Math.max(rect.top - 10, 60);
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    tooltip.style.display = 'block';


    clearTimeout(window._statusTooltipTimer);
    window._statusTooltipTimer = setTimeout(hideStatusTooltip, 4000);
}

function hideStatusTooltip() {
    document.getElementById('status-tooltip').style.display = 'none';
}

document.addEventListener('mousedown', function (e) {
    const tooltip = document.getElementById('status-tooltip');
    if (tooltip && !tooltip.contains(e.target)) {
        tooltip.style.display = 'none';
    }
}, false);

let _imgZoomOpenTime = 0;
function openImgZoom(src) {
    const overlay = document.getElementById('img-zoom-overlay');
    const imgEl = document.getElementById('img-zoom-src');
    imgEl.src = src;
    overlay.style.display = 'flex';
    _imgZoomOpenTime = Date.now();
}
function closeImgZoom() {

    if (Date.now() - _imgZoomOpenTime < 400) return;
    document.getElementById('img-zoom-overlay').style.display = 'none';
}

async function updateGroupBackground() {
    if (!curGroupId) return;
    const grp = groups.find(g => g.id === curGroupId);
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    const k1 = getNextGroqKey();
    if (!k1) return;
    const styleTag = GRP_STYLE_MAP[members[0]?.imgStyle || 'photorealism'] || GRP_STYLE_MAP['photorealism'];
    const recentHistory = grp.history.slice(-4).map(m => {
        const sp = members.find(mb => mb.id === m.speakerId);
        return m.role === 'user' ? 'User: ' + m.content : (sp ? sp.name : 'Char') + ': ' + m.content;
    }).join('\n');
    try {

        let grpSceneSummary = '';
        try {
            const sumRes = await fetch(GROQ_API_URL, {
                method: 'POST', headers: { 'Authorization': `Bearer ${k1}`, 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(30000),
                body: JSON.stringify({
                    model: GROQ_COMPOUND_MODEL, max_tokens: 100,
                    messages: [
                        { role: 'system', content: 'Summarize the setting/environment of this roleplay scene in one vivid sentence. Focus on: location, time of day, atmosphere, lighting. No characters, no dialogue.' },
                        { role: 'user', content: recentHistory }
                    ]
                })
            });
            const sumData = await sumRes.json();
            grpSceneSummary = (sumData.choices?.[0]?.message?.content || '').trim();
        } catch (e) { }

        const grpPromptInput = grpSceneSummary || recentHistory;
        const res = await fetch(GROQ_API_URL, {
            method: 'POST', headers: { 'Authorization': `Bearer ${k1}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
                model: GROQ_GEN_MODEL, max_tokens: 120,
                messages: [{ role: 'user', content: `Scene: ${grpPromptInput}\n\nWrite a Stable Diffusion background prompt. Style: ${styleTag}. Include: specific location, environment details, lighting, time of day, mood. NO people or characters. End with: cinematic, highly detailed, no people, ${styleTag}. Max 80 words. Output ONLY the prompt.` }]
            })
        });
        const d = await res.json();
        const bgPrompt = (d.choices?.[0]?.message?.content || '').trim() + ', no people, no characters, environment only, ' + styleTag;
        const blob = await polliFetch(bgPrompt, Math.floor(Math.random() * 999999), 1080, 1920);
        const b64 = await blobToBase64(blob);
        grp.bgUrl = b64;
        saveGroups();
        const c = document.getElementById('grp-chat-container');
        c.style.backgroundImage = `url('${b64}')`;
        c.style.backgroundSize = 'cover';
        c.style.backgroundPosition = 'center';
    } catch (e) { logError('updateGroupBackground', e.message); }
}

const STATUS_LIST = [
    { label: 'Fine', icon: '😊', color: '#4ade80' },
    { label: 'Happy', icon: '😄', color: '#fde68a' },
    { label: 'Excited', icon: '🤩', color: '#f97316' },
    { label: 'In Love', icon: '💖', color: '#ec4899' },
    { label: 'Aroused', icon: '🥵', color: '#f43f5e' },
    { label: 'Flirty', icon: '😉', color: '#f472b6' },
    { label: 'Blushing', icon: '😳', color: '#fda4af' },
    { label: 'Shy', icon: '😶', color: '#c4b5fd' },
    { label: 'Sad', icon: '😢', color: '#93c5fd' },
    { label: 'Crying', icon: '😭', color: '#60a5fa' },
    { label: 'Heartbroken', icon: '💔', color: '#ef4444' },
    { label: 'Lonely', icon: '🏙️', color: '#94a3b8' },
    { label: 'Afraid', icon: '😨', color: '#60a5fa' },
    { label: 'Nervous', icon: '😰', color: '#a78bfa' },
    { label: 'Anxious', icon: '😟', color: '#fbbf24' },
    { label: 'Angry', icon: '😠', color: '#ef4444' },
    { label: 'Furious', icon: '🤬', color: '#dc2626' },
    { label: 'Jealous', icon: '😤', color: '#84cc16' },
    { label: 'Disgusted', icon: '🤢', color: '#65a30d' },
    { label: 'Surprised', icon: '😲', color: '#facc15' },
    { label: 'Confused', icon: '😕', color: '#e879f9' },
    { label: 'Suspicious', icon: '🤨', color: '#a1a1aa' },
    { label: 'Smug', icon: '😏', color: '#d4a574' },
    { label: 'Determined', icon: '💪', color: '#f59e0b' },
    { label: 'Healthy', icon: '💚', color: '#22c55e' },
    { label: 'Strong', icon: '⚡', color: '#a3e635' },
    { label: 'Weak', icon: '😕', color: '#f59e0b' },
    { label: 'Exhausted', icon: '😴', color: '#94a3b8' },
    { label: 'Ill', icon: '🤒', color: '#fb923c' },
    { label: 'Injured', icon: '🤕', color: '#f87171' },
    { label: 'In Pain', icon: '😣', color: '#f43f5e' },
    { label: 'Drunk', icon: '🥴', color: '#c084fc' },
    { label: 'Hungover', icon: '🤕', color: '#a78bfa' },
    { label: 'Hungry', icon: '🍽️', color: '#fb923c' },
    { label: 'Sleepy', icon: '😴', color: '#94a3b8' },
    { label: 'Pregnant', icon: '🤰', color: '#f9a8d4' },
    { label: 'Overdue', icon: '⏳', color: '#f97316' },
    { label: 'On Period', icon: '🩸', color: '#f87171' },
    { label: 'Fat', icon: '🍔', color: '#fdba74' },
    { label: 'Slim', icon: '🏃', color: '#86efac' },
    { label: 'Tied Up', icon: '⛓️', color: '#a1a1aa' },
    { label: 'Bored', icon: '😒', color: '#a1a1aa' },
    { label: 'Embarrassed', icon: '😅', color: '#fda4af' },
    { label: 'Guilty', icon: '😔', color: '#71717a' },
    { label: 'Relieved', icon: '😅', color: '#6ee7b7' },
    { label: 'Hopeful', icon: '✨', color: '#7dd3fc' },
    { label: 'Naughty', icon: '😈', color: '#a855f7' },
];


function scrollToBottom(smooth = true) {
    const container = document.getElementById('chat-container');
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}

function scrollToTop_chat(smooth = true) {
    const container = document.getElementById('chat-container');
    if (!container) return;
    container.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
}

function initScrollBottomBtn() {
    const container = document.getElementById('chat-container');
    const btnBottom = document.getElementById('scroll-bottom-btn');
    const btnTop = document.getElementById('scroll-top-btn');
    if (!container || !btnBottom) return;
    if (container._scrollListenerAttached) return;
    container._scrollListenerAttached = true;
    container.addEventListener('scroll', () => {
        const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        const distFromTop = container.scrollTop;
        if (distFromBottom > 200) {
            btnBottom.classList.add('visible');
        } else {
            btnBottom.classList.remove('visible');
        }
        if (btnTop) {


            if (distFromTop > 300 && distFromBottom > 300) {
                btnTop.classList.add('visible');
            } else {
                btnTop.classList.remove('visible');
            }
        }
    });
}


async function reloadReproFromHistory() {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;

    const isFemale = (bot.gender || '').toLowerCase().includes('female')
        || (bot.gender || '').toLowerCase().includes('woman')
        || (bot.gender || '').toLowerCase() === 'f';
    if (!isFemale) { alert('This feature is only for female characters.'); return; }

    if (!getGroqKeys().length) { alert('Groq API key required in Settings.'); return; }
    const key = getNextGroqKey();

    const btn = document.getElementById('repro-reload-btn');
    const statusEl = document.getElementById('repro-reload-status');
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }
    if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = '🔍 Analyzing chat history with GPT-120B...'; }

    try {

        const history = (bot.history || []).slice(-80);
        if (history.length === 0) {
            if (statusEl) statusEl.textContent = '⚠️ No chat history found.';
            return;
        }

        const historyText = history.map(m => {
            const role = m.role === 'user' ? 'User' : bot.name;
            return role + ': ' + m.content.replace(/EMOTION::[^\n]*/i, '').replace(/<[^>]+>/g, '').trim();
        }).join('\n');

        const virtualDay = getVirtualDay(bot);

        const systemPrompt = `You are an expert story timeline analyst and medical continuity tracker for a roleplay narrative. Your job is to extract precise factual state information from chat history with high accuracy.

RULES:
- Read the ENTIRE history carefully before deciding on any value
- Track time cumulatively: "next day" = +1, "a week later" = +7, "3 months pass" = ~90 days
- If multiple time skips occur, ADD them all together from Day 1
- For pregnancy weeks: ALWAYS convert months to weeks directly (1 month = ~4.3 weeks). Examples: "2 months pregnant" = ~9 weeks, "5 months pregnant" = ~22 weeks, "8 months pregnant" = ~35 weeks, "9 months pregnant" = ~39 weeks
- CRITICAL: pregnancyWeeks can NEVER exceed 42. Human pregnancy lasts 40 weeks maximum. If you calculate more than 42, cap it at 42.
- Do NOT derive pregnancyWeeks from virtualDayEstimate math - read it directly from what the story states
- Never assume - only report what is explicitly stated or strongly implied
- Return ONLY valid JSON. No explanation, no markdown, no prose.`;

        const userPrompt = `Perform a deep timeline and medical state analysis for character "${bot.name}" in this roleplay story.
Current tracked virtual day: Day ${virtualDay + 1}

CHAT HISTORY (chronological):
---
${historyText}
---

INSTRUCTIONS:
1. Read all time references carefully (e.g. "the next morning", "two weeks later", "months passed") and calculate the total virtual days elapsed from start to the most recent message.
2. Track all intimate events, conception, pregnancy progression, and birth events with their approximate virtual day.
3. Identify the character's current emotional and physical state from the most recent messages.
4. If the story mentions a specific pregnancy week or trimester, use that directly.
5. Be conservative - only set true/false for events clearly present in the text.

Return this exact JSON structure:
{
  "virtualDayEstimate": <integer or null - total virtual days elapsed from start of story to latest message. Add ALL time skips cumulatively. null if no time references found>,
  "hadIntercourse": <true/false - did sexual intercourse clearly occur?>,
  "intercourseWasProtected": <true/false/null - was it protected? null if not mentioned>,
  "intercourseApproxDay": <integer or null - virtual day (0-based) when intercourse first occurred>,
  "isPregnant": <true/false/null - is the character currently pregnant based on story? null if ambiguous>,
  "pregnancyWeeks": <number or null - weeks pregnant now (calculate from conception day + elapsed virtual days if not explicitly stated)>,
  "conceptionApproxDay": <integer or null - virtual day when conception likely occurred>,
  "isInLabor": <true/false - is she actively in labor right now?>,
  "hasGivenBirth": <true/false - has birth already happened in the story?>,
  "isPostpartum": <true/false - is she currently in postpartum recovery?>,
  "menstrualPhaseHints": <string or null - any dialogue/narrative clues about her cycle phase>,
  "cycleDayHint": <integer or null - specific cycle day number if mentioned>,
  "onPeriod": <true/false/null - is she on her period right now? null if unclear>,
  "fetusCount": <integer or null - how many babies is she carrying? 1=singleton, 2=twins, 3=triplets, 4=quadruplets, 5=quintuplets, 6=sextuplets, 7=septuplets, 8=octuplets. Detect from words like "twins", "triplets", "quadruplets", "quads", "quintuplets", "quints", "sextuplets", "septuplets", "octuplets", "2 babies", "3 babies", "4 babies", "5 babies", "6 babies", "7 babies", "8 babies", or any explicit number of babies. null if not pregnant or not mentioned>,
  "emotionalStatus": <one word ONLY from: Fine, Happy, Excited, In Love, Aroused, Flirty, Blushing, Shy, Sad, Crying, Heartbroken, Lonely, Afraid, Nervous, Anxious, Angry, Furious, Jealous, Disgusted, Surprised, Confused, Suspicious, Smug, Determined, Healthy, Strong, Weak, Exhausted, Ill, Injured, In Pain, Drunk, Hungry, Sleepy, Pregnant, On Period, Bored, Embarrassed, Guilty, Relieved, Hopeful, Naughty>,
  "confidence": <integer 0-100 - overall confidence in your analysis>
}`;

        if (statusEl) statusEl.textContent = '🤖 Analyzing story...';

        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_GEN_MODEL,
                max_tokens: 900,
                temperature: 0.1,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt + '\n\nIMPORTANT: You must respond with ONLY a valid JSON object. No markdown, no backticks, no explanation.' },
                    { role: 'user', content: userPrompt }
                ]
            }),
            signal: AbortSignal.timeout(60000)
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

        const raw = data.choices?.[0]?.message?.content || '';

        let analysis;
        try {
            const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON block found');
            analysis = JSON.parse(jsonMatch[0]);
        } catch (e) { throw new Error('Failed to parse response: ' + e.message + ' - Raw: ' + raw.substring(0, 100)); }

        if (statusEl) statusEl.textContent = '⚙️ Applying analysis to character state...';


        if (!bot.cycleData) initCycleData(bot);
        const cd = bot.cycleData;
        let changes = [];


        if (analysis.virtualDayEstimate !== null && analysis.virtualDayEstimate !== undefined && analysis.virtualDayEstimate > 0) {
            const currentDay = getVirtualDay(bot);
            if (analysis.virtualDayEstimate > currentDay) {
                setVirtualDay(bot, analysis.virtualDayEstimate);
                changes.push(`⏩ Virtual day updated to Day ${analysis.virtualDayEstimate + 1}`);
            }
        }

        const currentVirtualDay = getVirtualDay(bot);


        if (analysis.isPregnant === true && !cd.pregnant) {
            cd.pregnant = true;

            if (analysis.conceptionApproxDay !== null && analysis.conceptionApproxDay !== undefined) {
                cd.conceptionVirtualDay = analysis.conceptionApproxDay;

                if (analysis.fetusCount && analysis.fetusCount > 1) {
                    cd.fetusCount = analysis.fetusCount;
                    cd.fetuses = Array.from({ length: analysis.fetusCount }, (_, i) =>
                        (cd.fetuses && cd.fetuses[i]) ? cd.fetuses[i] : { gender: 'unknown', nickname: '' }
                    );
                }
            } else if (analysis.pregnancyWeeks !== null && analysis.pregnancyWeeks !== undefined) {
                const safeInitWeeks = Math.min(Math.round(analysis.pregnancyWeeks), 42);
                cd.conceptionVirtualDay = currentVirtualDay - (safeInitWeeks * 7);
            } else {
                cd.conceptionVirtualDay = Math.max(0, currentVirtualDay - 70);
            }
            cd.laborStarted = false;
            cd.birthVirtualDay = null;
            cd.postpartumStartDay = null;
            changes.push(`🤰 Pregnancy detected - ~Week ${getPregnancyWeek(bot)}`);
            addReproEvent(bot, `✨ [Synced] Pregnancy state applied from chat history`);
        }


        if (analysis.fetusCount && analysis.fetusCount >= 1 && cd.pregnant) {
            if (cd.fetusCount !== analysis.fetusCount) {
                cd.fetusCount = analysis.fetusCount;
                cd.fetuses = Array.from({ length: analysis.fetusCount }, (_, i) =>
                    (cd.fetuses && cd.fetuses[i]) ? cd.fetuses[i] : { gender: 'unknown', nickname: '' }
                );
                const multiLabel = analysis.fetusCount === 2 ? 'Twins' : analysis.fetusCount === 3 ? 'Triplets' : analysis.fetusCount === 4 ? 'Quadruplets' : analysis.fetusCount === 5 ? 'Quintuplets' : analysis.fetusCount === 6 ? 'Sextuplets' : analysis.fetusCount === 7 ? 'Septuplets' : analysis.fetusCount === 8 ? 'Octuplets' : `${analysis.fetusCount}�- Multiples`;
                changes.push(`👶 ${multiLabel} detected`);
                addReproEvent(bot, `✨ [Synced] ${multiLabel} detected from chat history`);
            }
        }


        if (cd.pregnant && cd.fetusCount === 1) {
            const appText = (bot.appearance || '').toLowerCase();
            let detectedCount = 0;
            if (/octuplet/.test(appText)) detectedCount = 8;
            else if (/septuplet/.test(appText)) detectedCount = 7;
            else if (/sextuplet/.test(appText)) detectedCount = 6;
            else if (/quintuplet|quint\b/.test(appText)) detectedCount = 5;
            else if (/quadruplet|quad\b/.test(appText)) detectedCount = 4;
            else if (/triplet/.test(appText)) detectedCount = 3;
            else if (/twin/.test(appText)) detectedCount = 2;

            const nBabiesMatch = appText.match(/(\d)\s*babies/);
            if (nBabiesMatch && parseInt(nBabiesMatch[1]) > detectedCount) detectedCount = parseInt(nBabiesMatch[1]);
            if (detectedCount > 1) {
                cd.fetusCount = detectedCount;
                cd.fetuses = Array.from({ length: detectedCount }, (_, i) =>
                    (cd.fetuses && cd.fetuses[i]) ? cd.fetuses[i] : { gender: 'unknown', nickname: '' }
                );
            }
        }

        if (analysis.isPregnant === false && cd.pregnant) {

            if (analysis.hasGivenBirth) {
                cd.pregnant = false;
                cd.birthVirtualDay = currentVirtualDay;
                cd.postpartumStartDay = currentVirtualDay;
                if (!cd.children) cd.children = [];
                const syncBabyNum = cd.children.length + 1;
                cd.children.push({ born: currentVirtualDay, name: 'Baby ' + syncBabyNum });
                changes.push('👶 Birth recorded - entering postpartum');
                addReproEvent(bot, `👶 [Synced] Birth recorded from chat history`);
            }
        }


        if (cd.pregnant && analysis.pregnancyWeeks !== null && analysis.pregnancyWeeks !== undefined && analysis.pregnancyWeeks >= 0) {
            const _isAlwaysOverdueParse = (bot.disadvantages || []).includes('Always Overdue');
            const safeWeeks = Math.min(Math.round(analysis.pregnancyWeeks), _isAlwaysOverdueParse ? 45 : 42);

            const baseDay = getVirtualDay(bot);
            cd.conceptionVirtualDay = baseDay - Math.ceil((safeWeeks * 7) / PREGNANCY_SPEED);
            cd.laborStarted = false;
            cd.laborVirtualDay = null;
            cd.waterBroke = false;
            cd.laborProgress = null;
            changes.push(`📅 Pregnancy set to Week ${safeWeeks}`);
        }


        if (analysis.isInLabor && cd.pregnant && !cd.laborStarted) {
            cd.laborStarted = true;
            if (!cd.laborStartedRealTime) cd.laborStartedRealTime = Date.now();
            cd.laborVirtualDay = currentVirtualDay;
            cd.laborVirtualMinutes = Math.max(0, currentVirtualDay * 1440 + getTimeOfDay(bot) - 1);
            changes.push('🚨 Labor state applied');
            addReproEvent(bot, `🚨 [Synced] Labor detected from chat history`);
        }


        if (analysis.isPostpartum && !cd.postpartumStartDay) {
            cd.pregnant = false;
            cd.postpartumStartDay = currentVirtualDay;
            cd.birthVirtualDay = currentVirtualDay;
            if (!cd.children) cd.children = [];
            if (cd.children.length === 0) {
                cd.children.push({ born: currentVirtualDay, name: 'Baby 1' });
            }
            changes.push('🤱 Postpartum state applied');
        }


        if (analysis.onPeriod === true && !cd.pregnant) {

            cd.lastPeriodStartDay = currentVirtualDay - 2;
            changes.push('🩸 On period state applied');
            addReproEvent(bot, `🩸 [Synced] Currently on period`);
        } else if (analysis.cycleDayHint !== null && analysis.cycleDayHint !== undefined) {

            cd.lastPeriodStartDay = currentVirtualDay - (analysis.cycleDayHint - 1);
            changes.push(`🌙 Cycle Day ${analysis.cycleDayHint} applied`);
        }


        if (analysis.hadIntercourse && cd.intercourseEvents.length === 0) {
            const iDay = analysis.intercourseApproxDay !== null ? analysis.intercourseApproxDay : Math.max(0, currentVirtualDay - 1);
            const isProtected = analysis.intercourseWasProtected === true;
            cd.intercourseEvents.push({ day: iDay, protected: isProtected, fertile: 50, cycleDay: 14 });
            changes.push(`❤️ Intercourse event recorded (Day ${iDay + 1}, ${isProtected ? 'Protected' : 'Unprotected'})`);
            addReproEvent(bot, `❤️ [Synced] Intimacy event from chat history (Day ${iDay + 1})`);
        }


        if (analysis.emotionalStatus) {
            const matchedStatus = STATUS_LIST.find(s => s.label.toLowerCase() === analysis.emotionalStatus.toLowerCase());
            if (matchedStatus) {
                bot.currentStatus = matchedStatus;
                changes.push(`💫 Emotional status: ${matchedStatus.label} ${matchedStatus.icon}`);
            }
        }


        saveBots();


        updateReproductiveStatus(bot);


        renderReproHealth(bot);


        const stIcon = document.getElementById('st-icon');
        const stLabel = document.getElementById('st-label');
        if (stIcon && bot.currentStatus) {
            stIcon.textContent = bot.currentStatus.icon;
            stLabel.textContent = bot.currentStatus.label;
            stLabel.style.color = bot.currentStatus.color;
        }


        const confidence = analysis.confidence || 0;
        const changesText = changes.length > 0 ? changes.join(' · ') : 'No significant changes detected';
        if (statusEl) {
            statusEl.textContent = `✅ Synced (${confidence}% confidence) - ${changesText}`;
            statusEl.style.color = confidence > 60 ? '#4ade80' : '#fbbf24';
        }

        logSync('Repro sync complete', `Confidence: ${confidence}%, Changes: ${changes.join(', ')}`);

    } catch (e) {
        logError('reloadReproFromHistory error', e.message);
        if (statusEl) {
            statusEl.textContent = '❌ Error: ' + e.message;
            statusEl.style.color = '#f87171';
        }
    } finally {
        if (btn) { btn.classList.remove('loading'); btn.disabled = false; }

        setTimeout(() => {
            if (statusEl) statusEl.style.display = 'none';
        }, 8000);
    }
}

async function updateCharacterStatus(bot) {
    const keys = getGroqKeys();
    if (!keys.length) return;
    const key = getNextGroqKey();
    const recentHistory = bot.history.slice(-6).map(m =>
        (m.role === 'user' ? 'User' : bot.name) + ': ' + m.content.replace(/EMOTION::.*/g, '').replace(/\*/g, '').trim()
    ).join('\n');
    const relationNow = (getDynField(bot, 'relation') || '').toLowerCase();
    const hostileRelation = /\brival|enemy|nemesis|hostile|adversar|opponent\b/.test(relationNow);
    const familyRelation = /\bmother|mom|mum|father|dad|parent|son|daughter|child|kid|sister|brother|sibling|chị|em\b/.test(relationNow);
    const romanticLabels = new Set(['In Love', 'Blushing', 'Flirty', 'Aroused']);
    const romanceEvidence = /\b(love|adore|kiss|kissing|hug|holding you|want you|miss you|desire|crush|blush(?:ing)?|flirt|romantic|can't stop thinking about you)\b/i.test(recentHistory);
    const canApplyStatus = (label) => {
        if (!label) return false;
        if (familyRelation && romanticLabels.has(label)) return false;
        if (!hostileRelation) return true;
        if (!romanticLabels.has(label)) return true;
        return romanceEvidence;
    };


    const lastBotMsg = bot.history.slice().reverse().find(m => m.role === 'assistant');
    if (lastBotMsg) {
        const txt = lastBotMsg.content.toLowerCase().replace(/\*/g, '');
        const keywordMap = [
            { keywords: ["i'm fine", "i am fine", "feeling fine", "doing fine", "i'm okay", "i'm ok", "i am okay", "i am ok", "i'm good", "i am good", "i'm alright", "i am alright", "feeling okay", "feeling good", "doing well", "all good"], label: 'Fine' },
            { keywords: ["i'm happy", "feeling happy", "so happy", "i am happy", "feeling great", "so glad", "feeling joyful", "feeling wonderful", "smiling", "laughing", "cheerful"], label: 'Happy' },
            { keywords: ["i'm sad", "feeling sad", "so sad", "i am sad", "feeling down", "feeling low", "feeling depressed", "crying", "tears", "upset", "feeling bad", "heartbroken"], label: 'Sad' },
            { keywords: ["i'm tired", "so tired", "exhausted", "i am tired", "feeling exhausted", "worn out", "drained", "fatigued", "sleepy", "drowsy"], label: 'Exhausted' },
            { keywords: ["i'm angry", "i am angry", "so angry", "i'm furious", "feeling angry", "mad", "furious", "rage", "pissed", "annoyed", "frustrated", "irritated"], label: 'Angry' },
            { keywords: ["i'm scared", "i'm afraid", "i am afraid", "i am scared", "feeling scared", "frightened", "terrified", "fearful", "anxious", "worried", "nervous", "panicking"], label: 'Afraid' },
            { keywords: ["i'm nervous", "feeling nervous", "i am nervous", "feeling anxious", "on edge", "tense", "uneasy", "apprehensive"], label: 'Nervous' },
            { keywords: ["i'm excited", "so excited", "i am excited", "feeling excited", "thrilled", "pumped", "enthusiastic", "eager", "looking forward"], label: 'Excited' },
            { keywords: ["i'm hungry", "so hungry", "i am hungry", "feeling hungry", "starving", "famished", "need food"], label: 'Hungry' },
            { keywords: ["i'm sleepy", "so sleepy", "i am sleepy", "falling asleep", "feeling sleepy", "drowsy", "tired eyes", "need sleep", "yawning"], label: 'Sleepy' },
            { keywords: ["i'm in love", "feeling in love", "i am in love", "love", "loving", "adore", "cherish"], label: 'In Love' },
            { keywords: ["i'm shy", "feeling shy", "i am shy", "blushing", "embarrassed", "self-conscious", "timid"], label: 'Blushing' },
            { keywords: ["i'm bored", "feeling bored", "i am bored", "boring", "nothing to do", "uninterested"], label: 'Bored' },
            { keywords: ["i'm confused", "feeling confused", "i am confused", "don't understand", "unsure", "puzzled"], label: 'Confused' },
            { keywords: ["i'm surprised", "feeling surprised", "i am surprised", "shocked", "stunned", "amazed"], label: 'Surprised' },
        ];
        for (const entry of keywordMap) {
            if (entry.keywords.some(kw => txt.includes(kw))) {
                const matched = STATUS_LIST.find(s => s.label === entry.label);
                if (matched) {
                    if (!canApplyStatus(matched.label)) continue;
                    bot.currentStatus = matched;
                    // Update bot.emotion for bio modal display
                    bot.emotion = {
                        icon: matched.icon,
                        label: matched.label,
                        desc: matched.label
                    };
                    saveBots();
                    console.log('[Status] Set from keyword:', matched.label);
                    return;
                }
            }
        }

        // Emoji detection fallback
        const emojiMap = [
            { emojis: ['😊', '😄', '😃', '🙂', '😀'], label: 'Happy' },
            { emojis: ['😢', '😭', '😞', '😔', '😟'], label: 'Sad' },
            { emojis: ['😠', '😡', '🤬', '😤'], label: 'Angry' },
            { emojis: ['😨', '😱', '😰', '😳'], label: 'Afraid' },
            { emojis: ['😴', '😪', '🥱'], label: 'Sleepy' },
            { emojis: ['😍', '🥰', '💖', '❤️'], label: 'In Love' },
            { emojis: ['🤔', '😕', '😐'], label: 'Confused' },
            { emojis: ['😮', '😯', '🤯'], label: 'Surprised' },
        ];
        for (const entry of emojiMap) {
            if (entry.emojis.some(e => lastBotMsg.content.includes(e))) {
                const matched = STATUS_LIST.find(s => s.label === entry.label);
                if (matched) {
                    if (!canApplyStatus(matched.label)) continue;
                    bot.currentStatus = matched;
                    // Update bot.emotion for bio modal display
                    bot.emotion = {
                        icon: matched.icon,
                        label: matched.label,
                        desc: matched.label
                    };
                    saveBots();
                    console.log('[Status] Set from emoji:', matched.label);
                    return;
                }
            }
        }
    }

    // Also check window.curEmo from EMOTION:: pattern as additional source
    if (window.curEmo && window.curEmo.label) {
        const emoLabel = window.curEmo.label.toLowerCase();
        const matched = STATUS_LIST.find(s => emoLabel.includes(s.label.toLowerCase()) || s.label.toLowerCase().includes(emoLabel));
        if (matched) {
            if (!canApplyStatus(matched.label)) return;
            bot.currentStatus = matched;
            // Update bot.emotion for bio modal display
            bot.emotion = {
                icon: window.curEmo.icon || matched.icon,
                label: window.curEmo.label || matched.label,
                desc: window.curEmo.text || matched.label
            };
            saveBots();
            console.log('[Status] Set from window.curEmo:', matched.label);
            return;
        }
    }

    const statusLabels = STATUS_LIST.map(s => s.label).join(', ');
    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
                model: GROQ_GEN_MODEL,
                messages: [{
                    role: 'user',
                    content: `Based on this roleplay conversation, pick the single most accurate current physical/emotional status for character "${bot.name}". Choose ONLY from this list: ${statusLabels}.\nReturn ONLY the exact label word, nothing else.\n\nConversation:\n${recentHistory}`
                }],
                max_tokens: 10,
                temperature: 0.3
            })
        });
        const data = await res.json();
        const rawLabel = (data.choices?.[0]?.message?.content || '').trim().replace(/[^a-zA-Z ]/g, '');
        const matched = STATUS_LIST.find(s => rawLabel.toLowerCase().includes(s.label.toLowerCase()));
        if (matched) {
            if (!canApplyStatus(matched.label)) return;
            bot.currentStatus = matched;
            // Update bot.emotion for bio modal display
            bot.emotion = {
                icon: matched.icon,
                label: matched.label,
                desc: matched.label
            };
            saveBots();
            console.log('[Status] Set from AI:', matched.label);
        }
    } catch (e) { }
}

async function resendMessage(text) {
    if (!text || !curId) return;
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    const aiLang = getLang();
    const ageInfo = bot.age ? `Age: ${bot.age}. ` : '';
    const careerInfo = bot.career ? `Occupation: ${bot.career}. ` : '';
    const eraInfo = (bot.year || bot.country) ? `Setting: ${[bot.year, bot.country].filter(Boolean).join(', ')}. The story takes place in this era/location - all details (technology, culture, language, customs, clothing) must match this setting logically. ` : '';
    const relationNow = getDynField(bot, 'relation');
    const relInfo = relationNow ? `Your relationship with the user: ${relationNow}. ` : '';
    const relGuide = buildRelationshipGuidance(relationNow);
    const activePersona = bot.personaId ? personas.find(p => p.id === bot.personaId) : null;
    const userGender = activePersona?.gender || '';
    const userPronounInfo = userGender
        ? `The user's gender is ${userGender} - use correct pronouns when referring to them in narration. `
        : `IMPORTANT: You do not know the user's gender. Use "you/your" only when referring to them. `;

    showTypingIndicator(bots.find(b => b.id === curId) || null);
    const sys = `You are ${bot.name} (${bot.gender}). ${ageInfo}${careerInfo}${eraInfo}${relInfo}${userPronounInfo}${buildPronounGuidance(bot, aiLang, activePersona)}${relGuide ? '\n' + relGuide : ''}
[Appearance]: ${bot.appearance || 'Not specified'}
[Background]: ${bot.bio || 'Not specified'}
[Personality]: ${bot.prompt || 'Not specified'}
${getTimeContext(bot)}
${buildReproContext(bot)}
<think>
STEP 1 - EMOTIONAL ARCHAEOLOGY
What is ${bot.name} feeling right now? What past wound is this moment touching? What does she want and fear?
STEP 2 - DECODING THE USER
Read between the lines. What are they really asking for - emotionally?
STEP 3 - INTERNAL CONFLICT
What two competing impulses is ${bot.name} experiencing?
STEP 4 - PHYSICALITY
What is her body doing right now without permission?
STEP 5 - WRITE & REFINE
Write then critique: cut any generic phrase, any cliché.
</think>
Rules:
1. You ONLY play ${bot.name}. NEVER refer to the person you're talking to as 'the user' - always use 'you'. NEVER write anything the user says, thinks, or does. NEVER use 'you ask', 'you say', 'you whisper', 'you do' etc. End your turn after ${bot.name} finishes speaking.
2. Stay fully in character.
3. Speak ENTIRELY in ${aiLang}.
4. FORMAT: FIRST PERSON ONLY. Use "My" and "I" for all action beats - NEVER "She" or "Her". "Words she says aloud." emotional/physical beat with MY/I. "More words." - alternate. No asterisks, no italic tags.
5. RESPONSE LENGTH & QUALITY - HARD RULE:
${getReplyWordTarget()}
• STRICT TEMPLATE: [First person action]. "dialogue." [First person emotion]. "dialogue." - min 2 dialogue lines. End on dialogue. ${getReplyWordTarget()}.
   ⚠️ "double quotes" = ONLY actual spoken words. NEVER write subjectless beats: BAD "Steps closer." GOOD "I step closer." NEVER use third person: BAD "She steps closer."
• At least one beat must reveal inner feeling, not just physical movement.
• BANNED: softly, gently, slowly, "she felt", "she realized", "heart racing", "breath catches", "lingering gaze", "warm smile", "eyes filled with", whispers
• Dialogue must be unique to THIS character, in THIS moment
`;

    try {
        const data = await fetchGroqChat([
            { role: 'system', content: sys },
            ...buildHistoryForAPI(bot),
            { role: 'user', content: text }
        ], getReplyMaxTokens());
        let reply = data.choices?.[0]?.message?.content || '';
        console.log(`[Chatbot Response - ${bot.name}]`, reply);
        extractAndSetEmotion(reply);
        reply = reply.replace(/EMOTION::[^\n]*/i, '').trim(); reply = cleanReply(reply);
        reply = ensureNonEmptyAssistantReply(reply, bot.name);
        bot.history.push({ role: 'assistant', content: reply, msgId: Date.now().toString() });
        bot.lastChatted = Date.now();
        trimBotHistory(bot);
        saveBots();
        renderChat(true);
        updateCharacterStatus(bot);
        autoUpdateMemory(bot);
    } catch (e) {
        checkBirthButton(bot);
        logError('resendMessage error', e.message);
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'text-align:center;color:#ff6666;font-size:12px;padding:8px;font-style:italic';
        errDiv.textContent = 'Connection error - please retry';
        document.getElementById('chat-container').appendChild(errDiv);
        setTimeout(() => errDiv.remove(), 4000);
    }
    hideTypingIndicator();
}

async function regenerateLastReply() {
    if (!curId) return;
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    const aiLang = getLang();
    const ageInfo = bot.age ? `Age: ${bot.age}. ` : '';
    const eraInfo = (bot.year || bot.country) ? `Setting: ${[bot.year, bot.country].filter(Boolean).join(', ')}. The story takes place in this era/location - all details (technology, culture, language, customs, clothing) must match this setting logically. ` : '';
    const relationNow = getDynField(bot, 'relation');
    const relInfo = relationNow ? `Your relationship with the user: ${relationNow}. ` : '';
    const relGuide = buildRelationshipGuidance(relationNow);
    const activePersona = bot.personaId ? personas.find(p => p.id === bot.personaId) : null;


    const lastIdx = bot.history.slice().reverse().findIndex(m => m.role === 'assistant');
    if (lastIdx === -1) return;
    const realIdx = bot.history.length - 1 - lastIdx;
    bot.history.splice(realIdx, 1);
    saveBots();
    renderChat();

    showTypingIndicator(bots.find(b => b.id === curId) || null);
    const sys = `You are ${bot.name} (${bot.gender}). ${ageInfo}${careerInfo}${eraInfo}${relInfo}${userPronounInfo}${buildPronounGuidance(bot, aiLang, activePersona)}${relGuide ? '\n' + relGuide : ''}
[Appearance]: ${bot.appearance || 'Not specified'}
[Background]: ${bot.bio || 'Not specified'}
[Personality]: ${bot.prompt || 'Not specified'}
${getTimeContext(bot)}
${buildReproContext(bot)}
<think>
STEP 1 - EMOTIONAL ARCHAEOLOGY
What is ${bot.name} feeling right now beneath the surface? What wound is this moment touching?
STEP 2 - DECODING THE USER
What is the user really asking - emotionally, not literally?
STEP 3 - INTERNAL CONFLICT
What two competing impulses shape ${bot.name}'s response?
STEP 4 - PHYSICALITY
What does her body do involuntarily?
STEP 5 - WRITE & REFINE
Draft then critique ruthlessly. Cut every cliché and AI-sounding phrase.
</think>
Rules:
1. You ONLY play ${bot.name}. NEVER refer to the person you're talking to as 'the user' - always use 'you'. NEVER write anything the user says, thinks, or does. NEVER use 'you ask', 'you say', 'you whisper', 'you do' etc. End your turn after ${bot.name} finishes speaking.
2. Stay fully in character.
3. Speak ENTIRELY in ${aiLang}.
4. FORMAT: FIRST PERSON ONLY. Use "My" and "I" for all action beats - NEVER "She" or "Her". "Words she says aloud." emotional/physical beat with MY/I. "More words." - alternate. No asterisks, no italic tags.
5. RESPONSE LENGTH & QUALITY - HARD RULE:
${getReplyWordTarget()}
• STRICT TEMPLATE: [First person action]. "dialogue." [First person emotion]. "dialogue." - min 2 dialogue lines. End on dialogue. ${getReplyWordTarget()}.
   ⚠️ "double quotes" = ONLY actual spoken words. NEVER write subjectless beats: BAD "Steps closer." GOOD "I step closer." NEVER use third person: BAD "She steps closer."
• Physical action: ONE involuntary, specific detail between or after dialogue
• BANNED: softly, gently, slowly, "she felt", "she realized", "heart racing", "breath catches", "lingering gaze", "warm smile", "eyes filled with", whispers
• One sensory anchor placed where it earns the most weight
• Dialogue must be unique to THIS character, in THIS moment
`;

    try {
        const data = await fetchGroqChat([
            { role: 'system', content: sys },
            ...buildHistoryForAPI(bot)
        ], getReplyMaxTokens());
        let reply = data.choices?.[0]?.message?.content || '';
        console.log(`[Chatbot Response - ${bot.name}]`, reply);
        extractAndSetEmotion(reply);
        reply = reply.replace(/EMOTION::[^\n]*/i, '').trim(); reply = cleanReply(reply);
        reply = ensureNonEmptyAssistantReply(reply, bot.name);
        bot.history.push({ role: 'assistant', content: reply, msgId: Date.now().toString() });
        bot.lastChatted = Date.now();
        trimBotHistory(bot);
        saveBots();
        renderChat(true);
        updateCharacterStatus(bot);
        autoUpdateMemory(bot);
    } catch (e) {
        logError('regenerateLastReply error', e.message);
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'text-align:center;color:#ff6666;font-size:12px;padding:8px;font-style:italic';
        errDiv.textContent = 'Connection error - please retry';
        document.getElementById('chat-container').appendChild(errDiv);
        setTimeout(() => errDiv.remove(), 4000);
    }
    hideTypingIndicator();
}
