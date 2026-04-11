function initBodyMeasurements(bot) {
    if (bot.bodyMeasurements) return;
    
    const app = (bot.appearance || '').toLowerCase();
    
    let bustBase = 88, waistBase = 63, hipsBase = 90;
    let bra = 'B';
    
    const explicitCupMatch = app.match(/(aa|dd|a|b|c|d|e|f|g|h|i|j) cup/i);
    if (explicitCupMatch) {
        const cupLabel = explicitCupMatch[1].toUpperCase();
        bra = cupLabel;
        const cupBustMap = { AA:76, A:80, B:88, C:92, D:96, DD:100, E:104, F:108, G:112, H:116, I:120, J:124 };
        bustBase = cupBustMap[cupLabel] || 88;
    } else if (app.includes('large breast') || app.includes('big breast') || app.includes('busty') || app.includes('huge breast')) {
        bustBase = 98; bra = 'D';
    } else if (app.includes('small breast') || app.includes('flat')) {
        bustBase = 78; bra = 'A';
    } else if (app.includes('medium breast')) {
        bustBase = 90; bra = 'C';
    }
    
    let height = 165, weight = 53;
    const hMatch = app.match(/(\d{3})\s*cm/);
    const wMatch = app.match(/(\d{2,3})\s*kg/);
    if (hMatch) height = parseInt(hMatch[1]);
    if (wMatch) weight = parseInt(wMatch[1]);

    bot.bodyMeasurements = {
        bustBase, waistBase, hipsBase, bra,
        height, weight,
        bustCup: bra,         
        lastUpdatedDay: getVirtualDay(bot)
    };
    saveBots();
}

