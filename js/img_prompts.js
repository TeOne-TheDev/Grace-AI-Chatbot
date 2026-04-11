const GRP_STYLE_MAP = {
    'anime': 'masterpiece, best quality, highly detailed anime illustration, Disney-Pixar cinematic quality, luminous expressive eyes with detailed iris and catchlights, flowing silky hair with individual strand definition, vibrant jewel-tone color palette, soft volumetric backlighting, atmospheric bokeh background, delicate fabric texture, emotional cinematic atmosphere, sharp crisp linework, rich saturated color grading, Studio Ghibli inspired soft glow',
    'semi-realistic': 'masterpiece, best quality, semi-realistic digital painting, soft painterly rendering, nuanced luminous skin tones, detailed fabric textures, atmospheric depth of field, cinematic 3-point lighting, ArtStation trending concept art, intricate richly detailed environment, warm cinematic color grading, volumetric god rays',
    'photorealism': 'RAW photo, photorealistic, hyperrealistic, DSLR photograph, 85mm lens f/1.4 bokeh, natural skin texture, subsurface skin scattering, real photograph, 8K UHD, tack sharp focus, film grain, physically accurate cinematic lighting, shot on Sony A7R V, professional editorial photography',
    'manhwa': 'masterpiece, best quality, manhwa webtoon full color illustration, Korean comic art, ultra-clean precise linework, vibrant dynamic cel shading, dramatic expressive poses, detailed professional character design, cinematic panel composition, rich bold color blocking, dramatic rim lighting',
    'artwork': 'masterpiece, best quality, stunning digital illustration, painterly concept art technique, dynamic cinematic composition, rich vibrant jewel-tone color palette, dramatic atmospheric lighting with god rays, detailed lush environmental storytelling, ArtStation featured professional quality, intricate material and texture detail, warm cinematic color grading',
    'erotic': 'masterpiece, best quality, detailed illustration, elegant graceful figure, soft dramatic lighting, rich atmospheric color palette, intricate fabric and lace texture, professional refined artistic style, ArtStation quality, beautiful composition'
};

const GRP_STYLE_ENDING_MAP = {
    'anime': 'masterpiece, best quality, highly detailed, vibrant colors, beautiful detailed background, no watermark, no text',
    'semi-realistic': 'masterpiece, best quality, highly detailed, ArtStation, concept art, cinematic, no watermark, no text',
    'photorealism': 'RAW photo, DSLR, photorealistic, hyperrealistic, 8K, tack sharp, no watermark, no text',
    'manhwa': 'masterpiece, best quality, webtoon, full color, highly detailed, clean lines, no watermark, no text',
    'artwork': 'masterpiece, best quality, highly detailed, digital art, painterly, cinematic, ArtStation featured, no watermark, no text',
    'erotic': 'masterpiece, best quality, highly detailed, elegant, soft lighting, no watermark, no text'
};

// Simplified style tags (3-4 tags) for group chat prompts
const GRP_STYLE_SHORT_MAP = {
    'anime': 'anime illustration, vibrant colors, Studio Ghibli inspired, expressive eyes',
    'semi-realistic': 'semi-realistic painting, soft painterly, ArtStation style, cinematic lighting',
    'photorealism': 'photorealistic, DSLR photograph, 85mm lens, natural skin texture',
    'manhwa': 'manhwa webtoon, Korean comic art, clean linework, vibrant cel shading',
    'artwork': 'digital illustration, painterly, cinematic composition, rich colors',
    'erotic': 'elegant illustration, soft lighting, refined artistic style'
};

// Simplified quality tags (3-4 tags) for group chat prompts
const GRP_QUALITY_SHORT_MAP = {
    'anime': 'masterpiece, best quality, highly detailed, vibrant colors',
    'semi-realistic': 'masterpiece, best quality, highly detailed, ArtStation quality',
    'photorealism': '8K UHD, tack sharp focus, professional photography, high resolution',
    'manhwa': 'masterpiece, best quality, clean lines, full color',
    'artwork': 'masterpiece, best quality, highly detailed, ArtStation featured',
    'erotic': 'masterpiece, best quality, highly detailed, elegant style'
};


