function getPregnancyInfo(weeks) {
    
    
    if (weeks < 0) return null;

    
    if (weeks === 0) return {
        label: 'Fertilized', trimester: '', status: '\u2728 Fertilized',
        baby: 'Microscopic zygote - 0.1mm. Single fertilized cell dividing.',
        symptoms: ['No symptoms yet - conception just occurred'],
        cannotFeel: ['No fetal movement possible - embryo does not exist yet as a fetus'],
        desc: 'Fertilization occurred. Zygote dividing as it travels to the uterus.'
    };
    if (weeks === 1) return {
        label: 'Week 1', trimester: '1st', status: '\uD83D\uDD2C Implanting',
        baby: 'Blastocyst ~0.2mm - traveling down the fallopian tube.',
        symptoms: ['No symptoms - embryo not yet implanted', 'Possibly light spotting when implanting'],
        cannotFeel: ['No movement possible - no nervous system yet'],
        desc: 'Blastocyst traveling toward uterus. No symptoms possible yet.'
    };
    if (weeks === 2) return {
        label: 'Week 2', trimester: '1st', status: '\uD83C\uDF31 Implanted',
        baby: 'Embryo ~1mm - just implanted in uterine wall. Placenta beginning to form.',
        symptoms: ['Light implantation cramping possible', 'Slight spotting (implantation bleeding)', 'No morning sickness yet - hCG too low'],
        cannotFeel: ['No fetal movement - embryo is 1mm with no limbs or muscles'],
        desc: 'Implantation complete. hCG hormone rising - pregnancy test may turn positive.'
    };
    if (weeks === 3) return {
        label: 'Week 3', trimester: '1st', status: '\uD83C\uDF31 Very Early',
        baby: 'Embryo ~2mm - neural tube forming. Heart cells just beginning.',
        symptoms: ['Breast tenderness beginning', 'Fatigue starting', 'Frequent urination beginning', 'No nausea yet typically'],
        cannotFeel: ['No fetal movement - embryo has no developed limbs or muscles'],
        desc: 'hCG rising rapidly. Neural tube and heart cells forming. No nausea yet.'
    };
    if (weeks === 4) return {
        label: 'Week 4', trimester: '1st', status: '\uD83C\uDF31 Week 4',
        baby: 'Embryo ~5mm - heart beating for first time (primitive beat). Arm/leg buds forming.',
        symptoms: ['Morning sickness may begin (nausea, especially morning)', 'Breast tenderness', 'Extreme fatigue', 'Food aversions starting', 'Frequent urination'],
        cannotFeel: ['No fetal movement - embryo is 5mm with paddle-like limb buds, no coordinated muscles'],
        desc: 'Heart beats for first time. Morning sickness may begin. No movement possible.'
    };
    if (weeks === 5) return {
        label: 'Week 5', trimester: '1st', status: '\uD83E\uDD2D Week 5',
        baby: 'Embryo ~9mm - face features forming. Fingers just starting as webbed buds.',
        symptoms: ['Nausea often peaks in weeks 5-9', 'Vomiting possible', 'Extreme food aversions', 'Heightened sense of smell', 'Fatigue', 'Emotional mood swings'],
        cannotFeel: ['No fetal movement - embryo is 9mm, no coordinated muscular system'],
        desc: 'Worst nausea often starts now. Face, fingers, toes forming. Absolutely no kicks.'
    };
    if (weeks === 6) return {
        label: 'Week 6', trimester: '1st', status: '\uD83E\uDD2D Week 6',
        baby: 'Embryo ~12mm - eyelids, nostrils visible. Heart has 4 chambers.',
        symptoms: ['Nausea may be strong (all-day queasiness)', 'Breast very tender', 'Bloating and slower digestion', 'Heightened emotions'],
        cannotFeel: ['No fetal movement - 12mm embryo with immature nervous system cannot generate coordinated kicks'],
        desc: 'Nausea typically strongest 6-10 weeks. No movement possible at this size.'
    };
    if (weeks === 7) return {
        label: 'Week 7', trimester: '1st', status: '\uD83E\uDD2D Week 7',
        baby: 'Embryo ~13mm - all major organs forming. Tiny fingers distinct.',
        symptoms: ['Persistent nausea and vomiting', 'Round ligament pulling sensation', 'Frequent urination', 'Fatigue', 'Heartburn starting'],
        cannotFeel: ['No fetal movement - nervous system far too immature for coordinated movement'],
        desc: '13mm embryo. Nausea persists. No kicks or movement felt - medically impossible at this stage.'
    };
    if (weeks === 8) return {
        label: 'Week 8', trimester: '1st', status: '\uD83E\uDD2D Week 8',
        baby: 'Embryo 16mm (size of a raspberry) - facial features defined. Tail disappearing.',
        symptoms: ['Nausea and vomiting (may be severe)', 'Extreme fatigue', 'Breast very tender and larger', 'Visible bloating but no baby bump yet', 'Food aversions', 'Heightened emotions'],
        cannotFeel: ['NO KICKS OR MOVEMENT - at 16mm the embryo muscle-nerve connections are not developed enough to generate any sensation the mother could feel. Fetal movement is NOT felt until weeks 16-25.'],
        desc: '16mm raspberry-sized embryo. Nausea often peaks. Absolutely no kicks - movement cannot be felt until week 16 at earliest.'
    };
    if (weeks === 9) return {
        label: 'Week 9', trimester: '1st', status: '\uD83E\uDD2D Week 9',
        baby: 'Fetus ~23mm - now officially a "fetus" not embryo. Joints forming, tiny movements in amniotic fluid (NOT felt by mother).',
        symptoms: ['Nausea may begin easing slightly for some', 'Digestion may be slower than usual', 'Gas and bloating', 'Veins visible on breasts', 'Waistband tightening'],
        cannotFeel: ['Fetus makes tiny reflex movements in amniotic fluid but these CANNOT be felt by mother - uterus still deep in pelvis, too far from abdominal wall'],
        desc: 'Now a fetus at 23mm. Moves slightly in fluid but mother cannot feel it - walls too thick, baby too small.'
    };
    if (weeks === 10) return {
        label: 'Week 10', trimester: '1st', status: '\uD83E\uDD2D Week 10',
        baby: 'Fetus ~31mm - vital organs formed. Fingernails forming.',
        symptoms: ['Nausea improving for many women', 'Round ligament pain possible', 'Small bump may appear for some (especially multiples)', 'Fatigue continuing'],
        cannotFeel: ['No fetal movement felt - fetus still too small at 31mm and uterus too low'],
        desc: 'Organs complete. Nausea may ease. Still no movement felt by mother.'
    };
    if (weeks === 11) return {
        label: 'Week 11', trimester: '1st', status: '\uD83E\uDD2D Week 11',
        baby: 'Fetus ~41mm - yawning, swallowing, hiccupping (not felt by mother).',
        symptoms: ['Nausea gradually improving', 'Energy slowly returning', 'Bloating prominent', 'Small bump appearing'],
        cannotFeel: ['Fetal hiccups and swallowing occur but are NOT perceptible to mother - fetus at 41mm is far too small'],
        desc: '41mm fetus. Nausea easing for most. Hiccups/swallowing present but undetectable.'
    };
    if (weeks === 12) return {
        label: 'Week 12', trimester: '1st', status: '\uD83E\uDD2D Week 12',
        baby: 'Fetus ~54mm - reflexes developing. Face looks human. NT scan possible.',
        symptoms: ['Nausea significantly reducing', 'Energy returning', 'Small visible bump', 'Skin changes possible (linea nigra)', 'Frequent urination lessening'],
        cannotFeel: ['No fetal movement felt - at 54mm (5.4cm) fetus still too small for movements to reach abdominal wall'],
        desc: 'End of 1st trimester. Nausea fading. 54mm fetus active in fluid but movements not yet felt.'
    };

    
    const sizes13_27 = [0, 0, 0, 7.4, 8.7, 10.1, 11.6, 13.0, 14.2, 15.3, 16.4, 17.4, 18.0, 19.0, 20.0];
    if (weeks === 13) return {
        label: 'Week 13', trimester: '2nd', status: '\uD83E\uDD30 2nd Trimester',
        baby: `Fetus ~7.4cm - 2nd trimester begins. Fingerprints forming.`,
        symptoms: ['Energy returning', 'Nausea usually gone', 'Belly growing visibly', 'Increased appetite', 'Skin glowing for many'],
        cannotFeel: ['No movement felt yet - uterus just rising out of pelvis, fetus at 7.4cm still too small for perceptible movement'],
        desc: 'Welcome to 2nd trimester. Best phase for most. No kicks yet.'
    };
    if (weeks >= 14 && weeks <= 15) return {
        label: `Week ${weeks}`, trimester: '2nd', status: '\uD83E\uDD30 2nd Trimester',
        baby: `Eyes moving under closed lids. Sucking reflex & facial expressions present. Kidneys producing urine.`,
        symptoms: [
            'Energy noticeably returning - nausea largely gone',
            'Appetite strong, may have intense food cravings',
            'Baby bump clearly visible, especially for multiples',
            'Round ligament pain - sharp twinges on sides of lower belly',
            'Lower back ache, especially after standing long',
            'Leg cramps, particularly at night',
            'Breast tenderness continuing, areolas darkening',
            'Skin changes: linea nigra (dark line on belly) may appear',
            'Increased vaginal discharge (normal - leukorrhea)',
            'Stuffy or blocked nose (pregnancy rhinitis)',
            'Occasional headaches due to increased blood volume',
            'Mild dizziness when standing up quickly',
            'Heightened libido common in 2nd trimester',
            'Vivid, unusual dreams',
            'Gums may feel more sensitive when brushing'
        ],
        cannotFeel: ['No fetal movement perceptible yet - first-time mothers rarely feel movement before week 18-20'],
        desc: `Feeling much better. 2nd trimester golden phase beginning. Movement not yet felt.`
    };
    if (weeks === 16) return {
        label: 'Week 16', trimester: '2nd', status: '\uD83E\uDD30 2nd Trimester',
        baby: '~11.6cm (avocado-sized) - skeletal system hardening. Baby doing somersaults.',
        symptoms: ['Feeling great for most - energy returning fully', 'Noticeable bump especially in 2nd pregnancy', 'Skin glowing from increased circulation', 'Hair thicker and shinier (reduced shedding)', 'Back ache worsening as bump grows', 'Increased appetite and intensifying cravings'],
        cannotFeel: ['POSSIBLY: very experienced mothers (2nd+ pregnancy) may feel very faint "quickening" - flutter-like sensations, like bubbles or gas. First-time mothers usually do NOT feel anything yet.'],
        desc: '16 weeks - earliest possible movement sensation. Very subtle flutter, NOT kicks.'
    };
    if (weeks === 17) return {
        label: 'Week 17', trimester: '2nd', status: '\uD83E\uDD30 2nd Trimester',
        baby: '~13cm - fat deposits forming. Umbilical cord thickening.',
        symptoms: ['Quickening possible - flutters like butterflies or gas bubbles', 'Round ligament pain - sharp twinges on sides of lower belly', 'Stuffy or runny nose (pregnancy rhinitis)', 'Vivid and strange dreams (progesterone effect)', 'Stretch marks starting on belly, breasts, hips', 'Swollen feet and ankles, worse in evenings', 'Heightened libido - very common mid-2nd trimester'],
        cannotFeel: ['Movements felt as gentle flutters or bubbles, NOT as kicks or bumps - too early for kicks'],
        desc: 'Baby moving more. Some mothers feel first "quickening" - like bubbles, not kicks.'
    };
    if (weeks === 18) return {
        label: 'Week 18', trimester: '2nd', status: '\uD83E\uDD30 2nd Trimester',
        baby: '~14.2cm - yawning, hiccupping. Ears fully functional.',
        symptoms: ['Quickening - gentle tapping or bubble-like movements', 'Anatomy scan due 18-20 weeks (gender confirmed)', 'Swollen ankles and feet, worse by evening', 'Shortness of breath starting when exerting', 'Gums may feel more sensitive', 'Occasional Braxton Hicks - painless tightening'],
        cannotFeel: ['Movements felt as gentle taps or flutters. Kicks not yet strong enough to feel from outside.'],
        desc: 'Most mothers feel first gentle movements this week. Like tapping, not kicking.'
    };
    if (weeks === 19) return {
        label: 'Week 19', trimester: '2nd', status: '\uD83E\uDD30 2nd Trimester',
        baby: '~15.3cm - vernix coating forming. Hearing developed.',
        symptoms: ['Regular gentle movements - taps or soft rolls', 'Stronger appetite, hunger hits suddenly and intensely', 'Leg cramps especially at night (calcium/magnesium)', 'Skin changes: nipples darkening, linea nigra down belly', 'Belly button flattening or starting to pop out', 'Mild pelvic girdle pain when walking', 'Afternoon fatigue returning even after good sleep'],
        cannotFeel: ['Kicks not yet strong enough to feel from outside (partner cannot feel yet)'],
        desc: '19 weeks - regular gentle movements. Anatomy scan soon. Partner cannot feel from outside yet.'
    };
    if (weeks === 20) return {
        label: 'Week 20', trimester: '2nd', status: '\uD83E\uDD30 2nd Trimester',
        baby: '~16.4cm (halfway point!) - swallowing amniotic fluid, practicing breathing.',
        symptoms: ['Definite baby movements - stronger flutters, light taps, small rolls', 'Anatomy scan this week - baby fully visible on ultrasound', 'Belly button popping out or going flat', 'Lumbar back pain increasing with growing bump', 'Occasional wrist tingling', 'Itchy belly skin as it stretches'],
        cannotFeel: ['Partner MAY begin to feel very faint movement with hand on belly - only if baby kicks at that exact moment'],
        desc: 'Halfway! 20 weeks - real movement felt. Sometimes partner can feel very faint kicks.'
    };
    if (weeks === 21) return {
        label: 'Week 21', trimester: '2nd', status: '\uD83E\uDD30 2nd Trimester',
        baby: '~26cm (measuring head to toe now) - rapid eye movement during sleep.',
        symptoms: ['Definite kicks and rolls - recognizable and regular', 'Partner can feel kicks by pressing hand on belly', 'Leg cramps at night - sudden and sharp', 'Braxton Hicks becoming more noticeable - tightening then releasing', 'Heartburn and acid reflux worsening', 'Trouble finding comfortable sleeping position', 'Forgetfulness and mental fog (pregnancy brain)'],
        cannotFeel: [],
        desc: '21 weeks - real kicks! Partner can feel them. Baby has sleep-wake cycles.'
    };
    if (weeks >= 22 && weeks <= 24) {
        return {
            label: `Week ${weeks}`, trimester: '2nd', status: '\uD83E\uDD30 2nd Trimester',
            baby: `~${weeks*1.4}cm - responds to sound and light. Distinct sleep/wake cycles.`,
            symptoms: ['Strong regular kicks and rolls - partner can easily feel', 'Stretch marks appearing on belly, breasts, hips, thighs', 'Swollen ankles and fingers - rings may feel snug', 'Heartburn and acid reflux (uterus pressing on stomach)', 'Braxton Hicks becoming more frequent', 'Shortness of breath with mild exertion', 'Difficulty sleeping - pillow support between knees needed'],
            cannotFeel: [],
            desc: `${weeks} weeks - active and strong kicks. Baby responds to your voice.`
        };
    }
    if (weeks >= 25 && weeks <= 28) {
        return {
            label: `Week ${weeks}`, trimester: weeks <= 27 ? '2nd' : '3rd', status: '\uD83E\uDD30 ' + (weeks <= 27 ? '2nd' : '3rd') + ' Trimester',
            baby: `~${weeks*1.5}cm - eyes open, can see light through belly. Brain developing rapidly.`,
            symptoms: ['Very active kicks - visible rippling on belly surface', 'Shortness of breath - uterus pressing on diaphragm', 'Heartburn and reflux increasing', 'Swollen feet and ankles (edema) - worse in heat', 'Difficulty sleeping - hip pressure, baby moving at night', 'Round ligament pain with sudden movement', 'Back pain radiating into hips and tailbone'],
            cannotFeel: [],
            desc: `${weeks} weeks - kicks visible on belly surface. Very active baby.`
        };
    }

    
    if (weeks >= 29 && weeks <= 32) return {
        label: `Week ${weeks}`, trimester: '3rd', status: '\uD83E\uDD30 3rd Trimester',
        baby: `~${(weeks*1.6).toFixed(0)}cm - all senses active. Gaining weight rapidly.`,
        symptoms: ['Strong kicks and rolls felt constantly throughout day', 'Braxton Hicks more frequent - can feel like real contractions', 'Persistent back pain and hip ache', 'Difficulty sleeping - bump growing, baby active at night', 'Shortness of breath - uterus pressing hard on diaphragm', 'Frequent urination returning as baby presses on bladder', 'Waddling gait, pelvic pressure when walking'],
        cannotFeel: [],
        desc: `${weeks} weeks - 3rd trimester. Baby gaining 200g/week. Very strong movement.`
    };
    if (weeks >= 33 && weeks <= 36) return {
        label: `Week ${weeks}`, trimester: '3rd', status: '\uD83E\uDD30 3rd Trimester',
        baby: `~${(weeks*1.4).toFixed(0)}cm - head likely engaged (pointing down). Lungs maturing.`,
        symptoms: ['Movement feels different - less kicking, more rolling as space runs out', 'Occasional pelvic pressure and sharp twinges in groin', 'Nesting instinct - sudden urge to organize and prepare', 'Braxton Hicks intensifying and more frequent', 'Colostrum may begin leaking from nipples', 'Insomnia - impossible to get comfortable', 'Extreme fatigue despite poor sleep'],
        cannotFeel: [],
        desc: `${weeks} weeks - baby getting into position. Movement shifts from kicks to rolling/squirming.`
    };
    if (weeks >= 37 && weeks <= 38) return {
        label: `Week ${weeks}`, trimester: '3rd', status: '\u2705 Full Term',
        baby: `~48-50cm, ~3.0-3.2kg - fully developed. Could be born any day.`,
        symptoms: ['Pelvic pressure and pressure on bladder', 'Braxton Hicks may become more noticeable', 'Body preparing for birth', 'Extreme fatigue', 'Nesting instinct peak'],
        cannotFeel: [],
        desc: `Full term at ${weeks} weeks. Baby fully ready. Signs of labor may begin.`
    };
    if (weeks >= 39 && weeks <= 40) return {
        label: `Week ${weeks}`, trimester: '3rd', status: '\u23F0 Due Soon',
        baby: '~50-52cm, ~3.2-3.5kg - overripe but perfect. Placenta aging.',
        symptoms: ['Irregular or regular contractions', 'Water may break (amniotic fluid)', 'Extreme pelvic pressure', 'Back discomfort possible', 'Frequent bathroom trips'],
        cannotFeel: [],
        desc: `${weeks} weeks - due date. Labor signs imminent. Water breaking possible any moment.`
    };
    if (weeks >= 41 && weeks <= 42) return {
        label: `Week ${weeks}`, trimester: '3rd', status: '\u23F3 Overdue',
        baby: `~52-54cm, ~3.6-4.1kg - overdue. Placenta aging, induction typically offered.`,
        symptoms: [
            'Contractions coming and going, irregular but intense',
            'Extreme pelvic pressure - baby very low',
            'Braxton Hicks nearly indistinguishable from real contractions',
// ... (rest of the code remains the same)
            'Swollen feet and ankles, worse than ever',
            'Severe backache, constant and aching',
            'Exhaustion is bone-deep - sleep is broken and uncomfortable',
            'Frequent urge to urinate - baby pressing on bladder hard',
            'Emotional tension - frustration, anxiety, restlessness'
        ],
        cannotFeel: [],
        desc: `Overdue at ${weeks} weeks. Every day past due increases pressure on body and baby. Induction being actively discussed.`
    };
    if (weeks >= 43 && weeks <= 44) return {
        label: `Week ${weeks}`, trimester: '3rd', status: '⏳ Very Overdue',
        baby: `~53-55cm, ~4.0-4.5kg - significantly overdue. Placenta declining, monitoring intensive.`,
        symptoms: [
            'Irregular but powerful contractions - body is trying, not succeeding',
            'Pelvic pain constant - pressure unbearable when walking',
            'Cannot sleep - no position is comfortable',
            'Braxton Hicks are strong and frequent, sometimes alarming',
            'Extreme lower back pain radiating down legs',
            'Swollen from knees down, skin tight',
            'Shortness of breath even at rest - lungs have no space',
            'Emotional breakdown possible - desperation and exhaustion',
            'Mucus plug may discharge - body slowly preparing',
            'Every movement requires conscious effort'
        ],
        cannotFeel: [],
        desc: `Very overdue at ${weeks} weeks. Body is under significant strain. Labor imminent but stubbornly delayed.`
    };
    if (weeks >= 45) return {
        label: `Week ${weeks}`, trimester: '3rd', status: '⏳ Critically Overdue',
        baby: `~54-56cm, ~4.3-5.0kg - critically overdue. Baby large, placenta failing.`,
        symptoms: [
            'Contractions irregular but breathtaking in intensity',
            'Can barely walk - pelvic girdle pain severe',
            'Lower back feels like it may give way',
            'Belly impossibly large - skin pulled tight, deeply uncomfortable',
            'Cannot stand for more than a few minutes',
            'Breathing is labored even sitting still',
            'Dizzy spells when changing position',
            'Total sleep deprivation - minutes of rest at best',
            'Braxton Hicks violent and nearly constant',
            'Raw emotional state - tears at nothing, terror of what is coming'
        ],
        cannotFeel: [],
        desc: `Critically overdue at ${weeks} weeks. This is the absolute limit of human pregnancy. Labor can begin any moment.`
    };
    return null;
}

