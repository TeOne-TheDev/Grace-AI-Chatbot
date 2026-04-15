
function isParasiteHost(bot) {
    const allText = ((bot.prompt||'') + ' ' + (bot.bio||'') + ' ' + (bot.geneticTraits||[]).join(' ')).toLowerCase();
    return allText.includes('parasite host') || (bot.geneticTraits || []).includes('Parasite Host');
}


/**
 * stripParasiteConflictTraits(bot)
 * Remove Always Overdue and Always Multiples from any bot with Parasite Host trait.
 * Parasite gestation has its own timeline - these 2 traits don't apply.
 */
function stripParasiteConflictTraits(bot) {
    if (!bot || !isParasiteHost(bot)) return false;
    const PARASITE_INCOMPATIBLE = ['Always Overdue', 'Always Multiples'];
    let changed = false;

    // Remove from bot.geneticTraits
    if (bot.geneticTraits && bot.geneticTraits.length > 0) {
        const before = bot.geneticTraits.length;
        bot.geneticTraits = bot.geneticTraits.filter(d => !PARASITE_INCOMPATIBLE.includes(d));
        if (bot.geneticTraits.length !== before) changed = true;
    }

    // Remove from bot.prompt (comma-separated trait list before '. ')
    if (bot.prompt) {
        const dotIdx = bot.prompt.indexOf('. ');
        let traitPart = dotIdx > 0 ? bot.prompt.slice(0, dotIdx) : bot.prompt;
        const freePart  = dotIdx > 0 ? bot.prompt.slice(dotIdx) : '';
        const traits = traitPart.split(',').map(s => s.trim()).filter(s => s && !PARASITE_INCOMPATIBLE.includes(s));
        const newPrompt = traits.join(', ') + freePart;
        if (newPrompt !== bot.prompt) { bot.prompt = newPrompt; changed = true; }
    }

    if (changed) {
        addReproEvent(bot, '\uD83D\uDD27 [Parasite Host] Incompatible traits removed: Always Overdue / Always Multiples');
        saveBots();
    }
    return changed;
}

function resetParasiteLabor() {
    const bot = bots.find(b => b.id === curId);
    if (!bot || !bot.cycleData) return;
    const cd = bot.cycleData;

    if (!cd.isParasitePregnancy) return;

    if (!confirm('Reset parasite emergence for ' + bot.name + ' and restore parasite pregnancy to day 12?')) return;

    cd.laborStarted = false;
    cd.laborStartedRealTime = undefined;
    cd.laborVirtualDay = null;
    cd.laborVirtualMinutes = undefined;
    cd.laborProgress = {};

    cd.pregnant = true;
    cd.birthVirtualDay = null;
    cd.postpartumStartDay = null;

    const currentVDay = getVirtualDay(bot);
    cd.conceptionVirtualDay = currentVDay - 12;

    addReproEvent(bot, '\u21A9\uFE0F Parasite emergence reset \u2014 restored to day 12 (pre-emergence).');
    saveBots();

    const pp = document.getElementById('solo-parasite-emergence');
    if (pp) pp.style.display = 'none';

    renderReproHealth(bot);
}

function triggerParasiteImplant(bot) {
    if (!bot.cycleData) initCycleData(bot);
    const cd = bot.cycleData;
    if (cd.pregnant) return; 

    const virtualDay = getVirtualDay(bot);
    const parasiteCount = 6 + Math.floor(Math.random() * 5); // always 6-10

    cd.pregnant = true;
    cd.isParasitePregnancy = true;
    cd.parasiteStage = 'implanted';
    cd.conceptionVirtualDay = virtualDay;
    cd.laborStarted = false;
    cd.fetusCount = parasiteCount;
    cd.fetuses = Array.from({length: parasiteCount}, () => ({ gender: 'unknown', nickname: 'parasite larva' }));
    cd.pregnancyTestTaken = true;
    cd.pregnancyTestDay = virtualDay;

    addReproEvent(bot, decodeUnicode('\uD83D\uDC7D') + ' PARASITE SWARM IMPLANTED - ' + parasiteCount + ' larvae embedding simultaneously. Gestation begins...');
    saveBots();
    updateReproductiveStatus(bot);
}