// Universal NSFW sanitizer - applied to ALL models before sending to Pollinations
const POLLI_BASE_URL = 'https://image.pollinations.ai/prompt/';

function sanitizePromptForPollinations(prompt) {
    return prompt
        .replace(/\b(erotic|sensual|seductive|sultry|alluring|voluptuous|busty|large breasts?|big breasts?|huge breasts?|revealing outfit|naked|nude|topless|explicit|sexual|nsfw|adult content|pornograph\w*|hentai|cleavage|lingerie|bikini|skimpy|underwear|panties|bra|thong|nipple\w*|crotch|bare skin|midriff|thighs exposed|upskirt|bottomless)\b/gi, '')
        .replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim();
}
// ════════════════════════════════════════════════════════════════════════════
// CENTRALIZED PORTRAIT PROMPT BUILDER
// Each image model needs a completely different prompt format.
// This is the single source of truth for ALL portrait/illustration prompts.
//
// params: { name, gender, age, appearance, series, imgStyle,
//           poseTag, bgDesc, bodyTag, editHint, emotion }
// ════════════════════════════════════════════════════════════════════════════
function buildPortraitPromptForModel(params) {
    const {
        name = '', gender = 'Female', age = '', appearance = '',
        series = '', imgStyle = 'photorealism',
        poseTag = '', bgDesc = '', bodyTag = '', editHint = '', emotion = ''
    } = params;

    const model   = getImgModel();
    const isQwen  = model === 'qwen-image';
    const gStr    = gender.toLowerCase();
    const hasSeries = !!(series && series.trim());
    const ageDesc = age ? `${age}-year-old ` : '';
    const emotionTag = emotion ? `, ${emotion} expression` : '';
    const editPart   = editHint ? ` ${editHint}.` : '';

    // ── SD style tag map ─────────────────────────────────────────────────────
    const sdStyleMap = {
        'anime':         'masterpiece, best quality, highly detailed anime illustration, luminous expressive eyes with detailed iris and catchlights, flowing silky hair, vibrant jewel-tone color palette, soft volumetric backlighting, sharp crisp linework, cel shading with subtle gradient, Studio Ghibli inspired soft glow, rich saturated color grading',
        'semi-realistic':'masterpiece, best quality, semi-realistic digital painting, soft painterly rendering, nuanced luminous skin tones, detailed fabric textures, cinematic 3-point lighting, ArtStation trending concept art, intricate detailed environment, warm cinematic color grading',
        'photorealism':  'RAW photo, photorealistic, hyperrealistic, DSLR photograph, 85mm lens f/1.4 bokeh, natural skin texture, subsurface skin scattering, 8K UHD, tack sharp focus, film grain, physically accurate cinematic lighting, shot on Sony A7R V, professional editorial photography',
        'manhwa':        'masterpiece, best quality, manhwa webtoon full color, Korean comic art, ultra-clean precise linework, vibrant dynamic cel shading, dramatic expressive poses, detailed professional character design, cinematic panel composition, rich bold color blocking',
        'artwork':       'masterpiece, best quality, stunning digital illustration, painterly concept art technique, dynamic cinematic composition, rich vibrant jewel-tone color palette, dramatic atmospheric lighting with god rays, detailed environmental storytelling, ArtStation featured professional quality',
        'erotic':        'masterpiece, best quality, detailed illustration, elegant graceful figure, soft dramatic lighting, rich atmospheric color palette, refined artistic style, ArtStation quality, beautiful composition',
        'dirtberry-pro': 'masterpiece, best quality, painterly illustration, elegant detailed portrait, warm artistic lighting, rich textured brushwork, professional concept art',
    };
    const sdEnding = {
        'anime':         'masterpiece, best quality, highly detailed, vibrant colors, perfect anatomy, beautiful detailed background, no watermark, no text',
        'semi-realistic':'masterpiece, best quality, highly detailed, ArtStation, concept art, cinematic, no watermark, no text',
        'photorealism':  'RAW photo, DSLR, photorealistic, hyperrealistic, 8K, tack sharp, no watermark, no text',
        'manhwa':        'masterpiece, best quality, webtoon, full color, highly detailed, clean lines, no watermark, no text',
        'artwork':       'masterpiece, best quality, highly detailed, digital art, painterly, cinematic, ArtStation featured, no watermark, no text',
        'erotic':        'masterpiece, best quality, highly detailed, elegant, soft lighting, no watermark, no text',
        'dirtberry-pro': 'masterpiece, best quality, highly detailed, painterly, warm lighting, no watermark, no text',
    };
    const sdStyle  = sdStyleMap[imgStyle] || sdStyleMap['photorealism'];
    const sdEnd    = sdEnding[imgStyle]   || sdEnding['photorealism'];
    const gToken   = gStr.includes('male') && !gStr.includes('fe') ? '1boy' : '1girl';
    const ageSD    = age ? `, ${age} years old, age-accurate` : ', adult, mature';

    // ════════════════════════════════════════════════════════════════════════
    // QWEN IMAGE - clean natural language, strictly no SD syntax
    // ════════════════════════════════════════════════════════════════════════
    if (isQwen) {
        const styleDescQwen = imgStyle === 'anime' ? 'anime-style illustration' : imgStyle === 'manhwa' ? 'manhwa comic-style illustration' : imgStyle === 'semi-realistic' ? 'semi-realistic digital painting' : imgStyle === 'artwork' ? 'digital artwork' : 'high quality illustration';
        const ageHintImg = age ? `${age}-year-old ` : '';
        const seriesStyleImg = hasSeries ? ` Art style inspired by ${series}.` : '';
        // Appearance-first: physical description before name/series to prevent memory override
        return `${styleDescQwen} of a ${ageHintImg}${gStr}.` +
            (appearance ? ` Appearance: ${appearance}.` : '') +
            (bodyTag ? ` ${bodyTag}.` : '') +
            seriesStyleImg +
            ` ${poseTag || 'Facing viewer'}.` +
            (emotionTag ? ` ${emotion} expression.` : '') +
            (editPart || '') +
            ` ${bgDesc || 'Detailed atmospheric background'}.` +
            ` Character: ${name}.` +
            ` High quality, professional lighting.`;
    }

    // ════════════════════════════════════════════════════════════════════════
    // SD MODELS - zimage, klein, qwen-image
    // Each style needs proper SD tag format
    // ════════════════════════════════════════════════════════════════════════
    const nameHintSD  = hasSeries ? `${name} from ${series}, ` : name ? `${name}, ` : '';
    const posePart    = poseTag  ? `${poseTag}, ` : '';
    const bgPart      = bgDesc   ? `${bgDesc}, ` : '';
    const editSD      = editHint ? `${editHint}, ` : '';

    if (imgStyle === 'anime') {
        // For anime, put most critical visual tokens (hair, eyes) first for maximum fidelity
        // Extract hair and eyes from appearance for priority placement
        const appLower = (appearance || '').toLowerCase();
        const hairMatch = (appearance || '').match(/([^,]*hair[^,]*)/i);
        const eyeMatch  = (appearance || '').match(/([^,]*eye[^,]*)/i);
        const hairTag   = hairMatch ? hairMatch[1].trim() + ', ' : '';
        const eyeTag    = eyeMatch  ? eyeMatch[1].trim()  + ', ' : '';
        const restApp   = (appearance || '').replace(hairMatch ? hairMatch[0] : '', '').replace(eyeMatch ? eyeMatch[0] : '', '').replace(/^,\s*/, '').replace(/,\s*,/g, ',').trim();
        const ageSDAnime = age ? `, ${age} years old, age-accurate` : ', adult, mature adult';
        const maturitySD = age && parseInt(age) >= 30 ? ', mature adult woman, older woman, not a teenager, adult face' : age && parseInt(age) >= 18 ? ', young adult, adult face, not a child' : ', adult';

        return `${nameHintSD}${sdStyle}, ${gToken}, solo, ${posePart}${hairTag}${eyeTag}${emotionTag ? emotion + ', ' : ''}${restApp}${bodyTag ? ', ' + bodyTag : ''}${ageSDAnime}${maturitySD}, ${bgPart}${editSD}${sdEnd}`;
    }
    if (imgStyle === 'manhwa') {
        return `${nameHintSD}${sdStyle}, ${gToken}, solo, ${posePart}${emotionTag ? emotion + ', ' : ''}${appearance}${bodyTag ? ', ' + bodyTag : ''}${ageSD}, ${bgPart}${editSD}${sdEnd}`;
    }
    // photorealism, semi-realistic, artwork, erotic, dirtberry-pro
    return `${nameHintSD}A ${sdStyle} portrait of a ${ageDesc}${gStr} character. ${posePart}${emotionTag ? emotion + ' expression, ' : ''}Appearance: ${appearance}.${bodyTag ? ' ' + bodyTag + '.' : ''} ${bgPart}${editSD}Dramatic cinematic lighting, rim light, depth of field, sharp focus, perfect anatomy, ${sdEnd}`;
}