function getCurrentBodyMeasurements(bot) {
    if (!bot.bodyMeasurements) initBodyMeasurements(bot);
    const bm = bot.bodyMeasurements;
    const cd = bot.cycleData;
    const virtualDay = getVirtualDay(bot);

    let bust = bm.bustBase, waist = bm.waistBase, hips = bm.hipsBase;
    let weight = bm.weight;
    let cup = bm.bra;
    let breastNote = null;
    let lactating = false;
    let lactationNote = null;
    let postpartum = false;
    let fingerSwelling = false;

    const cups = ['AA','A','B','C','D','DD','E','F','G','H'];
    function cupIndex(c) { return Math.max(0, cups.indexOf(c)); }
    function cupAt(i) { return cups[Math.min(i, cups.length - 1)]; }

    
    if (cd && !cd.pregnant && cd.postpartumStartDay !== null && cd.birthVirtualDay !== null) {
        const postDays = virtualDay - cd.postpartumStartDay;
        postpartum = true;
        
        const baseIdx = cupIndex(bm.bra);
        cup = cupAt(baseIdx + 3); 
        bust = bm.bustBase + 14;
        hips = bm.hipsBase + 4;
        weight = bm.weight + 4;
        lactating = true;
        lactationNote = `Breasts engorged with milk - needs feeding every 2-3h. Leaking possible.`;
        breastNote = `Postpartum (Day ${postDays}): Milk has come in. Breasts full and tender.`;
    }
    
    else if (cd && cd.pregnant) {
        const weeks = getPregnancyWeek(bot) || 0;
        const fCount = (cd.fetuses || []).length;

        let changes;
        if (cd.isParasitePregnancy) {
            // Parasite pregnancy - use days instead of weeks
            const days = getParasiteWeek(bot) || 0;
            changes = calculateParasitePregnancyChanges(bot, days, fCount);
            breastNote = `Parasite gestation - chemical breast development. Unnatural fullness and sensitivity.`;
            lactating = days > 7; // Parasites cause early lactation
            lactationNote = days > 7 ? 'Parasite-induced lactation - thick, iridescent fluid.' : null;
        } else if (cd.isMonsterPregnancy) {
            // Monster pregnancy - use days with accelerated growth
            const days = getMonsterPregnancyWeek(bot) || 0;
            changes = calculateMonsterPregnancyChanges(bot, days, fCount);
            breastNote = `Monstrous gestation - rapid, unnatural breast growth. Dark veins visible.`;
            lactating = days > 3; // Monsters cause very early lactation
            lactationNote = days > 3 ? 'Monstrous lactation - thick, dark fluid with metallic scent.' : null;
        } else {
            // Normal human pregnancy - use weeks
            changes = calculateNormalPregnancyChanges(bot, weeks, fCount);
            // Set breast notes based on pregnancy stage
            if (weeks < 8) {
                breastNote = `Tender & swollen - first sign of pregnancy. Slightly fuller.`;
            } else if (weeks < 16) {
                breastNote = `Noticeably larger, veins visible. Areola darkening. Bra feels tight.`;
            } else if (weeks < 24) {
                breastNote = `Larger and heavier. Colostrum (early milk) may begin leaking from week 16.`;
                if (weeks >= 18) lactating = true, lactationNote = 'Colostrum may appear - thin yellowish pre-milk.';
            } else if (weeks < 32) {
                breastNote = `Heavy and full. Nipples larger and darker. Colostrum leaks possible.`;
                lactating = true; lactationNote = 'Colostrum production active - may leak.';
            } else {
                breastNote = `Fully prepared for nursing. Very full and heavy. Regular colostrum leaking.`;
                lactating = true; lactationNote = 'Heavy colostrum leaking. Breast pads recommended.';
            }
        }

        // Apply the calculated changes
        bust = bm.bustBase + changes.bust;
        waist = bm.waistBase + changes.waist;
        hips = bm.hipsBase + changes.hips;
        weight = bm.weight + changes.weight;

        // Update cup size
        const baseIdx = cupIndex(bm.bra);
        cup = cupAt(baseIdx + changes.cupIncrease);

        // Set finger swelling for multiple pregnancies
        fingerSwelling = fCount > 1 && weeks > 20;
    }
    
    else if (cd && !cd.pregnant) {
        const cycleDay = getCurrentCycleDay(bot);
        if (cycleDay <= 3) {
            waist += 2;
            breastNote = 'Slightly tender during period - PMS effect lasting into day 1-3.';
        } else if (cycleDay >= 22) {
            bust += 2;
            breastNote = 'PMS phase: breasts may feel fuller and more sensitive.';
        }
    }

    // ── Trait-based lactation override ───────────────────────────────────────
    // Applies AFTER pregnancy/cycle blocks. Only triggers if not already lactating.
    if (!lactating) {
        const _traitStr = ((bot.prompt || '') + ' ' + (bot.bio || '')).toLowerCase();
        const _geneticTraits = (bot.geneticTraits || []).map(t => t.toLowerCase()).join(' ');
        const _hasAlwaysLactate = _traitStr.includes('always lactate') || _traitStr.includes('always lactat') ||
                                _geneticTraits.includes('always lactate') || _geneticTraits.includes('always lactat');
        const _hasLactating     = _traitStr.includes('lactating') || _geneticTraits.includes('lactating');
        if (_hasAlwaysLactate) {
            const baseIdx = cupIndex(cup); cup = cupAt(baseIdx + 2);
            bust = Math.round(bust + 10);
            lactating = true;
            lactationNote = 'Breasts perpetually produce milk - always full, heavy, and leaking regardless of pregnancy.';
            breastNote = breastNote || 'Permanently in a nursing state - swollen, sensitive, and milk-producing at all times.';
        } else if (_hasLactating) {
            const baseIdx = cupIndex(cup); cup = cupAt(baseIdx + 1);
            bust = Math.round(bust + 5);
            lactating = true;
            lactationNote = 'Currently producing milk - breasts are sensitive and heavy; may leak when stimulated.';
            breastNote = breastNote || 'Actively lactating - fuller and more tender than her baseline.';
        }
    }

    // Clamp measurements to realistic human ranges
    bust = Math.max(60, Math.min(160, bust));
    waist = Math.max(40, Math.min(160, waist));
    hips = Math.max(60, Math.min(180, hips));
    weight = Math.max(30, Math.min(200, weight));

    return {
        bust: Math.round(bust), waist: Math.round(waist), hips: Math.round(hips),
        weight: Math.round(weight * 10) / 10,
        height: bm.height,
        cup, bra: bm.bra,
        fingerSwelling,
        breastNote, lactating, lactationNote, postpartum,
        pregnant: !!(cd && cd.pregnant),
        pregWeeks: (cd && cd.pregnant) ? (getPregnancyWeek(bot) || 0) : null,
        fetusCount: (cd && cd.fetuses) ? cd.fetuses.length : 1
    };
}

