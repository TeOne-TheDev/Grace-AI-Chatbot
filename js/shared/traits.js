// ─────────────────────────────────────────────────────────────────────────────
// traits.js  — Trait & State system (extracted from shared.js)
// Depends on: shared.js (bots, curId, escapeHTML, saveBots, getNextGroqKey,
//             getCharContext, callLlama, getCultureHintFromFields, getLang,
//             logError, diceSpin, setDiceLoading, getVirtualDay)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_PERSONALITY_TRAITS = 10;
const MAX_GENETIC_TRAITS = 10;


// ── Character States - temporary/biological conditions separate from personality traits ──
// States can be toggled on/off and are displayed as tags in the Bio panel
// State types:
//   'system'  - set by code events (birth, pregnancy milestones) - never random
//   'random'  - program rolls periodically; prob = chance per virtual day (0–1)
//   'ai'      - detected from chat history by AI after each exchange
//   'manual'  - user-controlled only
const ALL_STATES = [
   // ── SYSTEM states ─────────────────────────────────────────────────────────
   {id:'virgin',            label:'Virgin',             icon:'\uD83C\uDF38', type:'system', desc:'Has never been intimate - pure and inexperienced', color:'#f9a8d4', bg:'#3d0a20'},
   {id:'lactating',         label:'Lactating',          icon:'\uD83C\uDF7C', type:'system', desc:'Currently producing milk - breasts sensitive and may leak', color:'#fcd34d', bg:'#2a1800'},
   {id:'postpartum',        label:'Postpartum',         icon:'\uD83E\uDD31', type:'system', desc:'Recovering after childbirth - hormonal changes, bonding with newborn', color:'#86efac', bg:'#052e16'},
   {id:'nursing',           label:'Nursing',            icon:'\uD83D\uDC76', type:'system', desc:'Actively breastfeeding infant - schedule and energy affected', color:'#67e8f9', bg:'#0c1a2e'},
   {id:'heat_mode',         label:'In Heat',            icon:'\uD83D\uDD25', type:'system', desc:'Overwhelmed by primal biological urge for intimacy', color:'#f87171', bg:'#2d0808'},
   {id:'pregnancy_craving', label:'Pregnancy Craving',  icon:'\uD83E\uDD30', type:'system', desc:'Deeply fixated on bearing children - aroused by the thought', color:'#c084fc', bg:'#1a0028'},

   // ── Pregnancy-specific states ──────────────────────────────────────────────
   {id:'morning_sickness',  label:'Morning Sickness',   icon:'🤢', type:'system', desc:'Nausea and vomiting, especially in mornings - food aversions, fatigue', color:'#fbbf24', bg:'#1c1000'},
   {id:'breast_tenderness', label:'Breast Tenderness',  icon:'😣', type:'system', desc:'Breasts swollen and sore - sensitive to touch, needs supportive bra', color:'#f472b6', bg:'#2d0020'},
   {id:'fetal_movement',    label:'Fetal Movement',     icon:'👶', type:'system', desc:'Can feel baby moving inside - kicks, rolls, heartwarming but sometimes uncomfortable', color:'#86efac', bg:'#052e16'},
   {id:'nesting_instinct',  label:'Nesting Instinct',   icon:'🏠', type:'system', desc:'Strong urge to prepare home for baby - cleaning, organizing, decorating', color:'#a78bfa', bg:'#1a0b2e'},
   {id:'back_pain',         label:'Back Pain',          icon:'💔', type:'system', desc:'Lower back aching from pregnancy weight - needs support, rest', color:'#fb923c', bg:'#1c0a00'},
   {id:'swelling',          label:'Swelling',           icon:'🦵', type:'system', desc:'Feet and ankles swollen - uncomfortable walking, needs elevation', color:'#67e8f9', bg:'#0c1a2e'},
   {id:'food_cravings',     label:'Food Cravings',      icon:'🍪', type:'system', desc:'Intense cravings for specific foods - may eat unusual combinations', color:'#f9a8d4', bg:'#2d0a20'},
   {id:'mood_swings',       label:'Mood Swings',        icon:'😵‍💫', type:'system', desc:'Emotional highs and lows - hormonal fluctuations affect mood', color:'#c084fc', bg:'#1a0b2e'},

   // ── Monster pregnancy states ───────────────────────────────────────────────
   {id:'monster_dread',     label:'Monster Dread',      icon:'👹', type:'system', desc:'Deep fear and unease about what grows inside - something feels wrong', color:'#dc2626', bg:'#3d0808'},
   {id:'unnatural_hunger',  label:'Unnatural Hunger',   icon:'🦹', type:'system', desc:'Insatiable cravings that nothing satisfies - the creature demands more', color:'#7c2d12', bg:'#1c0800'},
   {id:'body_distortion',   label:'Body Distortion',    icon:'👻', type:'system', desc:'Body changing in unnatural ways - movements, shapes that defy biology', color:'#9333ea', bg:'#1a0028'},

   // ── Parasite pregnancy states ──────────────────────────────────────────────
   {id:'parasite_arousal',  label:'Parasite Arousal',   icon:'🧟', type:'system', desc:'Chemical arousal from parasites - body responds against will', color:'#ec4899', bg:'#2d0820'},
   {id:'crawling_sensation',label:'Crawling Sensation', icon:'🐛', type:'system', desc:'Constant feeling of movement beneath skin - parasites burrowing', color:'#65a30d', bg:'#0a1a00'},
   {id:'host_fever',        label:'Host Fever',         icon:'🌡️', type:'system', desc:'Low-grade fever from parasitic infection - body fighting invasion', color:'#f97316', bg:'#1c0800'},

  // ── RANDOM states - rolled by program periodically ────────────────────────
  {id:'hungry',            label:'Hungry',             icon:'\uD83C\uDF7D\uFE0F', type:'random', prob:0.08, maxDays:0.3, desc:'Stomach growling - needs food, energy and focus dropping', color:'#fbbf24', bg:'#1c1000'},
  {id:'thirsty',           label:'Thirsty',            icon:'\uD83D\uDCA7', type:'random', prob:0.07, maxDays:0.2, desc:'Mouth dry - craving water, mildly irritable', color:'#67e8f9', bg:'#0c1a2e'},
  {id:'tired',             label:'Tired',              icon:'\uD83D\uDE34', type:'random', prob:0.10, maxDays:0.5, desc:'Low energy - yawning, slower reactions, needs rest', color:'#a78bfa', bg:'#1a0b2e'},
  {id:'sick',              label:'Sick',               icon:'\uD83E\uDD12', type:'random', prob:0.03, maxDays:3,   desc:'Under the weather - runny nose, aches, reduced energy', color:'#fca5a5', bg:'#2d0808'},
  {id:'feverish',          label:'Feverish',           icon:'\uD83C\uDF21\uFE0F', type:'random', prob:0.015,maxDays:2,   desc:'High fever - confusion, flushed skin, needs rest urgently', color:'#f87171', bg:'#3d0808'},
  {id:'sore',              label:'Sore / Achy',        icon:'\uD83D\uDCA2', type:'random', prob:0.05, maxDays:1,   desc:'Body aching - muscles sore, movement uncomfortable', color:'#fb923c', bg:'#1c0800'},
  {id:'bloated',           label:'Bloated',            icon:'\uD83D\uDE23', type:'random', prob:0.06, maxDays:0.5, desc:'Stomach uncomfortable, feels sluggish and full', color:'#d4d4d4', bg:'#1a1a1a'},
  {id:'headache',          label:'Headache',           icon:'\uD83E\uDD15', type:'random', prob:0.06, maxDays:0.3, desc:'Head throbbing - sensitive to light and noise', color:'#fca5a5', bg:'#2a0808'},
  {id:'restless',          label:'Restless',           icon:'\uD83D\uDE24', type:'random', prob:0.07, maxDays:0.5, desc:'Pent-up energy, cannot stay still, needs stimulation', color:'#fde68a', bg:'#1c1000'},
  {id:'horny',             label:'Aroused',            icon:'\uD83C\uDF36\uFE0F', type:'random', prob:0.09, maxDays:0.3, desc:'Heightened physical desire - distracted, warm, reactive', color:'#f472b6', bg:'#2d0020'},

  // ── AI-inferred states - detected from chat history ──────────────────────
  {id:'grieving',          label:'Grieving',           icon:'\uD83D\uDDA4', type:'ai', desc:'Processing significant loss - heavy, withdrawn', color:'#94a3b8', bg:'#0f172a'},
  {id:'heartbroken',       label:'Heartbroken',        icon:'\uD83D\uDC94', type:'ai', desc:'Suffering from emotional heartbreak', color:'#f9a8d4', bg:'#2d0820'},
  {id:'euphoric',          label:'Euphoric',           icon:'\uD83C\uDF1F', type:'ai', desc:'In a state of intense happiness or elation', color:'#fde68a', bg:'#1c1400'},
  {id:'bonded',            label:'Deeply Bonded',      icon:'\uD83D\uDC9E', type:'ai', desc:'Has formed an unusually deep emotional connection with the user', color:'#f9a8d4', bg:'#2d0820'},
  {id:'anxious_state',     label:'Anxious',            icon:'\uD83D\uDE30', type:'ai', desc:'Currently on edge - overthinking, tense, unsettled', color:'#fde68a', bg:'#1c1400'},
  {id:'angry',             label:'Angry',              icon:'\uD83D\uDE20', type:'ai', desc:'Simmering or openly furious - short fuse, blunt', color:'#f87171', bg:'#3d0808'},
  {id:'sad',               label:'Sad',                icon:'\uD83D\uDE22', type:'ai', desc:'Low mood - quiet, introspective, vulnerable', color:'#93c5fd', bg:'#0c1a2e'},
  {id:'jealous_state',     label:'Jealous',            icon:'\uD83D\uDE12', type:'ai', desc:'Feeling threatened or left out - watchful, possessive', color:'#a3e635', bg:'#0a1a00'},
  {id:'embarrassed',       label:'Embarrassed',        icon:'\uD83D\uDE33', type:'ai', desc:'Flushed and self-conscious - avoiding eye contact', color:'#f9a8d4', bg:'#2d0a20'},
  {id:'nostalgic',         label:'Nostalgic',          icon:'\uD83C\uDF19', type:'ai', desc:'Lost in warm memories - distant, wistful', color:'#c4b5fd', bg:'#1a0b2e'},
  {id:'hopeful',           label:'Hopeful',            icon:'\uD83C\uDF05', type:'ai', desc:'Looking forward to something - lighter, open', color:'#86efac', bg:'#052e16'},
  {id:'conflicted',        label:'Conflicted',         icon:'\uD83D\uDE16', type:'ai', desc:'Torn between feelings - indecisive, uneasy', color:'#fbbf24', bg:'#1c1000'},

   // ── MOOD states - automatically set based on conditions ─────────────────
   {id:'content',           label:'Content',            icon:'😌', type:'system', desc:'Feeling satisfied and at peace - relaxed and happy', color:'#86efac', bg:'#052e16'},
   {id:'happy',             label:'Happy',              icon:'😊', type:'system', desc:'Feeling joyful and positive - smiling, upbeat energy', color:'#fde68a', bg:'#1c1400'},
   {id:'excited',           label:'Excited',           icon:'🤩', type:'system', desc:'Energetic and enthusiastic - bubbly and engaged', color:'#fbbf24', bg:'#1c1400'},
   {id:'relaxed',           label:'Relaxed',           icon:'😌', type:'system', desc:'Calm and at ease - no stress, comfortable', color:'#67e8f9', bg:'#0c1a2e'},
   {id:'satisfied',         label:'Satisfied',         icon:'😋', type:'system', desc:'Feeling fulfilled and pleased - content with current state', color:'#a78bfa', bg:'#1a0b2e'},
   {id:'playful',           label:'Playful',           icon:'😄', type:'system', desc:'Lighthearted and fun-loving - joking, teasing', color:'#f9a8d4', bg:'#2d0a20'},

   {id:'irritable',         label:'Irritable',          icon:'😤', type:'system', desc:'Easily annoyed and short-tempered - snappy responses', color:'#fb923c', bg:'#1c0a00'},
   {id:'frustrated',        label:'Frustrated',         icon:'😣', type:'system', desc:'Feeling blocked and annoyed - tense, complaining', color:'#f87171', bg:'#2d0808'},
   {id:'annoyed',           label:'Annoyed',            icon:'🙄', type:'system', desc:'Mildly bothered - rolling eyes, sarcastic', color:'#d4d4d4', bg:'#1a1a1a'},
   {id:'grumpy',            label:'Grumpy',             icon:'😠', type:'system', desc:'Bad-tempered and complaining - grouchy attitude', color:'#ef4444', bg:'#3d0808'},

   {id:'worried',           label:'Worried',            icon:'😟', type:'system', desc:'Anxious and concerned - fretting about things', color:'#fbbf24', bg:'#1c1000'},
   {id:'stressed',          label:'Stressed',           icon:'😰', type:'system', desc:'Overwhelmed and tense - high anxiety', color:'#f87171', bg:'#2d0808'},
   {id:'overwhelmed',       label:'Overwhelmed',       icon:'😵', type:'system', desc:'Feeling crushed by too much - mentally exhausted', color:'#a1a1aa', bg:'#27272a'},

   {id:'lonely',            label:'Lonely',             icon:'😢', type:'system', desc:'Feeling isolated and longing for connection', color:'#93c5fd', bg:'#0c1a2e'},
   {id:'bored',             label:'Bored',              icon:'🥱', type:'system', desc:'Uninterested and restless - seeking stimulation', color:'#d4d4d4', bg:'#1a1a1a'},
   {id:'disappointed',      label:'Disappointed',       icon:'😞', type:'system', desc:'Let down and disheartened - mood dampened', color:'#64748b', bg:'#0f172a'},

   {id:'flirty',            label:'Flirty',             icon:'😉', type:'system', desc:'Playfully romantic - teasing, suggestive', color:'#f472b6', bg:'#2d0020'},
   {id:'affectionate',      label:'Affectionate',       icon:'🥰', type:'system', desc:'Warm and loving - cuddly, demonstrative', color:'#f9a8d4', bg:'#2d0a20'},
   {id:'romantic',          label:'Romantic',           icon:'💕', type:'system', desc:'Dreamy and loving - poetic, sentimental', color:'#ec4899', bg:'#2d0820'},

   // ── MANUAL states - user-controlled ──────────────────────────────────────
   {id:'touch_starved',     label:'Touch Starved',      icon:'\uD83E\uDDF2', type:'manual', desc:'Craves physical contact desperately', color:'#a78bfa', bg:'#1a0b2e'},
   {id:'sex_craving',       label:'Intimacy Craving',   icon:'\uD83D\uDC8B', type:'manual', desc:'Driven by insatiable craving for physical intimacy', color:'#f472b6', bg:'#2d0020'},
   {id:'sub_arousal',       label:'Submission Arousal', icon:'\uD83D\uDD17', type:'manual', desc:'Deeply aroused when dominated or controlled', color:'#818cf8', bg:'#0f0a2e'},
   {id:'voyeur',            label:'Voyeuristic',        icon:'\uD83D\uDC41\uFE0F', type:'manual', desc:'Aroused by watching others in intimate moments', color:'#6ee7b7', bg:'#052e16'},
   {id:'exhibitionist',     label:'Exhibitionist',      icon:'\u2728', type:'manual', desc:'Thrives on being watched - craves attention on body and actions', color:'#fbbf24', bg:'#1c1400'},
   {id:'masochistic',       label:'Masochistic',        icon:'\u26A1', type:'manual', desc:'Finds pleasure in pain or humiliation', color:'#fb923c', bg:'#1c0a00'},
];