async function generateImagePollinationsPortrait(prompt, seed, w, h) {
    w = w || 1080; h = h || 1920;
    try {
        const blob = await polliFetch(prompt, seed, w, h);
        return await blobToBase64(blob);
    } catch(e) {
        logError('Portrait generation failed', e.message);
        throw e;
    }
}

async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function resizeImageBlob(blob, maxW, maxH) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            let { naturalWidth: w, naturalHeight: h } = img;
            const ratio = Math.min(maxW / w, maxH / h);
            canvas.width = Math.round(w * ratio);
            canvas.height = Math.round(h * ratio);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(b => resolve(b), 'image/jpeg', 0.82);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
        img.src = url;
    });
}


async function polliFetch(prompt, seed, w, h, forceModel, noEnhance) {
    const selectedModel = getImgModel();
    
    console.log('polliFetch called:', { selectedModel, forceModel });
    
    // Use Pollinations
    const key = getRandomPollinationsKey();
    const base = 'https://gen.pollinations.ai/image/';
    
    console.log('polliFetch using Pollinations:', { model: selectedModel, forceModel, hasKey: !!key, keyLength: key?.length });
    
    const _effectiveModel = selectedModel;

    const internalFlags = ['photorealism'];
    const useRealism = (forceModel === 'photorealism') || (!forceModel && _effectiveModel === 'klein');
    const modelToUse = (forceModel && !internalFlags.includes(forceModel)) ? forceModel : _effectiveModel;

    let finalPrompt = sanitizePromptForPollinations(prompt);
    if (useRealism && (modelToUse === 'klein' || modelToUse === 'zimage')) {
        finalPrompt = finalPrompt
            .replace(/anime|cel shading|illustration|painterly|manhwa|webtoon|artwork|digital art|lineart|Studio Ghibli/gi, '')
            .replace(/,\s*,/g, ',').trim();
        const prefix = 'RAW photo, photorealistic, hyperrealistic, DSLR photograph, 85mm lens f/1.8, natural skin texture, subsurface skin scattering, real photograph, 8K UHD, sharp focus, film grain, physically accurate lighting, no illustration, no painting, no anime, no CGI';
        finalPrompt = prefix + ', ' + finalPrompt;
    }
    if (modelToUse === 'qwen-image') {
        // Qwen Image specific processing - clean natural language
        finalPrompt = finalPrompt
            .replace(/\bextreme close-up\b|\bclose-up\b|\bheadshot\b|\bface only\b|\bface portrait\b|\bface filling frame\b|\bno body visible\b/gi, '')
            .replace(/\bhalf body shot\b|\bwaist-up\b|\bwaist up\b|\bupper body shot\b|\bbust-up shot\b|\bbust-up\b/gi, '')
            .replace(/\bthree-quarter angle\b|\bthree.quarter body\b|\bfull body shot\b|\bfull body\b/gi, '')
            .replace(/\bmasterpiece\b|\bbest quality\b|\bno watermark\b|\bno text\b|\bno border\b|\bno signature\b/gi, '')
            .replace(/\bRAW photo\b|\bDSLR photograph\b|\b85mm f\/[\d.]+\b|\b8K UHD\b|\bfilm grain\b|\bsubsurface scattering\b/gi, '')
            .replace(/,\s*,/g, ',').replace(/\.\s*\./g, '.').trim();
        finalPrompt = 'Front view, camera directly facing the character at eye level, character looking at viewer, not from above, not top-down. ' + finalPrompt;
    }

    const enc = encodeURIComponent(finalPrompt.length > 800 ? finalPrompt.substring(0, 800) : finalPrompt);

    console.log('%c[Image Generation Prompt]', 'color: #a855f7; font-weight: bold; font-size: 14px');
    console.log(`%c${finalPrompt}`, 'color: #3b82f6; font-style: italic');

    const candidates = [];
    const headers = {};
    // Sanitize key: only remove BOM and zero-width/invisible chars that cause fetch header errors
    // Keep all standard ASCII and extended ASCII chars that are valid in API keys
    const sanitizedKey = key 
        ? key.replace(/^\uFEFF/, '') // Remove BOM
             .replace(/[\u200B-\u200D\uFEFF\u2060\u00AD]/g, '') // Remove zero-width chars
             .trim()
        : '';
    console.log('API Key debug - original length:', key?.length, 'sanitized length:', sanitizedKey.length);
    if (sanitizedKey && sanitizedKey.length > 5) headers['Authorization'] = 'Bearer ' + sanitizedKey;

    // ── Build fallback chain ──────────────────────────────────────────────────
    const modelIdMap = { 'zimage': 'zimage', 'klein': 'klein', 'qwen-image': 'qwen-image' };
    const primaryModel = (forceModel === 'photorealism') ? 'klein'
        : (modelIdMap[modelToUse] || modelToUse);
    const _isRealismModel = primaryModel === 'klein';
    const commonParams = `width=${w}&height=${h}&seed=${seed}&nologo=true${noEnhance ? '' : ''}`;
    candidates.push({ url: `${base}${enc}?${commonParams}&model=${primaryModel}`, label: primaryModel });

    // Fallback 1: zimage (stable, high quality) - skip if it's already primary
    if (primaryModel !== 'zimage' && primaryModel !== 'klein' && primaryModel !== 'qwen-image') {
        candidates.push({ url: `${base}${enc}?${commonParams}&model=zimage`, label: 'zimage-fallback' });
    }
    // Fallback 2: klein - skip if already used
    if (primaryModel !== 'klein' && primaryModel !== 'qwen-image') {
        candidates.push({ url: `${base}${enc}?${commonParams}&model=klein`, label: 'klein-fallback' });
    }
    // Fallback 3: qwen-image
    if (primaryModel !== 'qwen-image') {
        candidates.push({ url: `${base}${enc}?${commonParams}&model=qwen-image`, label: 'qwen-image-fallback' });
    }
    // Fallback 4 & 5: FREE models - always available regardless of pollen balance
    if (primaryModel !== 'flux-realism') {
        candidates.push({ url: `${base}${enc}?${commonParams}&model=flux-realism`, label: 'flux-realism-fallback' });
    }
    if (primaryModel !== 'flux') {
        candidates.push({ url: `${base}${enc}?${commonParams}&model=flux`, label: 'flux-fallback' });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Content-filtered response detection: Pollinations returns a tiny placeholder
    // image (~1–4 KB) when a prompt is blocked. Real images are always > 6 KB.
    const CONTENT_FILTER_THRESHOLD = 6000;

    let lastErr;
    for (let i = 0; i < candidates.length; i++) {
        const { url, label } = candidates[i];
        try {
            // Brief delay between retries to avoid hammering the API
            if (i > 0) {
                const delay = i === 1 ? 2000 : 3500;
                const jitter = Math.random() * 1500;
                await new Promise(r => setTimeout(r, delay + jitter));
            }
            const resp = await fetch(url, { headers, signal: AbortSignal.timeout(90000) });
            if (!resp.ok) {
                const errBody = await resp.text().catch(() => '');
                console.error(`polliFetch: HTTP ${resp.status} for ${label}`, errBody.substring(0, 200));
                continue;
            }
            const blob = await resp.blob();
            return blob;
        } catch(e) {
            lastErr = e;
            if (i === candidates.length - 1) {
                logError('Image generation failed after all fallbacks (' + label + ')', e.message);
            }
        }
    }
    throw lastErr || new Error('All image generation attempts failed');
}


async function loadImageWithFallback(imgEl, prompt, seed, onSuccess, onAllFail, charName) {
    const cleanPrompt = (prompt || '').replace(/[*]/g, '').trim();
    const safeSeed = seed || Math.floor(Math.random() * 999999);

    try {
        const blob = await polliFetch(cleanPrompt, safeSeed, 1024, 1024);
        const b64 = await blobToBase64(blob);
        imgEl.src = b64;
        imgEl.style.cursor = 'pointer';
        imgEl.onclick = () => openImgZoom(b64);
        onSuccess(b64);
        return;
    } catch(e) {
        logError('Illust gen all attempts failed', e.message);
    }

    onAllFail('');
}
// ── Per-model avatar prompt builder ─────────────────────────────────────────
// Each image model expects a very different prompt format.
// This function returns the right prompt for the active model.
function buildAvatarPrompt({ name, gender, age, appearance, bodyStr, imgStyle, seriesHint, emotion }) {
    const model = getImgModel();
    const gStr = (gender || 'Female').toLowerCase();
    const gToken = gStr === 'male' ? '1boy' : '1girl';
    const ageTag = age ? `, ${age} years old` : '';
    const ageBoost = age ? `, exactly ${age} years old face, age-accurate` : ', adult, mature face';
    const nameHint = name ? name + (seriesHint ? ` from ${seriesHint}` : '') + ', ' : '';
    const emotionTag = emotion ? `, ${emotion} expression` : '';

    const styleTagMapSD = {
        'anime':         'masterpiece, best quality, anime illustration, luminous expressive eyes, vibrant colors, cel shading, sharp crisp linework, Studio Ghibli inspired',
        'semi-realistic':'masterpiece, best quality, semi-realistic digital painting, soft painterly rendering, ArtStation trending',
        'photorealism':  'RAW photo, photorealistic, hyperrealistic, 85mm f/1.4 lens, natural skin texture, subsurface scattering, soft studio lighting, 8K UHD, sharp focus',
        'manhwa':        'masterpiece, best quality, manhwa webtoon, Korean comic art, ultra-clean linework, vibrant cel shading',
        'artwork':       'masterpiece, best quality, detailed digital artwork, painterly, ArtStation featured',
        'dirtberry-pro': 'masterpiece, best quality, painterly illustration, elegant detailed portrait, warm artistic lighting',
    };

    // ── qwen-image: clean natural language, no SD tags ──────────────────────────
    if (model === 'qwen-image') {
        const ageDesc = age ? `${age}-year-old ` : '';
        const bodyDesc = bodyStr ? ` Body: ${bodyStr}.` : '';
        const emotionDesc = emotion ? ` Expression: ${emotion}.` : '';
        return `A close-up portrait photograph of a ${ageDesc}${gStr} character. ` +
               `Physical appearance: ${appearance || 'not specified'}.${bodyDesc}${emotionDesc}` +
               ` Headshot composition, soft bokeh background, professional studio lighting.`;
    }

    // ── SD-based models: zimage, klein, qwen-image ─
    const styleTag = styleTagMapSD[imgStyle] || styleTagMapSD['photorealism'];
    const bodyTag = bodyStr ? ` Body: ${bodyStr}.` : '';

    if (imgStyle === 'anime') {
        return `${nameHint}${styleTag}, ${gToken}, solo, face close-up portrait, from shoulders to top of head, simple gradient background, centered framing${ageTag}${emotionTag}${ageBoost}. Appearance: ${appearance || ''}${bodyTag}. Expressive detailed eyes, sharp clean lineart, no watermark, no text.`;
    }
    return `${nameHint}${styleTag}, ${gToken}, solo, headshot portrait, face and shoulders, looking at viewer${ageTag}${emotionTag}${ageBoost}. Appearance: ${appearance || ''}${bodyTag}. Detailed face, soft bokeh background, no watermark, no text.`;
}


// Generate portrait using Pollinations AI
async function generatePortraitUnified(prompt, seed, w, h) {
    console.log('%c[Image Generation Service]', 'color: #0084ff; font-weight: bold; font-size: 14px', 'Using: Pollinations AI');
    const blob = await polliFetch(prompt, seed, w, h);
    return await blobToBase64(blob);
}