function renderBodyMeasurements(bot) {
    
    const content = document.getElementById('body-meas-content');
    if (!content) return;
    const panel = document.getElementById('body-measurements-panel'); 
    const measContainer = document.getElementById('p-app-measures');

    const isFemale = (bot.gender || '').toLowerCase().includes('female')
        || (bot.gender || '').toLowerCase().includes('woman')
        || (bot.gender || '').toLowerCase() === 'f';
    if (!isFemale) {
        if (panel) panel.style.display = 'none';
        if (measContainer) measContainer.style.display = 'none';
        return;
    }
    if (panel) panel.style.display = 'block';
    if (measContainer) measContainer.style.display = 'block';

    if (!bot.bodyMeasurements) initBodyMeasurements(bot);
    const m = getCurrentBodyMeasurements(bot);

    
    let breastBadgeHtml = '';
    if (m.pregnant) {
        const wk = m.pregWeeks;
        const multNote = m.fetusCount > 1 ? ` (�-${m.fetusCount} - faster growth)` : '';
        breastBadgeHtml = `<div class="body-breast-change">
            <span class="body-change-tag" style="background:#2d0045;color:#c084fc;border:1px solid #a855f744">🤰 Pregnant Week ${wk}${multNote}</span><br>
            ${m.breastNote || ''}
            ${m.lactating && m.lactationNote ? '<br><span style="color:#fcd34d">🍼 ' + m.lactationNote + '</span>' : ''}
        </div>`;
    } else if (m.postpartum) {
        breastBadgeHtml = `<div class="body-breast-change" style="background:#0d1a00;border-color:#4ade8022">
            <span class="body-change-tag" style="background:#052e0a;color:#4ade80;border:1px solid #4ade8044">🤱 Postpartum</span><br>
            ${m.breastNote || ''}
            ${m.lactationNote ? '<br><span style="color:#fcd34d">🍼 ' + m.lactationNote + '</span>' : ''}
        </div>`;
    } else if (m.breastNote) {
        breastBadgeHtml = `<div class="body-breast-change" style="background:#100a00;border-color:#f59e0b22">
            <span class="body-change-tag" style="background:#1a0e00;color:#f59e0b;border:1px solid #f59e0b44">🩸 Cycle Effect</span><br>
            ${m.breastNote}
        </div>`;
    }

    content.innerHTML = `
        <div class="body-meas-grid">
            <div class="body-meas-stat">
                <span class="body-meas-val">${m.bust}cm</span>
                <span class="body-meas-lbl">👙 Bust</span>
            </div>
            <div class="body-meas-stat">
                <span class="body-meas-val">${m.waist}cm</span>
                <span class="body-meas-lbl">〰 Waist</span>
            </div>
            <div class="body-meas-stat">
                <span class="body-meas-val">${m.hips}cm</span>
                <span class="body-meas-lbl">🍑 Hips</span>
            </div>
        </div>
        <div class="body-meas-full">
            <div class="body-meas-row">
                <span class="body-meas-row-lbl">🎀 Bra Size</span>
                <span class="body-meas-row-val">${m.cup} cup</span>
            </div>
            <div class="body-meas-row">
                <span class="body-meas-row-lbl">⚖️ Weight</span>
                <span class="body-meas-row-val">${m.weight}kg</span>
            </div>
            <div class="body-meas-row">
                <span class="body-meas-row-lbl">📏 Height</span>
                <span class="body-meas-row-val">${m.height}cm</span>
            </div>
            <div class="body-meas-row">
                <span class="body-meas-row-lbl">📐 Ratio</span>
                <span class="body-meas-row-val">${m.bust}-${m.waist}-${m.hips}</span>
            </div>
        </div>
        ${breastBadgeHtml}
        <div class="body-note">📅 Updates daily in virtual time. Base measurements set from character appearance.</div>
    `;
}