function setBotState(bot, stateId, active) {
    if (!bot.states) bot.states = [];
    if (active) {
        if (!bot.states.includes(stateId)) bot.states.push(stateId);
    } else {
        bot.states = bot.states.filter(s => s !== stateId);
    }
}
function hasBotState(bot, stateId) {
    return !!(bot.states && bot.states.includes(stateId));
}

// ── 4. MOOD STATE SYNC - automatically set moods based on current states ──────
/**
 * Automatically set mood states based on current physical/emotional conditions
 * Called regularly to maintain realistic mood fluctuations
 */
function syncMoodStates(bot) {
    if (!bot || !bot.states) return;

    const activeStates = bot.states;
    const hasState = (stateId) => activeStates.includes(stateId);

    // Clear all mood states first
    const moodStates = [
        'content', 'happy', 'excited', 'relaxed', 'satisfied', 'playful',
        'irritable', 'frustrated', 'annoyed', 'grumpy',
        'worried', 'stressed', 'overwhelmed',
        'lonely', 'bored', 'disappointed',
        'flirty', 'affectionate', 'romantic'
    ];
    moodStates.forEach(state => setBotState(bot, state, false));

    // Set mood based on current conditions
    let moodSet = false;

    // Positive physical states → positive moods
    if (hasState('hungry') && !hasState('tired') && !hasState('sick')) {
        setBotState(bot, 'playful', true); // Anticipation of eating
        moodSet = true;
    } else if (!hasState('hungry') && !hasState('thirsty') && !hasState('tired') && !hasState('sore')) {
        // Well-fed, hydrated, rested, not in pain
        if (hasState('horny')) {
            setBotState(bot, 'flirty', true);
        } else if (hasState('bonded')) {
            setBotState(bot, 'affectionate', true);
        } else {
            setBotState(bot, 'content', true);
        }
        moodSet = true;
    }

    // Negative physical states → negative moods
    if (hasState('hungry') && hasState('tired')) {
        setBotState(bot, 'irritable', true);
        moodSet = true;
    } else if (hasState('sick') && hasState('tired')) {
        setBotState(bot, 'overwhelmed', true);
        moodSet = true;
    } else if (hasState('feverish') && hasState('sore')) {
        setBotState(bot, 'grumpy', true);
        moodSet = true;
    } else if (hasState('headache')) {
        setBotState(bot, 'annoyed', true);
        moodSet = true;
    }

    // Emotional states influence mood
    if (hasState('anxious_state')) {
        setBotState(bot, 'worried', true);
        moodSet = true;
    } else if (hasState('grieving')) {
        setBotState(bot, 'lonely', true);
        moodSet = true;
    } else if (hasState('heartbroken')) {
        setBotState(bot, 'disappointed', true);
        moodSet = true;
    }

    // Pregnancy-specific mood influences
    if (hasState('morning_sickness')) {
        setBotState(bot, 'annoyed', true);
        moodSet = true;
    } else if (hasState('fetal_movement')) {
        setBotState(bot, 'happy', true);
        moodSet = true;
    } else if (hasState('nesting_instinct')) {
        setBotState(bot, 'excited', true);
        moodSet = true;
    } else if (hasState('monster_dread') || hasState('parasite_arousal')) {
        setBotState(bot, 'worried', true);
        moodSet = true;
    }

    // Arousal states
    if (hasState('horny') && !hasState('heat_mode')) {
        setBotState(bot, 'flirty', true);
        moodSet = true;
    } else if (hasState('heat_mode')) {
        setBotState(bot, 'romantic', true); // More intense than flirty
        moodSet = true;
    }

    // Social states
    if (hasState('restless') && !hasState('tired')) {
        setBotState(bot, 'bored', true);
        moodSet = true;
    }

    // If no specific mood was set, default to neutral/relaxed
    if (!moodSet) {
        if (!hasState('tired') && !hasState('sick') && !hasState('feverish')) {
            setBotState(bot, 'relaxed', true);
        }
    }
}

