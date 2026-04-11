// img_generation.js - Image generation functions
// Depends on: images/img_prompts.js (buildPortraitPromptForModel, buildAvatarPrompt), core/storage.js (savePortraitUrl), api/keys.js (getGroqKeys, getRandomPollinationsKey), core/ui_helpers.js (showToast, logError), core/i18n.js (t), core/constants.js (POLLI_BASE_URL)

function getPortraitPoseTag(bot) {
    if (!bot) return 'standing';
    const traits = bot.traits || [];
    if (traits.includes('Seductive') || traits.includes('Hedonistic')) return 'alluring pose';
    if (traits.includes('Dominant')) return 'confident pose';
    if (traits.includes('Submissive')) return 'gentle pose';
    if (traits.includes('Stoic')) return 'stoic pose';
    if (traits.includes('Playful')) return 'playful pose';
    return 'natural pose';
}

function getPortraitExpressionTag(bot) {
    if (!bot) return 'neutral expression';
    const traits = bot.traits || [];
    if (traits.includes('Cold Blooded')) return 'cold expression';
    if (traits.includes('Emotional')) return 'emotional expression';
    if (traits.includes('Optimistic')) return 'warm smile';
    if (traits.includes('Pessimistic')) return 'serious expression';
    if (traits.includes('Confident')) return 'confident smile';
    if (traits.includes('Insecure')) return 'shy expression';
    if (traits.includes('Romantic')) return 'dreamy expression';
    return 'natural expression';
}

function getPortraitDimensions() {
    return { width: 1080, height: 1920 };
}

function toggleTheme() {
    const current = safeGetItem('img_theme', 'light');
    const newTheme = current === 'light' ? 'dark' : 'light';
    safeSetItem('img_theme', newTheme);
    return newTheme;
}

async function generatePortrait(botId) {
    if (!getGroqKeys().length && !getRandomPollinationsKey()) {
        alert(t('needKey'));
        return;
    }
    
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    
    const style = bot.imgStyle || 'photorealism';
    const prompt = buildPortraitPromptForModel(bot, style);
    const pose = getPortraitPoseTag(bot);
    const expression = getPortraitExpressionTag(bot);
    const fullPrompt = prompt + ', ' + pose + ', ' + expression;
    
    const btn = document.getElementById('btn-generate-portrait');
    if (btn) btn.disabled = true;
    
    try {
        const polliKey = getRandomPollinationsKey();
        const url = POLLI_BASE_URL + '/' + encodeURIComponent(fullPrompt) + 
            (polliKey ? '?key=' + polliKey : '') + 
            '&width=1080&height=1920&nologo=true&seed=' + bot.id;
        
        const res = await fetch(url);
        const blob = await res.blob();
        const base64 = await blobToBase64(blob);
        
        savePortraitUrl(botId, base64);
        bot.portraitUrl = '__stored__';
        saveBots();
        
        const preview = document.getElementById('portrait-preview');
        if (preview) {
            preview.src = base64;
            preview.style.display = 'block';
        }
        
        showToast('✅ Portrait generated!', '#0a1a0a', '#22c55e');
    } catch (e) {
        logError('generatePortrait failed', e.message);
        alert('Generation failed: ' + e.message);
    }
    
    if (btn) btn.disabled = false;
}

async function regeneratePortraitWithEdit(botId, editPrompt) {
    if (!getGroqKeys().length && !getRandomPollinationsKey()) {
        alert(t('needKey'));
        return;
    }
    
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    
    const style = bot.imgStyle || 'photorealism';
    const basePrompt = buildPortraitPromptForModel(bot, style);
    const fullPrompt = basePrompt + ', ' + editPrompt;
    
    const btn = document.getElementById('btn-regen-portrait');
    if (btn) btn.disabled = true;
    
    try {
        const polliKey = getRandomPollinationsKey();
        const url = POLLI_BASE_URL + '/' + encodeURIComponent(fullPrompt) + 
            (polliKey ? '?key=' + polliKey : '') + 
            '&width=1080&height=1920&nologo=true&seed=' + (botId + Date.now());
        
        const res = await fetch(url);
        const blob = await res.blob();
        const base64 = await blobToBase64(blob);
        
        savePortraitUrl(botId, base64);
        bot.portraitUrl = '__stored__';
        saveBots();
        
        const preview = document.getElementById('portrait-preview');
        if (preview) {
            preview.src = base64;
        }
        
        showToast('✅ Portrait regenerated!', '#0a1a0a', '#22c55e');
    } catch (e) {
        logError('regeneratePortraitWithEdit failed', e.message);
        alert('Generation failed: ' + e.message);
    }
    
    if (btn) btn.disabled = false;
}

