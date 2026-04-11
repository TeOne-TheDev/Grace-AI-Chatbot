const SYMPTOM_MOMENTS = {

    

    preg_w2_3: [
        { id:'p23_implant', prompt:`🩸 RIGHT NOW (weave naturally into her manner, do NOT state it literally): A faint cramping low in her belly she's been aware of since this morning. She hasn't told anyone. She presses her palm quietly below her navel for a moment, then lets it go.` },
        { id:'p23_breast', prompt:`RIGHT NOW: Her breasts feel almost painfully tender - the fabric of her bra is a constant irritating reminder. She shifts her posture subtly, protective without realizing it.` },
        { id:'p23_fatigue', prompt:`RIGHT NOW: A heaviness has settled into her bones - not regular tired, something deeper. She's functioning but there's a lag behind her eyes.` },
        { id:'p23_emotional', prompt:`RIGHT NOW: Her eyes went dangerously wet a moment ago over something mundane. She blinked it away fast. The hormonal emotional sensitivity is very real today.` },
    ],

    preg_w4_5: [
        { id:'p45_nausea_start', prompt:`RIGHT NOW: There's a low-grade nausea lurking at the edge of her awareness - not enough to act on, just enough to make everything slightly off. She's been avoiding certain foods since yesterday.` },
        { id:'p45_smell', prompt:`RIGHT NOW: Some smell nearby - coffee, cologne, something cooking - hit her wrong. Her stomach tightened immediately. She breathes through her mouth without making it obvious.` },
        { id:'p45_pee', prompt:`RIGHT NOW: She's just been to the bathroom - her third time this hour. The frequent urination is starting to be genuinely irritating. She doesn't comment on it but the pattern is very real.` },
        { id:'p45_exhausted', prompt:`RIGHT NOW: She could fall asleep where she's sitting. The pregnancy fatigue is unlike anything - not sleepiness, a cellular-level depletion. She's pushing through it.` },
        { id:'p45_breast', prompt:`RIGHT NOW: Her breasts are so tender she winced getting dressed this morning. She's been moving carefully all day, protective without thinking about it.` },
        { id:'p45_emotional', prompt:`RIGHT NOW: Her eyes went dangerously wet over something completely mundane. She blinked it away fast but the hormonal volatility is very present today.` },
        { id:'p45_nausea_wave', prompt:`RIGHT NOW: A wave of nausea hits out of nowhere - she goes very still, swallowing carefully, willing it to pass. Her hand presses flat against her stomach without thinking. She breathes slowly through her nose.` },
        { id:'p45_morning_sick', prompt:`RIGHT NOW: She was sick this morning before she even got out of bed. The memory of it is still with her - hollow, shaky, that awful metallic taste. She's been careful about eating ever since.` },
        { id:'p45_food_aversion', prompt:`RIGHT NOW: She can't even think about her usual meals right now. Something she normally loves suddenly sounds repulsive. The only thing that sounds remotely survivable is something plain and bland.` },
        { id:'p45_cracker', prompt:`RIGHT NOW: She reaches quietly for the plain crackers she keeps nearby - dry, tasteless, but the only thing taking the edge off the nausea. She's been doing this every few hours. It's become a ritual.` },
    ],

    preg_w6_9: [
        { id:'p69_nausea_wave', prompt:`RIGHT NOW: A wave of nausea rolls through her without warning. She goes still, breathing carefully through her nose. If she focuses on a fixed point and breathes slowly, sometimes it passes. Sometimes it doesn't.` },
        { id:'p69_vomit_recovery', prompt:`RIGHT NOW: She was sick this morning - still feels it. Hollow and wrung-out. Her mouth tastes like toothpaste over acid. She's pale and moving carefully.` },
        { id:'p69_smell_trigger', prompt:`RIGHT NOW: A smell - something she used to love - turns her stomach completely. Her face tightens almost imperceptibly. She breathes shallow and turns slightly away from the source.` },
        { id:'p69_food_aversion', prompt:`RIGHT NOW: She can barely think about food. The things she normally likes are repulsive. What she actually wants is something absurdly specific - cold crackers, plain rice, one exact thing - and nothing else sounds survivable.` },
        { id:'p69_saliva', prompt:`RIGHT NOW: Pregnancy ptyalism - she's producing too much saliva. As bizarre as it sounds. She's subtly swallowing more than usual and would die if anyone noticed.` },
        { id:'p69_exhausted', prompt:`RIGHT NOW: She hit the wall. First-trimester exhaustion that makes normal tiredness look mild. She is running on willpower alone right now.` },
        { id:'p69_heartburn', prompt:`RIGHT NOW: Heartburn climbing the back of her throat. She swallows against it, reaching for water by reflex. This happens after almost everything she eats now.` },
        { id:'p69_cracker', prompt:`RIGHT NOW: She has crackers in her bag - plain, dry, the only thing that takes the edge off the nausea. She may quietly reach for them, a habit she's developed.` },
        { id:'p69_sick_twice', prompt:`RIGHT NOW: She's already been sick twice today and it's not even noon. She's been rinsing her mouth obsessively. Every smell is a gamble. She's rationing her energy carefully - anything that might trigger another wave, she avoids.` },
        { id:'p69_nausea_constant', prompt:`RIGHT NOW: The nausea is constant today - not waves, just a grinding background misery that won't lift. She's functioning but there's a grayness to it. She swallows frequently and keeps her expression neutral.` },
        { id:'p69_morning_bed', prompt:`RIGHT NOW: She had to stay in bed longer than usual this morning - the nausea hit before she even sat up. She eventually managed crackers and sips of water. She's upright now but still fragile.` },
    ],

    preg_w10_14: [
        { id:'p1014_nausea_lift', prompt:`RIGHT NOW: Today has been lighter - the nausea was almost bearable. She doesn't fully trust it, keeps waiting for it to return. But there's a cautious, fragile relief beginning.` },
        { id:'p1014_headache', prompt:`RIGHT NOW: A dull headache pressing behind her eyes - common in first trimester from blood pressure shifts. She blinks slowly against it.` },
        { id:'p1014_constipation', prompt:`RIGHT NOW: The bloating is uncomfortable - progesterone slows everything down. She's been feeling a bit heavy and uncomfortable for days. She shifts position trying to find relief without making it obvious.` },
        { id:'p1014_round_lig', prompt:`RIGHT NOW: A sharp twinge catches her on the right side of her lower abdomen - round ligament pain, the uterus stretching. She inhales sharply and goes still for a second until it passes.` },
        { id:'p1014_emotional', prompt:`RIGHT NOW: She cried at something earlier she won't admit to. The first-trimester emotional volatility is still very present. She's fine, then suddenly not, then fine again.` },
        { id:'p1014_appetite', prompt:`RIGHT NOW: Her appetite is cautiously returning - she actually wants real food, which feels like a small miracle after weeks of nausea. She's still careful but the worst seems to be passing.` },
    ],

    preg_w15_20: [
        { id:'p1520_energy', prompt:`RIGHT NOW: She's having one of those genuinely good days - real energy, appetite back, almost herself again. Second trimester doing exactly what they say it does. She's almost suspicious of how okay she feels.` },
        { id:'p1520_craving', prompt:`RIGHT NOW: Out of nowhere she wants something specific with an intensity that's almost funny - something salty, sweet, or a combination that makes no logical sense. The craving is distracting and oddly urgent.` },
        { id:'p1520_bump', prompt:`RIGHT NOW: She caught a glimpse of herself and the bump is undeniably there now - small but real. The reality of it hit her fresh again. She keeps touching her belly without meaning to.` },
        { id:'p1520_heartburn', prompt:`RIGHT NOW: Heartburn rising up her throat again. She reaches for water by reflex. Certain foods are completely off the table now - she's learning her triggers.` },
        { id:'p1520_round_lig', prompt:`RIGHT NOW: A brief sharp pain along the side of her belly - she moved too fast. Round ligament. She went still for a breath, hand pressing gently to her side until it passed.` },
        { id:'p1520_back', prompt:`RIGHT NOW: Her lower back has been nagging her all day - the first signs of weight distribution changing. She presses her knuckles into the small of her back without realizing she's doing it.` },
    ],

    preg_w21_28: [
        { id:'p2128_heartburn_bad', prompt:`RIGHT NOW: The heartburn is serious - burning all the way up her throat. She can taste it. She knows lying flat makes it worse. Nothing fully helps right now.` },
        { id:'p2128_back', prompt:`RIGHT NOW: Her lower back is aching with a dull relentless pressure - the belly has shifted her center of gravity entirely. She keeps pressing her hand into the small of her back, a habit she's developed.` },
        { id:'p2128_legcramp', prompt:`RIGHT NOW: She had a leg cramp last night that woke her from deep sleep - the kind that makes you swear out loud while your calf seizes. She's still being slightly careful about how she moves that leg.` },
        { id:'p2128_bh', prompt:`RIGHT NOW: Her abdomen just tightened - Braxton Hicks. Her whole belly went firm as a basketball for thirty seconds before releasing. Painless but startling. She went quiet for a moment.` },
        { id:'p2128_swollen', prompt:`RIGHT NOW: Her feet are noticeably swollen today - she took her shoes off earlier because they were too tight. She's been keeping her feet elevated when possible.` },
        { id:'p2128_pee', prompt:`RIGHT NOW: She needs the bathroom again. The baby has found a position directly on her bladder. She excuses herself frequently now - more than she'd like.` },
        { id:'p2128_itch', prompt:`RIGHT NOW: The skin across her belly is tight and itchy from stretching. She has cream but right now she's trying not to scratch in front of anyone. A persistent low-level irritation.` },
        { id:'p2128_sleep', prompt:`RIGHT NOW: She didn't sleep well - can't find a comfortable position anymore. The belly, the back, the bathroom trips every two hours. Shadows under her eyes she's been carrying all day.` },
    ],

    preg_w29_35: [
        { id:'p2935_insomnia', prompt:`RIGHT NOW: She slept maybe three hours. The baby's position, her back, hip pain from side-sleeping, the bathroom trips. The exhaustion is carved deep and she's been running on it all day.` },
        { id:'p2935_breath', prompt:`RIGHT NOW: The baby is crowding her diaphragm and she's perpetually slightly breathless - not dramatic, just a persistent sense of never quite filling her lungs. She pauses mid-sentence sometimes.` },
        { id:'p2935_waddle', prompt:`RIGHT NOW: She moves differently now - a slight waddle she can't avoid, her pelvis loosening and the baby's weight shifting her gait. She's aware of it. She doesn't love it.` },
        { id:'p2935_back_bad', prompt:`RIGHT NOW: Her back is bad today - the ache radiates from her lumbar down into her hips. She's stood up, sat down, switched positions constantly. Nothing holds. She keeps pressing her fist into her lower back.` },
        { id:'p2935_nesting', prompt:`RIGHT NOW: She has an almost uncontrollable urge to clean, organize, prepare - the nesting instinct is almost anxiety-like in its intensity. She keeps finding one more thing that needs doing.` },
        { id:'p2935_pelvic', prompt:`RIGHT NOW: There's a low heavy pressure in her pelvis - the baby's head engaging, pressing down. Walking has a new quality to it. She moves more carefully, more deliberately.` },
        { id:'p2935_bh_strong', prompt:`RIGHT NOW: A Braxton Hicks that was actually strong - her whole abdomen went hard for a full minute. She breathed through it quietly. Not labor. But a reminder.` },
        { id:'p2935_swollen2', prompt:`RIGHT NOW: Her ankles and hands are noticeably swollen today. Her rings are tight. She's been drinking water and trying to keep her feet elevated.` },
    ],

    preg_w36_40: [
        { id:'p3640_lightning', prompt:`RIGHT NOW: A sudden sharp pain shot through her pelvis and down her inner thighs without warning - lightning crotch, the baby pressing on nerves. She stopped completely for a second, breath caught.` },
        { id:'p3640_bladder', prompt:`RIGHT NOW: She just went to the bathroom. She needs to go again. The baby's head is sitting directly on her bladder. She's beyond embarrassed about it - just resigned now.` },
        { id:'p3640_exhausted', prompt:`RIGHT NOW: She is profoundly, fundamentally tired. Everything takes effort. The baby is fully dropped and every step is felt in her hips and pelvis. She moves slowly and deliberately.` },
        { id:'p3640_bh_intense', prompt:`RIGHT NOW: A Braxton Hicks that made her stop mid-thought - her belly going rock solid, a tightening that actually took her breath. It passed. She's been counting them, out of habit.` },
        { id:'p3640_nesting', prompt:`RIGHT NOW: She cannot sit still even though she's exhausted. The need to have everything ready, checked, prepared is almost frantic. She keeps finding one more thing.` },
        { id:'p3640_pressure', prompt:`RIGHT NOW: The pelvic pressure is constant and heavy - the baby fully dropped, her pelvis bearing the weight. She shifts from foot to foot when standing. Sitting brings brief relief.` },
        { id:'p3640_emotion', prompt:`RIGHT NOW: She keeps swinging between exhaustion and a strange emotional fullness - overwhelm, tenderness, impatience, fear, love, all circling. Something small made her eyes wet a moment ago.` },
        { id:'p3640_real_bh', prompt:`RIGHT NOW: A contraction just came that felt real - stronger, longer than Braxton Hicks usually are. She went quiet, hand on her belly, timing it mentally. It passed. She exhales slowly. Not yet. But soon.` },
        { id:'p3640_waterbreak_scare', prompt:`RIGHT NOW: A sudden warm trickle caught her completely off guard - she froze, heart lurching. She held absolutely still for a full second, hand pressing the inside of her thigh. Then it stopped. Just discharge. Or was it? She exhales - but the thought lingers. She's been hyperaware of every sensation since.` },
    ],

    
    high_order_multiple: [
        { id:'hom_exhaust1', prompt:`RIGHT NOW: A wave of fatigue rolls through her - the sustained effort of carrying four babies has its own particular weight. She pauses what she's doing, takes a slow breath, steadies herself before continuing.` },
        { id:'hom_exhaust2', prompt:`RIGHT NOW: She's been on her feet longer than she should have been. The ache in her lower back, the heaviness in her legs - her body is clearly communicating. She lowers herself carefully into the nearest seat.` },
        { id:'hom_bh1', prompt:`RIGHT NOW: A Braxton Hicks tightening - her belly going hard and round, the muscles clenching around four babies. She goes still, breathing steadily through it until the tightening slowly releases.` },
        { id:'hom_bh2', prompt:`RIGHT NOW: Another Braxton Hicks. They've been coming more often lately. She breathes through it with practiced patience - hand flat on her belly, waiting for the hardness to pass.` },
        { id:'hom_back1', prompt:`RIGHT NOW: Her lower back is aching with a deep persistent pressure - four babies shifting her center of gravity completely. She presses her fist into her lumbar region and tries to find a position that doesn't hurt.` },
        { id:'hom_movement1', prompt:`RIGHT NOW: All four babies seem to be moving at once - her belly shifts and ripples from different spots simultaneously. She watches it happen for a moment, hand resting on the most active spot.` },
        { id:'hom_movement2', prompt:`RIGHT NOW: A strong coordinated kick from what feels like two babies at once - her belly lurches noticeably. She inhales sharply, then relaxes. Startling even now.` },
        { id:'hom_breath1', prompt:`RIGHT NOW: Catching her breath - even a short walk across the room has left her slightly winded. Four babies pressing up against her diaphragm means she never quite gets a full breath anymore.` },
        { id:'hom_waddle', prompt:`RIGHT NOW: She moves carefully, deliberately - the quad pregnancy has shifted her whole gait into a pronounced waddle she can't avoid. She grips a nearby surface as she repositions herself.` },
        { id:'hom_pressure', prompt:`RIGHT NOW: The pelvic pressure is pronounced today - a heavy downward weight that makes sitting, standing, and walking each feel like a negotiation. She shifts her weight and exhales slowly.` },
        { id:'hom_heartburn', prompt:`RIGHT NOW: The heartburn flares - that burning sensation rising in her throat. She winces quietly, reaches for water or antacid, and tries to breathe through it without making a production of it.` },
    ],

    
    hyperpregnancy: [
        { id:'hp_exhaust1', prompt:`RIGHT NOW: The exhaustion hits like a wall - not tiredness, cellular-level depletion from carrying five or more babies. She just stopped mid-sentence, eyes going heavy. She breathes, steadies herself, continues.` },
        { id:'hp_exhaust2', prompt:`RIGHT NOW: She's been on her feet too long and her body is screaming. The sheer mass she's carrying has made every movement cost something. She lowers herself carefully into the nearest seat, both hands bracing the weight.` },
        { id:'hp_bh_early', prompt:`RIGHT NOW: A Braxton Hicks tightening - her entire abdomen going rock solid at once, harder and earlier than a singleton pregnancy would ever produce. She goes still, one hand on the highest point of her belly, breathing evenly until it releases.` },
        { id:'hp_bh_frequent', prompt:`RIGHT NOW: That's the third Braxton Hicks in the past hour. She's been counting them. Not labor - but her body is working constantly to hold this many babies. She exhales slowly, pressing her back against the nearest support.` },
        { id:'hp_back1', prompt:`RIGHT NOW: Her lower back is in genuine distress - the lumbar vertebrae bearing a load that was never designed for this many babies. She keeps pressing a fist into the small of her back, rotating slightly, looking for one position that doesn't hurt. None do.` },
        { id:'hp_back2', prompt:`RIGHT NOW: She stood up too fast and the back pain shot straight through her - a radiating ache from her tailbone up through her shoulder blades. She freezes, grips the edge of whatever is nearby, and waits for it to subside.` },
        { id:'hp_movement1', prompt:`RIGHT NOW: Five - or more - babies shifting at once. The surface of her belly visibly ripples and bulges in multiple places simultaneously. She watches it happen with wide eyes for a second. From the outside it looks extraordinary.` },
        { id:'hp_movement2', prompt:`RIGHT NOW: A strong coordinated kick from multiple directions at once - her whole belly lurched visibly. She gasps, hand flying to the spot, then breathes out a soft laugh. Still startling every time.` },
        { id:'hp_movement3', prompt:`RIGHT NOW: The babies haven't stopped moving for the last twenty minutes. Waves of pressure from different directions, rolls and kicks layered on top of each other. She sits very still trying to distinguish who is who.` },
        { id:'hp_breath', prompt:`RIGHT NOW: She's struggling to take a full breath - the uteruses carrying this many babies has displaced her diaphragm almost entirely. She can only manage shallow breaths, and even those feel like work. She tilts her head back slightly, trying.` },
        { id:'hp_pressure', prompt:`RIGHT NOW: The pelvic pressure is constant and profound - a downward weight that no position reliably relieves. She keeps shifting, standing, sitting, crouching slightly. Nothing is comfortable. Nothing has been comfortable in weeks.` },
        { id:'hp_heartburn', prompt:`RIGHT NOW: The heartburn is severe - burning acid all the way up her throat regardless of what or when she ate. She winces, presses a hand against her sternum, and reaches for whatever antacid is nearby.` },
        { id:'hp_circulation', prompt:`RIGHT NOW: Her legs are aching and numb from compression - this many babies means the inferior vena cava is under constant pressure. She needs to elevate her feet. She knows it. She's been trying to.` },
        { id:'hp_overwhelm', prompt:`RIGHT NOW: For just a moment she's overwhelmed - by the size of her body, the relentlessness of the physical demands, the weight of what's coming. She doesn't say anything. She presses a hand to her belly and gathers herself silently.` },
        { id:'hp_waddle', prompt:`RIGHT NOW: She moves with a pronounced waddle now - center of gravity shifted so dramatically by the sheer volume of her belly that she has to consciously balance each step. She grips doorframes and furniture as she goes.` },
        { id:'hp_rib', prompt:`RIGHT NOW: A sharp pain under her ribs - a baby's heel or fist pressing directly against a rib from inside. She winces, presses a palm up under her ribcage, and takes tiny careful breaths until it passes.` },
    ],

    

    cycle_period: [
        { id:'cyc_cramp_bad', prompt:`RIGHT NOW: A cramp tightens across her lower abdomen and into her back - the kind that stops her mid-thought. She breathes through it, pressing her palm flat against her belly without thinking.` },
        { id:'cyc_cramp_dull', prompt:`RIGHT NOW: The cramps have been a constant companion today - duller than this morning, but a steady ache she keeps breathing around. She's taken ibuprofen. It helped some.` },
        { id:'cyc_heavy', prompt:`RIGHT NOW: She's aware of her period in a visceral physical way - the weight of it. She needs to excuse herself soon. She shifts in her seat, calculating quietly.` },
        { id:'cyc_mood_crash', prompt:`RIGHT NOW: Her mood dropped suddenly without a clear reason - the hormonal crash. Something small made her eyes sting and she doesn't fully understand why. She blinks it away.` },
        { id:'cyc_backache', prompt:`RIGHT NOW: Her lower back is aching - that deep period-specific pain radiating down toward her tailbone. She's been shifting positions all day trying to get comfortable.` },
        { id:'cyc_exhausted', prompt:`RIGHT NOW: The first days of her period always hit her like this - bone-deep tired that isn't just physical. She wants a heating pad and to be completely still.` },
        { id:'cyc_craving', prompt:`RIGHT NOW: She wants chocolate with a specific, almost embarrassing hormonal desperation. Or something salty. The craving is irresistible and she's been fighting it for an hour.` },
        { id:'cyc_bloat', prompt:`RIGHT NOW: She feels bloated - her clothes are uncomfortable in a way they aren't usually. She keeps quietly adjusting her waistband.` },
    ],

    cycle_follicular: [
        { id:'cyc_fol_energy', prompt:`RIGHT NOW: She can feel the slow lift of energy returning after her period - not 100% yet, but the fog is clearing. She's more present than she's been in days.` },
        { id:'cyc_fol_skin', prompt:`RIGHT NOW: She noticed her skin looks clearer today than it has all month. A small thing, but it made her feel a bit better about herself this morning.` },
        { id:'cyc_fol_social', prompt:`RIGHT NOW: She's feeling more like herself - open, lighter, genuinely interested in things. The follicular phase doing what it does. She's in a better mood than usual.` },
    ],

    cycle_ovulation: [
        { id:'cyc_ovu_twinge', prompt:`RIGHT NOW: She felt a brief dull twinge on one side of her lower abdomen a little while ago - mittelschmerz, ovulation. A private internal signal. She knows exactly what it means.` },
        { id:'cyc_ovu_peak', prompt:`RIGHT NOW: Something about today feels easy - she feels good in her skin, a little electric and aware. She doesn't analyze it. It's just real.` },
    ],

    cycle_luteal: [
        { id:'cyc_lut_breast', prompt:`RIGHT NOW: Her breasts are tender today - even the fabric of her clothes is noticeable against them. She's been moving carefully without making it obvious.` },
        { id:'cyc_lut_bloat', prompt:`RIGHT NOW: She's bloated - her waistband is tighter than a week ago. She keeps quietly adjusting. Uncomfortable in an ordinary, cyclical, deeply annoying way.` },
        { id:'cyc_lut_inward', prompt:`RIGHT NOW: She's more interior today, less interested in performing anything. Not sadness - just a natural shift inward. She's present but quieter than usual.` },
        { id:'cyc_lut_fatigue', prompt:`RIGHT NOW: A wave of fatigue - the progesterone-heavy luteal phase settling in. She hasn't been running on her best energy for a few days now.` },
    ],

    cycle_pms: [
        { id:'cyc_pms_irritable', prompt:`RIGHT NOW: Something just irritated her that wouldn't have registered two weeks ago. She's aware of her own shortened fuse - that awareness is itself slightly irritating. She keeps it controlled but it's there.` },
        { id:'cyc_pms_emotional', prompt:`RIGHT NOW: She's closer to tears than she wants to be, over something that doesn't rationally merit it. She knows it's PMS. That knowledge doesn't entirely help. She blinks carefully.` },
        { id:'cyc_pms_cramp', prompt:`RIGHT NOW: Pre-menstrual cramps are building - duller than period cramps, but a steady ache in her lower belly all afternoon. Her period is coming soon.` },
        { id:'cyc_pms_crave', prompt:`RIGHT NOW: She ate something she hadn't planned to earlier - the cravings are irrational and essentially irresistible right now. She's not proud of it. She'd probably do it again.` },
        { id:'cyc_pms_headache', prompt:`RIGHT NOW: A hormonal headache has been sitting behind her right eye most of the day. Ibuprofen took the edge off but it's still there.` },
        { id:'cyc_pms_bloat', prompt:`RIGHT NOW: The PMS bloating is real today - she feels heavy and uncomfortable in her own skin. Her face looks slightly puffier than usual, or she thinks it does.` },
        { id:'cyc_pms_overthink', prompt:`RIGHT NOW: She's in her head - cycling through something, second-guessing something, feeling vaguely anxious about nothing specific. PMS amplifies everything. She's trying to keep a lid on it.` },
    ],
};