// ── 4. PREGNANCY STATE SYNC - triggered when pregnancy stage changes ──────────
/**
 * Automatically sync pregnancy-related states based on current pregnancy stage
 * Called when pregnancy progresses (trimester change, parasite stage change, etc.)
 */
function syncPregnancyStates(bot) {
    if (!bot || !bot.cycleData || !bot.cycleData.pregnant) {
        // Not pregnant - clear all pregnancy-related states
        const pregnancyStates = ['hungry', 'tired', 'sore', 'bloated', 'feverish', 'headache', 'restless', 'horny', 'host_fever', 'crawling_sensation', 'monster_dread', 'parasite_arousal', 'breast_tenderness', 'unnatural_hunger', 'body_distortion', 'anxious_state'];
        pregnancyStates.forEach(stateId => setBotState(bot, stateId, false));
        return;
    }
    
    const cd = bot.cycleData;
    const isParasite = cd.isParasitePregnancy;
    const isMonster = cd.isMonsterPregnancy;
    
    // Clear parasite-specific states if not a parasite pregnancy
    if (!isParasite) {
        const parasiteStates = ['host_fever', 'crawling_sensation', 'monster_dread', 'parasite_arousal', 'unnatural_hunger', 'body_distortion'];
        parasiteStates.forEach(stateId => setBotState(bot, stateId, false));
    }
    
    // Clear normal pregnancy symptoms if it's a parasite or monster pregnancy
    if (isParasite || isMonster) {
        const normalPregnancyStates = ['morning_sickness', 'fetal_movement', 'nesting_instinct', 'food_cravings'];
        normalPregnancyStates.forEach(stateId => setBotState(bot, stateId, false));
    }
    
    // Clear monster-specific symptoms if not a monster pregnancy
    if (!isMonster) {
        const monsterStates = ['monster_dread', 'unnatural_hunger'];
        monsterStates.forEach(stateId => setBotState(bot, stateId, false));
    }
    
    if (isParasite) {
        // Parasite pregnancy stages - alien and terrifying
        const pDay = (typeof getParasiteWeek === 'function') ? getParasiteWeek(bot) : 0;

        if (pDay < 3) {
            // Implantation: burning sensation, fever, dread
            setBotState(bot, 'host_fever', true);
            setBotState(bot, 'crawling_sensation', true);
            setBotState(bot, 'monster_dread', true);
            setBotState(bot, 'parasite_arousal', true);
            setBotState(bot, 'breast_tenderness', true);
            setBotState(bot, 'feverish', true);
            setBotState(bot, 'headache', true);
            setBotState(bot, 'restless', true);
        } else if (pDay < 6) {
            // Feeding: ravenous hunger, chemical arousal, body changes
            setBotState(bot, 'unnatural_hunger', true);
            setBotState(bot, 'parasite_arousal', true);
            setBotState(bot, 'crawling_sensation', true);
            setBotState(bot, 'breast_tenderness', true);
            setBotState(bot, 'body_distortion', true);
            setBotState(bot, 'feverish', true);
            setBotState(bot, 'sore', true);
        } else if (pDay < 9) {
            // Growth: extreme bloating, constant arousal, barely functional
            setBotState(bot, 'body_distortion', true);
            setBotState(bot, 'parasite_arousal', true);
            setBotState(bot, 'crawling_sensation', true);
            setBotState(bot, 'unnatural_hunger', true);
            setBotState(bot, 'bloated', true);
            setBotState(bot, 'sore', true);
            setBotState(bot, 'tired', true);
            setBotState(bot, 'breast_tenderness', true);
        } else if (pDay < 12) {
            // Maturation: peak suffering, constant chemical haze
            setBotState(bot, 'body_distortion', true);
            setBotState(bot, 'parasite_arousal', true);
            setBotState(bot, 'crawling_sensation', true);
            setBotState(bot, 'bloated', true);
            setBotState(bot, 'sore', true);
            setBotState(bot, 'tired', true);
            setBotState(bot, 'host_fever', true);
            setBotState(bot, 'feverish', true);
            setBotState(bot, 'restless', true);
        } else {
            // Emergence: absolute limit, terror and agony
            setBotState(bot, 'body_distortion', true);
            setBotState(bot, 'crawling_sensation', true);
            setBotState(bot, 'sore', true);
            setBotState(bot, 'tired', true);
            setBotState(bot, 'host_fever', true);
            setBotState(bot, 'feverish', true);
            setBotState(bot, 'anxious_state', true);
            setBotState(bot, 'monster_dread', true);
        }
    } else {
        // Normal/Monster pregnancy stages
        const weeks = (typeof getPregnancyWeek === 'function') ? getPregnancyWeek(bot) : 0;
        const isMonster = cd.isMonsterPregnancy;
        
        if (isMonster) {
            // Monster pregnancy - supernatural horror and physical strain
            const mDays = (typeof getMonsterPregnancyWeek === 'function') ? getMonsterPregnancyWeek(bot) : 0;

            if (mDays <= 3) {
                // Early monster: wrongness detected, growing fear
                setBotState(bot, 'monster_dread', true);
                setBotState(bot, 'anxious_state', true);
                setBotState(bot, 'feverish', true);
                setBotState(bot, 'restless', true);
                setBotState(bot, 'morning_sickness', true);
                setBotState(bot, 'breast_tenderness', true);
            } else if (mDays <= 6) {
                // Monster development: body changing unnaturally
                setBotState(bot, 'monster_dread', true);
                setBotState(bot, 'body_distortion', true);
                setBotState(bot, 'anxious_state', true);
                setBotState(bot, 'sore', true);
                setBotState(bot, 'tired', true);
                setBotState(bot, 'feverish', true);
                setBotState(bot, 'unnatural_hunger', true);
                setBotState(bot, 'breast_tenderness', true);
            } else {
                // Advanced monster: extreme suffering, barely human
                setBotState(bot, 'monster_dread', true);
                setBotState(bot, 'body_distortion', true);
                setBotState(bot, 'anxious_state', true);
                setBotState(bot, 'sore', true);
                setBotState(bot, 'tired', true);
                setBotState(bot, 'feverish', true);
                setBotState(bot, 'bloated', true);
                setBotState(bot, 'restless', true);
                setBotState(bot, 'back_pain', true);
                setBotState(bot, 'swelling', true);
            }
        } else if (weeks <= 12) {
            // Normal pregnancy - Trimester 1: early symptoms, adjustment
            setBotState(bot, 'morning_sickness', true);
            setBotState(bot, 'breast_tenderness', true);
            setBotState(bot, 'tired', true);
            setBotState(bot, 'headache', true);
            setBotState(bot, 'mood_swings', true);
            setBotState(bot, 'food_cravings', true);
        } else if (weeks <= 26) {
            // Trimester 2: energy returns, baby movements, visible changes
            setBotState(bot, 'fetal_movement', true);
            setBotState(bot, 'hungry', true);
            setBotState(bot, 'food_cravings', true);
            setBotState(bot, 'mood_swings', true);
            setBotState(bot, 'breast_tenderness', true);
            setBotState(bot, 'back_pain', true);
        } else {
            // Trimester 3: heavy, preparing for birth, nesting
            setBotState(bot, 'fetal_movement', true);
            setBotState(bot, 'nesting_instinct', true);
            setBotState(bot, 'back_pain', true);
            setBotState(bot, 'swelling', true);
            setBotState(bot, 'sore', true);
            setBotState(bot, 'tired', true);
            setBotState(bot, 'bloated', true);
            setBotState(bot, 'restless', true);
            setBotState(bot, 'breast_tenderness', true);
        }
    }
    
    // Sync mood states based on current conditions
    syncMoodStates(bot);

    // Refresh bio panel if states changed
    const bioPanel = document.getElementById('p-states-box');
    if (bioPanel && typeof renderStatesInBio === 'function') {
        renderStatesInBio(bot);
    }

    saveBots();
}

