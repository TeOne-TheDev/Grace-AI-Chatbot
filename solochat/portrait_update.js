async function updatePortraitFromChat() {
    const key = getNextGroqKey();
    if (!key || !curId) return;
    const bot = bots.find(b => b.id === curId);

    // In-app confirm instead of browser confirm()
    const confirmed = await _showUpdateBgConfirm(
        `Generate a new background for <b>${bot.name}</b> based on the current chat scene?<br><br>The image will match the mood and setting of your recent conversation.`
    );
    if (!confirmed) return;

    const btn = document.querySelector('.btn-update-portrait');
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }

    const recentHistory = bot.history.slice(-8);
    const historyText = recentHistory.map(m =>
        (m.role === 'user' ? 'User' : bot.name) + ': ' + m.content.replace(/EMOTION::.*/g,'').trim()
    ).join('\n');

    const imgStyle = getImgStyleOverride() || bot.imgStyle || 'photorealism';
    const styleTagMap = {
        'anime': 'anime art style, cel shading, vibrant saturated colors, expressive large eyes, clean precise lineart, Studio Ghibli quality',
        'semi-realistic': 'semi-realistic digital painting, painterly brushwork, soft detailed rendering, concept art quality, ArtStation trending',
        'photorealism': 'photorealism, ultra-high resolution photography, 85mm f/1.4 lens, natural skin texture, subsurface scattering, volumetric lighting, physically accurate shadows, sharp focus, 8K UHD, shot on Sony A7R V',
        'manhwa': 'manhwa webtoon full color, Korean comic art, clean refined linework, detailed cel shading, dramatic cinematic lighting'
    };
    const styleTag = styleTagMap[imgStyle] || styleTagMap['photorealism'];

    let portraitBodyCtx = '';
    let isPregnantPortrait = false;
    let portraitPregWeeks = 0;
    const isFemBotP = (bot.gender||'').toLowerCase().includes('female')||(bot.gender||'').toLowerCase().includes('woman')||(bot.gender||'').toLowerCase()==='f';
    if (isFemBotP && bot.bodyMeasurements) {
        const pm = typeof getCurrentBodyMeasurements === 'function' ? getCurrentBodyMeasurements(bot) : {};
        const pParts = [`${pm.height||165}cm tall`, `${pm.weight||55}kg`];
        if (pm.bust) pParts.push(`bust ${pm.bust}cm (${pm.cup} cup)`);
        if (pm.waist) pParts.push(`waist ${pm.waist}cm`);
        if (pm.hips) pParts.push(`hips ${pm.hips}cm`);
        if (pm.pregnant && pm.pregWeeks) {
            isPregnantPortrait = true;
            portraitPregWeeks = pm.pregWeeks;
            const twinNote = (bot.cycleData && bot.cycleData.twins) ? ' with twins (larger belly)' : '';
            pParts.push(`${pm.pregWeeks} weeks pregnant${twinNote} - very large prominent rounded belly`);
        } else if (pm.postpartum) { pParts.push('postpartum - engorged breasts'); }
        portraitBodyCtx = `\nCurrent body: ${pParts.join(', ')}.`;
    }
    const portraitFraming = isPregnantPortrait ? `full body or three-quarter body shot clearly showing large pregnant belly (${portraitPregWeeks} weeks)` : `waist-up, upper body shot`;
    const pregnantInstruction = isPregnantPortrait ? `\nCRITICAL: She is ${portraitPregWeeks} weeks pregnant - her belly MUST be clearly visible and prominent. Show clothing stretched over large round belly. Full body framing required.` : '';

    try {
        const activeModel = getImgModel();
        const isSmartModel = activeModel === 'grok-imagine' || activeModel === 'imagen-4';

        let finalPrompt;
        const pregnantFinalTag = isPregnantPortrait ? `, ${portraitPregWeeks} weeks pregnant, large round belly clearly visible, clothing stretched over belly, full body shown` : '';

        if (isSmartModel) {
            // ── grok-imagine / imagen-4: build directly - no AI intermediary ──
            // The AI would write SD tags that these models don't understand
            let sceneBgHint = 'detailed atmospheric background from the conversation scene';
            try {
                const sceneSumRes = await fetch(GROQ_API_URL, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: GROQ_FAST_MODEL,
                        messages: [{
                            role: 'user',
                            content: `In ONE sentence (max 20 words), describe ONLY the setting/environment from this chat scene - location, time of day, lighting. No characters, no dialogue.\n\n${historyText}`
                        }],
                        max_tokens: 40, temperature: 0.3
                    }),
                    signal: AbortSignal.timeout(6000)
                });
                const sd = await sceneSumRes.json();
                const bg = (sd.choices?.[0]?.message?.content || '').trim();
                if (bg) sceneBgHint = bg;
            } catch(e) { /* optional - skip if slow */ }

            finalPrompt = buildPortraitPromptForModel({
                name:       bot.name,
                gender:     bot.gender || 'Female',
                age:        bot.age || '',
                appearance: bot.appearance || '',
                series:     bot.series || '',
                imgStyle:   imgStyle,
                poseTag:    portraitFraming,
                bgDesc:     sceneBgHint,
                bodyTag:    portraitBodyCtx.replace(/\nCurrent body: /,''),
                editHint:   '',
                emotion:    ''
            });
        } else {
            // ── SD models: use AI to capture scene expression/pose in SD format ──
            const summarizeRes = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(30000),
                body: JSON.stringify({
                    model: GROQ_GEN_MODEL,
                    messages: [{
                        role: 'user',
                        content: `Based on this roleplay conversation, write ONLY the expression, pose, and background part of an SD image prompt for ${bot.name} (${bot.gender}${bot.year ? ', '+bot.year : ''}${bot.country ? ', '+bot.country : ''}).
DO NOT include character name. DO NOT include style tags. DO NOT include "masterpiece" or "best quality".
Output 2-3 short phrases: (1) exact expression + emotion, (2) body pose and framing (${portraitFraming}), (3) specific detailed background with lighting and atmosphere.${pregnantInstruction}
Max 60 words. Output ONLY these phrases.\n\nConversation:\n${historyText}`
                    }],
                    max_tokens: 100
                })
            });
            const sumData = await summarizeRes.json();
            const sceneDesc = sumData.choices?.[0]?.message?.content?.trim() || '';

            const eraTag3 = [bot.year, bot.country].filter(Boolean).join(', ');

            // Find SD style tag
            const sdStyleMap3 = {
                'anime':         'masterpiece, best quality, highly detailed anime illustration, luminous expressive eyes, vibrant colors, cel shading, sharp lineart, Studio Ghibli inspired',
                'semi-realistic':'masterpiece, best quality, semi-realistic digital painting, painterly rendering, ArtStation trending',
                'photorealism':  'RAW photo, photorealistic, hyperrealistic, 85mm f/1.4 bokeh, natural skin texture, subsurface scattering, 8K UHD, sharp focus, film grain',
                'manhwa':        'masterpiece, best quality, manhwa webtoon full color, Korean comic art, clean linework, vibrant cel shading',
                'artwork':       'masterpiece, best quality, digital illustration, painterly, ArtStation featured, dramatic lighting',
            };
            const styleTag3 = sdStyleMap3[imgStyle] || sdStyleMap3['photorealism'];
            const gToken3 = (bot.gender||'').toLowerCase().includes('male') && !(bot.gender||'').toLowerCase().includes('fe') ? '1boy' : '1girl';
            finalPrompt = `${styleTag3}, ${gToken3}, solo, ${bot.appearance || ''}${eraTag3 ? ', '+eraTag3 : ''}${pregnantFinalTag}${portraitBodyCtx ? ', '+portraitBodyCtx.replace(/\nCurrent body: /,'') : ''}, ${sceneDesc}, cinematic lighting, rim light, depth of field, sharp focus, no watermark, no text, no border`;
        }
        const seed = Math.floor(Math.random() * 999999);
        const blobUrl = await generateImagePollinationsPortrait(finalPrompt, seed);

        bot.portraitUrl = blobUrl;
        saveBots();

        bot.useBg = true;
        saveBots();
        const scChatEl3 = document.getElementById('sc-chat');
        if (scChatEl3) { scChatEl3.style.backgroundImage = `url('${blobUrl}')`; scChatEl3.classList.add('has-bg'); }
        const chatContainer2 = document.getElementById('chat-container');
        if (chatContainer2) { chatContainer2.classList.remove('has-bg'); chatContainer2.style.backgroundImage = ''; }

        showToast('\u2705 Background updated!', '#0a1a0a', '#22c55e');
    } catch(e) {
        logError('updatePortraitFromChat failed', e.message);
        showToast('\u274c Background update failed. See error log.', '#1a0a0a', '#ef4444');
    }

    if (btn) { btn.innerHTML = '<i class="fas fa-image"></i>'; btn.disabled = false; }
}