async function detectLaborAI(text) {
    if (!getGroqKeys().length) {
        const t = text.toLowerCase();
        return /\b(contraction|labor|labour|water broke|water break|giving birth|push|pushing|crowning|dilat|cervix|epidural|midwife|baby is coming|baby coming now|water broke|labor pain|giving birth)\b/.test(t);
    }
    const key = getNextGroqKey();
    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_FAST_MODEL,
                max_tokens: 3,
                temperature: 0.0,
                messages: [{ role: 'user', content: `Does this roleplay text explicitly mention that the character's water broke or that she is going into labor/giving birth (in any language)?
Examples YES: "water broke", "water broke", "labor pain", "contractions started", "the baby is coming", "labor started", "kneeling holding belly", "breaking water", "contractions began"
Examples NO: normal talking, pregnancy aches, just mentioning being pregnant, general pain.

Text: "${text.substring(0, 400)}"

Answer only YES or NO:` }]
            }),
            signal: AbortSignal.timeout(4000)
        });
        const data = await res.json();
        return (data.choices?.[0]?.message?.content || '').trim().toUpperCase().startsWith('YES');
    } catch(e) { 
        const t = text.toLowerCase();
        return /\b(contraction|labor|labour|water broke|water break|giving birth|push|pushing|crowning|water broke|labor pain|giving birth)\b/i.test(t); 
    }
}

