// traits_picker.js - Trait selection UI
// Depends on: traits/traits_data.js (ALL_TRAITS, PERSONALITY_TRAITS, GENETIC_TRAITS, TRAIT_CONFLICT_MAP), core/ui_helpers.js (diceSpin, setDiceLoading, logError), api/groq.js (callLlama), core/i18n.js (t, getLang), core/constants.js (GROQ_GEN_MODEL), bots/bot_storage.js (saveBots)

let selectedTraits = new Map();
let selectedDisadvantages = new Set();
let selectedPersonaTraits = new Map();

function openTraitPicker() {
    const picker = document.getElementById('trait-picker');
    const list = document.getElementById('trait-list');
    if (!picker || !list) return;
    
    list.innerHTML = ALL_TRAITS.map(t => {
        const isSelected = selectedTraits.has(t.name);
        const isConflict = getConflictingSelectedTraits(t.name).length > 0;
        const clickHandler = isConflict ? '' : `onclick="toggleTrait('${t.name}')"`;
        return `
            <div ${clickHandler} style="
                display:flex;align-items:center;gap:10px;padding:10px 12px;
                border-radius:8px;margin-bottom:6px;
                cursor:${isConflict ? 'not-allowed' : 'pointer'};
                background:${isSelected ? '#3b156b33' : 'var(--input-bg)'};
                border:1px solid ${isSelected ? '#6d28d9' : isConflict ? '#ef4444' : 'var(--border)'};
                opacity:${isConflict ? '0.5' : '1'}">
                <div style="flex:1">
                    <div style="font-size:13px;font-weight:bold;color:${isSelected ? '#b259ff' : 'var(--text-main)'}">${t.name}</div>
                    <div style="font-size:11px;color:var(--text-sub)">${t.desc}</div>
                </div>
                ${isSelected ? '<i class="fas fa-check" style="color:#b259ff"></i>' : ''}
                ${isConflict ? '<span style="color:#ef4444;font-size:11px">⚠️ Conflict</span>' : ''}
            </div>
        `;
    }).join('');
    
    picker.style.display = 'flex';
}

function closeTraitPicker() {
    const picker = document.getElementById('trait-picker');
    if (picker) picker.style.display = 'none';
}

function toggleTrait(name) {
    if (selectedTraits.has(name)) {
        selectedTraits.delete(name);
    } else {
        if (selectedTraits.size >= MAX_PERSONALITY_TRAITS) {
            alert(`Maximum ${MAX_PERSONALITY_TRAITS} personality traits allowed`);
            return;
        }
        selectedTraits.set(name, true);
    }
    renderTraitChips();
    openTraitPicker();
}

function getConflictingSelectedTraits(traitName) {
    const conflicts = TRAIT_CONFLICT_MAP[traitName] || [];
    return conflicts.filter(c => selectedTraits.has(c));
}

function renderTraitChips() {
    const container = document.getElementById('trait-chips');
    if (!container) return;
    
    const chips = [];
    selectedTraits.forEach((v, name) => {
        chips.push(`<span class="trait-chip" onclick="removeTraitChip(this, '${name}')">${name} <i class="fas fa-times"></i></span>`);
    });
    container.innerHTML = chips.join('');
}

function removeTraitChip(btn, name) {
    selectedTraits.delete(name);
    renderTraitChips();
}

