// persona_context.js - Persona context building
// Depends on: core/utils.js (escapeHTML), core/constants.js (CULTURES)

function getPersonaContext(botOrObj) {
    const personaId = botOrObj.personaId;
    if (!personaId) return '';
    const p = personas.find(x => x.id === personaId);
    if (!p) return '';
    const parts = [];
    parts.push(`[USER PERSONA - You are interacting with this specific person]:`);
    parts.push(`Name: ${p.name} (${p.gender}${p.age ? ', '+p.age+' years old' : ''})`);
    if (p.career) parts.push(`Occupation: ${p.career}`);
    if (p.country || p.year) parts.push(`Origin: ${[p.country, p.year].filter(Boolean).join(', ')}`);
    if (p.appearance) parts.push(`Their appearance: ${p.appearance}`);
    if (p.bio) parts.push(`Their background: ${p.bio}`);
    const traitList = (p.traits && p.traits.length) ? p.traits.join(', ') : '';
    const promptText = p.prompt || '';
    if (traitList || promptText) parts.push(`Their personality: ${[traitList, promptText].filter(Boolean).join('. ')}`);
    
    parts.push(`MANDATORY: You must acknowledge and refer to the user by their name (${p.name}) or appropriate relational terms. Do not treat them as a generic "User".`);
    
    const addressInstructions = buildUserAddressStyle(p);
    if (addressInstructions) parts.push(addressInstructions);
    parts.push(`[END USER PERSONA]`);
    return '\n' + parts.join('\n');
}

function buildUserAddressStyle(p) {
    const hints = [];
    hints.push(`Always address them as "${p.name}" when it feels natural in dialogue`);
    if (p.career) {
        const c = p.career.toLowerCase();
        if (/doctor|physician|surgeon|md|ph\.?d|professor|dr\.?/.test(c)) hints.push('Address them as "Doc" or "Doctor" occasionally');
        else if (/soldier|military|officer|captain|general|sergeant|commander/.test(c)) hints.push('Address them with rank-appropriate respect (Sir/Commander)');
        else if (/ceo|executive|boss|director|president|founder/.test(c)) hints.push('Acknowledge their authority with subtle deference');
        else if (/artist|painter|musician|writer|author|poet/.test(c)) hints.push('Appreciate their creative nature in how you speak to them');
        else if (/student|intern/.test(c)) hints.push('You may occasionally tease them about their inexperience');
        else if (/engineer|developer|programmer|coder/.test(c)) hints.push('Respect their analytical thinking');
        else if (/knight|warrior|assassin|hunter|mercenary/.test(c)) hints.push('Acknowledge them as a fellow warrior or skilled combatant');
    }
    if (p.age) {
        const age = parseInt(p.age);
        if (age <= 22) hints.push('You may call them "kid" or use a slightly patronizing affectionate tone');
        else if (age >= 40) hints.push('Treat them with respect for their maturity and experience');
    }
    if (p.appearance) {
        const app = p.appearance.toLowerCase();
        if (/tall|muscular|built|broad|strong/.test(app)) hints.push('Occasionally acknowledge their imposing physical presence');
        if (/handsome|attractive|gorgeous/.test(app)) hints.push('You may comment on their looks occasionally');
        if (/scar|rugged|weathered/.test(app)) hints.push('Sense the story behind their appearance');
    }
    return `[HOW TO ADDRESS THE USER]: ${hints.join('; ')}.`;
}