async function detectPregnancyTestAI(userMsg, botReply) {
    if (!getGroqKeys().length) return false;
    const combined = ((userMsg || '') + ' ' + (botReply || '')).trim();
    if (combined.length < 4) return false;
    const key = getNextGroqKey();
    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_FAST_MODEL,
                max_tokens: 3,
                temperature: 0.0,
                messages: [{ role: 'user', content: `Does this roleplay text mention a pregnancy test being taken, shown, or confirmed positive (in any language)?
Examples YES: "took a pregnancy test", "pregnancy test", "pregnancy check", "two lines appeared", "test positive", "test de grossesse positif", "test positivo", "two lines showed", "positive result"
Examples NO: general sex, kissing, being pregnant without testing, vague mentions

Text: "${combined.substring(0, 400)}"

Answer only YES or NO:` }]
            }),
            signal: AbortSignal.timeout(4000)
        });
        const data = await res.json();
        return (data.choices?.[0]?.message?.content || '').trim().toUpperCase().startsWith('YES');
    } catch(e) { return false; }
}

async function detectPregnancyConfirmationAI(botReply) {
    if (!getGroqKeys().length) return false;
    if (!botReply || botReply.trim().length < 4) return false;
    const key = getNextGroqKey();
    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_FAST_MODEL,
                max_tokens: 3,
                temperature: 0.0,
                messages: [{ role: 'user', content: `Does the character in this text explicitly confirm or admit that she is already pregnant (in any language)?
Examples YES: "I'm pregnant", "I'm expecting", "pregnant", "expecting a baby", "we're having a baby", "je suis enceinte", "estoy embarazada", "I'm expecting", "we're having a baby"
Examples NO: sex happening, feeling nauseous, maybe pregnant, speculating, being asked if pregnant

Text: "${botReply.substring(0, 400)}"

Answer only YES or NO:` }]
            }),
            signal: AbortSignal.timeout(4000)
        });
        const data = await res.json();
        return (data.choices?.[0]?.message?.content || '').trim().toUpperCase().startsWith('YES');
    } catch(e) { return false; }
}

