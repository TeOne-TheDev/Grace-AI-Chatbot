// Returns the target time-of-day in minutes when a "morning" skip is requested
function getWakeMins(bot) {
    const s = (bot && bot.schedule && bot.schedule.wake) ? bot.schedule.wake : '08:00';
    return timeStrToMinutes(s);
}

// Returns true when the user text implies jumping to next morning (not just next day)
function hasMorningTarget(txt) {
    return /\b(tomorrow morning|next morning|this morning|skip to morning|fast.?forward to morning|morning after|wake up tomorrow|morning time|early morning|dawn tomorrow|sunrise tomorrow)\b/i.test(txt)
        || (/\b(tomorrow|next day)\b/i.test(txt) && /\b(morning|dawn|sunrise|wake|breakfast)\b/i.test(txt));
}

// Returns true when the user text implies jumping to a named time of day other than morning
function hasTargetTimeOfDay(txt) {
    const m = txt.match(/\b(?:skip to|jump to|fast.?forward to|until|till?)\s+(noon|lunch|midday|afternoon|evening|night|dinner|midnight|dusk|sunset)\b/i);
    return m ? m[1].toLowerCase() : null;
}
const TARGET_TIME_MAP = {
    noon: 720, midday: 720, lunch: 720,
    afternoon: 840, evening: 1080, dusk: 1080, sunset: 1080, dinner: 1080,
    night: 1320, midnight: 1440,
};

async function estimateTimePassed(bot, userMsg, botReply) {
    await _estimateTimePassedInner(bot, userMsg, botReply);
    _checkOverdueLaborTrigger(bot);
    
    // Check parasite auto-labor after time advancement during chat
    if (bot.cycleData && bot.cycleData.isParasitePregnancy) {
        checkParasiteAutoLabor(bot);
    }
}