// ── STATE ENGINE ─────────────────────────────────────────────────────────────

// ── 1. SYSTEM STATE SYNC - triggered by code events ──────────────────────────
function syncSystemStates(bot) {
    const cd = bot.cycleData;
    if (!cd) return;
    const isPostpartum = cd.postpartumStartDay != null && !cd.pregnant;
    setBotState(bot, 'postpartum', isPostpartum);
    const daysSinceBirth = isPostpartum ? (getVirtualDay(bot) - (cd.postpartumStartDay || 0)) : 999;
    setBotState(bot, 'nursing', isPostpartum && daysSinceBirth <= 90);
    const hasAlwaysLact = (bot.geneticTraits || []).includes('Always Lactate') || (bot.prompt || '').toLowerCase().includes('always lactat');
    setBotState(bot, 'lactating', hasAlwaysLact || (isPostpartum && daysSinceBirth <= 120));
    if (cd.heatActive) setBotState(bot, 'heat_mode', true);
    else if (!hasBotState(bot, 'heat_mode')) { /* keep if manually set */ }

    // Sync mood states after system state changes
    syncMoodStates(bot);
}

// ── 2. RANDOM STATE ROLL - runs periodically on virtual time advance ──────────
function rollRandomStates(bot, virtualDaysPassed) {
    if (!virtualDaysPassed || virtualDaysPassed <= 0) return;
    const randomPool = ALL_STATES.filter(s => s.type === 'random');
    const now = Date.now();
    for (const state of randomPool) {
        const isActive = hasBotState(bot, state.id);
        const prob = state.prob || 0.05;
        const maxDays = state.maxDays || 1;
        if (isActive) {
            const onsetKey = '_stateOnset_' + state.id;
            const onset = bot[onsetKey] || now;
            const elapsedDays = (now - onset) / (1000 * 60 * 60 * 24);
            if (elapsedDays >= maxDays) {
                setBotState(bot, state.id, false);
                delete bot[onsetKey];
            }
        } else {
            const rollChance = 1 - Math.pow(1 - prob, virtualDaysPassed);
            if (Math.random() < rollChance) {
                setBotState(bot, state.id, true);
                bot['_stateOnset_' + state.id] = now;
            }
        }
    }
    if (hasBotState(bot, 'feverish')) setBotState(bot, 'sick', true);
    if (hasBotState(bot, 'euphoric') && hasBotState(bot, 'sad')) setBotState(bot, 'sad', false);
    if (hasBotState(bot, 'angry') && hasBotState(bot, 'euphoric')) setBotState(bot, 'euphoric', false);

    // Sync mood states after random state changes
    syncMoodStates(bot);
}