function processPregnancyTest(bot, replyText) {
    if (!bot.cycleData || !bot.cycleData.pregnant) return;
    const cd = bot.cycleData;
    if (cd.pregnancyTestTaken) return; 

    
    const isNegative = /\b(negative|not pregnant|one line|no result|test negative)\b/.test(replyText.toLowerCase());
    if (isNegative) return;

    cd.pregnancyTestTaken = true;
    cd.pregnancyTestDay = getVirtualDay(bot);
    addReproEvent(bot, '\uD83E\uDDEA Pregnancy test taken - positive result confirmed!');
    saveBots();
}

function getFetusSize(week) {
    
    
    const data = {
        0:  { l: 0.01, w: 0 },
        1:  { l: 0.02, w: 0 },
        2:  { l: 0.1,  w: 0 },
        3:  { l: 0.2,  w: 0 },
        4:  { l: 0.5,  w: 0.5 },
        5:  { l: 0.9,  w: 1 },
        6:  { l: 1.2,  w: 2 },
        7:  { l: 1.3,  w: 3 },
        8:  { l: 1.6,  w: 1 },
        9:  { l: 2.3,  w: 2 },
        10: { l: 3.1,  w: 4 },
        11: { l: 4.1,  w: 7 },
        12: { l: 5.4,  w: 14 },
        13: { l: 7.4,  w: 23 },
        14: { l: 8.7,  w: 43 },
        15: { l: 10.1, w: 70 },
        16: { l: 11.6, w: 100 },
        17: { l: 13.0, w: 140 },
        18: { l: 14.2, w: 190 },
        19: { l: 15.3, w: 240 },
        20: { l: 16.4, w: 300 },
        21: { l: 26.0, w: 360 },
        22: { l: 27.0, w: 430 },
        23: { l: 28.0, w: 500 },
        24: { l: 30.0, w: 600 },
        25: { l: 34.0, w: 660 },
        26: { l: 35.0, w: 760 },
        27: { l: 36.0, w: 875 },
        28: { l: 37.0, w: 1005 },
        29: { l: 38.0, w: 1150 },
        30: { l: 39.0, w: 1320 },
        31: { l: 41.0, w: 1500 },
        32: { l: 42.0, w: 1700 },
        33: { l: 44.0, w: 1900 },
        34: { l: 45.0, w: 2100 },
        35: { l: 46.0, w: 2400 },
        36: { l: 47.0, w: 2600 },
        37: { l: 49.0, w: 2900 },
        38: { l: 50.0, w: 3100 },
        39: { l: 51.0, w: 3300 },
        40: { l: 51.0, w: 3500 },
    };
    const w = Math.min(week, 40);
    const d = data[w] || data[40];
    return { lengthCm: d.l, weightG: d.w };
}