async function _estimateTimePassedInner(bot, userMsg, botReply) {
    const currentTime = minutesToTimeStr(getTimeOfDay(bot));
    const currentDay = getVirtualDay(bot);
    const currentMinsOfDay = getTimeOfDay(bot); 

    
    const s = bot.schedule || {};
    const scheduleInfo = s.wake ? `Character's daily schedule:
- Wake up: ${s.wake}
- Breakfast: ${s.breakfast || 'not set'}
- Lunch: ${s.lunch || 'not set'}
- Dinner: ${s.dinner || 'not set'}
- Bedtime: ${s.sleep || 'not set'}
IMPORTANT: When she wakes up after sleeping at night, the time MUST be her wake time (${s.wake}), not earlier.` : 'No schedule set.';

    
    const userFull = userMsg.replace(/EMOTION::.*/g,'').replace(/<[^>]+>/g,'').trim();
    const botFull  = botReply.replace(/EMOTION::.*/g,'').replace(/<[^>]+>/g,'').trim();

    
    
    const stripActions = (text) => text.replace(/\*[^*]+\*/g, '').replace(/\s+/g, ' ').trim();
    const extractActions = (text) => { const m = text.match(/\*([^*]+)\*/g); return m ? m.map(s=>s.replace(/\*/g,'')).join(' ') : ''; };
    const userSpoken  = stripActions(userFull);
    const userActions = extractActions(userFull);
    const botSpoken   = stripActions(botFull);
    const botActions  = extractActions(botFull);

    
    
    const hasSleepAction = /\*[^*]*(sleep|fell asleep|falls asleep|goes to sleep|sleeping)[^*]*\*/i.test(userFull);
    const hasMorningFlag = /\b(morning|sunrise|dawn|wake up|next day)\b/i.test(userFull);
    const isEveningOrNight = currentMinsOfDay >= 1080 || currentMinsOfDay < 360; 
    if (hasSleepAction) {
        const wakeStr = (bot.schedule && bot.schedule.wake) ? bot.schedule.wake : '08:00';
        const wakeMins = timeStrToMinutes(wakeStr);
        let destDay, destMins;
        if (hasMorningFlag || isEveningOrNight) {
            
            destDay = currentDay + 1;
            destMins = wakeMins;
        } else {
            
            const napMins = 60 + Math.floor(Math.random() * 31);
            bot.virtualMinutes = getVirtualMinutes(bot) + napMins;
            bot.virtualDay = Math.floor(bot.virtualMinutes / 1440);
            saveBots(); renderVirtualDateBadge(bot); renderVirtualClockBadge(bot); refreshBioPanelIfOpen(bot);
            return;
        }
        const _prevSleep = getVirtualMinutes(bot);
        bot.virtualMinutes = destDay * 1440 + destMins;
        bot.virtualDay = destDay;
        evaluateCycleAfterTimeSkip(bot, 1);
        checkScheduleMilestones(bot, _prevSleep, bot.virtualMinutes);
    // Roll random states based on days passed
    const _daysPassed = (bot.virtualMinutes - _prevSleep) / 1440;
    if (_daysPassed > 0) { rollRandomStates(bot, _daysPassed); syncSystemStates(bot); saveBots(); }
        saveBots(); renderVirtualDateBadge(bot); renderVirtualClockBadge(bot); checkBirthButton(bot); refreshBioPanelIfOpen(bot);
        return;
    }

    
    const explicitMatch = userFull.match(/(?:rest|nap|wait|sleep|relax)(?:\s+for)?\s+(\d+(?:\.\d+)?)\s*(h|hour|hr|hours|m|min|minute|minutes)/i);
    if (explicitMatch) {
        const val = parseFloat(explicitMatch[1]);
        const unit = explicitMatch[2].toLowerCase();
        const mins = unit.startsWith('h') ? Math.round(val * 60) : Math.round(val);
        const cappedMins = Math.min(mins, 480); 
        const newTotal = getVirtualMinutes(bot) + cappedMins;
        const newDay2 = Math.floor(newTotal / 1440);
        bot.virtualMinutes = newTotal;
        bot.virtualDay = newDay2;
        saveBots();
        renderVirtualDateBadge(bot);
        renderVirtualClockBadge(bot);
        refreshBioPanelIfOpen(bot);
        return; 
    }

    
    const mealTimeMatch = userFull.match(/(?:until|till|to|for)\s+(dinner|lunch|breakfast|supper|evening|morning|noon|midnight|dusk|dawn|sunset|sunrise)/i);
    if (mealTimeMatch) {
        const mealWord = mealTimeMatch[1].toLowerCase();
        const mealTargetMap = {
            breakfast: 480, morning: 480, dawn: 360, sunrise: 360,
            noon: 720, lunch: 720,
            dinner: 1080, supper: 1080, evening: 1080, sunset: 1080, dusk: 1080,
            midnight: 1440
        };
        let targetMins = mealTargetMap[mealWord] || 1080;
        
        if (bot.schedule) {
            if ((mealWord === 'dinner' || mealWord === 'supper') && bot.schedule.dinner) targetMins = timeStrToMinutes(bot.schedule.dinner);
            if (mealWord === 'lunch' && bot.schedule.lunch) targetMins = timeStrToMinutes(bot.schedule.lunch);
            if ((mealWord === 'breakfast' || mealWord === 'morning') && bot.schedule.breakfast) targetMins = timeStrToMinutes(bot.schedule.breakfast);
        }
        
        if (targetMins > currentMinsOfDay && targetMins < 1440) {
            const _prevMeal = getVirtualMinutes(bot);
            bot.virtualMinutes = currentDay * 1440 + targetMins;
            bot.virtualDay = currentDay; 
            checkScheduleMilestones(bot, _prevMeal, bot.virtualMinutes);
            saveBots();
            renderVirtualDateBadge(bot);
            renderVirtualClockBadge(bot);
            refreshBioPanelIfOpen(bot);
            return;
        }
    }

    
    const tillMatch = userFull.match(/(?:rest|sleep|nap|relax|wait)\s+(?:till?|until|to)\s+(\d{1,2})(?::(\d{2}))?\s*(?:h|am|pm)?\s*(tomorrow|next day|morning after)?/i);
    if (tillMatch) {
        const targetHour = parseInt(tillMatch[1]);
        const targetMin  = parseInt(tillMatch[2] || '0');
        const targetMinsOfDay = targetHour * 60 + targetMin;
        const hasTomorrow = !!(tillMatch[3]);
        
        const nextDay = hasTomorrow || (targetMinsOfDay <= currentMinsOfDay);
        const destDay  = nextDay ? currentDay + 1 : currentDay;
        const newTotal = destDay * 1440 + targetMinsOfDay;
        const _prevTill = getVirtualMinutes(bot);
        bot.virtualMinutes = newTotal;
        bot.virtualDay     = destDay;
        checkScheduleMilestones(bot, _prevTill, newTotal);
        saveBots();
        renderVirtualDateBadge(bot);
        renderVirtualClockBadge(bot);
        refreshBioPanelIfOpen(bot);
        return;
    }

    
    
    
    const userHasSleepIntent = /\b(sleep|go to bed|goodnight|good night|bedtime|let.?s sleep|let.?s rest|rest now|time to sleep|heading to bed|nap)\b/i.test(userFull);
    const botMentionsLate = /\b(it.?s (already )?late|already late|getting late|so late|it.?s getting late|quite late now|we should (sleep|rest|get some rest))\b/i.test(botFull);
    if (botMentionsLate && !userHasSleepIntent) {
        
        bot.virtualMinutes = getVirtualMinutes(bot) + 8;
        saveBots();
        renderVirtualDateBadge(bot);
        renderVirtualClockBadge(bot);
        return;
    }

    
    
    
    const isNapKeyword = /\b(nap|take a nap|midday rest|afternoon rest)\b/i.test(userFull)
        || (/\b(sleep|rest|lie down|lay down)\b/i.test(userFull) && !userHasSleepIntent);
    const isBotNapping = /\b(nap|take a nap|i.?ll take a nap|feeling sleepy|closes eyes|snuggle|blanket)\b/i.test(botFull);
    
    if ((isNapKeyword || isBotNapping) && currentMinsOfDay >= 360 && currentMinsOfDay < 1200) {
        
        const napMins = 45 + Math.floor(Math.random() * 46); 
        bot.virtualMinutes = getVirtualMinutes(bot) + napMins;
        saveBots();
        renderVirtualDateBadge(bot);
        renderVirtualClockBadge(bot);
        return;
    }

    
    
    
    const isSleepKeyword = /\b(sleep|go to bed|goodnight|bedtime|time to sleep|heading to bed)\b/i.test(userFull);
    if (isSleepKeyword && currentMinsOfDay < 360) { 
        const wakeStr  = (bot.schedule && bot.schedule.wake) ? bot.schedule.wake : '08:00';
        const wakeMins = timeStrToMinutes(wakeStr);
        const newTotal = currentDay * 1440 + wakeMins;
        if (newTotal > getVirtualMinutes(bot)) { 
            const _prevSlp = getVirtualMinutes(bot);
            bot.virtualMinutes = newTotal;
            bot.virtualDay     = currentDay;
            checkScheduleMilestones(bot, _prevSlp, newTotal);
            saveBots();
            renderVirtualDateBadge(bot);
            renderVirtualClockBadge(bot);
            refreshBioPanelIfOpen(bot);
            return;
        }
    }

    
    // ── "tomorrow morning" / "next morning" shortcut ──
    if (hasMorningTarget(userFull)) {
        const _prevMorn = getVirtualMinutes(bot);
        bot.virtualDay = currentDay + 1;
        bot.virtualMinutes = bot.virtualDay * 1440 + getWakeMins(bot);
        evaluateCycleAfterTimeSkip(bot, 1);
        checkScheduleMilestones(bot, _prevMorn, bot.virtualMinutes);
        saveBots(); renderVirtualDateBadge(bot); renderVirtualClockBadge(bot); checkBirthButton(bot); refreshBioPanelIfOpen(bot);
        return;
    }

    // Skip handling - more flexible matching
    let skipDays = 0;
    // Match: skip 2 days, skip 3 weeks, fast forward 1 month, etc.
    const skipDayMatch = userFull.match(/skip\s+(\d+)\s*days?/i);
    const skipWeekMatch = userFull.match(/skip\s+(\d+)\s*weeks?/i);
    const skipMonthMatch = userFull.match(/skip\s+(\d+)\s*months?/i);
    const skipAheadMatch = userFull.match(/(?:fast\s*forward|advance)\s+(\d+)\s*days?/i);
    
    if (skipDayMatch) skipDays += parseInt(skipDayMatch[1]);
    if (skipWeekMatch) skipDays += parseInt(skipWeekMatch[1]) * 7;
    if (skipMonthMatch) skipDays += parseInt(skipMonthMatch[1]) * 30;
    if (skipAheadMatch) skipDays += parseInt(skipAheadMatch[1]);
    
    if (skipDays > 0) {
        const prevSkipMin = getVirtualMinutes(bot);
        const currentMinsOfDay = getTimeOfDay(bot);
        const _m2 = hasMorningTarget(userFull);
        const _t2 = hasTargetTimeOfDay(userFull);
        const _d2 = _m2 ? getWakeMins(bot) : (_t2 && TARGET_TIME_MAP[_t2] ? TARGET_TIME_MAP[_t2] : (currentMinsOfDay || 480));
        bot.virtualDay = currentDay + skipDays;
        bot.virtualMinutes = bot.virtualDay * 1440 + _d2;
        evaluateCycleAfterTimeSkip(bot, skipDays);
        checkScheduleMilestones(bot, prevSkipMin, bot.virtualMinutes);
        saveBots();
        renderVirtualDateBadge(bot);
        renderVirtualClockBadge(bot);Ye
        checkBirthButton(bot);
        refreshBioPanelIfOpen(bot);
        return;
    }

    
    const keys = getGroqKeys();
    if (!keys.length) {
        
        bot.virtualMinutes = getVirtualMinutes(bot) + 5 + Math.floor(Math.random() * 6);
        bot.virtualDay = Math.floor(bot.virtualMinutes / 1440);
        saveBots();
        renderVirtualDateBadge(bot);
        renderVirtualClockBadge(bot);
        return;
    }

    try {
        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
                model: GROQ_COMPOUND_MODEL,
                messages: [
                    { role: 'system', content: `You are a story time-tracker. Decide how much real time passes in a roleplay exchange. Output ONLY JSON.\n\nCRITICAL - understand roleplay format:\n- Text inside *asterisks* = physical ACTIONS (what characters actually DO)\n- Text outside asterisks = spoken DIALOGUE (what characters SAY)\n- Actions drive time. Dialogue alone does NOT advance time significantly.\n- Bot SAYING "it's late" is just dialogue = 5\u201310 min. Bot *falling asleep* is an action = real sleep.\n\nRULES (never break):\n- User/bot *sleeps* / *falls asleep* / *closes eyes to sleep* \u2192 real sleep event\n- User explicitly says sleep/goodnight/bed \u2192 real sleep event\n- Bot dialogue only mentions sleep/late (no *action*) \u2192 just talking = 5\u201310 min\n- *nap* / *rests* / daytime rest action (06:00\u201319:59) \u2192 45\u201390 min SAME day, NEVER next day\n- Conversation / intimate moment \u2192 5\u201320 min\n- *eating* / *meal* action \u2192 20\u201345 min\n- *traveling* / *driving* / *walking home* \u2192 15\u201340 min\n- User states exact duration ("rest 1h", "wait 2h") \u2192 use EXACTLY that\n- Nighttime sleep (user initiates, 20:00\u201323:59) \u2192 next day at wake time\n- Post-midnight sleep (00:00\u201305:59) \u2192 SAME day at wake time\n- MAX 1 day advance per exchange. NEVER go backwards.\n\nKeywords that cause time to pass: skip, wait, tomorrow, next day, later, after a while, time passes, fast forward, a few hours, the next morning, that evening, that night, later that day, days later, weeks later, months later, the following day/week/month, some time passes, after some time, eventually.` },
                    { role: 'user', content: `Time: ${currentTime} | Day: ${currentDay}
${scheduleInfo}

USER spoken: "${userSpoken || '(none)'}"
USER actions: ${userActions ? '*' + userActions + '*' : '(none)'}
${bot.name} spoken: "${botSpoken || '(none)'}"
${bot.name} actions: ${botActions ? '*' + botActions + '*' : '(none)'}

Check ACTIONS first to identify real events, then USER intent, then dialogue. Watch for time-skip keywords like "skip", "wait", "tomorrow", "later", "next day", "time passes", etc.
Output ONLY: {"time":"HH:MM","day":NUMBER}` }
                ],
                max_tokens: 80,
                temperature: 0.1
            })
        });
        const data = await res.json();
        let raw = (data.choices?.[0]?.message?.content || '').trim();
        
        raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        
        const allMatches = [
            ...raw.matchAll(/\{[^}]*"time"\s*:\s*"(\d{1,2}:\d{2})"[^}]*"day"\s*:\s*(\d+)[^}]*\}/g),
            ...raw.matchAll(/\{[^}]*"day"\s*:\s*(\d+)[^}]*"time"\s*:\s*"(\d{1,2}:\d{2})"[^}]*\}/g)
        ];
        if (!allMatches.length) {
            
            const convMins = 5 + Math.floor(Math.random() * 11);
            bot.virtualMinutes = getVirtualMinutes(bot) + convMins;
            bot.virtualDay = Math.floor(bot.virtualMinutes / 1440);
            saveBots();
            renderVirtualDateBadge(bot);
            renderVirtualClockBadge(bot);
            return;
        }
        const lastMatch = allMatches[allMatches.length - 1];
        const lastMatchRaw = lastMatch[0];
        let newTimeStr, newDay;
        if (lastMatchRaw.indexOf('"time"') < lastMatchRaw.indexOf('"day"')) {
            newTimeStr = lastMatch[1]; newDay = parseInt(lastMatch[2]);
        } else {
            newDay = parseInt(lastMatch[1]); newTimeStr = lastMatch[2];
        }
        if (isNaN(newDay) || newDay < currentDay) return;
        const newTimeMinutes = timeStrToMinutes(newTimeStr);
        if (isNaN(newTimeMinutes)) return;

        
        
        if (newDay > currentDay + 1) newDay = currentDay + 1;
        
        const currentTotalMin = getVirtualMinutes(bot);
        const newTotalMin = newDay * 1440 + newTimeMinutes;
        const deltaMin = newTotalMin - currentTotalMin;
        if (newDay === currentDay && deltaMin > 360) {
            
            bot.virtualMinutes = Math.min(currentTotalMin + 360, currentDay * 1440 + 1380); 
            bot.virtualDay = currentDay;
        } else {
            bot.virtualMinutes = newDay * 1440 + newTimeMinutes;
            bot.virtualDay = newDay;
        }
        const _daysDeltaNormal = newDay - currentDay;
        if (_daysDeltaNormal > 0) evaluateCycleAfterTimeSkip(bot, _daysDeltaNormal);
        checkScheduleMilestones(bot, currentTotalMin, bot.virtualMinutes);
        saveBots();
        renderVirtualDateBadge(bot);
        renderVirtualClockBadge(bot);
        checkBirthButton(bot);
        refreshBioPanelIfOpen(bot);
    } catch(e) {
        
        const fallbackMins = 5 + Math.floor(Math.random() * 6);
        bot.virtualMinutes = getVirtualMinutes(bot) + fallbackMins;
        bot.virtualDay = Math.floor(bot.virtualMinutes / 1440);
        saveBots();
        renderVirtualDateBadge(bot);
        renderVirtualClockBadge(bot);
    }
}