// ── 3. AI STATE INFERENCE - detect from recent chat history ──────────────────
async function inferStatesFromChat(bot) {
    if (!bot || !bot.history || bot.history.length < 4) return;
    const key = getNextGroqKey();
    if (!key) return;
    const exchangeCount = bot.history.filter(m => m.role === 'assistant').length;
    if (exchangeCount % 5 !== 0) return;
    const recent = bot.history.slice(-10)
        .map(m => (m.role === 'user' ? 'User' : bot.name) + ': ' + (m.content || '').replace(/\*/g,' ').substring(0, 150))
        .join('\n');
    const aiStateIds = ALL_STATES.filter(s => s.type === 'ai').map(s => s.id);
    const aiStateList = ALL_STATES.filter(s => s.type === 'ai')
        .map(s => `${s.id}: ${s.label} - ${s.desc}`)
        .join('\n');
    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GROQ_FAST_MODEL,
                max_tokens: 80,
                temperature: 0.1,
                messages: [{
                    role: 'system',
                    content: `You detect emotional/psychological states from roleplay chat. Return ONLY a JSON array of active state IDs from this list:\n${aiStateList}\n\nRules:\n- Only include states CLEARLY evidenced in the text\n- Max 3 states at once\n- Return [] if nothing clear\n- Return ONLY the JSON array, nothing else`
                }, {
                    role: 'user',
                    content: `Character: ${bot.name}\nRecent chat:\n${recent}\n\nWhich states apply RIGHT NOW?`
                }]
            }),
            signal: AbortSignal.timeout(8000)
        });
        const data = await res.json();
        const raw = (data.choices?.[0]?.message?.content || '').trim();
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
        if (!Array.isArray(parsed)) return;
        aiStateIds.forEach(id => setBotState(bot, id, false));
        parsed.filter(id => aiStateIds.includes(id)).forEach(id => setBotState(bot, id, true));

        // Sync mood states after AI state changes
        syncMoodStates(bot);

        saveBots();
        const bioPanel = document.getElementById('p-states-box');
        if (bioPanel) renderStatesInBio(bot);
    } catch(e) {
        // Silent fail - state inference is non-critical
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// TRAIT SYSTEM: Personality vs Genetic
// ─────────────────────────────────────────────────────────────────────────────
// Personality: Character traits that can be randomized, have opposites
// Genetic: Body-related hidden parameters (user picks manually)

// ── PERSONALITY TRAITS (with opposites) ──
const PERSONALITY_TRAITS = [
  {name:'Dominant', category:'personality', opposite:'Submissive', desc:'Takes charge in every dynamic - expects to lead, sets the pace and terms; voice alone stops a room'},
  {name:'Submissive', category:'personality', opposite:'Dominant', desc:'Finds comfort and pleasure in yielding control to another - peace lives in surrender'},
  {name:'Cold Blooded', category:'personality', opposite:'Emotional', desc:'Unmoved by ordinary appeals; decisions come from calculation, never sentiment'},
  {name:'Emotional', category:'personality', opposite:'Cold Blooded', desc:'Wears feelings openly - highs exhilarating, lows devastating, everything vivid'},
  {name:'Stoic', category:'personality', opposite:'Explosive', desc:'Unmoved externally - processes in silence; genuine calm anchors others'},
  {name:'Explosive', category:'personality', opposite:'Stoic', desc:'Erupts without warning - emotions detonate; the room changes when they snap'},
  {name:'Optimistic', category:'personality', opposite:'Pessimistic', desc:'Defaults to hope - radiates warmth; mood lifts the room without effort'},
  {name:'Pessimistic', category:'personality', opposite:'Optimistic', desc:'Expects the worst and is rarely surprised; perpetually braced for disappointment'},
  {name:'Generous', category:'personality', opposite:'Selfish', desc:'Gives freely of time, affection, resources - default is warmth and goodwill'},
  {name:'Selfish', category:'personality', opposite:'Generous', desc:'Prioritizes own needs without apology; others are secondary'},
  {name:'Impulsive', category:'personality', opposite:'Calculating', desc:'Acts on emotion before reason catches up; regrets arrive afterward'},
  {name:'Calculating', category:'personality', opposite:'Impulsive', desc:'Plots three moves deeper; schemes run silent, outcomes engineered'},
  {name:'Possessive', category:'personality', opposite:'Independent', desc:'Treats loved ones as exclusively theirs; rival in every glance'},
  {name:'Independent', category:'personality', opposite:'Possessive', desc:'Relies on themselves first; accepting help feels like surrender'},
  {name:'Confident', category:'personality', opposite:'Insecure', desc:'Comfortable in their own skin - doubt is a stranger they rarely entertain'},
  {name:'Insecure', category:'personality', opposite:'Confident', desc:'Perpetually questions their worth; seeks validation constantly'},
  {name:'Diplomatic', category:'personality', opposite:'Blunt', desc:'Navigates conflict with tact; finds common ground without losing position'},
  {name:'Blunt', category:'personality', opposite:'Diplomatic', desc:'Speaks raw truth without filter; tact is deception, honesty is kindness'},
  {name:'Romantic', category:'personality', opposite:'Pragmatic', desc:'Believes deeply in love; expresses affection through grand gestures'},
  {name:'Pragmatic', category:'personality', opposite:'Romantic', desc:'Views love through practical lens; sentiment is secondary to function'},
  {name:'Hedonistic', category:'personality', opposite:'Disciplined', desc:'Lives for pleasure above all; indulges every sense without guilt'},
  {name:'Disciplined', category:'personality', opposite:'Hedonistic', desc:'Operates by structure; impulse is enemy, consistency is the goal'},
  {name:'Seductive', category:'personality', opposite:'Innocent', desc:'Masters deliberate allure - draws people in without them noticing they moved'},
  {name:'Innocent', category:'personality', opposite:'Seductive', desc:'Untouched by corruption - genuine goodness that disarms hardened people'},
  {name:'Manipulative', category:'personality', opposite:'Honest', desc:'Moves people like pieces - levers pulled precisely, targets unaware'},
  {name:'Honest', category:'personality', opposite:'Manipulative', desc:'Words match truth exactly; deception feels like self-betrayal'},
  {name:'Hostile', category:'personality', opposite:'Warm', desc:'Treats world with baseline suspicion; warmth must be earned'},
  {name:'Warm', category:'personality', opposite:'Hostile', desc:'Approaches others with open warmth; assumes good until proven otherwise'},
  {name:'Obsessive', category:'personality', opposite:'Detached', desc:'Fixates with terrifying intensity - cannot let go, cannot stop'},
  {name:'Detached', category:'personality', opposite:'Obsessive', desc:'Maintains comfortable distance; nothing grips tight enough to hurt'},
  {name:'Playful', category:'personality', opposite:'Serious', desc:'Approaches life with levity; turns ordinary into memorable'},
  {name:'Serious', category:'personality', opposite:'Playful', desc:'Treats life as weighty matter; play is frivolous, focus is sacred'},
  {name:'Introverted', category:'personality', opposite:'Extroverted', desc:'Recharges alone; social exposure drains, comfort lives in quiet'},
  {name:'Extroverted', category:'personality', opposite:'Introverted', desc:'Gains energy from crowds; solitude feels like starvation'},
  {name:'Cautious', category:'personality', opposite:'Reckless', desc:'Measures twice before acting; safety is wisdom, not cowardice'},
  {name:'Reckless', category:'personality', opposite:'Cautious', desc:'Chases danger without weighing consequences; rush is the point'},
  {name:'Vindictive', category:'personality', opposite:'Forgiving', desc:'Wrongs catalogued forever; revenge planned slowly, patiently savored'},
  {name:'Forgiving', category:'personality', opposite:'Vindictive', desc:'Lets go of wrongs; grudges are poison, release is freedom'},
  {name:'Idealistic', category:'personality', opposite:'Cynical', desc:'Believes in better world; chases visions others stopped calling possible'},
  {name:'Cynical', category:'personality', opposite:'Idealistic', desc:'Expects corruption; the world is broken and pretending otherwise is naivety'},
  {name:'Protective', category:'personality', opposite:'Carefree', desc:'Instinctively shields loved ones - sometimes to smothering degree'},
  {name:'Carefree', category:'personality', opposite:'Protective', desc:'Others make their own choices; consequences are theirs to carry'},
  {name:'Mysterious', category:'personality', opposite:'Open', desc:'Guards inner world; reveals only what they choose, when they choose'},
  {name:'Open', category:'personality', opposite:'Mysterious', desc:'Wears heart on sleeve; secrets feel like unnecessary walls'},
  {name:'Competitive', category:'personality', opposite:'Cooperative', desc:'Views life as contest to be won; second place is failure'},
  {name:'Cooperative', category:'personality', opposite:'Competitive', desc:'Victory shared is sweeter; we over me, always'},
  {name:'Perfectionist', category:'personality', opposite:'Easygoing', desc:'Accepts nothing less than flawless; standards relentless'},
  {name:'Easygoing', category:'personality', opposite:'Perfectionist', desc:'Good enough is good enough; perfection is paralysis'},
  {name:'Loyal', category:'personality', opposite:'Fickle', desc:'Bonds once formed are unbreakable; betrayal is unthinkable'},
  {name:'Fickle', category:'personality', opposite:'Loyal', desc:'Attachments shift like weather; what mattered yesterday may not today'},
  {name:'Adventurous', category:'personality', opposite:'Settled', desc:'Craves novelty and risk; routine is slow suffocation'},
  {name:'Settled', category:'personality', opposite:'Adventurous', desc:'Finds peace in familiar rhythms; chaos is exhausting, not exciting'},
  {name:'Flirtatious', category:'personality', opposite:'Reserved', desc:'Keeps tension playful; charm is a game they always win'},
  {name:'Reserved', category:'personality', opposite:'Flirtatious', desc:'Intimacy is earned, not offered; boundaries are clear'},
];

// ── GENETIC TRAITS (body-related, user picks, no opposites) ──
// gender: 'female' | 'male' | 'neutral'
const GENETIC_TRAITS = [
  // ── Female traits ──
  {name:'Always Lactate',    category:'genetic', gender:'female', desc:'Breasts perpetually produce milk regardless of pregnancy'},
  {name:'Always Multiples',  category:'genetic', gender:'female', desc:'Every pregnancy produces multiple babies (2-6, equal chance)'},
  {name:'Always Overdue',    category:'genetic', gender:'female', opposite:'Early Birth', desc:'Never goes into labor before week 43, extends to week 45'},
  {name:'Early Birth',       category:'genetic', gender:'female', opposite:'Parasite Host', desc:'High risk of premature labor - can go into labor unexpectedly as early as week 28'},
  {name:'Heat Cycle',        category:'genetic', gender:'female', desc:'Enhanced fertility with shorter, more frequent cycles'},
  {name:'Monster Pregnancy', category:'genetic', gender:'female', desc:'Body carries supernatural offspring with physical transformations'},
  {name:'Parasite Host',     category:'genetic', gender:'female', opposite:'Early Birth', desc:'Body hosts alien/demonic parasite for offspring'},
  {name:'Perfect Incubation',category:'genetic', gender:'female', desc:'Pregnancy progresses 2x faster than normal (affects Normal & Monster, not Parasite)'},
  {name:'Ultra-fertile',     category:'genetic', gender:'female', opposite:'Infertile', desc:'Conception happens with ease; nearly guaranteed on ovulation day'},

  // ── Neutral traits (apply to both) ──
  {name:'Breeding Instinct', category:'genetic', gender:'neutral', desc:'Primal biological drive to conceive dominates all other instincts'},
  {name:'Infertile',         category:'genetic', gender:'neutral', opposite:'Ultra-fertile', desc:'Drastically reduced fertility - conception is extremely difficult'},

  // ── Male traits ──
  {name:'Alpha Seed',        category:'genetic', gender:'male', desc:'Offspring inherit dominant genetic traits; conception chance moderately boosted (+20%)'},
  {name:'Hyper-Virility',    category:'genetic', gender:'male', opposite:'Infertile', desc:'Sperm count perpetually at peak - conception chance doubled, never depleted'},
  {name:'Rut Cycle',         category:'genetic', gender:'male', desc:'Periodic testosterone surges (every ~21 days): aggression, libido, and dominance spike severely'},
];

// Combine for backward compatibility
const ALL_TRAITS = [...PERSONALITY_TRAITS, ...GENETIC_TRAITS];

// ─────────────────────────────────────────────────────────────────────────────
// OPPOSITE TRAIT MAPPING
// ─────────────────────────────────────────────────────────────────────────────
const TRAIT_OPPOSITES = {};
PERSONALITY_TRAITS.forEach(t => {
  if (t.opposite) {
    TRAIT_OPPOSITES[t.name] = t.opposite;
    TRAIT_OPPOSITES[t.opposite] = t.name;
  }
});

// Trait conflict pairs - picking one hides the other
const TRAIT_CONFLICTS = [
  ['Dominant',          'Submissive'],
  ['Cold Blooded',      'Romantic'],
  ['Stoic',             'Explosive'],
  ['Possessive',        'Independent'],
  ['Possessive',        'Diplomatic'],
  ['Disciplined',       'Impulsive'],
  ['Parasite Host',     'Always Overdue'],
  ['Parasite Host',     'Always Multiples'],
  ['Monster Pregnancy', 'Parasite Host'],
  ['Hyper-Virility',    'Infertile'],
];

// Build a quick lookup: traitName → Set of conflicting trait names
const TRAIT_CONFLICT_MAP = {};
TRAIT_CONFLICTS.forEach(([a, b]) => {
  if (!TRAIT_CONFLICT_MAP[a]) TRAIT_CONFLICT_MAP[a] = new Set();
  if (!TRAIT_CONFLICT_MAP[b]) TRAIT_CONFLICT_MAP[b] = new Set();
  TRAIT_CONFLICT_MAP[a].add(b);
  TRAIT_CONFLICT_MAP[b].add(a);
});

function getConflictingSelectedTraits(traitName) {
  const conflicts = TRAIT_CONFLICT_MAP[traitName] || new Set();
  const active = [];
  conflicts.forEach(c => { if (selectedTraits.has(c)) active.push(c); });
  return active;
}

// selectedTraits: Map<name, mutable(bool)>
let selectedTraits = new Map();
let selectedDisadvantages = new Set();
let _traitPickerTab = 'all';

function countPersonality() { let c=0; selectedTraits.forEach((m, name)=>{ const t = ALL_TRAITS.find(tr => tr.name === name); if(t && t.category === 'personality') c++; }); return c; }
function countGenetic() { let c=0; selectedTraits.forEach((m, name)=>{ const t = ALL_TRAITS.find(tr => tr.name === name); if(t && t.category === 'genetic') c++; }); return c; }

function updateTraitCountBadge() {
  const el = document.getElementById('trait-count-badge');
  if (!el) return;
  const pers = countPersonality(), gen = countGenetic();
  el.textContent = `\uD83C\uDFAD ${pers}/${MAX_PERSONALITY_TRAITS}  \uD83E\uDDEC ${gen}/${MAX_GENETIC_TRAITS}`;
  el.style.color = (pers >= MAX_PERSONALITY_TRAITS || gen >= MAX_GENETIC_TRAITS) ? '#f59e0b' : '#888';
}

function openTraitPicker() {
  _traitPickerTab = 'all';
  document.querySelectorAll('.trait-picker-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'all'));
  filterTraitPicker('');
  const inp = document.getElementById('trait-picker-search-input');
  if (inp) inp.value = '';
  const overlay = document.getElementById('trait-picker-overlay');
  if (overlay) { overlay.style.display = 'flex'; overlay.style.pointerEvents = 'auto'; if (inp) setTimeout(()=>inp.focus(), 100); }
}
function closeTraitPicker() {
  const overlay = document.getElementById('trait-picker-overlay');
  if (overlay) { overlay.style.display = 'none'; overlay.style.pointerEvents = 'none'; }
}

function rollRandomPersonalityTraits() {
  const pool = ALL_TRAITS.filter(t => t.category === 'personality');
  if (!pool.length) { alert('No personality traits available!'); return; }
  const pickCount = Math.min(Math.floor(Math.random() * 3) + 3, MAX_PERSONALITY_TRAITS, pool.length);
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  const selected = [];
  for (const t of shuffled) {
    if (selected.length >= pickCount) break;
    if (!t.opposite || !selected.some(s => s.name === t.opposite)) {
      selected.push(t);
    }
  }
  for (const t of selected) {
    selectedTraits.set(t.name, true);
  }
  renderTraitChips();
  filterTraitPicker(document.getElementById('trait-picker-search-input')?.value || '');
  updateTraitCountBadge();
}

function randomizeBotPersonalityInBio(botId) {
  const bot = (typeof bots !== 'undefined' ? bots : []).find(b => b.id === botId);
  if (!bot) return;
  
  // Keep non-personality traits
  bot.disadvantages = (bot.disadvantages || []).filter(t => {
    const obj = ALL_TRAITS.find(x => x.name === t);
    return obj && obj.category !== 'personality';
  });
  
  const pool = ALL_TRAITS.filter(t => t.category === 'personality');
  const pickCount = Math.min(Math.floor(Math.random() * 3) + 3, MAX_PERSONALITY_TRAITS, pool.length);
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  const selected = [];
  for (const t of shuffled) {
    if (selected.length >= pickCount) break;
    if (!t.opposite || !selected.some(s => s.name === t.opposite)) {
      selected.push(t);
    }
  }
  
  const newTraits = selected.map(t => t.name);
  bot.disadvantages = bot.disadvantages.concat(newTraits);
  
  // Set bot.prompt to explicitly mirror these personality tags
  const persTraits = bot.disadvantages.filter(t => {
    const obj = ALL_TRAITS.find(x => x.name === t);
    return obj && obj.category === 'personality';
  });
  bot.prompt = persTraits.join(', ');
  
  if (typeof saveBots === 'function') saveBots();
  if (document.getElementById('grp-bio-modal') && document.getElementById('grp-bio-modal').style.display === 'flex' && typeof showGroupMemberBio === 'function') {
      showGroupMemberBio(bot.id);
  } else if (typeof showBioPopup === 'function') {
      showBioPopup();
  }
}

function setTraitTab(tab) {
  _traitPickerTab = tab;
  document.querySelectorAll('.trait-picker-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  filterTraitPicker(document.getElementById('trait-picker-search-input')?.value || '');
}

function filterTraitPicker(q) {
  const lower = (q||'').toLowerCase();
  const body = document.getElementById('trait-picker-body');
  if (!body) return;
  body.innerHTML = '';

  // Detect current bot's gender - prefer live form value over saved bot
  const _genderEl = document.getElementById('bot-gender');
  const _genderVal = (_genderEl ? _genderEl.value : '') || (() => {
    const _curBot = bots && curId ? bots.find(b => b.id === curId) : null;
    return _curBot ? (_curBot.gender||'') : '';
  })();
  const _botGender = _genderVal.toLowerCase();
  const _isMale = _botGender === 'male';
  const _isFemale = _botGender === 'female';

  const list = ALL_TRAITS.filter(t => {
    if (_traitPickerTab === 'personality' && t.category !== 'personality') return false;
    if (_traitPickerTab === 'genetic' && t.category !== 'genetic') return false;
    if (t.category === 'genetic' && t.gender && t.gender !== 'neutral') {
      if (_isMale && t.gender === 'female') return false;
      if (_isFemale && t.gender === 'male') return false;
    }
    return !q || t.name.toLowerCase().includes(lower);
  });

  if (list.length === 0) {
    body.innerHTML = '<div style="color:var(--text-sub);font-size:13px;text-align:center;padding:20px">No traits found</div>';
    return;
  }
  const groups = {};
  list.forEach(t => {
    const k = t.category || 'personality';
    if (!groups[k]) groups[k] = [];
    groups[k].push(t);
  });
  const labelMap = {personality: '\uD83C\uDFAD Personality - character traits with opposites', genetic: '\uD83E\uDDEC Genetic - body-related hidden parameters'};
  ['personality','genetic'].forEach(gk => {
    if (!groups[gk]) return;
    const gl = document.createElement('div');
    gl.className = 'trait-group-label';
    gl.textContent = labelMap[gk];
    body.appendChild(gl);
    groups[gk].forEach(t => {
      const isSel = selectedTraits.has(t.name);
      const hasOpposite = t.opposite && selectedTraits.has(t.opposite);
      const atLimit = !isSel && t.category === 'genetic' && countGenetic() >= MAX_GENETIC_TRAITS;
      const conflictsWith = !isSel ? getConflictingSelectedTraits(t.name) : [];
      const isConflicted = conflictsWith.length > 0;
      if (isConflicted || hasOpposite) return;
      const locked = atLimit;
      const row = document.createElement('div');
      row.className = 'trait-picker-item' + (isSel ? ' selected' + (t.category === 'genetic' ? ' imm' : '') : '') + (locked ? ' locked' : '');
      row.style.opacity = locked ? '0.4' : '1';
      const badgeHtml = t.category === 'genetic'
        ? `<span class="trait-picker-badge badge-imm">\uD83E\uDDEC</span>`
        : `<span class="trait-picker-badge badge-mut">\uD83C\uDFAD</span>`;
      const genderBadge = t.category === 'genetic' && t.gender
        ? (t.gender === 'male'    ? `<span style="font-size:10px;background:#0a1a30;border:1px solid #3b82f644;color:#60a5fa;border-radius:5px;padding:0 5px;margin-right:4px;flex-shrink:0">\u2642</span>`
         : t.gender === 'female'  ? `<span style="font-size:10px;background:#1a0a20;border:1px solid #e879f944;color:#e879f9;border-radius:5px;padding:0 5px;margin-right:4px;flex-shrink:0">\u2640</span>`
         : `<span style="font-size:10px;background:#101010;border:1px solid #44444444;color:#888;border-radius:5px;padding:0 5px;margin-right:4px;flex-shrink:0">\u26a5</span>`)
        : '';
      row.innerHTML = `<div class="trait-picker-check">${isSel ? '\u2713' : ''}</div>
        <div class="trait-picker-name" style="flex:1">
          <div style="display:flex;align-items:center;gap:4px">${genderBadge}${escapeHTML(t.name)}</div>
          ${t.desc ? `<div style="font-size:13px;color:${t.category === 'genetic' ? '#a78bfa' : '#60a5fa'};opacity:0.75;margin-top:1px">${escapeHTML(t.desc)}</div>` : ''}
        </div>
        ${badgeHtml}`;
      if (!locked) {
        row.onclick = () => {
          if (selectedTraits.has(t.name)) {
            selectedTraits.delete(t.name);
          } else {
            selectedTraits.set(t.name, t.category === 'personality');
            if (t.opposite && selectedTraits.has(t.opposite)) selectedTraits.delete(t.opposite);
            if (t.name === 'Parasite Host') {
              selectedTraits.delete('Always Multiples');
              selectedTraits.delete('Always Overdue');
              selectedTraits.delete('Monster Pregnancy');
            }
            if (t.name === 'Monster Pregnancy') selectedTraits.delete('Parasite Host');
            if (t.name === 'Always Overdue')    selectedTraits.delete('Parasite Host');
            if (t.name === 'Always Multiples')  selectedTraits.delete('Parasite Host');
          }
          renderTraitChips();
          filterTraitPicker(document.getElementById('trait-picker-search-input')?.value || '');
        };
      } else {
        row.title = t.category === 'genetic' ? `Max ${MAX_GENETIC_TRAITS} genetic traits` : `Max ${MAX_PERSONALITY_TRAITS} personality traits`;
      }
      body.appendChild(row);
    });
  });
}

function addCustomTrait() {
  const inp = document.getElementById('trait-custom-inp');
  const catBtn = document.getElementById('trait-custom-cat');
  const name = (inp.value || '').trim();
  if (!name) return;
  const isGenetic = catBtn.dataset.cat === 'genetic';
  if (isGenetic && countGenetic() >= MAX_GENETIC_TRAITS) { alert(`Max ${MAX_GENETIC_TRAITS} genetic traits allowed.`); return; }
  if (!isGenetic && countPersonality() >= MAX_PERSONALITY_TRAITS) { alert(`Max ${MAX_PERSONALITY_TRAITS} personality traits allowed.`); return; }
  selectedTraits.set(name, isGenetic ? 'genetic' : 'personality');
  inp.value = '';
  renderTraitChips();
  filterTraitPicker(document.getElementById('trait-picker-search-input')?.value || '');
}

function renderTraitChips() {
  const wrap = document.getElementById('selected-traits-wrap');
  const input = document.getElementById('bot-prompt');
  if (!wrap) return;
  wrap.innerHTML = '';

  const liveSummary = document.getElementById('trait-picker-live-summary');
  if (liveSummary) {
    liveSummary.innerHTML = '';
    if (selectedTraits.size > 0) {
      liveSummary.style.display = 'flex';
      selectedTraits.forEach((cat, name) => {
        const t = ALL_TRAITS.find(tr => tr.name === name);
        const isGenetic = t?.category === 'genetic' || cat === 'genetic';
        const mini = document.createElement('span');
        mini.style.cssText = `display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:bold;padding:2px 8px 2px 6px;border-radius:20px;cursor:pointer;${isGenetic ? 'background:#1a0b2e;color:#c084fc;border:1px solid #7c3aed55' : 'background:#0a1a30;color:#93c5fd;border:1px solid #0084ff44'}`;
        mini.title = 'Click to remove';
        mini.innerHTML = (isGenetic ? '\uD83E\uDDEC ' : '\uD83C\uDFAD ') + escapeHTML(name) + ' <span style="opacity:0.5;font-size:13px;margin-left:1px">\xD7</span>';
        mini.onclick = () => { selectedTraits.delete(name); renderTraitChips(); filterTraitPicker(document.getElementById('trait-picker-search-input')?.value || ''); };
        liveSummary.appendChild(mini);
      });
    } else {
      liveSummary.style.display = 'none';
    }
  }

  selectedTraits.forEach((cat, name) => {
    const chip = document.createElement('span');
    const t = ALL_TRAITS.find(tr => tr.name === name);
    const isGenetic = t?.category === 'genetic' || cat === 'genetic';
    chip.className = 'trait-chip ' + (isGenetic ? 'genetic' : 'personality');
    const icon = isGenetic ? '\uD83E\uDDEC ' : '\uD83C\uDFAD ';
    chip.innerHTML = icon + escapeHTML(name) + `<button class="chip-x" onclick="removeTraitChip(this)" data-name="${escapeHTML(name)}">\xD7</button>`;
    wrap.appendChild(chip);
  });
  updateTraitCountBadge();
  if (input) {
    const tagStr = [...selectedTraits.keys()].join(', ');
    let freeText = '';
    const oldVal = input.value;
    const commaIdx = oldVal.lastIndexOf('. ');
    if (commaIdx > 0) {
      const candidate = oldVal.slice(commaIdx + 2).trim();
      if (candidate && !ALL_TRAITS.some(t => t.name === candidate) && !selectedTraits.has(candidate)) {
        freeText = candidate;
      }
    }
    input.value = tagStr + (freeText ? '. ' + freeText : '');
    if (typeof autoResize === 'function') autoResize(input);
  }
}

function removeTraitChip(btn) {
  const name = btn.dataset.name;
  selectedTraits.delete(name);
  renderTraitChips();
  filterTraitPicker(document.getElementById('trait-picker-search-input')?.value || '');
}

// ── Appearance Tag System ─────────────────────────────────────────────────────
let _appTags = [];

// Predefined appearance tags organized by categories
const PREDEFINED_APP_TAGS = {
  height: null, // Generated randomly 140-200cm
  hair: ['blonde hair', 'brown hair', 'black hair', 'red hair', 'auburn hair', 'gray hair', 'white hair', 'dyed hair', 'short hair', 'long hair', 'wavy hair', 'curly hair', 'straight hair', 'ponytail', 'bun', 'bangs'],
  eyes: ['blue eyes', 'brown eyes', 'green eyes', 'hazel eyes', 'gray eyes', 'amber eyes', 'dark eyes', 'light eyes'],
  skin: ['fair skin', 'light skin', 'medium skin', 'olive skin', 'tan skin', 'dark skin', 'pale skin', 'golden skin', 'bronzed skin', 'deep brown skin', 'ebony skin', 'porcelain skin', 'rose skin', 'alabaster skin', 'warm beige skin', 'caramel skin', 'mocha skin'],
  build: ['slender', 'athletic', 'curvy', 'petite', 'tall', 'average', 'muscular', 'lean', 'fit', 'hourglass', 'willowy', 'slim', 'thin', 'plump', 'plus size', 'voluptuous', 'stocky', 'sturdy', 'broad-shouldered', 'long-legged', 'compact', 'boyish figure'],
  features: ['freckles', 'dimples', 'beauty mark', 'high cheekbones', 'defined jawline', 'full lips', 'long eyelashes', 'rosy cheeks', 'collarbones', 'tattoos', 'piercings', 'scars', 'glasses', 'contacts'],
  style: ['casual', 'formal', 'sporty', 'elegant', 'bohemian', 'vintage', 'modern', 'minimalist', 'chic', 'preppy', 'edgy', 'classic']
};

// Generate random appearance from predefined tags (no AI needed)
function generateRandomAppearance() {
  const randomTags = [];
  // Generate random height between 140-200cm
  const randomHeight = Math.floor(Math.random() * (200 - 140 + 1)) + 140;
  randomTags.push(randomHeight + 'cm');
  // Always include hair color
  randomTags.push(PREDEFINED_APP_TAGS.hair[Math.floor(Math.random() * PREDEFINED_APP_TAGS.hair.filter(t => t.includes('hair')).length)]);
  // Always include eye color
  randomTags.push(PREDEFINED_APP_TAGS.eyes[Math.floor(Math.random() * PREDEFINED_APP_TAGS.eyes.length)]);
  // Always include skin tone
  randomTags.push(PREDEFINED_APP_TAGS.skin[Math.floor(Math.random() * PREDEFINED_APP_TAGS.skin.length)]);
  // Always include build
  randomTags.push(PREDEFINED_APP_TAGS.build[Math.floor(Math.random() * PREDEFINED_APP_TAGS.build.length)]);
  // Randomly add 1-2 features
  const numFeatures = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < numFeatures; i++) {
    const feature = PREDEFINED_APP_TAGS.features[Math.floor(Math.random() * PREDEFINED_APP_TAGS.features.length)];
    if (!randomTags.includes(feature)) randomTags.push(feature);
  }
  // Randomly add style
  if (Math.random() > 0.3) {
    const style = PREDEFINED_APP_TAGS.style[Math.floor(Math.random() * PREDEFINED_APP_TAGS.style.length)];
    if (!randomTags.includes(style)) randomTags.push(style);
  }
  return randomTags;
}

// Roll appearance using predefined tags (no AI)
function rollAppearanceFromTags(btn) {
  diceSpin(btn);
  _appTags = [];
  const randomTags = generateRandomAppearance();
  randomTags.forEach(tag => {
    if (!_appTags.includes(tag)) _appTags.push(tag);
  });
  renderAppTags();
  setDiceLoading(btn, false);
}

// Render predefined tag suggestions
function renderAppTagSuggestions() {
  const wrap = document.getElementById('app-suggestions-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  
  // Flatten all tags into a single array (excluding height which is random)
  const allTags = [];
  Object.entries(PREDEFINED_APP_TAGS).forEach(([category, tags]) => {
    if (category === 'height' || !tags) return; // Skip height (random) and null values
    tags.forEach(tag => {
      if (!allTags.includes(tag)) allTags.push(tag);
    });
  });
  
  // Render clickable suggestion chips
  allTags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'app-tag';
    chip.style.background = '#1a1a1a';
    chip.style.borderColor = '#333';
    chip.style.color = '#888';
    chip.style.fontSize = '11px';
    chip.style.padding = '3px 8px';
    chip.style.cursor = 'pointer';
    chip.textContent = tag;
    chip.onclick = () => {
      if (!_appTags.includes(tag)) {
        _appTags.push(tag);
        renderAppTags();
      }
    };
    wrap.appendChild(chip);
  });
}

function renderAppTags() {
  const wrap = document.getElementById('app-tags-wrap');
  const hidden = document.getElementById('bot-app');
  if (!wrap) return;
  wrap.innerHTML = '';
  _appTags.forEach((tag, i) => {
    const chip = document.createElement('span');
    chip.className = 'app-tag';
    chip.title = 'Click to remove';
    chip.innerHTML = escapeHTML(tag) + `<span class="app-tag-x" onclick="removeAppTag(${i});event.stopPropagation()">\xD7</span>`;
    chip.onclick = () => removeAppTag(i);
    wrap.appendChild(chip);
  });
  if (hidden) hidden.value = _appTags.join(', ');
}

function addAppTag(val) {
  const inp = document.getElementById('app-tag-input');
  const raw = (val !== undefined ? val : (inp ? inp.value : '')).trim().replace(/,+$/, '').trim();
  if (!raw) return;
  const sentences = raw.split(/\.\s+|\.\n/).map(s => s.trim()).filter(Boolean);
  sentences.forEach(sentence => {
    if (sentence.length <= 80) {
      if (!_appTags.includes(sentence)) _appTags.push(sentence);
    } else {
      const parts = sentence.split(',').map(s => s.trim()).filter(Boolean);
      let buffer = '';
      parts.forEach(part => {
        if (buffer) {
          const joined = buffer + ', ' + part;
          if (joined.length <= 80) { buffer = joined; }
          else { if (!_appTags.includes(buffer)) _appTags.push(buffer); buffer = part; }
        } else { buffer = part; }
      });
      if (buffer && !_appTags.includes(buffer)) _appTags.push(buffer);
    }
  });
  if (inp) inp.value = '';
  renderAppTags();
}

function removeAppTag(i) {
  _appTags.splice(i, 1);
  renderAppTags();
}

function handleAppTagKey(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addAppTag();
  }
}

