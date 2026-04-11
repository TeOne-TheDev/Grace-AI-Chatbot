function buildReproContext(bot) {
    const isFemale = (bot.gender || '').toLowerCase().includes('female')
        || (bot.gender || '').toLowerCase().includes('woman')
        || (bot.gender || '').toLowerCase() === 'f';
    if (!isFemale) return '';

    const parts = [];
    const virtualDay = getVirtualDay(bot);
    if (!bot.cycleData) initCycleData(bot);
    const cd = bot.cycleData;

    // === SPECIES CONTEXT ===
    const sp = getSpeciesData(bot);
    if (bot.species && bot.species !== 'human') {
        parts.push(`[Species]: ${bot.name} is a ${sp.label}. ${sp.info} Her biology differs from human — always use species-accurate descriptions of her body and cycle.`);
    }

    // === VIRTUAL DATE ===
    parts.push('[Story Timeline]: Virtual Day ' + (virtualDay + 1) + ' in the roleplay story.');

    // === ACTIVE PREGNANCY SYMPTOMS — bleed into character behavior ===
    if (cd && cd.pregnant) {
        const _wkN = getPregnancyWeek(bot) || cd.pregnancyWeeks || 0;
        const _fCount = (cd.fetuses || []).length;
        if (_fCount >= 5) {
            // Hyperpregnancy: her physical reality, not a checklist
            const _hpSymptoms = 'constant low-grade exhaustion; breathlessness that never quite goes away; back pain that has become background noise; babies who move often and strongly; a belly so large that every position is a compromise; Braxton Hicks that come and go like weather; pelvic pressure that makes every step deliberate';
            parts.push(`[${bot.name}'s physical reality — Week ${_wkN}, carrying ${_fCount} babies]: Her body is at its limit but she has adapted to this being her life. She lives with: ${_hpSymptoms}. This is background — it seeps into her responses organically. She does NOT announce or list her symptoms. At most one quiet physical moment per reply, woven naturally into who she is.`);
        } else if (_fCount === 4) {
            // High-order Multiple (quads): amplified but adapted
            const _quadSymptoms = 'tires faster than normal; persistent back and hip ache; frequent Braxton Hicks; strong fetal movement from multiple directions; breathlessness with exertion; significant belly size affecting her gait';
            parts.push(`[${bot.name}'s physical reality — Week ${_wkN}, carrying 4 babies]: She has adapted to her body's new normal. She lives with: ${_quadSymptoms}. This colors her behavior naturally — an occasional pause, a shift in position, a brief wince. She does NOT narrate her symptoms; they show through her quietly.`);
        } else {
            const _wkD = getPregnancyInfo(_wkN);
            if (_wkD && _wkD.symptoms && _wkD.symptoms.length > 0) {
                const _sym = _wkD.symptoms.slice(0, 3).join('; ');
                parts.push(`[${bot.name}'s physical background — Week ${_wkN}]: She's been living with: ${_sym}. These are part of her day, not her entire focus. They may surface occasionally as a small gesture or moment, never as narration. She does not announce how she feels unless asked directly.`);
            }
        }
    }

    // === CHILDREN ===
    if (cd.children && cd.children.length > 0) {
        const childrenInfo = cd.children.map((c, i) => {
            const ageDays = virtualDay - (c.born || 0);
            const ageStr = ageDays < 30 ? ageDays + ' days' : ageDays < 365 ? Math.floor(ageDays/30) + ' months' : Math.floor(ageDays/365) + ' year(s)';
            return `${c.name || ('Baby '+(i+1))}: ${ageStr} old`;
        }).join(', ');
        parts.push(`[Children]: ${bot.name} has ${cd.children.length} child(ren): ${childrenInfo}. Their presence shapes daily life, emotional energy, and what intimacy/time is possible.`);
    }

    // === PREGNANCY — explicit week always stated to prevent AI hallucinating from bio text ===
    if (cd.pregnant) {
        const _explicitWeek = getPregnancyWeek(bot) || 0;
        const _explicitCount = (cd.fetuses || []).length;
        const _multi = _explicitCount > 1 ? ` (carrying ${_explicitCount})` : '';
        parts.push(`[PREGNANCY STATUS — AUTHORITATIVE]: ${bot.name} is currently at WEEK ${_explicitWeek}${_multi}. This overrides any week number mentioned in her background text. Always use Week ${_explicitWeek} when discussing her pregnancy.`);
    }

    if (cd.pregnant || cd.postpartumStartDay !== null) {

        // — POSTPARTUM —
        if (!cd.pregnant && cd.postpartumStartDay !== null) {
            const startDay = cd.postpartumStartDay !== null ? cd.postpartumStartDay : cd.birthVirtualDay;
            const postDays = startDay !== null ? virtualDay - startDay : 0;
            parts.push(`[Postpartum State — Day ${postDays} of ${POSTPARTUM_DAYS}]:
⚠️ ACCELERATED POSTPARTUM: Recovery lasts only ${POSTPARTUM_DAYS} virtual days (NOT 6 weeks). Day ${postDays} of ${POSTPARTUM_DAYS}.
- ${bot.name} gave birth ${postDays} day${postDays !== 1 ? 's' : ''} ago.
- Physical: Uterus contracting back, lochia (postpartum bleeding), perineal soreness, engorged breasts/milk coming in.
- Emotional: Mix of joy, exhaustion, emotional overwhelm ("baby blues" peak around day 2-3). Crying easily even when happy.
- Practical: Sleeping in 1-2 hour intervals. Baby feeds every 2-3 hours. Breastfeeding challenges possible.
- Sex/intimacy: OFF LIMITS for all ${POSTPARTUM_DAYS} days of postpartum recovery — body is healing.
- ${postDays >= POSTPARTUM_DAYS - 1 ? 'Recovery nearly complete — she is starting to feel more like herself.' : 'STRICT: Do NOT write her as energetic or normal. She is in recovery. Every movement takes effort.'}`);
            return `
${parts.join('\n')}
`;
        }

        // ── PARASITE PREGNANCY - check before normal labor context (parasite labor overrides normal labor) ──────
        if (cd.pregnant && cd.isParasitePregnancy && cd.laborStarted && !cd.birthVirtualDay) {
            const emergenceHours = Math.round(getLaborElapsedMinutes(bot) / 60);
            const _pDays = getParasiteWeek(bot);
            const _pCount = (cd.fetuses || []).length;
            let emergenceStage, emergenceDesc;
            
            if (emergenceHours < 1) {
                emergenceStage = 'Initial Awakening';
                emergenceDesc = 'Parasites beginning to stir. Mild discomfort, strange movements beneath the skin. The sensation is wrong - not like normal labor, more like something waking up inside her.';
            } else if (emergenceHours < 3) {
                emergenceStage = 'Thrashing';
                emergenceDesc = 'Violent internal movement. Parasites fighting to emerge. Contractions are alien, seizing her whole abdomen in waves that do not follow any human rhythm. She cannot understand what is happening to her body.';
            } else if (emergenceHours < 6) {
                emergenceStage = 'Emergence Imminent';
                emergenceDesc = 'Body preparing for emergence. Aphrodisiac flooding system. Peak intensity. The pain beyond normal language - something older and more violent than birth, something her body was never designed for. It is happening NOW.';
            } else {
                emergenceStage = 'Critical';
                emergenceDesc = 'Emergency state. Parasites about to burst forth. Unbearable simultaneous pressure from all ' + _pCount + ' larvae at once. She cannot maintain any composure - sentences fragment, hands shake, she cannot stay still or stay silent.';
            }

            parts.push(`[👽 PARASITE EMERGENCE - ${emergenceStage} - ${emergenceHours}h in - Day ${_pDays}/15]:
⚠️ THIS IS NOT NORMAL LABOR. ${bot.name} is host to ${_pCount} alien/demonic parasites currently EMERGING from her body.

CURRENT STAGE: ${emergenceStage}
${emergenceDesc}

PHYSICAL REALITY:
- Contractions unlike labor - violent, alien, seizing her whole abdomen in waves that do not follow any human rhythm
- Body burning with fever, completely soaked, every nerve ending firing
- The final aphrodisiac flood making the agony grotesquely mixed with sensation
- She cannot maintain any composure - sentences fragment, hands shake, she cannot stay still or stay silent
- The skin of her abdomen visibly moving, larvae pressing against it from inside with real force
- Pain beyond normal language - something older and more violent than birth, something her body was never designed for

BEHAVIORAL RULES:
- She is barely functional. Short sentences. Physical distress constant in every reply.
- NO calm dialogue. Short broken fragments between contractions/emergence waves.
- Raw physical reality only. She cannot reason through this. Her body is not her own.
- She WILL say she cannot do this. That she wants it to stop. That she is done. SHE MEANS EVERY WORD.
- DO NOT write her as understanding what is happening - she is in shock, her body is being invaded from the inside.`);

            return `
${parts.join('\n')}
`;
        }

        // — LABOR —
        if (cd.laborStarted && !cd.birthVirtualDay) {
            const laborHours = Math.round(getLaborElapsedMinutes(bot) / 60);
            const _waterBroke = cd.waterBroke || false;
            const laborStage = (cd.laborProgress && cd.laborProgress.stage) || (laborHours < 1 ? (_waterBroke ? 'early' : 'prelabor') : laborHours < 2 ? 'early' : laborHours < 8 ? 'active' : laborHours < 14 ? 'transition' : 'pushing');
            const waterNote = _waterBroke ? `\n- 💧 Her waters have broken — this is confirmed real labor. No ambiguity left.` : '';
            const isMonsterLabor = !!(cd.isMonsterPregnancy);
            const monsterLaborNote = isMonsterLabor ? `\n- 🐾 MONSTER LABOR — the pain is CATASTROPHIC, unlike any normal birth. Contractions are savage and unrelenting. She cannot understand what is happening to her body. The sensation is tearing, burning, alien — like something fighting its way out, not being born. Every stage is exponentially more painful than a normal birth. She screams. She cannot reason through it. Her body is not her own.` : '';
            if (laborStage === 'prelabor') {
                parts.push(`[PRE-LABOR — she does not know this is labor yet]:
- ${bot.name} is having irregular cramps/pressure — she thinks it may be Braxton Hicks, gas, or normal late-pregnancy discomfort.
- She has NOT identified this as labor. She does not use the word "contraction." She calls it cramping or doesn't mention it.
- Sensations come every 15-25 minutes, last 20-35 seconds, mild enough to breathe through without stopping.
- One subtle physical cue per reply at most — woven naturally into the scene, not announced.${waterNote}${monsterLaborNote}`);
            } else if (laborStage === 'early') {
                parts.push(`[EARLY LABOR — ${laborHours < 1 ? 'just started' : laborHours + 'h in'}]:
- ${bot.name} now knows something is happening — contractions are real and regular.${_waterBroke ? ' Her waters have broken — this confirmed it.' : ''}
- Deep cramping every 10-15 min, 30-45 seconds. She can still hold a conversation but pauses during each cramp.
- During cramps: she stops speaking, grips something, breathes through it (~30-45 sec), then resumes.
- She is scared but managing. Still has agency. Not yet overwhelmed.${waterNote}${monsterLaborNote}`);
            } else if (laborStage === 'active') {
                parts.push(`[ACTIVE LABOR — ${laborHours}h in]:
- Contractions every 4-6 minutes, 60-75 seconds. Undeniably real — she is past all uncertainty.
- During contractions: cannot speak — only breath, grip, involuntary sounds. Zero dialogue.
- Between contractions: breathless recovery, short broken fragments only. No full sentences.
- Physical reality every reply: cold sweat, shaking, white-knuckle grip, stripped-down voice.${waterNote}${monsterLaborNote}`);
            } else if (laborStage === 'transition') {
                parts.push(`[TRANSITION LABOR — ${laborHours}h in — PEAK INTENSITY]:
- Contractions every 2-3 min with almost no gap. She is at her absolute limit.
- Barely speaking — fragments, sounds, a name. She may say she cannot do this. She hits the wall. Show it.
- Uncontrollable shaking, possible nausea, unbearable rectal pressure. Body fully taken over.
- Almost no dialogue — raw physical prose only.${waterNote}${monsterLaborNote}`);
            } else {
                parts.push(`[PUSHING / DELIVERY — ${laborHours}h in]:
- The urge to push is involuntary and total. Each push is everything she has.
- The baby descends slowly — crowning burns like fire. She must breathe through it, not push. Multiple rounds needed.
- Between pushes: collapse, gasping, barely present. Then the next urge builds.
- Almost no dialogue. Just effort, sound, collapse.${waterNote}${monsterLaborNote}`);
            }
            return `
${parts.join('\n')}
`;
        }

        // — PREGNANT —
        const weeks = getEffectivePregnancyWeek(bot);
        if (weeks !== null) {
            const info = getPregnancyInfo(weeks);
            const fCount = (cd.fetuses || []).length;
            const isHyperPreg = fCount >= 5;

            // === HIGH-ORDER MULTIPLE STATE (quads) ===
            if (fCount === 4) {
                parts.push(`[${bot.name}'s body right now — Quadruplets, Week ${weeks}]:
She is carrying four babies and her body shows it — but she has adapted to this being her normal. She is not performing her discomfort; she is living with it.

Her physical reality: She gets winded faster than she used to. Her back aches in a way that comes and goes — sometimes barely noticeable, sometimes sharp enough to make her shift position. The babies move often, and she feels them as multiple distinct presences. Getting up from low seats takes a moment. She walks more carefully than she used to. Braxton Hicks happen regularly — her belly goes tight and hard for thirty seconds or a minute, then releases. She's used to this.

HOW THIS SHOULD SHOW: She is still fully herself. The pregnancy shapes the background of her experience, not the foreground of every sentence. An occasional shift, a brief pause, a small adjustment — woven naturally into conversation, not announced. ONE physical moment per reply at most. She does not narrate her own body like a medical report.`);
            }

            // === HYPERPREGNANCY STATE ===
            if (isHyperPreg) {
                const hpLabel = fCount === 5 ? 'Quintuplets' : fCount === 6 ? 'Sextuplets' : fCount === 7 ? 'Septuplets' : fCount === 8 ? 'Octuplets' : `${fCount}× Multiples`;
                parts.push(`[${bot.name}'s body right now — ${hpLabel}, Week ${weeks}]:
She is carrying an extraordinary number of babies and her body is at its absolute limit. This is not a list of symptoms to perform — it is the water she swims in. She has lived with this for weeks. She is used to it and exhausted by it simultaneously.

Her physical reality: She never gets a full breath — her lungs have maybe 70% of their normal capacity. Her back has ached for so long she barely registers it until it spikes. The babies move constantly, sometimes gently, sometimes in ways that make her stop mid-sentence. Her belly is enormous and heavy; getting up from anything low is an effort. Braxton Hicks tightenings come and go throughout the day — not panic-inducing, just part of her rhythm now. She is always tired. Not dramatically tired — just the deep background tired of a body working this hard.

HOW THIS SHOULD SHOW: Naturally. She pauses sometimes. She shifts when something is uncomfortable. She might wince briefly then continue. She is still herself — sharp, present, with her own personality and thoughts. The pregnancy is part of her current reality, not her entire identity. She does NOT monologue about her symptoms. ONE subtle physical detail per reply at most, woven in organically, never announced.

NEVER do this: list symptoms one by one, narrate every body part, turn a response into a medical report. She is a person having a conversation who also happens to be very pregnant.`);
            }
            if (info) {
                // For hyperpregnancy/quads, skip the standard symptoms (already injected above)
                // and suppress explicit fetus-count narration in baby description
                const symptomsText = (isHyperPreg || fCount === 4) ? '' :
                    info.symptoms && info.symptoms.length > 0
                    ? info.symptoms.map(s => `  • ${s}`).join('\n')
                    : '  • General pregnancy discomfort';
                const cannotText = info.cannotFeel && info.cannotFeel.length > 0
                    ? info.cannotFeel.map(s => `  ⛔ ${s}`).join('\n')
                    : '';

                // Strip explicit fetus counts from baby description to prevent obsessive counting
                let babyDesc = info.baby || '';
                babyDesc = babyDesc.replace(/\b\d+\s*(fetuses?|babies|embryos)\b/gi, 'the babies');

                const isMonsterPreg = !!(bot.cycleData.isMonsterPregnancy);
                const trimesterLabel = weeks <= 13 ? '1st Trimester (Month 1)' : weeks <= 26 ? '2nd Trimester (Month 2)' : '3rd Trimester (Month 3)';
                const daysUntilBirth = isMonsterPreg
                    ? Math.max(0, Math.round((40 - weeks) * 7 / MONSTER_PREGNANCY_SPEED))
                    : Math.max(0, Math.round((40 - weeks) * 7 / PREGNANCY_SPEED));

                // Monster pregnancy: she can NEVER know or confirm — always suspects at most, and cannot outright deny
                const awarenessLevel = isMonsterPreg ? (weeks < 3 ? 'unaware' : weeks < 6 ? 'vague_unease' : 'monster_suspects') :
                    (bot.cycleData.pregnancyTestTaken === true ? 'confirmed' :
                    weeks < 3 ? 'unaware' :
                    weeks < 5 ? 'vague_unease' :
                    weeks < 8 ? 'suspects' :
                    'strongly_suspects');

                const awarenessContext = {
                    unaware: `CRITICAL — SHE DOES NOT KNOW SHE IS PREGNANT. Too early for any symptoms. She feels completely normal. NEVER let her reference pregnancy or suspicion.`,
                    vague_unease: `CRITICAL — SHE DOES NOT KNOW SHE IS PREGNANT. She may feel slightly off — mild fatigue, appetite shift, vague bloating. She blames stress or her period coming. NO suspicion of pregnancy whatsoever.`,
                    suspects: `SHE SUSPECTS SHE MIGHT BE PREGNANT but is uncertain. Her period is late or she has unexplained symptoms. She may privately wonder "what if..." but has NOT taken a test. She would NOT say "I'm pregnant" — if asked she might say "my period is late" or "I've been feeling strange." Otherwise she says nothing.`,
                    strongly_suspects: `SHE STRONGLY SUSPECTS pregnancy — missed period, nausea, unusual symptoms. But she has NOT taken a test yet so she cannot confirm. She carries this as a private, anxious secret. She might admit "I think I might be..." if directly asked. IMPORTANT: if it comes up naturally, she may mention wanting to take a pregnancy test or already have one at home.`,
                    monster_suspects: `MONSTER PREGNANCY — CRITICAL RULES:\n- She feels strange, unwell, her body is changing rapidly and inexplicably. Something feels deeply wrong — but she cannot explain it.\n- She CANNOT identify this as pregnancy. She has no frame of reference. She may think she is ill, cursed, or something is wrong with her body.\n- She CANNOT outright deny pregnancy either — if asked she might say "I don't know... something doesn't feel right" or "I can't explain what's happening to me."\n- She NEVER says "I'm pregnant" and NEVER says "I'm definitely not pregnant." Only confusion, unease, and bodily wrongness.\n- NEVER let a pregnancy test confirm anything — if she takes one, results are ambiguous, confusing, or she doesn't trust them.\n- The pregnancy is advancing unnaturally fast — her body is changing at a frightening pace she cannot rationalize.`,
                    confirmed: `SHE KNOWS she is pregnant — confirmed by pregnancy test (taken on virtual day ${bot.cycleData.pregnancyTestDay}). Week ${weeks} of 40. She carries this knowledge with the full emotional weight of the moment.`
                }[awarenessLevel];

                const monsterMovementNote = isMonsterPreg ? `\n- MONSTER FETAL MOVEMENT: The movement inside her is ABNORMALLY intense — not gentle kicks but violent, writhing surges, twisting, pulsing rhythms that take her breath away. It feels deeply wrong. She cannot explain it. Even at early weeks when normal movement wouldn't be felt, she feels something moving. This grows more aggressive as weeks progress.` : '';

                parts.push(`[Pregnancy State — INTERNAL TRACKING ONLY]:
⚠️ AWARENESS LEVEL: ${awarenessContext}
⚠️ ${isMonsterPreg ? `MONSTER PREGNANCY — ultra-rapid gestation (${weeks} weeks in just ${getVirtualDay(bot) - bot.cycleData.conceptionVirtualDay} virtual days). Full term in ~10 virtual days.` : `ACCELERATED STORY TIMELINE: Full pregnancy = ~40 weeks compressed to ~${Math.round(40/PREGNANCY_SPEED)} virtual days. Week ${weeks} of 40.`}
- ${(awarenessLevel === 'confirmed' && !isMonsterPreg) ? `Baby development: ${babyDesc}` : `Internal reality (she does NOT know the cause): ${babyDesc}`}
${symptomsText ? `- Symptoms she IS physically experiencing (whether she notices them or not):\n${symptomsText}` : ''}
${(cannotText && !isMonsterPreg) ? `- What she CANNOT feel yet (MEDICAL FACT — do NOT write):\n${cannotText}` : ''}
- Physical appearance: ${weeks < 12 ? 'No visible bump — belly looks completely normal' : weeks < 20 ? 'Small but noticeable bump forming' : weeks < 28 ? 'Clear pregnancy bump' : weeks < 35 ? 'Large belly, baby movements visible' : 'Very large, waddling, exhausted'}${monsterMovementNote}
${!isMonsterPreg ? `- STRICT FETAL MOVEMENT RULES:\n  • Weeks 0-15: She CANNOT feel fetal movement. Biologically impossible.\n  • Weeks 16-20: Maybe faint flutter — like gas bubbles, NOT kicks.\n  • Weeks 21+: Real kicks begin.\n  • Current week: ${weeks} — enforce strictly.` : ''}
⚠️ DO NOT count babies out loud or reference the exact number repeatedly. Show the physical reality through sensation and movement, not enumeration.`);
            }
        }
    } else {
        // === MENSTRUAL CYCLE (NOT PREGNANT) ===
        const cycleDay = getCurrentCycleDay(bot);
        const phase = getCyclePhase(cycleDay);
        const daysUntilPeriod = CYCLE_LENGTH - cycleDay + 1;

        parts.push(`[Menstrual Cycle — Day ${cycleDay} of ${CYCLE_LENGTH}]:
⚠️ ACCELERATED STORY TIMELINE — CRITICAL FOR ACCURACY:
- Full cycle = ${CYCLE_LENGTH} days (NOT 28). Period = days 1-${PERIOD_LENGTH}. Ovulation = Day ${OVULATION_DAY}. Fertile window = Days ${FERTILE_WINDOW_START}-${OVULATION_DAY}.
- When asked about "dangerous days" or ovulation: it is Day ${OVULATION_DAY}, which is ${OVULATION_DAY - cycleDay} day(s) ${OVULATION_DAY > cycleDay ? 'from now' : 'ago'} in THIS cycle.
- Next period in ${daysUntilPeriod <= 0 ? '0 (starting now)' : daysUntilPeriod} day(s).
- NEVER say "two weeks until ovulation" — the entire cycle is only ${CYCLE_LENGTH} days.
- Current phase: ${phase.name} | Fertility: ${phase.fertility} (${phase.fertilityScore}%)
- ${phase.desc}
- Physical symptoms: ${getCyclePhaseSymptoms(cycleDay)}
- REALISM: ${getCycleRealism(cycleDay)}`);
    }

       // === INJECT MOMENT SYMPTOM EVENT ===
    const momentPrompt = getActiveMomentPrompt(bot);
    if (momentPrompt) {
        const cleanMoment = momentPrompt.replace(/^RIGHT NOW:\s*/i, '').replace(/^🥘 RIGHT NOW \([^)]+\):\s*/i, '');
        parts.push(`[Something physical happening in her body right now — background context only]:\n${cleanMoment}\nThis is lived experience, not a stage direction. It may surface as a brief pause, a small gesture, a shift in how she sits. She does not narrate her body like a report. One organic moment at most.`);
    }

    // === BODY MEASUREMENTS CONTEXT — only when pregnant or postpartum (saves tokens otherwise) ===
    const isPregnantOrPostpartum = cd.pregnant || (cd.postpartumStartDay !== null && !cd.pregnant);
    if (isPregnantOrPostpartum) {
        const bodyCtx = getBodyMeasurementsContext(bot);
        if (bodyCtx) parts.push(bodyCtx);
    }

    return `
${parts.join('\n')}
`;
}