function getBodyMeasurementsContext(bot) {
    const isFemale = (bot.gender || '').toLowerCase().includes('female')
        || (bot.gender || '').toLowerCase().includes('woman')
        || (bot.gender || '').toLowerCase() === 'f';
    if (!isFemale) return '';
    if (!bot.bodyMeasurements) initBodyMeasurements(bot);
    const m = getCurrentBodyMeasurements(bot);

    const parts = [];
    parts.push(`[Body Measurements - Current]:
- Bust: ${m.bust}cm (${m.cup} cup) | Waist: ${m.waist}cm | Hips: ${m.hips}cm
- Height: ${m.height}cm | Weight: ${m.weight}kg
- Figure ratio: ${m.bust}-${m.waist}-${m.hips}
IMPORTANT: When asked about your measurements or size, ALWAYS quote these exact numbers - never make up different values.`);

    if (m.pregnant) {
        parts.push(`[Breast & Body Changes - Week ${m.pregWeeks} pregnancy${m.fetusCount > 1 ? ' (multiples)' : ''}]:
- Cup size changed from ${m.bra} → ${m.cup} (${m.cup !== m.bra ? 'larger' : 'same'} due to pregnancy)
- ${m.breastNote || 'Breasts enlarged due to pregnancy'}
${m.lactating ? `- 🍼 LACTATION: ${m.lactationNote}
  IMPORTANT: She may notice leaking - she should feel/react to it physically if relevant.` : ''}
- Physical self-awareness: She is acutely aware of her changing body. Her bra fits differently. Clothes feel different.
- She may touch her belly/breasts unconsciously. She notices weight shift in her center of gravity.`);
    } else if (m.postpartum) {
        parts.push(`[Postpartum Breast State]:
- Breasts: ${m.cup} cup - engorged with milk
- ${m.breastNote}
- 🍼 ${m.lactationNote}
- IMPORTANT: She experiences let-down reflex (sudden leaking) especially when she hears crying. Breasts ache if not emptied every 2-3h.`);
    } else if (m.lactating) {
        // Trait-based lactation (Lactating or Always Lactate) - not from pregnancy/postpartum
        const _traitStr = ((bot.prompt || '') + ' ' + (bot.bio || '')).toLowerCase();
        const _geneticTraits = (bot.geneticTraits || []).map(t => t.toLowerCase()).join(' ');
        const _alwaysLact = _traitStr.includes('always lactate') || _traitStr.includes('always lactat') ||
                            _geneticTraits.includes('always lactate') || _geneticTraits.includes('always lactat') ||
                            (typeof hasBotState === 'function' && hasBotState(bot, 'lactating'));
        if (_alwaysLact) {
            parts.push(`[Always Lactating - Trait]:
- Cup size: ${m.cup} (permanently enlarged due to continuous milk production)
- ${m.breastNote}
- 🍼 ${m.lactationNote}
- IMPORTANT: Her breasts leak constantly - she is accustomed to this but it is always present. She may press a hand to her chest unconsciously or adjust her clothing. Any pressure or stimulation causes leaking. She carries breast pads or damp spots appear on her clothing naturally.`);
        } else {
            parts.push(`[Currently Lactating - Trait]:
- Cup size: ${m.cup} (fuller than her usual baseline)
- ${m.breastNote}
- 🍼 ${m.lactationNote}
- IMPORTANT: She is aware of the heaviness and sensitivity. Leaking is possible when stimulated or after a long gap. She notices when her bra is damp.`);
        }
    } else if (m.breastNote) {
        parts.push(`[Menstrual Breast Effect]:
- ${m.breastNote}
- She may be more aware of her chest - tender to touch, slightly fuller bra fit.`);
    }

    return parts.join('\n');
}

// ── New formula-based body measurement changes for pregnancies ──

// Calculate normal pregnancy body changes using mathematical formulas
function calculateNormalPregnancyChanges(bot, weeks, fetusCount) {
    if (!weeks || weeks <= 0) return { bust: 0, waist: 0, hips: 0, weight: 0, cupIncrease: 0 };

    const baseMeasurements = bot.bodyMeasurements;
    const isTwins = fetusCount >= 2;
    const isTriplets = fetusCount >= 3;
    const isMultiples = fetusCount > 1;

    // Growth curves using sigmoid/logistic functions for realistic progression
    // Bust growth: peaks around week 32-36
    const bustGrowth = 18 * (1 / (1 + Math.exp(-0.3 * (weeks - 20)))) * (isMultiples ? 1.2 : 1.0);

    // Waist expansion: gradual increase with acceleration in later weeks
    const waistGrowth = 32 * Math.pow(weeks / 40, 1.8) * (isTwins ? 1.4 : isTriplets ? 1.7 : 1.0);

    // Hip widening: slower but steady increase
    const hipGrowth = 12 * Math.pow(weeks / 40, 1.2) * (isMultiples ? 1.1 : 1.0);

    // Weight gain: follows medical guidelines with adjustments for multiples
    const baseWeightGain = 12.5; // kg for singleton
    const multipleBonus = (fetusCount - 1) * 4; // extra kg per additional fetus
    const weightGain = (baseWeightGain + multipleBonus) * (weeks / 40);

    // Cup size increase: correlates with bust growth
    const cupIncrease = Math.floor(bustGrowth / 4);

    return {
        bust: Math.round(bustGrowth),
        waist: Math.round(waistGrowth),
        hips: Math.round(hipGrowth),
        weight: Math.round(weightGain * 10) / 10, // Round to 1 decimal place
        cupIncrease: cupIncrease
    };
}