function initAppTags(existingText) {
  _appTags = [];
  if (existingText) {
    const hasSentences = /\.\s+[A-Z]/.test(existingText);
    if (hasSentences) {
      const sentences = existingText.split(/\.\s+|\.\n/).map(s => s.trim()).filter(Boolean);
      sentences.forEach(sentence => {
        if (sentence.length <= 80) {
          if (!_appTags.includes(sentence)) _appTags.push(sentence);
        } else {
          const parts = sentence.split(',').map(s => s.trim()).filter(Boolean);
          let buffer = '';
          parts.forEach(part => {
            const joined = buffer ? buffer + ', ' + part : part;
            if (joined.length <= 80) { buffer = joined; }
            else { if (buffer && !_appTags.includes(buffer)) _appTags.push(buffer); buffer = part; }
          });
          if (buffer && !_appTags.includes(buffer)) _appTags.push(buffer);
        }
      });
    } else {
      const rawParts = existingText.split(',').map(s => s.trim()).filter(Boolean);
      const merged = [];
      let buffer = '';
      rawParts.forEach(part => {
        if (buffer) {
          const joined = buffer + ' ' + part;
          if (buffer.split(' ').length <= 1 && buffer.length <= 8) { buffer = joined; }
          else { merged.push(buffer); buffer = part; }
        } else { buffer = part; }
      });
      if (buffer) merged.push(buffer);
      merged.forEach(t => { if (!_appTags.includes(t)) _appTags.push(t); });
    }
  }
  renderAppTags();
  renderAppTagSuggestions();
  const inp = document.getElementById('app-tag-input');
  if (inp) inp.value = '';
}