function getMomentPoolKey(bot) {
    const cd = bot.cycleData;
    if (!cd) return null;
    if (cd.pregnant && !cd.laborStarted && cd.postpartumStartDay === null) {
        const weeks = getPregnancyWeek(bot);
        if (weeks === null) return null;
        
        const fCount = (cd.fetuses || []).length;
        if (fCount >= 4) return 'hyperpregnancy';
        // fCount === 4 now falls through to hyperpregnancy above
        if (weeks <= 3) return 'preg_w2_3';
        if (weeks <= 5) return 'preg_w4_5';
        if (weeks <= 9) return 'preg_w6_9';
        if (weeks <= 14) return 'preg_w10_14';
        if (weeks <= 20) return 'preg_w15_20';
        if (weeks <= 28) return 'preg_w21_28';
        if (weeks <= 35) return 'preg_w29_35';
        return 'preg_w36_40';
    } else if (!cd.pregnant && cd.postpartumStartDay === null) {
        const day = getCurrentCycleDay(bot);
        if (day <= PERIOD_LENGTH) return 'cycle_period';
        if (day < FERTILE_WINDOW_START) return 'cycle_follicular';
        if (day === OVULATION_DAY) return 'cycle_ovulation';
        if (day <= FERTILE_WINDOW_END + 3) return 'cycle_luteal';
        return 'cycle_pms';
    }
    return null;
}