function getParasiteWeek(bot) {
    // Returns elapsed DAYS (0-15) - parasite gestation is exactly 15 virtual days
    if (!bot.cycleData || !bot.cycleData.isParasitePregnancy) return getPregnancyWeek(bot);
    const cd = bot.cycleData;
    const virtualDay = getVirtualDay(bot);
    const elapsed = Math.floor(virtualDay - (cd.conceptionVirtualDay || 0));
    return Math.min(15, Math.max(0, isNaN(elapsed) ? 0 : elapsed));
}

function renderParasiteBioPanel(bot, pregPanel) {
    if (!bot.cycleData || !bot.cycleData.isParasitePregnancy) return;
    const existing = pregPanel.querySelector('#parasite-panel');
    if (existing) existing.remove();

    const stageInfo = getParasiteStageLabel(bot);
    const weeks = getParasiteWeek(bot); // now returns elapsed days
    const count = (bot.cycleData.fetuses || []).length;

    const div = document.createElement('div');
    div.id = 'parasite-panel';
    div.style.cssText = 'background:linear-gradient(135deg,#1a0030,#0d001a);border:1px solid #7c3aed88;border-radius:12px;padding:12px;margin-top:10px';
    div.innerHTML = `
        <div style="font-size:11px;font-weight:bold;color:#c084fc;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">${stageInfo.icon} PARASITE GESTATION</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px">
            <div style="text-align:center;background:#2a0040;border-radius:8px;padding:6px">
                <div style="font-size:18px;font-weight:bold;color:#e879f9">${weeks}</div>
                <div style="font-size:9px;color:#a855f7;text-transform:uppercase">Day ${weeks} / 15</div>
            </div>
            <div style="text-align:center;background:#2a0040;border-radius:8px;padding:6px">
                <div style="font-size:18px;font-weight:bold;color:#e879f9">${count}</div>
                <div style="font-size:9px;color:#a855f7;text-transform:uppercase">Larvae</div>
            </div>
            <div style="text-align:center;background:#2a0040;border-radius:8px;padding:6px">
                <div style="font-size:11px;font-weight:bold;color:${stageInfo.color}">${stageInfo.stage}</div>
                <div style="font-size:9px;color:#a855f7;text-transform:uppercase">Stage</div>
            </div>
        </div>
        <div style="font-size:12px;color:#d8b4fe;font-style:italic;line-height:1.5;margin-bottom:8px">${stageInfo.desc}</div>
        <div style="background:#2a0040;border-radius:6px;height:6px;margin-bottom:8px;overflow:hidden">
            <div style="height:100%;width:${stageInfo.pct||100}%;background:${stageInfo.color};border-radius:6px;transition:width 0.5s"></div>
        </div>
    `;
    pregPanel.appendChild(div);
}

