// img_prompts.js - Image prompt building
// Depends on: core/utils.js (escapeHTML), core/text.js (cleanReply), core/constants.js (GRP_STYLE_MAP, etc.)

const GRP_STYLE_MAP = {
    'photorealism': 'photorealistic portrait, highly detailed, 8K, cinematic lighting',
    'anime': 'anime style portrait, vibrant colors, soft shading, clean lines',
    'digital_art': 'digital art portrait, vibrant colors, clean lines, modern aesthetic',
    'oil_painting': 'oil painting portrait, rich textures, classical style, warm lighting',
    'watercolor': 'watercolor portrait, soft edges, pastel colors, artistic',
    'sketch': 'pencil sketch portrait, detailed shading, artistic lines',
    'comic': 'comic book style portrait, bold lines, vibrant colors, dynamic',
    'fantasy': 'fantasy portrait, magical atmosphere, ethereal lighting, detailed',
    'cyberpunk': 'cyberpunk portrait, neon lights, futuristic, high tech',
    'noir': 'film noir portrait, black and white, dramatic lighting, shadows',
    'vintage': 'vintage portrait, sepia tones, nostalgic, classic photography',
};

const GRP_STYLE_ENDING_MAP = {
    'photorealism': ', professional photography, sharp focus',
    'anime': ', anime art, clean lines',
    'digital_art': ', digital illustration, vibrant',
    'oil_painting': ', oil on canvas, textured',
    'watercolor': ', watercolor painting, soft',
    'sketch': ', pencil sketch, detailed',
    'comic': ', comic book art, bold',
    'fantasy': ', fantasy art, magical',
    'cyberpunk': ', cyberpunk aesthetic, neon',
    'noir': ', film noir style, dramatic',
    'vintage': ', vintage photography, nostalgic',
};

const GRP_STYLE_SHORT_MAP = {
    'photorealism': 'photo',
    'anime': 'anime',
    'digital_art': 'digital',
    'oil_painting': 'oil',
    'watercolor': 'watercolor',
    'sketch': 'sketch',
    'comic': 'comic',
    'fantasy': 'fantasy',
    'cyberpunk': 'cyber',
    'noir': 'noir',
    'vintage': 'vintage',
};

const GRP_QUALITY_SHORT_MAP = {
    'high': 'HQ',
    'medium': 'MQ',
    'low': 'LQ',
};

const POLLI_BASE_URL = 'https://image.pollinations.ai/prompt';

function sanitizePromptForPollinations(prompt) {
    if (!prompt) return '';
    return prompt.replace(/[^\w\s\-\.,;:!?()'"\/]/g, '').substring(0, 2000);
}

function buildPortraitPromptForModel(bot, style) {
    const parts = [];
    
    if (bot.gender) {
        parts.push(bot.gender === 'Female' ? 'woman' : 'man');
    }
    if (bot.age) {
        parts.push(bot.age + ' years old');
    }
    if (bot.appearance) {
        parts.push(bot.appearance);
    }
    if (bot.bio) {
        parts.push(bot.bio.substring(0, 200));
    }
    if (bot.prompt) {
        parts.push(bot.prompt.substring(0, 200));
    }
    
    const styleDesc = GRP_STYLE_MAP[style] || GRP_STYLE_MAP['photorealism'];
    const styleEnding = GRP_STYLE_ENDING_MAP[style] || GRP_STYLE_ENDING_MAP['photorealism'];
    
    return sanitizePromptForPollinations(parts.join(', ') + ', ' + styleDesc + styleEnding);
}

function buildAvatarPrompt(bot, style) {
    const parts = [];
    
    if (bot.gender) {
        parts.push(bot.gender === 'Female' ? 'woman avatar' : 'man avatar');
    }
    if (bot.appearance) {
        parts.push(bot.appearance);
    }
    if (bot.name) {
        parts.push('character named ' + bot.name);
    }
    
    const styleDesc = GRP_STYLE_MAP[style] || GRP_STYLE_MAP['anime'];
    const styleEnding = GRP_STYLE_ENDING_MAP[style] || GRP_STYLE_ENDING_MAP['anime'];
    
    return sanitizePromptForPollinations(parts.join(', ') + ', ' + styleDesc + styleEnding + ', simple background');
}
