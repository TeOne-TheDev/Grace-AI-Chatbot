
// Helper: get male partner bot from active context (group or solo)
function _getMalePartnerBot(femaleBot) {
    // In group chat: find a male bot in the same room as the female
    if (typeof curGroupId !== 'undefined' && curGroupId) {
        const grp = groups && groups.find(g => g.id === curGroupId);
        if (grp) {
            const femRoom = grp.memberRooms && grp.memberRooms[femaleBot.id];
            const maleInRoom = (grp.memberIds || [])
                .map(id => bots.find(b => b.id === id))
                .filter(Boolean)
                .find(b => b.id !== femaleBot.id && (b.gender||'').toLowerCase().includes('male') && !((b.gender||'').toLowerCase().includes('female')) &&
                    (grp.memberRooms[b.id] === femRoom || grp.memberRooms[b.id] === grp.userRoom));
            if (maleInRoom) return maleInRoom;
        }
    }
    return null;
}


// Helper: check if male is in rut phase based on virtual time
function _isInRut(maleBot) {
    const effect = TRAIT_EFFECTS['Rut Cycle'];
    if (!effect) return false;
    const vDay = getVirtualDay(maleBot);
    const rutDay = vDay % effect.rutPeriodDays;
    return rutDay < effect.rutDurationDays;
}

