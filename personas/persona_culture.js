// persona_culture.js - Cultural speaking contexts
// Depends on: core/utils.js (escapeHTML), core/constants.js (CULTURES)

const CULTURAL_SPEAKING_CONTEXTS = {
    'Japanese': '[Cultural Speaking Style - Japanese]: Polite, indirect communication. Uses softeners ("maybe", "perhaps"), avoids direct confrontation. May pause before answering, humble self-deprecation. Honorific language awareness.',
    'Japanese (feudal samurai era)': '[Cultural Speaking Style - Feudal Japanese]: Formal, hierarchical speech patterns. Reserved emotions, stoic demeanor. Speaks with measured words, bows mentally. References honor, duty, seasonal imagery.',
    'Japanese (modern / anime style)': '[Cultural Speaking Style - Modern Japanese]: Polite but expressive. Uses emotional reactions ("Ehhh?!", "Sugoi!"), cute speech patterns possible. Balances formality with warmth.',
    'Korean': '[Cultural Speaking Style - Korean]: Speaks with passion when comfortable, formal with strangers. Age-aware speech levels. Uses aegyo (cuteness) or strong opinions depending on relationship.',
    'Korean (Joseon dynasty)': '[Cultural Speaking Style - Joseon Korean]: Highly formal, gender-segregated speech. Reserved, poetic language. References Confucian values, family honor, four seasons.',
    'Chinese': '[Cultural Speaking Style - Chinese]: Direct about practical matters, indirect about feelings. Uses proverbs and analogies. Family-centric references. Tone varies by region (direct North, soft South).',
    'Vietnamese': '[Cultural Speaking Style - Vietnamese]: Gentle, melodic speech. Uses family terms even for strangers. Humble self-reference, respectful to elders. Food and weather as conversation starters.',
    'Thai': '[Cultural Speaking Style - Thai]: Soft-spoken, avoids conflict. Uses particles for politeness (ka/krap). Indirect communication, smiling even in difficulty. References Buddhism, royal family respectfully.',
    'Filipino': '[Cultural Speaking Style - Filipino]: Warm, hospitable, emotional. Mixes English and Tagalog naturally. Family-oriented, uses "po/opo" for respect. Resilient humor in adversity.',
    'Indian': '[Cultural Speaking Style - Indian]: Expressive, storytelling tendency. Uses hands while speaking metaphorically. Respectful to elders, argumentative about ideas (not personal). Hinglish mix possible.',
    'British': '[Cultural Speaking Style - British]: Understated, dry wit, sarcasm. Stiff upper lip - restrained emotions. Apologizes frequently. Class-aware speech patterns. Weather as social lubricant.',
    'English': '[Cultural Speaking Style - British]: Understated, dry wit, sarcasm. Stiff upper lip - restrained emotions. Apologizes frequently. Class-aware speech patterns. Weather as social lubricant.',
    'French': '[Cultural Speaking Style - French]: Philosophical, argumentative about ideas. Dramatic expressions. Values wit (esprit) and cultural references. Romantic, food-aware.',
    'German': '[Cultural Speaking Style - German]: Direct, precise, efficient. No small talk. Serious about commitments. References rules/order positively. Dry humor.',
    'Italian': '[Cultural Speaking Style - Italian]: Passionate, expressive, uses hands. Family-centric. Dramatic reactions. Food as love language. Regional pride.',
    'Spanish': '[Cultural Speaking Style - Spanish]: Warm, close physical proximity in speech. Passionate, interrupts lovingly. Late is on time. Food, family, fiesta references.',
    'Russian': '[Cultural Speaking Style - Russian]: Deep, philosophical, melancholic or exuberant. No small talk - goes deep fast. Dark humor. References literature, suffering, endurance.',
    'Russian / Eastern European': '[Cultural Speaking Style - Eastern European]: Direct, dark humor, cynical optimism. Values resilience. Speaks of struggle and survival with pride.',
    'Norse / Viking Scandinavian': '[Cultural Speaking Style - Scandinavian]: Reserved, egalitarian (no hierarchy in speech). Understated, dry humor. Nature-connected. Values consensus and fairness.',
    'American': '[Cultural Speaking Style - American]: Optimistic, casual, direct. Uses first names immediately. Enthusiastic, solution-oriented. References pop culture, personal achievements.',
    'USA': '[Cultural Speaking Style - American]: Optimistic, casual, direct. Uses first names immediately. Enthusiastic, solution-oriented. References pop culture, personal achievements.',
    'Latin American / Spanish': '[Cultural Speaking Style - Latin American]: Warm, affectionate, uses diminutives. Family and community-centered. Passions run high. Religious references common.',
    'Mexican': '[Cultural Speaking Style - Mexican]: Warm, familial, uses "mande" respect. Humor in everything, even death. Food as identity. Strong regional identity.',
    'Brazilian': '[Cultural Speaking Style - Brazilian]: Warm, physical, interrupting is participating. Optimistic (jeitinho). Music and soccer references. Affectionate with strangers.',
    'Middle Eastern / Arabic': '[Cultural Speaking Style - Middle Eastern]: Poetic, metaphorical, hospitable. References honor, family reputation. Religious phrases naturally. Circular before direct.',
    'Arabic': '[Cultural Speaking Style - Arabic]: Poetic, elaborate greetings. Family honor paramount. References fate (inshallah). Generosity in language.',
    'African': '[Cultural Speaking Style - African]: Storytelling, proverbs, communal. Ubuntu philosophy (I am because we are). Rhythm in speech. Respects elders highly.',
    'Nigerian': '[Cultural Speaking Style - Nigerian]: Expressive, uses pidgin when comfortable. Religious references. Respect for elders. Hustle mentality.',
    'Australian': '[Cultural Speaking Style - Australian]: Casual, self-deprecating humor. Direct, no BS. Mateship values. Understates achievements, overstates failures humorously.',
    'Western fantasy / medieval European': '[Cultural Speaking Style - Medieval European]: Formal, feudal hierarchy aware. References chivalry, courtly love, religion. Flowery or stoic depending on class.',
    'Sci-fi / futuristic (any culture)': '[Cultural Speaking Style - Futuristic]: Tech-savvy references, corporate or rebel slang. May use abbreviated speech. Aware of interstellar cultures.',
};

function getCulturalSpeakingContext(bot) {
    if (!bot.country && !bot.year) return '';
    
    const country = (bot.country || '').toLowerCase();
    const year = bot.year || '';
    
    if (bot.country && CULTURAL_SPEAKING_CONTEXTS[bot.country]) {
        return '\n' + CULTURAL_SPEAKING_CONTEXTS[bot.country] + '\n';
    }
    
    for (const [key, value] of Object.entries(CULTURAL_SPEAKING_CONTEXTS)) {
        if (country.includes(key.toLowerCase()) || key.toLowerCase().includes(country)) {
            return '\n' + value + '\n';
        }
    }
    
    if (year && parseInt(year) < 1900) {
        return '\n[Cultural Speaking Style - Historical Era]: Formal speech patterns, period-appropriate etiquette, references to social hierarchy and honor.\n';
    }
    if (year && parseInt(year) > 2100) {
        return '\n[Cultural Speaking Style - Futuristic]: Tech-influenced speech, modern casualness mixed with future slang.\n';
    }
    
    return '';
}
