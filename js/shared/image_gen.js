// image_gen.js -- Portrait & Avatar generation (extracted from shared.js)
// Depends on: shared.js globals (bots, curId, fetchGroq, getImgModel, polliFetch,
//             blobToBase64, resizeImageBlob, buildPortraitPromptForModel, buildAvatarPrompt,
//             generateImagePollinationsPortrait, logError, t)

function getPortraitPoseTag(pose, personality) {
    const poseMap = {
        'portrait': 'extreme close-up face portrait, face filling frame, no body visible, ultra detailed face and eyes',
        'half': 'half body shot, waist-up, face and torso visible, natural three-quarter angle',
        'fullbody': 'full body shot, head to toe, standing, complete figure visible, detailed outfit and shoes',
        'sitting': 'sitting pose, relaxed comfortable posture, full or half body, casual scene',
        'action': 'dynamic action pose, motion blur energy, powerful stance, full body, dramatic angle',
        'side': 'side profile view, facing left or right, elegant silhouette, half or full body',
        'back': 'view from behind, character looking away or over shoulder, mysterious atmosphere',
        'lying': 'lying down pose, reclining, relaxed, horizontal composition',
        'sexy': 'full body confident pose, elegant alluring stance, fashion model look, direct camera gaze'
    };
    
    // Creative random poses for AUTO mode
    const creativePoses = [
        'dramatic low angle shot, powerful heroic stance, looking down at viewer with confidence',
        'soft dreamy pose, gentle tilt of head, wistful gaze into distance, romantic atmosphere',
        'mischievous playful pose, slight smirk, one eye closed in wink, dynamic energy',
        'contemplative pose, hand on chin, deep in thought, intellectual aura',
        'fierce battle-ready stance, intense focus, windswept dramatic effect',
        'elegant dance pose, graceful arm position, fluid movement frozen in time',
        'mysterious hooded figure pose, partial shadow on face, intriguing ambiguity',
        'carefree laughing pose, head thrown back, genuine joy captured, candid moment',
        'brooding intense pose, arms crossed, powerful presence, commanding attention',
        'delicate fragile pose, slightly hunched, vulnerable yet beautiful, emotional depth',
        'confident stride pose, mid-walk captured, purposeful movement, determined expression',
        'serene meditative pose, peaceful expression, spiritual aura, harmonious composition',
        'flirtatious pose, playful hair twirl, coy smile, charming energy',
        'defiant rebellious pose, challenging gaze, bold stance, strong personality',
        'tender nurturing pose, gentle hand placement, soft maternal energy, warm atmosphere'
    ];
    
    if (pose === 'auto' || !poseMap[pose]) {
        // 30% chance for completely random creative pose, 70% personality-based
        if (Math.random() < 0.3) {
            return creativePoses[Math.floor(Math.random() * creativePoses.length)];
        }
        
        const p = personality.toLowerCase();
        // Expanded personality matching with more variety
        if (p.includes('action') || p.includes('warrior') || p.includes('fighter') || p.includes('combat')) {
            const actionPoses = [
                'dynamic action pose, powerful stance, full body, dramatic angle',
                'mid-battle pose, weapon ready, intense combat stance, heroic angle',
                'fierce warrior stance, battle-ready posture, commanding presence'
            ];
            return actionPoses[Math.floor(Math.random() * actionPoses.length)];
        }
        if (p.includes('shy') || p.includes('gentle') || p.includes('sweet')) {
            const shyPoses = [
                'half body, soft shy pose, slightly turned, gentle demeanor',
                'demure pose, looking down modestly, gentle hand placement, tender atmosphere',
                'timid reserved pose, slight shoulder hunch, vulnerable expression, soft lighting'
            ];
            return shyPoses[Math.floor(Math.random() * shyPoses.length)];
        }
        if (p.includes('confident') || p.includes('bold') || p.includes('leader')) {
            const confidentPoses = [
                'confident full body pose, strong stance, direct gaze toward viewer',
                'commanding pose, chin up proudly, dominant presence, powerful posture',
                'charismatic pose, engaging camera directly, magnetic presence, assured stance'
            ];
            return confidentPoses[Math.floor(Math.random() * confidentPoses.length)];
        }
        if (p.includes('mysterious') || p.includes('cold') || p.includes('aloof')) {
            const mysteriousPoses = [
                'three-quarter profile, half body, distant gaze, enigmatic pose',
                'shadowed mysterious pose, partial face hidden, intriguing silhouette',
                'cool detached pose, looking away thoughtfully, unreadable expression'
            ];
            return mysteriousPoses[Math.floor(Math.random() * mysteriousPoses.length)];
        }
        if (p.includes('playful') || p.includes('cheerful') || p.includes('energetic')) {
            const playfulPoses = [
                'playful dynamic pose, half body, lively natural energy',
                'bubbly energetic pose, mid-laugh captured, vibrant movement',
                'carefree joyful pose, spontaneous gesture, infectious happiness'
            ];
            return playfulPoses[Math.floor(Math.random() * playfulPoses.length)];
        }
        if (p.includes('seductive') || p.includes('flirty') || p.includes('alluring')) {
            const seductivePoses = [
                'alluring confident pose, subtle invitation in stance, magnetic attraction',
                'sensual elegant pose, graceful curve of body, captivating gaze',
                'provocative yet tasteful pose, playful teasing expression, sophisticated allure'
            ];
            return seductivePoses[Math.floor(Math.random() * seductivePoses.length)];
        }
        if (p.includes('elegant') || p.includes('noble') || p.includes('refined')) {
            const elegantPoses = [
                'regal noble pose, graceful posture, aristocratic bearing, sophisticated elegance',
                'poised dignified pose, perfect posture, refined gestures, cultured presence',
                'graceful ballet-like pose, fluid arm position, delicate refinement'
            ];
            return elegantPoses[Math.floor(Math.random() * elegantPoses.length)];
        }
        
        // Default with variety
        const defaultPoses = [
            'natural half body pose, relaxed authentic stance, three-quarter angle toward viewer',
            'casual natural pose, slight lean, approachable demeanor, genuine expression',
            'balanced composed pose, subtle weight shift, natural beauty, effortless charm'
        ];
        return defaultPoses[Math.floor(Math.random() * defaultPoses.length)];
    }
    return poseMap[pose];
}