async function updateAvatarFromChat() {
    if (!getGroqKeys().length || !curId) return;
    const key = getNextGroqKey();
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;

    // In-app confirm instead of browser confirm()
    const confirmed = await _showUpdateAvConfirm(
        `Generate a new avatar for <b>${bot.name}</b> based on recent chat?<br><br>The avatar will reflect their current emotion and appearance.`
    );
    if (!confirmed) return;

    const msgAvatars = document.querySelectorAll('.msg-av');
    msgAvatars.forEach(a => { a.style.opacity = '0.35'; a.style.transition = 'opacity .3s'; });

    try {
        // ── Step 1: detect current emotion from recent chat (lightweight call) ──
        const recentHistory = bot.history.slice(-6);
        const historyText = recentHistory.map(m =>
            (m.role === 'user' ? 'User' : bot.name) + ': ' + (m.content || '').replace(/EMOTION::.*/g,'').trim().substring(0, 120)
        ).join('\n');

        let emotion = '';
        try {
            const emotionRes = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: GROQ_FAST_MODEL,
                    messages: [{ role: 'user', content: `Based on this conversation, what is ${bot.name}'s current emotional expression in ONE word or short phrase (e.g. "happy", "sad", "flirty smile", "nervous", "calm")?\n\n${historyText}\n\nReturn ONLY the expression word/phrase, nothing else.` }],
                    max_tokens: 15, temperature: 0.3
                }),
                signal: AbortSignal.timeout(6000)
            });
            const eData = await emotionRes.json();
            emotion = (eData.choices?.[0]?.message?.content || '').trim().replace(/[.,"']/g, '').toLowerCase();
        } catch(e) { /* emotion is optional - silently skip */ }

        // ── Step 2: build model-appropriate prompt directly ──────────────────
        const imgStyle = getImgStyleOverride() || bot.imgStyle || 'photorealism';

        let bodyStr = '';
        if (bot.bodyMeasurements) {
            const _bm = typeof getCurrentBodyMeasurements === 'function' ? getCurrentBodyMeasurements(bot) : bot.bodyMeasurements;
            const _bp = [];
            if (_bm.height) _bp.push(`${_bm.height}cm tall`);
            if (_bm.bust)   _bp.push(`${_bm.bust}cm bust`);
            if (_bm.waist)  _bp.push(`${_bm.waist}cm waist`);
            if (_bm.hips)   _bp.push(`${_bm.hips}cm hips`);
            if (_bp.length) bodyStr = _bp.join(', ');
        }

        const finalPrompt = buildAvatarPrompt({
            name:       bot.name,
            gender:     bot.gender || 'Female',
            age:        bot.age || '',
            appearance: bot.appearance || '',
            bodyStr,
            imgStyle,
            seriesHint: bot.series || '',
            emotion
        });

        // ── Step 3: generate image ────────────────────────────────────────────
        const seed = Math.floor(Math.random() * 999999);
        const blob = await polliFetch(finalPrompt, seed, 768, 768);
        const resized = await resizeImageBlob(blob, 200, 200);
        const newAvatarB64 = await blobToBase64(resized);

        bot.avatar = newAvatarB64;
        saveBots();

        msgAvatars.forEach(a => { a.src = newAvatarB64; a.style.opacity = '1'; });
        renderBotList();
        showToast('\u2705 Avatar updated!', '#0a1a0a', '#22c55e');
    } catch(e) {
        logError('updateAvatarFromChat failed', e.message);
        msgAvatars.forEach(a => { a.style.opacity = '1'; });
        showToast('\u274c Avatar generation failed - tried all models. Check Error Log.', '#1a0505', '#f87171');
    }
}