function getFetusMilestone(week) {
    const w = Math.min(Math.max(Math.round(week) || 0, 4), 42);
    const milestones = {
        4:'Neural tube forming', 5:'Heart begins beating', 6:'Brain & spinal cord forming',
        7:'Hands & feet paddle-shaped', 8:'All major organs present', 9:'Muscles responding',
        10:'Fingernails developing', 11:'Can make a fist', 12:'Reflexes developing',
        13:'Fingerprints forming', 14:'Can squint & grimace', 15:'Bones hardening',
        16:'Hearing developing', 17:'Fat layers forming', 18:'Gender may be visible',
        19:'Vernix coating forming', 20:'Halfway point', 21:'Swallowing amniotic fluid',
        22:'Lips & eyebrows visible', 23:'Rapid brain growth', 24:'Lungs developing surfactant',
        25:'Responsive to sound', 26:'Eyes opening', 27:'Brain active during sleep',
        28:'Can dream (REM sleep)', 29:'Muscles & lungs maturing', 30:'Bone marrow making blood cells',
        31:'Rapid weight gain', 32:'Practicing breathing', 33:'Bones fully hardening',
        34:'Fingernails reach fingertips', 35:'Kidneys fully developed', 36:'Considered early term',
        37:'Full term approaching', 38:'Full term', 39:'Ready for birth', 40:'Due date',
        41:'Post-term', 42:'Late post-term'
    };
    return milestones[w] || '';
}

