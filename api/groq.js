// groq.js - Groq API calls
// Depends on: api/keys.js (getGroqKeys, getNextGroqKey), core/utils.js (safeGetItem, safeSetItem), core/constants.js (GROQ_API_URL, GROQ_GEN_MODEL, GROQ_COMPOUND_MODEL)

async function fetchGroq(body) {
    const keys = getGroqKeys();
    if (!keys.length) { alert(t('needKey')); throw new Error('No Groq key'); }
    const startIdx = parseInt(safeGetItem('groq_key_idx', '0') || '0', 10);
    let lastErr;

    console.group(`[AI REQUEST - ${body.model}]`);
    console.log("Full Payload:", body);
    if (body.messages) {
        console.group("Messages Stream:");
        body.messages.forEach((m, idx) => {
            console.log(`${idx}. [${m.role.toUpperCase()}] ${m.content}`);
        });
        console.groupEnd();
    }
    console.groupEnd();

    for (let i = 0; i < keys.length; i++) {
        const idx = (startIdx + i) % keys.length;
        const key = keys[idx];
        try {
            const res = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(30000)
            });
            const data = await res.json();
            
            console.group(`[AI RESPONSE - ${body.model}]`);
            if (data.choices?.[0]) {
                const msg = data.choices[0].message;
                console.log("Content:", msg.content);
                if (msg.reasoning_content) console.log("Reasoning (Thinking):", msg.reasoning_content);
                console.log("Usage:", data.usage);
            } else {
                console.warn("No valid response content:", data);
            }
            console.groupEnd();

            if (data.error) {
                throw new Error(data.error.message || JSON.stringify(data.error));
            }
            if (!data.choices?.[0]) {
                throw new Error('No choices');
            }
            const _m = data.choices[0].message;
            if (_m && (!_m.content || !_m.content.trim()) && _m.reasoning_content) {
                _m.content = _m.reasoning_content;
            }
            if (_m && _m.content) {
                const _origUtil = _m.content;
                _m.content = _m.content.replace(/<thinking>[\s\S]*?<\/think>/gi, '').trim();
                _m.content = _m.content.replace(/<thinking>[\s\S]*/gi, '').trim();
                if (!_m.content && _origUtil) {
                    const _thinkM = _origUtil.match(/<thinking>([\s\S]*?)<\/think>/i);
                    _m.content = _thinkM ? _thinkM[1].trim() : _origUtil.replace(/<\/?think>/gi, '').trim();
                }
            }
            if (_m && !_m.content && _m.reasoning_content) {
                _m.content = _m.reasoning_content.replace(/<\/?think>/gi, '').trim();
            }
            safeSetItem('groq_key_idx', ((startIdx + i + 1) % keys.length).toString());
            if (typeof trackTokens === 'function') trackTokens(data.usage, !!window._grpTurnActive);
            return data;
        } catch (e) {
            lastErr = e;
            logError('Groq key #' + (idx + 1) + ' failed, trying next...', e.message);
        }
    }
    if (body.model === GROQ_COMPOUND_MODEL) {
        logError('fetchGroq', 'compound-beta failed on all keys, retrying with ' + GROQ_GEN_MODEL);
        return fetchGroq({ ...body, model: GROQ_GEN_MODEL });
    }
    throw lastErr;
}

async function fetchGroqChat(messages, maxTokens) {
    const keys = getGroqKeys();
    if (!keys.length) { alert('Please set up your Groq API Key in Settings first!'); throw new Error('No Groq key'); }
    const startIdx = parseInt(safeGetItem('groq_key_idx', '0') || '0', 10);
    let lastErr;
    for (let i = 0; i < keys.length; i++) {
        const idx = (startIdx + i) % keys.length;
        const key = keys[idx];
        try {
            const activeModel = getActiveChatModel();
            const isLlama = /llama/i.test(activeModel);
            const isKimi = /kimi/i.test(activeModel);

            let kimiMessages = messages;
            if (isKimi) {
                const KIMI_WARMTH = `CRITICAL VOICE DIRECTIVE: You are playing a warm, emotionally present human character. Your replies must feel alive - use sensory details, hesitations, physicality, warmth. NEVER sound clinical, formal, or robotic. Write with emotion: let her voice crack, laugh, whisper, ache. Short sentences. Real feelings. No AI cadence.`;
                kimiMessages = messages.map((m, idx) => {
                    if (m.role === 'system') return { ...m, content: m.content + '\n\n' + KIMI_WARMTH };
                    return m;
                });
            }
            const chatBody = {
                model: activeModel,
                max_tokens: maxTokens || getReplyMaxTokens(),
                messages: isKimi ? kimiMessages : messages,
                temperature: (() => {
                    const userTemp = parseFloat(safeGetItem('ai_temperature') || '0');
                    if (userTemp >= 0.1) return userTemp;
                    return isLlama ? 1.05 : isKimi ? 1.0 : 0.95;
                })(),
            };
            if (isLlama) {
                chatBody.frequency_penalty = 0.55;
                chatBody.presence_penalty = 0.45;
            }
            if (isKimi) {
                chatBody.frequency_penalty = 0.4;
                chatBody.presence_penalty = 0.35;
            }
            const res = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(chatBody),
                signal: AbortSignal.timeout(30000)
            });
            const data = await res.json();
            console.log('[Groq Raw Response]', JSON.stringify(data, null, 2));
            if (data.error) {
                throw new Error(data.error.message || JSON.stringify(data.error));
            }
            const _msg = data.choices?.[0]?.message;
            if (!_msg) {
                throw new Error('No message in response');
            }
            console.log('[Groq Message]', JSON.stringify(_msg, null, 2));

            if ((!_msg.content || !_msg.content.trim()) && _msg.reasoning_content) {
                _msg.content = _msg.reasoning_content;
            }
            if (_msg.content) {
                const _origContent = _msg.content;
                _msg.content = _msg.content.replace(/<thinking>[\s\S]*?<\/think>/gi, '').trim();
                _msg.content = _msg.content.replace(/<thinking>[\s\S]*/gi, '').trim();
                if (!_msg.content && _origContent) {
                    const _thinkMatch = _origContent.match(/<thinking>([\s\S]*?)<\/think>/i);
                    _msg.content = _thinkMatch ? _thinkMatch[1].trim() : _origContent.replace(/<\/?think>/gi, '').trim();
                }
            }
            if (!_msg.content && _msg.reasoning_content) {
                _msg.content = _msg.reasoning_content.replace(/<\/?think>/gi, '').trim();
            }
            if (!_msg.content) {
                throw new Error('Empty response');
            }
            safeSetItem('groq_key_idx', ((startIdx + i + 1) % keys.length).toString());
            if (typeof trackTokens === 'function') trackTokens(data.usage, !!window._grpTurnActive);
            return data;
        } catch (e) {
            lastErr = e;
            logError('Groq key #' + (idx + 1) + ' failed, trying next...', e.message);
        }
    }
    throw lastErr;
}

async function callLlama(systemPrompt, userPrompt, model, temperature, maxTokens) {
    if (!getGroqKeys().length) { alert(t('needKey')); throw new Error('No Groq key'); }
    const _model = model || GROQ_GEN_MODEL;
    const _temp = temperature !== undefined ? temperature : 0.9;
    const _max = maxTokens || 200;
    try {
        const data = await fetchGroq({
            model: _model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: _max,
            temperature: _temp
        });
        return data.choices?.[0]?.message?.content || '';
    } catch (e) {
        logError('callLlama failed', e.message);
        throw e;
    }
}