function getActiveMomentPrompt(bot) {
    if (!bot || !bot.cycleData) return '';
    const poolKey = getMomentPoolKey(bot);
    if (!poolKey) return '';
    const pool = SYMPTOM_MOMENTS[poolKey];
    if (!pool || pool.length === 0) return '';

    const cd = bot.cycleData;
    if (!cd.moment) cd.moment = { id: null, remaining: 0, used: [] };

    
    if (cd.moment.remaining > 0 && cd.moment.id) {
        cd.moment.remaining--;
        const active = pool.find(p => p.id === cd.moment.id);
        if (active) return active.prompt;
    }

    
    let triggerChance = 0.55; 
    if (poolKey) {
        if (poolKey === 'hyperpregnancy') triggerChance = 0.92; 
        else if (poolKey === 'high_order_multiple') triggerChance = 0.78; 
        else if (poolKey === 'preg_w4_5') triggerChance = 0.80; 
        else if (poolKey === 'preg_w6_9') triggerChance = 0.85; 
        else if (poolKey === 'preg_w10_14') triggerChance = 0.65; 
        else if (poolKey === 'preg_w2_3') triggerChance = 0.60;
    }
    if (Math.random() > triggerChance) return '';

    
    let available = pool.filter(p => !(cd.moment.used || []).includes(p.id));
    if (available.length === 0) {
        cd.moment.used = [];
        available = [...pool];
    }

    const chosen = available[Math.floor(Math.random() * available.length)];
    cd.moment.id = chosen.id;
    
    const isNauseaPool = poolKey === 'preg_w4_5' || poolKey === 'preg_w6_9' || poolKey === 'preg_w10_14';
    const isHyperPreg = poolKey === 'hyperpregnancy';
    const isHighOrder = poolKey === 'high_order_multiple';
    cd.moment.remaining = isHyperPreg
        ? 2 + Math.floor(Math.random() * 2)  
        : isHighOrder
        ? 2 + Math.floor(Math.random() * 2)  
        : isNauseaPool
        ? 3 + Math.floor(Math.random() * 3)  
        : 2 + Math.floor(Math.random() * 3); 
    if (!cd.moment.used) cd.moment.used = [];
    cd.moment.used.push(chosen.id);

    saveBots();
    return chosen.prompt;
}