async function triggerParasiteBirth() {
    const bot = bots.find(b => b.id === curId);
    if (!bot || !bot.cycleData) return;
    const cd = bot.cycleData;
    const count = (cd.fetuses || []).length;
    const stageInfo = getParasiteStageLabel(bot);

    cd.pregnant = false;
    cd.isParasitePregnancy = false;
    cd.birthVirtualDay = getVirtualDay(bot);
    cd.postpartumStartDay = cd.birthVirtualDay;
    cd.laborStarted = false;

    
    if (!cd.children) cd.children = [];
    for (let i = 0; i < count; i++) {
        cd.children.push({ type: 'parasite', name: 'Parasite Larva #' + (i+1), birthDay: cd.birthVirtualDay });
    }

    addReproEvent(bot, decodeUnicode('\uD83D\uDC7D') + ' EMERGENCE - ' + count + ' parasite' + (count > 1 ? 's' : '') + ' emerged from host body. Host enters recovery.');
    saveBots();
    renderReproHealth(bot);

    
    const _pNames = count > 1 ? count + ' larvae' : 'the larva';
    const reply = `*AAAAAAHHHHHHHH!!!* She screams - a raw, primal sound torn from her throat as ${_pNames} ${count > 1 ? 'erupt' : 'erupts'} from her body. The sensation is overwhelming, alien, and utterly devastating.\n\n*The aphrodisiac stops the instant they leave her body.*\n\n*It hits her immediately - every chemical buffer gone, nothing between her and the raw reality of what just happened. The warmth that had been constant for fifteen days vanishes, replaced by something cold and hollow, and the agony beneath it is sudden and absolute. She had not understood, until this moment, how much of what she felt was not her own.*\n\n*She is shaking. Her hands find her abdomen - flat now, wrong, the skin loose and trembling where it was taut - and she pulls her hands away from it as if burned.*\n\n*${_pNames} ${count > 1 ? 'move' : 'moves'} away from her. ${count > 1 ? 'Each one' : 'It'} is alien in a way she was not prepared for. She had been carrying this - she had been carrying ${count > 1 ? 'them' : 'it'} - and now ${count > 1 ? 'they are' : 'it is'} here, and she cannot reconcile what she is seeing with anything she knows.*\n\n*"No." Her voice comes out wrong. Small. She says it again - "No" - like the word might undo something. She looks away. Then back. ${count > 1 ? 'They' : 'It'} ${count > 1 ? 'are' : 'is'} still there.*\n\n*She does not touch ${count > 1 ? 'them' : 'it'}. She cannot move yet. She is not sure she wants to.*\n\n*She is alive. She does not know what else she is right now.*`;
    bot.history.push({ role: 'assistant', content: reply, msgId: 'parasite_birth_' + Date.now() });
    saveBots();
    renderChat();
    scrollToBottom(true);
}

function checkParasiteAutoLabor(bot) {
    if (!bot || !bot.cycleData || !bot.cycleData.isParasitePregnancy) return;
    if (!bot.cycleData.pregnant || bot.cycleData.birthVirtualDay !== null) return; // already born
    const days = getParasiteWeek(bot); // returns elapsed DAYS 0-15
    const cd = bot.cycleData;
    
    if (days >= 12 && !cd.laborStarted) {
        // At day 15 (final day), trigger actual birth immediately
        if (days >= 15) {
            cd.laborStarted = true;
            cd.laborStartedRealTime = Date.now();
            cd.laborVirtualDay = getVirtualDay(bot);
            cd.laborVirtualMinutes = getVirtualMinutes(bot);
            addReproEvent(bot, '\u26A0\uFE0F Parasite preparing to emerge - day ' + days + '/15. EMERGENCE IMMINENT.');
            saveBots();
            renderReproHealth(bot);
            
            // Trigger actual birth immediately at day 15
            triggerParasiteBirth();
            return;
        }
        
        // For days 12-14, only trigger between noon (12:00 = 720) and afternoon (18:00 = 1080)
        // Add randomness - each check in the time window has a chance to trigger
        const currentMinutes = getVirtualMinutes(bot);
        if (currentMinutes >= 720 && currentMinutes < 1080) {
            // 15% chance per check during the time window to add randomness
            if (Math.random() < 0.15) {
                cd.laborStarted = true;
                cd.laborStartedRealTime = Date.now();
                cd.laborVirtualDay = getVirtualDay(bot);
                cd.laborVirtualMinutes = currentMinutes;
                addReproEvent(bot, '\u26A0\uFE0F Parasite preparing to emerge - day ' + days + '/15. EMERGENCE IMMINENT.');
                saveBots();
                renderReproHealth(bot);
            }
        }
    }
}

// Rate limiting for monster pregnancy check per bot
const _monsterCheckCache = new Map();


// ===== MONSTER PREGNANCY DETECTION =====
// DISABLED - Monster pregnancy is now a preset trait only