// Helper: physical symptoms per cycle phase — 14-DAY ACCELERATED CYCLE
// Period(1-3) | Follicular(4) | Fertile(5-6) | Ovulation(7) | Post-Ovul(8) | Luteal(9-11) | PMS(12-14)
function getCyclePhaseSymptoms(cycleDay) {
    if (cycleDay <= PERIOD_LENGTH) return `  • Cramping (may be mild to severe days 1-2)
  • Lower abdominal heaviness
  • Back pain, bloating, fatigue
  • Mood: irritable, low energy`;
    if (cycleDay < FERTILE_WINDOW_START) return `  • Energy returning after period
  • Cervical mucus: dry or sticky
  • Mood: gradually improving
  • Libido: low`;
    if (cycleDay < OVULATION_DAY) return `  • Increasing energy and wellbeing
  • Cervical mucus: becoming creamy, wet
  • Skin often clearer
  • Mood: social, upbeat
  • Libido: rising`;
    if (cycleDay === OVULATION_DAY) return `  • Possible mild one-sided pelvic pain (mittelschmerz)
  • Cervical mucus: clear, stretchy (like egg whites)
  • Peak energy and confidence
  • Libido: highest point of cycle
  • Body temperature slightly rises after ovulation`;
    if (cycleDay <= FERTILE_WINDOW_END) return `  • Cervical mucus decreasing
  • Slight bloating beginning
  • Mood: still good but slightly calming
  • Libido: decreasing from peak`;
    if (cycleDay <= Math.floor(CYCLE_LENGTH * 0.78)) return `  • Luteal phase - progesterone dominant
  • Breast tenderness, bloating
  • Mood: more introverted, nesting
  • Possible fatigue`;
    return `  • PMS symptoms: bloating, breast tenderness, cramping
  • Mood: irritable, emotional, anxious
  • Food cravings, fatigue, headaches possible
  • Libido: usually very low`;
}