function getFetusWeightStr(weightG, fetusCount, fetusIndex) {
    
    const seeds = [1.00, 0.91, 1.08, 0.94, 1.05, 0.88, 1.12, 0.96];
    const variance = seeds[fetusIndex % seeds.length] || 1.0;
    
    const countScale = fetusCount === 1 ? 1.0 : fetusCount === 2 ? 0.85 : fetusCount === 3 ? 0.78 : fetusCount === 4 ? 0.72 : fetusCount <= 6 ? 0.65 : 0.58;
    const adj = weightG * countScale * variance;
    if (adj <= 0) return '< 1g';
    if (adj < 1000) return Math.round(adj) + 'g';
    return (adj / 1000).toFixed(2) + 'kg';
}

function getFetusLengthStr(lengthCm, fetusCount, fetusIndex) {
    const seeds = [1.00, 0.97, 1.03, 0.96, 1.02, 0.95, 1.04, 0.98];
    const variance = seeds[fetusIndex % seeds.length] || 1.0;
    const countScale = fetusCount === 1 ? 1.0 : fetusCount === 2 ? 0.94 : fetusCount === 3 ? 0.89 : fetusCount === 4 ? 0.85 : fetusCount <= 6 ? 0.81 : 0.77;
    const adj = lengthCm * countScale * variance;
    if (adj < 1) return Math.round(adj * 10) + 'mm';
    return adj.toFixed(1) + 'cm';
}