function getPortraitExpressionTag(personality) {
    const p = personality.toLowerCase();
    if (p.includes('cold') || p.includes('stern') || p.includes('serious') || p.includes('stoic')) return 'serious composed expression, neutral controlled gaze, subtle intensity';
    if (p.includes('sad') || p.includes('melancholy') || p.includes('broken') || p.includes('lonely')) return 'melancholic pensive expression, soft sorrowful eyes, quiet emotion';
    if (p.includes('fierce') || p.includes('aggressive') || p.includes('wild') || p.includes('dangerous')) return 'fierce intense expression, sharp predatory eyes, powerful gaze';
    if (p.includes('playful') || p.includes('cheerful') || p.includes('bubbly') || p.includes('fun')) return 'bright cheerful smile, sparkling eyes, infectious joy';
    if (p.includes('shy') || p.includes('timid') || p.includes('reserved') || p.includes('quiet')) return 'soft shy expression, slightly averted gaze, gentle half-smile';
    if (p.includes('mysterious') || p.includes('enigmatic') || p.includes('secretive')) return 'mysterious ambiguous expression, knowing half-smile, cryptic gaze';
    if (p.includes('seductive') || p.includes('flirty') || p.includes('charming') || p.includes('alluring')) return 'confident expression, subtle smirk, magnetic eye contact';
    if (p.includes('kind') || p.includes('warm') || p.includes('caring') || p.includes('gentle')) return 'warm genuine smile, soft kind eyes, approachable expression';
    if (p.includes('arrogant') || p.includes('proud') || p.includes('haughty')) return 'proud confident smirk, slightly raised chin, superior gaze';
    return 'natural authentic expression fitting their personality, genuine emotion in eyes';
}

function getPortraitDimensions(ratio) {
    // Standard Pollinations dimensions
    const dims = {
        '9:16': [1080, 1920],
        '1:1':  [1080, 1080],
        '16:9': [1920, 1080],
        '3:4':  [1080, 1440],
        '2:3':  [1080, 1620]
    };
    return dims[ratio] || [1080, 1920];
}


// ════════════════════════════════════════════════════════════════════════════

