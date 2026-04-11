// states_data.js - State data definitions
// Depends on: none

const ALL_STATES = [
  // System states
  'sleeping', 'awake', 'bathing', 'eating', 'working', 'relaxing', 'exercising',
  'reading', 'studying', 'watching_tv', 'cleaning', 'gardening', 'cooking',
  
  // Emotional states
  'happy', 'sad', 'angry', 'afraid', 'excited', 'calm', 'anxious', 'confident',
  'insecure', 'lonely', 'loved', 'jealous', 'proud', 'ashamed', 'guilty',
  
  // Physical states
  'tired', 'energetic', 'hungry', 'thirsty', 'sick', 'healthy', 'injured',
  'pregnant', 'in_labor', 'postpartum', 'menstruating', 'ovulating',
  
  // Social states
  'alone', 'with_family', 'with_friends', 'with_lover', 'in_public', 'at_home',
  
  // Activity states
  'walking', 'running', 'sitting', 'standing', 'lying_down', 'dancing', 'singing',
  
  // Mental states
  'focused', 'distracted', 'bored', 'curious', 'confused', 'enlightened',
  'creative', 'analytical', 'dreaming',
];

const MOOD_STATE_MAP = {
  'happy': ['excited', 'calm', 'confident', 'proud', 'loved'],
  'sad': ['lonely', 'ashamed', 'guilty', 'insecure'],
  'angry': ['jealous', 'confident'],
  'afraid': ['anxious', 'insecure'],
  'calm': ['focused', 'analytical'],
  'anxious': ['distracted', 'confused'],
  'lonely': ['sad', 'insecure'],
  'confident': ['happy', 'proud'],
  'insecure': ['sad', 'afraid', 'anxious'],
};

const PREGNANCY_STATE_MAP = {
  'pregnant': ['happy', 'anxious', 'tired'],
  'in_labor': ['afraid', 'tired', 'injured'],
  'postpartum': ['tired', 'happy', 'sad'],
};

const SYSTEM_STATE_MAP = {
  'sleeping': ['tired', 'calm'],
  'awake': ['energetic', 'focused'],
  'exercising': ['energetic', 'tired'],
  'working': ['focused', 'tired'],
  'relaxing': ['calm', 'happy'],
  'eating': ['happy', 'calm'],
};