function filterTraitPicker(q) {
    const list = document.getElementById('trait-list');
    if (!list) return;
    
    const filtered = ALL_TRAITS.filter(t => 
        t.name.toLowerCase().includes(q.toLowerCase()) ||
        t.desc.toLowerCase().includes(q.toLowerCase())
    );
    
    list.innerHTML = filtered.map(t => {
        const isSelected = selectedTraits.has(t.name);
        const isConflict = getConflictingSelectedTraits(t.name).length > 0;
        const clickHandler = isConflict ? '' : `onclick="toggleTrait('${t.name}')"`;
        return `
            <div ${clickHandler} style="
                display:flex;align-items:center;gap:10px;padding:10px 12px;
                border-radius:8px;margin-bottom:6px;
                cursor:${isConflict ? 'not-allowed' : 'pointer'};
                background:${isSelected ? '#3b156b33' : 'var(--input-bg)'};
                border:1px solid ${isSelected ? '#6d28d9' : isConflict ? '#ef4444' : 'var(--border)'};
                opacity:${isConflict ? '0.5' : '1'}">
                <div style="flex:1">
                    <div style="font-size:13px;font-weight:bold;color:${isSelected ? '#b259ff' : 'var(--text-main)'}">${t.name}</div>
                    <div style="font-size:11px;color:var(--text-sub)">${t.desc}</div>
                </div>
                ${isSelected ? '<i class="fas fa-check" style="color:#b259ff"></i>' : ''}
                ${isConflict ? '<span style="color:#ef4444;font-size:11px">⚠️ Conflict</span>' : ''}
            </div>
        `;
    }).join('');
}

function setTraitTab(tab) {
    const tabs = document.querySelectorAll('.trait-tab');
    tabs.forEach(t => t.classList.remove('active'));
    document.getElementById(`trait-tab-${tab}`).classList.add('active');
    
    const list = document.getElementById('trait-list');
    if (!list) return;
    
    const traits = tab === 'personality' ? PERSONALITY_TRAITS : GENETIC_TRAITS;
    list.innerHTML = traits.map(t => {
        const isSelected = selectedTraits.has(t.name);
        const isConflict = getConflictingSelectedTraits(t.name).length > 0;
        const clickHandler = isConflict ? '' : `onclick="toggleTrait('${t.name}')"`;
        return `
            <div ${clickHandler} style="
                display:flex;align-items:center;gap:10px;padding:10px 12px;
                border-radius:8px;margin-bottom:6px;
                cursor:${isConflict ? 'not-allowed' : 'pointer'};
                background:${isSelected ? '#3b156b33' : 'var(--input-bg)'};
                border:1px solid ${isSelected ? '#6d28d9' : isConflict ? '#ef4444' : 'var(--border)'};
                opacity:${isConflict ? '0.5' : '1'}">
                <div style="flex:1">
                    <div style="font-size:13px;font-weight:bold;color:${isSelected ? '#b259ff' : 'var(--text-main)'}">${t.name}</div>
                    <div style="font-size:11px;color:var(--text-sub)">${t.desc}</div>
                </div>
                ${isSelected ? '<i class="fas fa-check" style="color:#b259ff"></i>' : ''}
                ${isConflict ? '<span style="color:#ef4444;font-size:11px">⚠️ Conflict</span>' : ''}
            </div>
        `;
    }).join('');
}

function addCustomTrait() {
    const name = document.getElementById('custom-trait-name').value.trim();
    const desc = document.getElementById('custom-trait-desc').value.trim();
    if (!name || !desc) { alert('Please fill in both name and description'); return; }
    
    ALL_TRAITS.push({ name, category: 'personality', desc });
    selectedTraits.set(name, true);
    renderTraitChips();
    openTraitPicker();
    
    document.getElementById('custom-trait-name').value = '';
    document.getElementById('custom-trait-desc').value = '';
}

function updateTraitCountBadge() {
    const badge = document.getElementById('trait-count-badge');
    if (badge) badge.textContent = `${selectedTraits.size}/${MAX_PERSONALITY_TRAITS}`;
}

function countPersonality() {
    let c = 0;
    selectedTraits.forEach((m, name) => {
        const t = ALL_TRAITS.find(tr => tr.name === name);
        if (t && t.category === 'personality') c++;
    });
    return c;
}

function countGenetic() {
    let c = 0;
    selectedTraits.forEach((m, name) => {
        const t = ALL_TRAITS.find(tr => tr.name === name);
        if (t && t.category === 'genetic') c++;
    });
    return c;
}