async function generatePortrait() {
    const gender     = document.getElementById('bot-gender').value;
    const name       = document.getElementById('bot-name').value.trim();
    const personality= document.getElementById('bot-prompt').value.trim();
    const appearance = document.getElementById('bot-app').value.trim();
    const imgStyle   = document.getElementById('bot-img-style').value;
    const pose       = (document.getElementById('portrait-ratio') || {}).value ? (document.getElementById('portrait-pose')||{value:'auto'}).value : 'auto';
    const ratio      = (document.getElementById('portrait-ratio') || {value:'9:16'}).value;

    if (!gender || !name || !appearance) {
        const missing = [];
        if (!gender) missing.push('Gender');
        if (!name) missing.push('Name');
        if (!appearance) missing.push('Appearance');
        alert('Please fill in: ' + missing.join(' + ') + ' first!');
        return;
    }

    const btn     = document.getElementById('btn-gen-portrait');
    const loadEl  = document.getElementById('portrait-loading');
    const preview = document.getElementById('portrait-preview');
    btn.disabled  = true;
    loadEl.style.display = 'block';
    preview.style.display = 'none';

    const poseTag       = getPortraitPoseTag(pose, personality);
    const expressionTag = getPortraitExpressionTag(personality);
    const bioHint       = document.getElementById('bot-bio').value.trim();
    const ageVal        = document.getElementById('bot-age')?.value.trim() || '';
    const countryVal    = document.getElementById('bot-country')?.value.trim() || '';
    const yearVal       = document.getElementById('bot-year')?.value.trim() || '';
    const seriesEl      = document.getElementById('ai-series');
    const seriesVal     = seriesEl?.value.trim() || '';
    const [w, h]        = getPortraitDimensions(ratio);

    const settingCtx = [seriesVal, countryVal, yearVal].filter(Boolean).join(', ');
    const bgDesc = settingCtx
        ? `in a richly detailed environment fitting the world of ${settingCtx}, dramatic atmospheric lighting`
        : bioHint
            ? `in a cinematic environment fitting: ${bioHint.substring(0, 80)}, atmospheric lighting`
            : 'in a richly detailed atmospheric location, dramatic lighting, vivid background';

    let bodyTag = '';
    const _editBot = bots ? bots.find(b => b.id === curId) : null;
    if (_editBot && _editBot.bodyMeasurements) {
        const _bm = typeof getCurrentBodyMeasurements === 'function' ? getCurrentBodyMeasurements(_editBot) : _editBot.bodyMeasurements;
        const _p = [];
        if (_bm.height) _p.push(`${_bm.height}cm`);
        if (_bm.bust)   _p.push(`bust ${_bm.bust}cm`);
        if (_bm.waist)  _p.push(`waist ${_bm.waist}cm`);
        if (_bm.hips)   _p.push(`hips ${_bm.hips}cm`);
        if (_p.length) bodyTag = _p.join(', ');
    }

    // For anime/series characters with a Groq key: ask GPT-OSS to craft
    // an optimal image prompt for the selected model - much more accurate than template
    let prompt;
    const _groqKey = getNextGroqKey() || null;
    const _activeImgModel = getImgModel();
    const _hasSeries = !!(seriesVal && seriesVal.trim());
    const _isAnimeStyle = imgStyle === 'anime' || imgStyle === 'manhwa' || imgStyle === 'semi-realistic';

    if (_groqKey) {
        try {
            loadEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Crafting optimal image prompt...';

            // Style descriptor - driven entirely by user selection
            const styleDesc = {
                'anime':          'anime style illustration',
                'photorealism':   'photorealistic, hyperrealistic, cinematic lighting, tack sharp focus, DSLR quality',
                'artwork':        'digital concept art illustration, painterly, atmospheric lighting',
                'erotic':         'elegant digital illustration, graceful figure, soft artistic lighting',
            }[imgStyle] || imgStyle;

            const _ageN = ageVal ? parseInt(ageVal) : 0;
            const _maturity = _ageN >= 30 ? ', mature adult woman, defined facial features, adult proportions, not a teenager'
                : _ageN >= 18 ? ', young adult woman, adult face, not a child' : '';

            const _promptReq = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${_groqKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: GROQ_SCHEDULE_MODEL,
                    max_tokens: 400,
                    temperature: 0.1,
                    messages: [{
                        role: 'system',
                        content: 'You are an image prompt engineer. Your only job: write one image generation prompt. Return ONLY the prompt, no explanation, no labels, no markdown.'
                    }, {
                        role: 'user',
                        content: `Write one image generation prompt for this character.

IDENTITY (reproduce exactly - this defines who they are):
${_hasSeries ? '- ' + name + ' from ' + seriesVal : '- Name: ' + name}
- ${gender}${ageVal ? ', age ' + ageVal : ''}
- Identifying features: ${appearance}${bodyTag ? ', ' + bodyTag : ''}${_maturity}

SHOT:
- ${poseTag || 'full body, standing, looking at viewer'}
- ${bgDesc}

ART STYLE (use exactly these words, do not change or add to them):
${styleDesc}

RULES:
1. Start with the art style words above
2. Then: name + series (if known) for identity anchor
3. Then: ALL of the following in order - hair (color+style+length), eye color, skin tone, FULL OUTFIT (every clothing item with color and fit exactly as listed), accessories, markings/tattoos
4. End with pose and background
5. One line, no line breaks, under 150 words
6. Do NOT invent or omit any visual features listed above - include every clothing item
7. Add at end: ultra detailed, intricate details, sharp focus, highly detailed face and clothing`
                    }]
                }),
                signal: AbortSignal.timeout(15000),
            });
            const _pdata = await _promptReq.json();
            const _aiPrompt = (_pdata.choices?.[0]?.message?.content || '').trim().replace(/```[\s\S]*?```/g, '').trim();
            if (_aiPrompt && _aiPrompt.length > 10) {
                prompt = _aiPrompt;
                logError('Portrait AI prompt', _aiPrompt);
            }
        } catch(pe) {
            logError('Portrait prompt AI failed', pe.message);
        }
    }

    // Fallback to template if AI prompt failed
    if (!prompt) {
        prompt = buildPortraitPromptForModel({
            name, gender, age: ageVal, appearance,
            imgStyle, poseTag, bgDesc, bodyTag,
            editHint: '', emotion: expressionTag
        });
    }

    loadEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span id="lbl-portrait-drawing">Drawing background...</span>';

    try {
        const blobUrl = await generatePortraitUnified(prompt, Math.floor(Math.random() * 999999), w, h);
        preview.src = blobUrl;
        preview.style.display = 'block';
        document.getElementById('bot-portrait-url').value = blobUrl;
        document.getElementById('portrait-edit-section').style.display = 'block';
    } catch(e) {
        logError('Portrait generation failed', e.message || e);
        console.error('Portrait generation error details:', e);
        const isFiltered = (e.message || '').toLowerCase().includes('filter');
        const isNetworkError = (e.message || '').toLowerCase().includes('network') || (e.message || '').toLowerCase().includes('fetch');
        const isKeyError = (e.message || '').toLowerCase().includes('key') || (e.message || '').toLowerCase().includes('auth');
        if (isNetworkError) {
            loadEl.innerHTML = '<span style="color:#ef4444">❌ Network error. Check your internet connection.</span>';
        } else if (isKeyError) {
            loadEl.innerHTML = '<span style="color:#ef4444">❌ API key invalid. Check your Pollinations key in Settings.</span>';
        } else if (isFiltered) {
            loadEl.innerHTML = '<span style="color:#ef4444">⚠️ Prompt blocked by image filter. Try a different Pose or Image Style.</span>';
        } else {
            loadEl.innerHTML = '<span style="color:#ef4444">❌ Portrait generation failed: ' + (e.message || 'Unknown error') + '</span>';
        }
        loadEl.style.display = 'block';
        btn.disabled = false;
        return;
    }
    loadEl.style.display = 'none';
    btn.disabled = false;
}

