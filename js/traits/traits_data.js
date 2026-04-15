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
  ['Parasite Host', 'Always Overdue'],
  ['Parasite Host', 'Always Multiples'],
  ['Monster Pregnancy', 'Parasite Host'],
  ['Hyper-Virility', 'Infertile'],
];

const TRAIT_CONFLICT_MAP = {};
TRAIT_CONFLICTS.forEach(([a, b]) => {
  if (!TRAIT_CONFLICT_MAP[a]) TRAIT_CONFLICT_MAP[a] = [];
  if (!TRAIT_CONFLICT_MAP[b]) TRAIT_CONFLICT_MAP[b] = [];
  TRAIT_CONFLICT_MAP[a].push(b);
  TRAIT_CONFLICT_MAP[b].push(a);
});
