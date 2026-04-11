// traits_data.js - Trait data definitions
// Depends on: none

const MAX_PERSONALITY_TRAITS = 10;
const MAX_GENETIC_TRAITS = 10;

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
  {name:'Innocent', category:'personality', opposite:'Seductive', desc:'Genuine naivety; charm comes from authenticity, not calculation'},
  {name:'Loyal', category:'personality', opposite:'Fickle', desc:'Stands by chosen people through anything; betrayal is unforgivable'},
  {name:'Fickle', category:'personality', opposite:'Loyal', desc:'Interest shifts easily; commitment is a foreign concept'},
  {name:'Adventurous', category:'personality', opposite:'Cautious', desc:'Seeks new experiences constantly; routine is suffocating'},
  {name:'Cautious', category:'personality', opposite:'Adventurous', desc:'Weighs every risk carefully; prefers known paths to uncertainty'},
  {name:'Ambitious', category:'personality', opposite:'Content', desc:'Driven to achieve and rise; never satisfied with current position'},
  {name:'Content', category:'personality', opposite:'Ambitious', desc:'At peace with current state; ambition is unnecessary noise'},
  {name:'Creative', category:'personality', opposite:'Conventional', desc:'Thinks outside boxes; innovation is natural, not learned'},
  {name:'Conventional', category:'personality', opposite:'Creative', desc:'Values tradition and established ways; innovation is suspicious'},
  {name:'Playful', category:'personality', opposite:'Serious', desc:'Approaches life with humor and levity; play is serious business'},
  {name:'Serious', category:'personality', opposite:'Playful', desc:'Treats everything with gravity; humor is frivolous distraction'},
];

const GENETIC_TRAITS = [
  {name:'Always Lactate', category:'genetic', desc:'Breasts produce milk constantly, not just during pregnancy - may leak unexpectedly'},
  {name:'High Fertility', category:'genetic', desc:'Conception happens easily and often; pregnancy is highly likely from unprotected intimacy'},
  {name:'Multiple Births', category:'genetic', desc:'Pregnancies frequently result in twins, triplets, or more'},
  {name:'Sensitive Body', category:'genetic', desc:'Extremely responsive to touch; even casual contact feels intense'},
  {name:'Fast Metabolism', category:'genetic', desc:'Burns energy quickly; needs to eat frequently to maintain stamina'},
  {name:'Slow Metabolism', category:'genetic', desc:'Energy burns slowly; gains weight easily, loses it with difficulty'},
  {name:'High Pain Tolerance', category:'genetic', desc:'Can endure physical discomfort without showing it much'},
  {name:'Low Pain Tolerance', category:'genetic', desc:'Physical discomfort is overwhelming; even minor pain is disabling'},
  {name:'Strong Immune System', category:'genetic', desc:'Rarely gets sick; recovers quickly from illness'},
  {name:'Weak Immune System', category:'genetic', desc:'Gets sick easily; recovery takes longer than normal'},
  {name:'Night Owl', category:'genetic', desc:'Naturally more alert at night; morning is difficult'},
  {name:'Early Bird', category:'genetic', desc:'Naturally wakes early; morning is peak energy time'},
  {name:'Light Sleeper', category:'genetic', desc:'Wakes easily from small disturbances; needs quiet to sleep well'},
  {name:'Deep Sleeper', category:'genetic', desc:'Sleeps through almost anything; hard to wake up'},
  {name:'Warm Blooded', category:'genetic', desc:'Comfortable in cold; overheats easily in heat'},
  {name:'Cold Blooded', category:'genetic', desc:'Comfortable in heat; feels cold easily in normal temperatures'},
  {name:'High Libido', category:'genetic', desc:'Strong, frequent physical desires; intimacy is a constant need'},
  {name:'Low Libido', category:'genetic', desc:'Minimal physical desire; intimacy is occasional at most'},
  {name:'Quick Recovery', category:'genetic', desc:'Heals from physical exertion or injury faster than normal'},
  {name:'Slow Recovery', category:'genetic', desc:'Takes long to recover from physical exertion or injury'},
  
  // Social & Interpersonal traits (merged from disadvantages)
  {name:'Socially Awkward', category:'genetic', desc:'Struggles with normal social interactions'},
  {name:'Chronic Liar', category:'genetic', desc:'Cannot stop lying even when unnecessary'},
  {name:'Gossiper', category:'genetic', desc:'Cannot keep secrets, always spreads rumours'},
  {name:'Pathological Jealousy', category:'genetic', desc:'Overwhelmed by jealousy in all relationships'},
  {name:'Attention Seeker', category:'genetic', desc:'Craves constant validation and spotlight'},
  {name:'People Pleaser', category:'genetic', desc:'Cannot say no, sacrifices own needs for others'},
  {name:'Passive-Aggressive', category:'genetic', desc:'Expresses hostility through indirect behavior'},
  {name:'Guilt-Tripper', category:'genetic', desc:'Manipulates others through guilt and self-pity'},
  {name:'Gaslighter', category:'genetic', desc:'Makes others question their own reality'},
  {name:'Martyr Complex', category:'genetic', desc:'Portrays themselves as a constant victim or sacrificial figure'},
  {name:'Savior Complex', category:'genetic', desc:'Obsessively tries to fix others\' lives uninvited'},
  {name:'Codependent', category:'genetic', desc:'Emotionally dependent to an unhealthy degree'},
  {name:'Fear of Abandonment', category:'genetic', desc:'Extreme anxiety about being left or rejected'},
  
  // Mental & Emotional traits (merged from disadvantages)
  {name:'Chronic Procrastinator', category:'genetic', desc:'Always delays tasks until the last possible moment'},
  {name:'Overthinking', category:'genetic', desc:'Obsessively analyzes every situation, never acts'},
  {name:'Catastrophizer', category:'genetic', desc:'Always assumes the worst possible outcome'},
  {name:'Perfectionism Paralysis', category:'genetic', desc:'Paralyzed by fear of imperfection, nothing gets done'},
  {name:'Emotionally Volatile', category:'genetic', desc:'Rapid, unpredictable emotional swings'},
  {name:'Emotional Shutdown', category:'genetic', desc:'Shuts down completely when overwhelmed'},
  {name:'Emotionally Unavailable', category:'genetic', desc:'Cannot form deep emotional connections'},
  {name:'Inferiority Complex', category:'genetic', desc:'Persistent feeling of being lesser than others'},
  {name:'Superiority Complex', category:'genetic', desc:'Delusional belief in their own superiority'},
  {name:'Self-Loathing', category:'genetic', desc:'Deep-seated hatred of themselves'},
  {name:'Self-Destructive', category:'genetic', desc:'Unconsciously sabotages their own happiness'},
  {name:'Hypochondriac', category:'genetic', desc:'Convinced they are constantly ill or dying'},
  {name:'Paranoid', category:'genetic', desc:'Trusts no one, sees threats in everything'},
  {name:'Neurotic', category:'genetic', desc:'Perpetually anxious and emotionally unstable'},
  
  // Behavioral traits (merged from disadvantages)
  {name:'Hot-Headed', category:'genetic', desc:'Loses temper at the slightest provocation'},
  {name:'Crybaby', category:'genetic', desc:'Bursts into tears at the smallest setbacks'},
  {name:'Doormat', category:'genetic', desc:'Allows everyone to mistreat them without resistance'},
  {name:'Clumsy', category:'genetic', desc:'Prone to accidents, always breaking things'},
  {name:'Forgetful', category:'genetic', desc:'Cannot retain important information'},
  {name:'Easily Distracted', category:'genetic', desc:'Loses focus within seconds'},
  {name:'Impulsive Spender', category:'genetic', desc:'Cannot control spending, always broke'},
  {name:'Compulsive Gambler', category:'genetic', desc:'Addicted to games of chance'},
  {name:'Workaholic', category:'genetic', desc:'Sacrifices all personal life for work'},
  {name:'Recklessly Honest', category:'genetic', desc:'Says hurtful truths without any filter'},
  {name:'Overly Trusting', category:'genetic', desc:'Believes everyone, gets exploited easily'},
  {name:'Commitment-Phobic', category:'genetic', desc:'Flees from any long-term relationship or promise'},
  {name:'Addictive Personality', category:'genetic', desc:'Easily forms addictions to substances or behaviors'},
  {name:'Control Freak', category:'genetic', desc:'Must control every situation or person around them'},
  {name:'Narcissistic Tendencies', category:'genetic', desc:'Excessive self-focus, lacks empathy for others'},
  
  // Unique / Character traits (merged from disadvantages)
  {name:'Manipulation Through Tears', category:'genetic', desc:'Uses crying as a weapon to get what they want'},
  {name:'Chronic Victim', category:'genetic', desc:'Always positions themselves as the wronged party'},
  {name:'Obsessive Planner', category:'genetic', desc:'Cannot handle anything unplanned, spirals in chaos'},
];