function detectFetusCountFromText(text) {
    if (!text) return 1;
    const t = text.toLowerCase();
    if (/octuplet/.test(t)) return 8;
    if (/septuplet/.test(t)) return 7;
    if (/sextuplet/.test(t)) return 6;
    if (/quintuplet|quint\b/.test(t)) return 5;
    if (/quadruplet|quad\b/.test(t)) return 4;
    if (/triplet/.test(t)) return 3;
    if (/\btwin[s]?\b/.test(t)) return 2;
    const nMatch = t.match(/(\d)\s*babies/);
    if (nMatch) return parseInt(nMatch[1]);
    return 1;
}

function createFetusesArray(count, existing = null) {
    return Array.from({length: count}, (_, i) =>
        (existing && existing[i]) ? existing[i] : { gender: 'unknown', nickname: '' }
    );
}


function getSeasonEmoji(month) {
    const emojis = ['\u2744\uFE0F','\u2744\uFE0F','\uD83C\uDF38','\uD83C\uDF38','\uD83C\uDF38','\u2600\uFE0F','\u2600\uFE0F','\u2600\uFE0F','\uD83C\uDF42','\uD83C\uDF42','\uD83C\uDF42','\u2744\uFE0F'];
    return emojis[(month - 1) % 12] || '\u2744\uFE0F';
}
    