async function regeneratePortraitWithEdit() {
    const editPrompt = document.getElementById('portrait-edit-prompt').value.trim();
    const gender     = document.getElementById('bot-gender').value;
    const name       = document.getElementById('bot-name').value.trim();
    const personality= document.getElementById('bot-prompt').value.trim();
    const appearance = document.getElementById('bot-app').value.trim();
    const imgStyle   = document.getElementById('bot-img-style').value;
    const pose       = (document.getElementById('portrait-pose') || {value:'auto'}).value;
    const ratio      = (document.getElementById('portrait-ratio') || {value:'9:16'}).value;

    const poseTag       = getPortraitPoseTag(pose, personality);
    const expressionTag = getPortraitExpressionTag(personality);
    const bioHint       = document.getElementById('bot-bio').value.trim();
    const ageVal        = document.getElementById('bot-age')?.value.trim() || '';
    const countryVal    = document.getElementById('bot-country')?.value.trim() || '';
    const yearVal       = document.getElementById('bot-year')?.value.trim() || '';
    const seriesEl      = document.getElementById('ai-series');
    const seriesVal     = seriesEl?.value.trim() || '';
    const [w, h]        = getPortraitDimensions(ratio);

    const settingCtx = [seriesVal, countryVal, yearVal].filter(Boolean).join(', ');
    const bgDesc = settingCtx
        ? `in a richly detailed environment fitting the world of ${settingCtx}, dramatic atmospheric lighting`
        : bioHint
            ? `in a cinematic environment fitting: ${bioHint.substring(0, 80)}`
            : 'in a richly detailed atmospheric location, dramatic lighting';

    let bodyTag = '';
    const _editBot2 = bots ? bots.find(b => b.id === curId) : null;
    if (_editBot2 && _editBot2.bodyMeasurements) {
        const _bm = typeof getCurrentBodyMeasurements === 'function' ? getCurrentBodyMeasurements(_editBot2) : _editBot2.bodyMeasurements;
        const _p = [];
        if (_bm.height) _p.push(`${_bm.height}cm`);
        if (_bm.bust)   _p.push(`bust ${_bm.bust}cm`);
        if (_bm.waist)  _p.push(`waist ${_bm.waist}cm`);
        if (_bm.hips)   _p.push(`hips ${_bm.hips}cm`);
        if (_p.length) bodyTag = _p.join(', ');
    }

    const prompt = buildPortraitPromptForModel({
        name, gender, age: ageVal, appearance,
        imgStyle, poseTag, bgDesc, bodyTag,
        editHint: editPrompt, emotion: expressionTag
    });

    const btn    = document.getElementById('btn-regen-portrait');
    const loadEl = document.getElementById('portrait-loading');
    const preview= document.getElementById('portrait-preview');
    if (btn) btn.disabled = true;
    loadEl.style.display = 'block';

    try {
        const blobUrl = await generatePortraitUnified(prompt, Math.floor(Math.random() * 999999), w, h);
        preview.src = blobUrl;
        preview.style.display = 'block';
        document.getElementById('bot-portrait-url').value = blobUrl;
    } catch(e) {
        logError('Portrait regen failed', e.message || e);
        const isFiltered = (e.message || '').toLowerCase().includes('filter');
        loadEl.innerHTML = isFiltered
            ? '<span style="color:#ef4444">⚠️ Prompt blocked by image filter. Try a different Pose or Image Style.</span>'
            : '<span style="color:#ef4444">❌ Regeneration failed. Try again.</span>';
        loadEl.style.display = 'block';
        if (btn) btn.disabled = false;
        return;
    }
    loadEl.style.display = 'none';
    if (btn) btn.disabled = false;
}