function processIntercourse(bot, isProtected, maleBotOverride) {
    // Skip reproductive mechanics for Male bots
    const isFemale = (bot.gender || '').toLowerCase().includes('female') || 
                     (bot.gender || '').toLowerCase().includes('woman') || 
                     (bot.gender || '').toLowerCase() === 'f';
    if (!isFemale) return;
    
    if (!bot.cycleData) initCycleData(bot);
    const cd = bot.cycleData;
    const virtualDay = getVirtualDay(bot);

    if (cd.pregnant) return;

    if (isParasiteHost(bot) && !isProtected) {
        triggerParasiteImplant(bot);
        return;
    }

    const hasMonsterPregnancyTrait = (() => {
        const allText = ((bot.prompt||'') + ' ' + (bot.bio||'') + ' ' + (bot.geneticTraits||[]).join(' ')).toLowerCase();
        return allText.includes('monster pregnancy') || (bot.geneticTraits || []).includes('Monster Pregnancy');
    })();

    const cycleDay = getCurrentCycleDay(bot);
    const phase = getCyclePhase(cycleDay);
    const fertile = phase.fertilityScore;

    // ── Resolve male partner ──
    const maleBot = maleBotOverride || _getMalePartnerBot(bot);
    const maleName = maleBot ? maleBot.name : 'Unknown';
    const maleTraits = maleBot ? (maleBot.geneticTraits || []) : [];

    // Track partner history
    if (!cd.partnerHistory) cd.partnerHistory = [];
    cd.partnerHistory.push({ partnerId: maleBot ? maleBot.id : null, partnerName: maleName, virtualDay, protected: isProtected });
    cd.intercourseEvents.push({ day: virtualDay, protected: isProtected, fertile, cycleDay, partnerId: maleBot ? maleBot.id : null });

    if (bot.prompt && bot.prompt.includes('Virgin')) {
        bot.prompt = bot.prompt.replace(/,?\s*\bVirgin\b\s*,?/g, ',').replace(/^,\s*|,\s*$/g, '').trim();
        if (!bot.dynBio) bot.dynBio = {};
        bot.dynBio.virginityLost = true;
    }

    const partnerTag = maleBot ? ` with ${maleName}` : '';
    addReproEvent(bot, `❤️ Intimacy (${isProtected ? 'Protected' : 'Unprotected'})${partnerTag} - Cycle Day ${cycleDay} - Fertility: ${phase.fertility}`);

    if (!isProtected) {
        let conceptionChance;
        if (cycleDay === OVULATION_DAY) conceptionChance = 0.30;
        else if (cycleDay >= FERTILE_WINDOW_START && cycleDay <= FERTILE_WINDOW_END) conceptionChance = 0.15;
        else if (cycleDay >= FERTILE_WINDOW_START - 2 && cycleDay < FERTILE_WINDOW_START) conceptionChance = 0.05;
        else conceptionChance = 0.01;

        // ── Female trait modifiers ──
        const femStr = ((bot.prompt || '') + ' ' + (bot.bio || '') + ' ' + (bot.geneticTraits || []).join(' ')).toLowerCase();
        const femTag = [...(selectedTraits ? selectedTraits.keys() : [])].join(' ').toLowerCase();
        if (femStr.includes('ultra-fertile') || femStr.includes('ultra fertile') || femTag.includes('ultra-fertile')) {
            conceptionChance = Math.max(conceptionChance, cycleDay === OVULATION_DAY ? 1.0 : 0.75);
        } else if (femStr.includes('breeding instinct') || femTag.includes('breeding instinct')) {
            conceptionChance = Math.max(conceptionChance, cycleDay === OVULATION_DAY ? 0.75 : 0.45);
        }
        if (femStr.includes('heat cycle') || femTag.includes('heat cycle')) {
            conceptionChance = Math.min(1.0, conceptionChance * (TRAIT_EFFECTS['Heat Cycle'].fertilityBoost || 1.5));
        }
        if (femStr.includes('infertile') || femTag.includes('infertile')) {
            conceptionChance *= 0.10;
        }

        // ── Male trait modifiers ──
        if (maleBot && !isProtected) {
            const maleStr = ((maleBot.prompt||'') + ' ' + (maleBot.bio||'') + ' ' + maleTraits.join(' ')).toLowerCase();
            if (maleStr.includes('hyper-virility') || maleStr.includes('hyper virility')) {
                conceptionChance = Math.min(1.0, conceptionChance * (TRAIT_EFFECTS['Hyper-Virility'].partnerConceptionMultiplier || 2.0));
            }
            if (maleStr.includes('alpha seed')) {
                conceptionChance = Math.min(1.0, conceptionChance * (TRAIT_EFFECTS['Alpha Seed'].partnerConceptionMultiplier || 1.2));
            }
            if (maleStr.includes('breeding instinct')) {
                conceptionChance = Math.min(1.0, conceptionChance * (TRAIT_EFFECTS['Breeding Instinct'].partnerConceptionMultiplier || 1.3));
            }
            if (maleStr.includes('rut cycle') && _isInRut(maleBot)) {
                conceptionChance = Math.min(1.0, conceptionChance * (TRAIT_EFFECTS['Rut Cycle'].rutConceptionMultiplier || 1.5));
                addReproEvent(bot, `🔥 ${maleName} is in RUT PHASE - conception chance boosted`);
            }
            if (maleStr.includes('infertile')) {
                conceptionChance *= 0.10;
            }
        }

        conceptionChance = Math.min(1.0, Math.max(0, conceptionChance));

        const _roll = Math.random();
        const _conceived = _roll < conceptionChance;
        if (_conceived) {
            cd.pregnant = true;
            cd.conceptionVirtualDay = virtualDay;
            cd.laborStarted = false;
            // ── Record father ──
            cd.fatherId = maleBot ? maleBot.id : null;
            cd.fatherName = maleBot ? maleBot.name : null;
            cd.fatherTraits = maleTraits.slice();

            if (isParasiteHost(bot)) {
                const _pCount = 6 + Math.floor(Math.random() * 5);
                cd.isParasitePregnancy = true;
                cd.parasiteStage = 'implanted';
                cd.fetusCount = _pCount;
                cd.fetuses = Array.from({length: _pCount}, () => ({ gender: 'unknown', nickname: 'parasite larva' }));
                cd.pregnancyTestTaken = true;
                cd.isMonsterPregnancy = false;
                addReproEvent(bot, '👽 PARASITE SWARM - ' + _pCount + ' larvae implanted (converted from conception)');
            } else {
                const personalityStr = ((bot.prompt || '') + ' ' + (bot.bio || '') + ' ' + (bot.geneticTraits || []).join(' ')).toLowerCase();
                const hasTraitStr = [...(selectedTraits ? selectedTraits.keys() : [])].join(' ').toLowerCase();
                // Always Multiples: also triggered if father has Alpha Seed (enhanced chance of multiples)
                const alwaysMultiples = personalityStr.includes('always multiples') || hasTraitStr.includes('always multiples');
                const alphaMultiBoost = maleBot && ((maleBot.geneticTraits||[]).includes('Alpha Seed'));
                let fCount = 1;
                if (alwaysMultiples) {
                    const roll = Math.random();
                    if (roll < 0.20) fCount = 2;
                    else if (roll < 0.40) fCount = 3;
                    else if (roll < 0.60) fCount = 4;
                    else if (roll < 0.80) fCount = 5;
                    else fCount = 6;
                } else if (alphaMultiBoost) {
                    // Alpha Seed: slightly elevated twins chance
                    const r = Math.random();
                    if (r < 0.003) fCount = 3;
                    else if (r < 0.08) fCount = 2;
                } else {
                    const r = Math.random();
                    if (r < 0.001) fCount = 3;
                    else if (r < 0.03) fCount = 2;
                }
                cd.fetusCount = fCount;
                cd.fetuses = Array.from({length: fCount}, () => ({ gender: 'unknown', nickname: '' }));

                if (hasMonsterPregnancyTrait) {
                    cd.isMonsterPregnancy = true;
                    cd.isParasitePregnancy = false;
                }

                const _pregType = cd.isMonsterPregnancy ? '🐾 MONSTER PREGNANCY' : '✨ Conception';
                const _fatherNote = maleBot ? ` | Father: ${maleName}` : '';
                addReproEvent(bot, `${_pregType} occurred! (Cycle Day ${cycleDay}) - ${fCount > 1 ? fCount + ' fetuses (multiples)' : 'single fetus'}${cd.isMonsterPregnancy ? ' - Mother will undergo physical transformations' : ' - unknown yet...'}${_fatherNote}`);
            }
            showToast('✨ ' + bot.name + ' - Conception occurred! (' + Math.round(conceptionChance*100) + '% chance)', '#1a1a2e', '#a78bfa');
        } else {
            addReproEvent(bot, `💨 No conception - rolled ${Math.round(_roll*100)}% vs ${Math.round(conceptionChance*100)}% chance (Cycle Day ${cycleDay})`);
            showToast('💨 ' + bot.name + ' - No conception this time (' + Math.round(conceptionChance*100) + '% chance)', '#1a1a2e', '#94a3b8');
        }
    }
    saveBots();
    updateReproductiveStatus(bot);
}
