// models.js - AI model management
// Depends on: core/utils.js (safeGetItem, safeSetItem), core/text.js (t)

function getActiveChatModel() {
    const id = safeGetItem('active_model_id', 'groq:llama-3.1-8b-instant');
    return id.replace(/^groq:/, '');
}

const MODEL_LIST = [
    { id: 'groq:llama-3.1-8b-instant', label: 'Llama 3.1 8B', sub: 'Fast · Light · Free tier', color: '#22c55e', req: 'groq' },
    { id: 'groq:meta-llama/llama-4-maverick-17b-128e-instruct', label: 'Llama 4 Maverick', sub: 'Currently unavailable', color: '#888888', req: 'groq', disabled: true },
    { id: 'groq:moonshotai/kimi-k2-instruct-0905', label: 'Kimi K2', sub: 'Moonshot AI · Strong reasoning', color: '#f97316', req: 'groq' },
    { id: 'groq:qwen/qwen3-32b', label: 'Qwen3 32B', sub: 'Qwen · Strong reasoning · Free tier', color: '#a855f7', req: 'groq' },
    { id: 'groq:openai/gpt-oss-20b', label: 'GPT-OSS 20B', sub: 'OpenAI · Compact · Free tier', color: '#3b82f6', req: 'groq' },
];

function getActiveModelId() {
    return safeGetItem('active_model_id', 'groq:llama-3.1-8b-instant');
}

function updateModelBadge() {
    const m = MODEL_LIST.find(m => m.id === getActiveModelId());
    if (!m) return;
    const el = document.getElementById('c-model');
    if (el) { el.textContent = m.label; el.style.color = m.color; el.style.borderColor = m.color + '44'; }
    const grpEl = document.getElementById('grp-c-model');
    if (grpEl) { grpEl.textContent = m.label; grpEl.style.color = m.color; }
}

function toggleModelPicker() {
    const picker = document.getElementById('model-picker');
    const list = document.getElementById('model-picker-list');
    const grKey = getNextGroqKey();
    const activeId = getActiveModelId();
    const curTemp = parseFloat(safeGetItem('ai_temperature') || '1.0');

    list.innerHTML = MODEL_LIST.map(m => {
        const hasKey = grKey.length >= 10;
        const isActive = m.id === activeId;
        const isDisabled = !!m.disabled;
        const clickHandler = isDisabled ? '' : `onclick="selectModel('${m.id}')"`;
        return `<div ${clickHandler} style="
            display:flex;align-items:center;gap:12px;padding:12px 14px;
            border-radius:12px;margin-bottom:8px;
            cursor:${isDisabled ? 'not-allowed' : 'pointer'};
            background:${isActive ? m.color + '22' : 'var(--input-bg)'};
            border:1px solid ${isActive ? m.color : isDisabled ? '#333' : 'var(--border)'};
            opacity:${isDisabled ? '0.4' : hasKey ? '1' : '0.55'}">
            <div style="flex:1">
                <div style="font-size:14px;font-weight:bold;color:${isDisabled ? '#555' : m.color}">${m.label}${isDisabled ? ' 🚫' : ''}</div>
                <div style="font-size:11px;color:var(--text-sub);margin-top:2px">${m.sub}${!hasKey && !isDisabled ? ' · ⚠️ No key' : ''}</div>
            </div>
            ${isActive ? `<i class="fas fa-check-circle" style="color:${m.color};font-size:16px"></i>` : ''}
        </div>`;
    }).join('');

    list.innerHTML += `
        <div style="margin-top:6px;padding:12px 14px;background:var(--input-bg);border:1px solid var(--border);border-radius:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div>
                    <div style="font-size:13px;font-weight:bold;color:var(--text-main)">🌡️ Creativity / Temperature</div>
                    <div style="font-size:10px;color:var(--text-sub);margin-top:2px">Low = focused · High = creative & unpredictable</div>
                </div>
                <span id="temp-display" style="font-size:15px;font-weight:bold;color:#f97316;min-width:32px;text-align:right">${curTemp.toFixed(1)}</span>
            </div>
            <input type="range" id="temp-slider" min="0.1" max="2.0" step="0.1" value="${curTemp}"
                oninput="document.getElementById('temp-display').textContent=parseFloat(this.value).toFixed(1)"
                onchange="safeSetItem('ai_temperature',this.value)"
                style="width:100%;accent-color:#f97316;cursor:pointer">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-sub);margin-top:4px">
                <span>0.1 Precise</span><span>1.0 Balanced</span><span>2.0 Wild</span>
            </div>
        </div>`;

    picker.style.display = 'flex';
}

function selectModel(id) {
    safeSetItem('active_model_id', id);
    document.getElementById('model-picker').style.display = 'none';
    const bioModal = document.getElementById('bio-modal');
    if (bioModal) bioModal.style.display = 'none';
    updateModelBadge();
    if (curId) {
        const bot = bots.find(b => b.id === curId);
        if (bot && bot.history && bot.history.length > 0) {
            renderChat();
            forceSummaryForModelSwitch(bot);
        }
    }
}