function toggleTheme() {
    const curr = document.documentElement.getAttribute('data-theme');
    const next = curr === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    safeSetItem('grace_theme', next);
}


async function bioEditAndSavePortrait() {
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    const editPrompt = document.getElementById('bio-portrait-edit-prompt').value.trim();
    const statusEl = document.getElementById('bio-portrait-status');
    const btn = statusEl.previousElementSibling.querySelector('button');

    statusEl.style.display = 'block';
    statusEl.textContent = '⏳ Generating portrait...';
    btn.disabled = true;

    try {
        const imgStyle = getImgStyleOverride() || bot.imgStyle || 'photorealism';
        const styleTagMap = {
            'anime': 'anime art style, cel shading, vibrant colors, clean lineart',
            'semi-realistic': 'semi-realistic digital painting, painterly brushwork, concept art',
            'photorealism': 'photorealism, ultra-high resolution photography, 85mm f/1.4 lens, natural skin texture, subsurface scattering, volumetric lighting, physically accurate shadows, sharp focus, 8K UHD, shot on Sony A7R V',
            'manhwa': 'manhwa webtoon art style, Korean comic, dramatic cinematic lighting',
            'artwork': 'detailed digital artwork illustration, painterly, ArtStation featured',
            'erotic': 'detailed illustration, elegant figure, soft dramatic lighting'
        };
        const styleTag = styleTagMap[imgStyle] || styleTagMap['photorealism'];
        let portraitPrompt = `${bot.gender}, ${bot.name}, ${bot.appearance || ''}, ${styleTag}, portrait, 9:16, FHD`;
        if (editPrompt) portraitPrompt += `, ${editPrompt}`;
        if (bot.portraitUrl && editPrompt) portraitPrompt = `${editPrompt}, ${portraitPrompt}`;

        const seed = Math.floor(Math.random() * 999999);
        const blob = await polliFetch(portraitPrompt, seed, 1080, 1920);
        if (!blob.type.startsWith('image/')) throw new Error('Response is not an image');
        const dataUrl = await blobToBase64(blob);

        bot.portraitUrl = dataUrl;
        bot.useBg = true;
        saveBots();

        const portrait = document.getElementById('p-portrait');
        const ph = document.getElementById('p-portrait-ph');
        portrait.src = dataUrl;
        portrait.style.display = 'block';
        ph.style.display = 'none';

        bot.useBg = true;
        const scChatEl2 = document.getElementById('sc-chat');
        if (scChatEl2) { scChatEl2.style.backgroundImage = `url(${dataUrl})`; scChatEl2.classList.add('has-bg'); }
        const chatCont = document.getElementById('chat-container');
        if (chatCont) { chatCont.classList.remove('has-bg'); chatCont.style.backgroundImage = ''; }

        statusEl.textContent = '✅ Background saved!';
        setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
    } catch(e) {
        statusEl.textContent = '❌ Error: ' + e.message;
    }
    btn.disabled = false;
}