function initTraitSystem() {
  selectedTraits.clear();
  selectedDisadvantages.clear();
  const existing = document.getElementById('bot-prompt')?.value || '';
  ALL_TRAITS.forEach(t => {
    if (existing.toLowerCase().includes(t.name.toLowerCase())) {
      selectedTraits.set(t.name, t.category === 'personality');
    }
  });
  const toRemove = [];
  selectedTraits.forEach((cat, name) => {
    if (!ALL_TRAITS.some(t => t.name === name)) toRemove.push(name);
  });
  toRemove.forEach(name => selectedTraits.delete(name));
  renderTraitChips();
}
function clearPersonalityTags() { selectedTraits.clear(); selectedDisadvantages.clear(); renderTraitChips(); }
function initPersonalityTags() { initTraitSystem(); }
let selectedPersonalityTags = new Set(); // stub

async function rollPersonality(btn) {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    diceSpin(btn);
    setDiceLoading(btn, true);
    const ctx = getCharContext();
    const cultureHint = getCultureHintFromFields(ctx) ? `Cultural/era/location background: ${getCultureHintFromFields(ctx)}.` : '';
    const nameHint = ctx.name ? `Name: "${ctx.name}".` : '';
    const bioHint = ctx.bio ? `Background: ${ctx.bio.substring(0,80)}.` : '';
    const ageHint = ctx.age ? `Age: ${ctx.age}.` : '';
    const lang = getLang();
    try {
        const result = await callLlama(
            `You are a character designer. Return ONLY a personality description (2-3 sentences) for a ${ctx.gender} character. ${nameHint} ${ageHint} ${bioHint} ${cultureHint}
Describe: core traits, speaking style, emotional tendencies, quirks, how they act under pressure. Must be consistent and logical with all provided info including the cultural/era setting. Avoid clichés. Write in ${lang}. No intro, no label - just the personality.`,
            'Describe the character personality.'
        );
        document.getElementById('bot-prompt').value = result;
    } catch(e) {
        logError('rollPersonality failed', e.message);
    }
    setDiceLoading(btn, false);
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT HELPER — properly separates genetic traits from personality flaws
// ─────────────────────────────────────────────────────────────────────────────
function buildTraitContext(bot) {
    const disadvs = bot.disadvantages || [];
    if (!disadvs.length) return '';
    const geneticNames = new Set((typeof GENETIC_TRAITS !== 'undefined' ? GENETIC_TRAITS : []).map(t => t.name));
    const flaws    = disadvs.filter(d => !geneticNames.has(d));
    const genetics = disadvs.filter(d =>  geneticNames.has(d));
    const parts = [];
    if (flaws.length)    parts.push(`[Character Flaws - permanent personality weaknesses, always show them]: ${flaws.join(', ')}`);
    if (genetics.length) parts.push(`[Genetic Traits - biological facts about her body, not personality weaknesses]: ${genetics.join(', ')}`);
    return parts.join('\n');
}
