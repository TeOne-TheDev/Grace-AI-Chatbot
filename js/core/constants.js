// constants.js - Application constants
// Depends on: none

const RECENT_MSG_KEEP = 15;
const BYSTANDER_CHANCE_HIGH = 0.58;
const BYSTANDER_CHANCE_LOW = 0.22;
const CHAIN_REACTOR_CHANCE = 0.75;
const CHAIN_RESPONDER_CHANCE = 0.45;
const PASSIVE_DRIFT_CHANCE = 0.05;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_GEN_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_THINK_MODEL = 'llama-3.3-70b-versatile';
const HINT_MODEL = GROQ_GEN_MODEL;
const GROQ_FAST_MODEL = 'llama-3.1-8b-instant';
const GROQ_COMPOUND_MODEL = 'compound-beta';
const GROQ_SCHEDULE_MODEL = 'llama-3.3-70b-versatile';
const DYNBIO_MODEL = 'qwen/qwen3-32b';

const CULTURES = [
    'Japanese', 'Korean', 'Chinese', 'Vietnamese', 'Thai', 'Filipino', 'Indian',
    'British', 'French', 'German', 'Italian', 'Spanish', 'Russian',
    'American', 'Mexican', 'Brazilian', 'Australian',
    'Middle Eastern / Arabic', 'African', 'Nigerian'
];

const ACTIVITY_ROOM_MAP = {
    'sleeping': ['bedroom'],
    'bathing': ['bathroom'],
    'cooking': ['kitchen'],
    'eating': ['kitchen', 'dining'],
    'working': ['office', 'library'],
    'relaxing': ['living', 'patio', 'garden'],
    'exercising': ['gym', 'garden'],
    'reading': ['library', 'living'],
};

const CYCLE_LENGTH = 14;
const _SEND_COOLDOWN_MS = 1200;