async function drawAvatar() {
    const app = document.getElementById('bot-app').value.trim();
    if (!app) return alert(t('needApp'));

    const btn = document.getElementById('btn-draw');
    const drawSpan = document.getElementById('lbl-draw-btn');
    const drawIcon = btn ? btn.querySelector('i') : null;
    if (drawIcon) drawIcon.className = 'fas fa-spinner fa-spin';
    if (drawSpan) drawSpan.innerText = '';
    btn.disabled = true;

    const charName  = document.getElementById('bot-name').value.trim() || '';
    const gender    = document.getElementById('bot-gender').value || 'Female';
    const ageRaw    = document.getElementById('bot-age')?.value.trim() || '';
    const imgStyle  = document.getElementById('bot-img-style')?.value || 'photorealism';
    const seed      = Math.floor(Math.random() * 999999);

    const _seriesEl = document.getElementById('ai-series');
    const seriesHint = _seriesEl?.value.trim() || '';

    // Body measurements
    let bodyStr = '';
    const _editBot = bots ? bots.find(b => b.id === curId) : null;
    if (_editBot && _editBot.bodyMeasurements) {
        const _bm = typeof getCurrentBodyMeasurements === 'function' ? getCurrentBodyMeasurements(_editBot) : _editBot.bodyMeasurements;
        const _bp = [];
        if (_bm.height) _bp.push(`${_bm.height}cm tall`);
        if (_bm.bust)   _bp.push(`${_bm.bust}cm bust`);
        if (_bp.length) bodyStr = _bp.join(', ');
    }

    const prompt = buildAvatarPrompt({
        name: charName, gender, age: ageRaw,
        appearance: app,
        bodyStr, imgStyle, seriesHint,
        emotion: ''
    });

    const preview = document.getElementById('av-preview');
    preview.style.opacity = '0.5';
    const nextDrawLabel = t('redrawBtn');

    try {
        const blob = await polliFetch(prompt, seed, 768, 768, null, true);
        const resized = await resizeImageBlob(blob, 200, 200);
        const b64 = await blobToBase64(resized);
        preview.src = b64;
        preview.style.opacity = '1';
        document.getElementById('bot-av-url').value = b64;
    } catch(e) {
        logError('drawAvatar failed', e.message);
        preview.style.opacity = '1';
    } finally {
        if (drawSpan) drawSpan.innerText = nextDrawLabel;
        if (drawIcon) drawIcon.className = 'fas fa-wand-magic-sparkles';
        btn.disabled = false;
    }
}