async function bioEditAndSavePortrait(botId) {
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    
    const editPrompt = document.getElementById('portrait-edit-prompt')?.value?.trim();
    if (!editPrompt) {
        alert('Please describe the changes you want');
        return;
    }
    
    await regeneratePortraitWithEdit(botId, editPrompt);
}

async function drawAvatar(botId) {
    if (!getGroqKeys().length && !getRandomPollinationsKey()) {
        alert(t('needKey'));
        return;
    }
    
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    
    const style = bot.imgStyle || 'anime';
    const prompt = buildAvatarPrompt(bot, style);
    
    const btn = document.getElementById('btn-draw-avatar');
    if (btn) btn.disabled = true;
    
    try {
        const polliKey = getRandomPollinationsKey();
        const url = POLLI_BASE_URL + '/' + encodeURIComponent(prompt) + 
            (polliKey ? '?key=' + polliKey : '') + 
            '&width=256&height=256&nologo=true&seed=' + bot.id;
        
        const res = await fetch(url);
        const blob = await res.blob();
        const base64 = await blobToBase64(blob);
        
        bot.avatar = base64;
        saveBots();
        
        const preview = document.getElementById('av-preview');
        if (preview) {
            preview.src = base64;
        }
        
        showToast('✅ Avatar generated!', '#0a1a0a', '#22c55e');
    } catch (e) {
        logError('drawAvatar failed', e.message);
        alert('Generation failed: ' + e.message);
    }
    
    if (btn) btn.disabled = false;
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function resizeImageBlob(blob, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (maxHeight / height) * width;
                height = maxHeight;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(resolve, 'image/jpeg', 0.9);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
    });
}

function polliFetch(prompt, options = {}) {
    const polliKey = getRandomPollinationsKey();
    const width = options.width || 1080;
    const height = options.height || 1920;
    const seed = options.seed || Date.now();
    
    const url = POLLI_BASE_URL + '/' + encodeURIComponent(prompt) + 
        (polliKey ? '?key=' + polliKey : '') + 
        `&width=${width}&height=${height}&nologo=true&seed=${seed}`;
    
    return fetch(url);
}

function loadImageWithFallback(url, fallbackUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            if (fallbackUrl) {
                const fallbackImg = new Image();
                fallbackImg.onload = () => resolve(fallbackImg);
                fallbackImg.onerror = reject;
                fallbackImg.src = fallbackUrl;
            } else {
                reject();
            }
        };
        img.src = url;
    });
}

async function generatePortraitUnified(botId, style) {
    if (!getGroqKeys().length && !getRandomPollinationsKey()) {
        alert(t('needKey'));
        return;
    }
    
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    
    const prompt = buildPortraitPromptForModel(bot, style || bot.imgStyle || 'photorealism');
    
    try {
        const polliKey = getRandomPollinationsKey();
        const url = POLLI_BASE_URL + '/' + encodeURIComponent(prompt) + 
            (polliKey ? '?key=' + polliKey : '') + 
            '&width=1080&height=1920&nologo=true&seed=' + bot.id;
        
        const res = await fetch(url);
        const blob = await res.blob();
        const base64 = await blobToBase64(blob);
        
        savePortraitUrl(botId, base64);
        bot.portraitUrl = '__stored__';
        bot.imgStyle = style || bot.imgStyle || 'photorealism';
        saveBots();
        
        return base64;
    } catch (e) {
        logError('generatePortraitUnified failed', e.message);
        throw e;
    }
}

// Migrated from js/img_prompts.js - generates a portrait via Pollinations and returns base64
async function generateImagePollinationsPortrait(prompt, seed, w, h) {
    w = w || 1080; h = h || 1920;
    try {
        const blob = await polliFetch(prompt, seed, w, h);
        return await blobToBase64(blob);
    } catch (e) {
        logError('Portrait generation failed', e.message);
        throw e;
    }
}