function getGenderColor(gender) {
    if (gender === 'male') return '#60a5fa';
    if (gender === 'female') return '#f9a8d4';
    return '#888';
}

function getParasiteStageLabel(bot) {
    // 15 DAYS total, 5 stages �- 3 days each
    const days = getParasiteWeek(bot); // returns elapsed days 0-15
    const count = (bot.cycleData?.fetuses||[]).length || '?';
    if (days < 3)  return {
        stage: 'Implantation',  icon: decodeUnicode('\uD83D\uDC7D'),
        desc: 'Day ' + days + '/15 - ' + count + ' larvae burrowing in. Pelvic burning, low fever, waves of nausea. Nipples hypersensitive, breast ache. Body flushed with an inexplicable wrongness - and an unwanted arousal she cannot trace. She suspects illness, not what this really is.',
        syms: ['Pelvic burning & crawling sensation', 'Nausea worse than morning sickness', 'Low fever, unexplained warmth', 'Nipples hypersensitive, breast ache', 'Faint involuntary arousal (early aphrodisiac traces)', 'Dread - wrongness she cannot name'],
        color: '#a855f7', pct: Math.round((days/3)*100)
    };
    if (days < 6)  return {
        stage: 'Feeding Phase', icon: decodeUnicode('\uD83E\uDDA0'),
        desc: 'Day ' + days + '/15 - Ravenous hunger nothing satisfies. Dark veins spreading from abdomen. Breasts swollen and leaking thin iridescent fluid - not milk. Multiple larvae writhing in alien irregular patterns. Aphrodisiac secretion fully active: constantly flushed, slick, body betraying her against her will.',
        syms: ['Insatiable hunger (larvae consuming her intake)', 'Dark veins across lower abdomen', 'Breasts leaking iridescent non-milk fluid', 'Irregular alien writhing - probing, shifting', 'Constant involuntary arousal & wetness (aphrodisiac)', 'Nausea between hunger spikes, drugged feeling'],
        color: '#c084fc', pct: Math.round(((days-3)/3)*100)
    };
    if (days < 9)  return {
        stage: 'Rapid Growth',  icon: decodeUnicode('\uD83D\uDCA5'),
        desc: 'Day ' + days + '/15 - Abdomen visibly distending fast, skin drum-tight. Larvae clashing and coiling in chaotic uncoordinated patterns. Breasts engorged, leaking thick opalescent fluid (faintly luminescent). Peak aphrodisiac saturation - overwet, oversensitive, mind blurred, barely functional.',
        syms: ['Abdomen rapidly swelling, skin near-translucent at peak', 'Chaotic multi-larva writhing - clashing, coiling', 'Breasts leaking thick luminescent fluid constantly', 'Overwhelming involuntary heat & sensitivity', 'Difficulty breathing (diaphragm pressure)', 'Knows something is deeply wrong - terrified'],
        color: '#e879f9', pct: Math.round(((days-6)/3)*100)
    };
    if (days < 12) return {
        stage: 'Maturation',    icon: decodeUnicode('\u26A0\uFE0F'),
        desc: 'Day ' + days + '/15 - Synchronized alien pulses as larvae organize. Abdomen hard and asymmetric, shifting shape. Fluid leaking continuously, staining fabric. Mind fogged with aphrodisiac at peak. Every movement calculated and painful. Primal dread beneath everything - body knows what is coming.',
        syms: ['Synchronized alien pulses inside - larvae organizing', 'Abdomen hard, asymmetric, visibly shifting', 'Continuous luminescent leaking from breasts', 'Peak chemical fog - arousal constant and shameful', 'Every movement deliberate and agonizing', 'Primal dread - body anticipates emergence'],
        color: '#f97316', pct: Math.round(((days-9)/3)*100)
    };
    return {
        stage: 'EMERGENCE',     icon: decodeUnicode('\uD83D\uDEA8'),
        desc: 'Day ' + days + '/15 - All ' + count + ' larvae thrashing simultaneously. Alien violent contractions. Body burning, soaked, every nerve firing. Aphrodisiac flooded at maximum - the horror and the sensation grotesquely mixed. It is happening NOW.',
        syms: ['All larvae thrashing in unison', 'Alien violent contractions (not human labor)', 'Fever, soaked through, every nerve firing', 'Final aphrodisiac flood - horror and sensation mixed', 'Skin visibly moving from inside', 'No composure possible'],
        color: '#ef4444', pct: 100
    };
}