// Calculate monster pregnancy body changes - more extreme and rapid
function calculateMonsterPregnancyChanges(bot, days, fetusCount) {
    if (!days || days <= 0) return { bust: 0, waist: 0, hips: 0, weight: 0, cupIncrease: 0 };

    const baseMeasurements = bot.bodyMeasurements;
    const monsterType = bot.cycleData?.monsterType || 'creature';

    // Monster pregnancies are much more rapid and extreme
    // Convert days to effective weeks for calculation (monster pregnancies are faster)
    const effectiveWeeks = days * 3; // 10 days = 30 weeks equivalent

    // More aggressive growth curves
    const bustGrowth = 24 * (1 / (1 + Math.exp(-0.4 * (effectiveWeeks - 15)))) * (fetusCount > 1 ? 1.5 : 1.0);

    // Waist expansion: even more dramatic for monsters
    const waistGrowth = 40 * Math.pow(effectiveWeeks / 30, 2.2) * (fetusCount > 1 ? 1.8 : 1.0);

    // Hip changes: monsters often cause more dramatic hip widening
    const hipGrowth = 16 * Math.pow(effectiveWeeks / 30, 1.5) * (fetusCount > 1 ? 1.3 : 1.0);

    // Weight gain: monsters cause more extreme weight changes
    const baseWeightGain = 15;
    const multipleBonus = (fetusCount - 1) * 6;
    const weightGain = (baseWeightGain + multipleBonus) * (effectiveWeeks / 30);

    const cupIncrease = Math.floor(bustGrowth / 3.5); // Monsters cause more bust growth per cup

    return {
        bust: Math.round(bustGrowth),
        waist: Math.round(waistGrowth),
        hips: Math.round(hipGrowth),
        weight: Math.round(weightGain * 10) / 10,
        cupIncrease: cupIncrease
    };
}

// Calculate parasite pregnancy body changes - alien and unpredictable
function calculateParasitePregnancyChanges(bot, days, parasiteCount) {
    if (!days || days <= 0) return { bust: 0, waist: 0, hips: 0, weight: 0, cupIncrease: 0 };

    const baseMeasurements = bot.bodyMeasurements;

    // Parasite pregnancies follow different patterns - more focused on specific areas
    // Days are out of 15 total for parasites

    // Parasites cause more localized changes, often asymmetric
    // Breast changes: parasites secrete chemicals that cause rapid breast development
    const breastMultiplier = Math.min(parasiteCount * 0.8, 3.0); // Max 3x for many parasites
    const bustGrowth = 20 * Math.sin((days / 15) * Math.PI) * breastMultiplier;

    // Abdominal changes: parasites cause visible movement and distension
    const abdomenGrowth = 35 * Math.pow(days / 15, 1.5) * (parasiteCount > 6 ? 1.4 : 1.0);

    // Hip changes: minimal for parasites
    const hipGrowth = 6 * Math.pow(days / 15, 1.3);

    // Weight changes: parasites consume host resources, may cause weight loss initially then gain
    let weightChange;
    if (days < 5) {
        weightChange = -2 * (days / 5); // Initial weight loss
    } else {
        weightChange = 8 * ((days - 5) / 10) * parasiteCount * 0.3;
    }

    const cupIncrease = Math.floor(bustGrowth / 3);

    return {
        bust: Math.round(bustGrowth),
        waist: Math.round(abdomenGrowth), // Parasites primarily affect waist/abdomen
        hips: Math.round(hipGrowth),
        weight: Math.round(weightChange * 10) / 10,
        cupIncrease: cupIncrease
    };
}