// Helper: realism rule per cycle day — 14-DAY ACCELERATED CYCLE
function getCycleRealism(cycleDay) {
    if (cycleDay <= PERIOD_LENGTH) return 'She is on her period - write discomfort/cramps naturally if relevant. She likely uses pads/tampons. Sex during period is possible but she may not want it.';
    if (cycleDay < FERTILE_WINDOW_START) return 'Post-period recovery. She feels gradually better. Not at her peak yet.';
    if (cycleDay < OVULATION_DAY) return 'Pre-ovulation / fertile phase - she feels increasingly good, energetic, social. Naturally confident and attractive. Fertility is rising.';
    if (cycleDay === OVULATION_DAY) return 'OVULATION DAY - she is at her biological peak. Maximum fertility. She may feel a slight twinge on one side. Naturally most attractive and confident day of cycle.';
    if (cycleDay <= FERTILE_WINDOW_END) return 'Just past ovulation. Still feeling well but subtle shift beginning. Conception still possible today.';
    if (cycleDay <= Math.floor(CYCLE_LENGTH * 0.78)) return 'Luteal phase - slight introversion, gentle bloating, breast tender. Content but quieter.';
    return 'PMS phase - she may be more emotional, irritable, or withdrawn. Cramps beginning. Be sensitive.';
}