const ALL_TRAITS = [...PERSONALITY_TRAITS, ...GENETIC_TRAITS];

const TRAIT_OPPOSITES = {};
PERSONALITY_TRAITS.forEach(t => {
  if (t.opposite) TRAIT_OPPOSITES[t.name] = t.opposite;
});

const TRAIT_CONFLICTS = [
  ['Dominant', 'Submissive'],
  ['Cold Blooded', 'Emotional'],
  ['Stoic', 'Explosive'],
  ['Optimistic', 'Pessimistic'],
  ['Generous', 'Selfish'],
  ['Impulsive', 'Calculating'],
  ['Possessive', 'Independent'],
  ['Confident', 'Insecure'],
  ['Diplomatic', 'Blunt'],
  ['Romantic', 'Pragmatic'],
  ['Hedonistic', 'Disciplined'],
  ['Seductive', 'Innocent'],
  ['Loyal', 'Fickle'],
  ['Adventurous', 'Cautious'],
  ['Ambitious', 'Content'],
  ['Creative', 'Conventional'],
  ['Playful', 'Serious'],
  ['Always Lactate', 'Low Libido'],
  ['High Fertility', 'Low Libido'],
  ['High Libido', 'Low Libido'],
];

const TRAIT_CONFLICT_MAP = {};
TRAIT_CONFLICTS.forEach(([a, b]) => {
  if (!TRAIT_CONFLICT_MAP[a]) TRAIT_CONFLICT_MAP[a] = [];
  if (!TRAIT_CONFLICT_MAP[b]) TRAIT_CONFLICT_MAP[b] = [];
  TRAIT_CONFLICT_MAP[a].push(b);
  TRAIT_CONFLICT_MAP[b].push(a);
});