async function rollPersonality(btn) {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    diceSpin(btn);
    setDiceLoading(btn, true);
    
    const gender = document.getElementById('bot-gender').value;
    const name = document.getElementById('bot-name').value.trim() || 'Character';
    const lang = getLang();
    
    try {
        const result = await callLlama(
            `Generate 3-5 personality traits for a ${gender} character named "${name}". Return ONLY a comma-separated list of trait names from this list: ${PERSONALITY_TRAITS.map(t => t.name).join(', ')}. Do not include descriptions. Do not include numbering.`,
            'Generate personality traits.'
        );
        
        const traits = result.split(',').map(t => t.trim()).filter(t => PERSONALITY_TRAITS.some(pt => pt.name === t));
        
        selectedTraits.clear();
        traits.slice(0, MAX_PERSONALITY_TRAITS).forEach(t => selectedTraits.set(t, true));
        renderTraitChips();
        updateTraitCountBadge();
        
        const prompt = document.getElementById('bot-prompt');
        if (prompt) {
            prompt.value = traits.join(', ');
            autoResize(prompt);
        }
    } catch(e) {
        logError('rollPersonality failed', e.message);
    }
    setDiceLoading(btn, false);
}

function randomizeBotPersonalityInBio(botId) {
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    
    const available = PERSONALITY_TRAITS.filter(t => !bot.geneticTraits?.includes(t.name));
    const shuffled = available.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.floor(Math.random() * 4) + 2);
    
    bot.traits = selected.map(t => t.name);
    saveBots();
}

function rollRandomPersonalityTraits() {
    selectedTraits.clear();
    const shuffled = PERSONALITY_TRAITS.sort(() => Math.random() - 0.5);
    const count = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < count && i < MAX_PERSONALITY_TRAITS; i++) {
        const trait = shuffled[i];
        if (trait && !getConflictingSelectedTraits(trait.name).length) {
            selectedTraits.set(trait.name, true);
        }
    }
    renderTraitChips();
    updateTraitCountBadge();
}

function initTraitSystem() {
    const list = document.getElementById('trait-list');
    if (list) {
        list.innerHTML = PERSONALITY_TRAITS.map(t => {
            const isSelected = selectedTraits.has(t.name);
            const isConflict = getConflictingSelectedTraits(t.name).length > 0;
            const clickHandler = isConflict ? '' : `onclick="toggleTrait('${t.name}')"`;
            return `
                <div ${clickHandler} style="
                    display:flex;align-items:center;gap:10px;padding:10px 12px;
                    border-radius:8px;margin-bottom:6px;
                    cursor:${isConflict ? 'not-allowed' : 'pointer'};
                    background:${isSelected ? '#3b156b33' : 'var(--input-bg)'};
                    border:1px solid ${isSelected ? '#6d28d9' : isConflict ? '#ef4444' : 'var(--border)'};
                    opacity:${isConflict ? '0.5' : '1'}">
                    <div style="flex:1">
                        <div style="font-size:13px;font-weight:bold;color:${isSelected ? '#b259ff' : 'var(--text-main)'}">${t.name}</div>
                        <div style="font-size:11px;color:var(--text-sub)">${t.desc}</div>
                    </div>
                    ${isSelected ? '<i class="fas fa-check" style="color:#b259ff"></i>' : ''}
                    ${isConflict ? '<span style="color:#ef4444;font-size:11px">⚠️ Conflict</span>' : ''}
                </div>
            `;
        }).join('');
    }
    updateTraitCountBadge();
}

function clearPersonalityTags() {
    selectedTraits.clear();
    renderTraitChips();
}

function initPersonalityTags() {
    initTraitSystem();
}

function renderPersonaTraitChips() {
    const container = document.getElementById('persona-trait-chips');
    if (!container) return;
    
    const chips = [];
    selectedPersonaTraits.forEach((v, name) => {
        chips.push(`<span class="trait-chip" onclick="removePersonaTraitChip(this, '${name}')">${name} <i class="fas fa-times"></i></span>`);
    });
    container.innerHTML = chips.join('');
}

function removePersonaTraitChip(btn, name) {
    selectedPersonaTraits.delete(name);
    renderPersonaTraitChips();
}
