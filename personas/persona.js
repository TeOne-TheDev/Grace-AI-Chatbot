// persona.js - Persona CRUD operations
// Depends on: core/utils.js (escapeHTML), core/storage.js (safeSetItem, safeGetItem), core/ui_helpers.js (showToast, autoResize), core/i18n.js (t)

function savePersona() {
    const name = document.getElementById('persona-name').value.trim();
    if (!name) { alert('Please enter a name for your persona!'); return; }
    const persona = {
        id: Date.now().toString(),
        name,
        gender: document.getElementById('persona-gender').value,
        age: document.getElementById('persona-age').value.trim() || '',
        year: document.getElementById('persona-year').value.trim() || '',
        country: document.getElementById('persona-country').value.trim() || '',
        career: document.getElementById('persona-career')?.value.trim() || '',
        appearance: document.getElementById('persona-app').value.trim(),
        bio: document.getElementById('persona-bio').value.trim(),
        prompt: document.getElementById('persona-prompt').value.trim(),
        traits: [...selectedPersonaTraits],
    };
    personas.push(persona);
    savePersonas();
    renderSavedPersonas();
    refreshPersonaDropdown();
    ['persona-name','persona-app','persona-bio','persona-prompt','persona-age','persona-year','persona-country','persona-career'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    selectedPersonaTraits = new Map();
    renderPersonaTraitChips();
    showToast('✅ Persona saved!', '#0a1a0a', '#22c55e');
}

function deletePersona(id) {
    if (!confirm('Delete this persona?')) return;
    personas = personas.filter(p => p.id !== id);
    savePersonas();
    renderSavedPersonas();
    refreshPersonaDropdown();
}

function renderSavedPersonas() {
    const el = document.getElementById('persona-saved-list');
    if (!el) return;
    if (!personas.length) {
        el.innerHTML = '<div style="font-size:12px;color:var(--text-sub);font-style:italic">No personas saved yet.</div>';
        return;
    }
    el.innerHTML = personas.map(p => `
        <div style="display:flex;align-items:center;gap:10px;background:var(--input-bg);border:1px solid #3b156b44;border-radius:10px;padding:8px 10px;margin-bottom:8px">
            <div style="flex:1">
                <div style="font-size:14px;font-weight:bold;color:#b259ff">${escapeHTML(p.name)}</div>
                <div style="font-size:11px;color:var(--text-sub)">${escapeHTML(p.gender)}${p.age?' · '+p.age+'y':''}${p.career?' · '+p.career:''}${p.country?' · '+p.country:''}${p.year?' · '+p.year:''}</div>
                ${p.bio ? '<div style="font-size:11px;color:var(--text-sub);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHTML(p.bio.substring(0,60)) + '</div>' : ''}
            </div>
            <button onclick="deletePersona('${p.id}')" style="background:none;border:none;color:#ff4444;font-size:14px;cursor:pointer;padding:4px"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

function refreshPersonaDropdown() {
    const sel = document.getElementById('bot-persona-id');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">- None (no persona) -</option>' +
        personas.map(p => `<option value="${p.id}">${escapeHTML(p.name)} (${p.gender}${p.age?' · '+p.age+'y':''}${p.career?' · '+p.career:''}${p.country?' · '+p.country:''})</option>`).join('');
    if (cur) sel.value = cur;
    sel.onchange = updatePersonaPreview;
}

function updatePersonaPreview() {
    const sel = document.getElementById('bot-persona-id');
    const preview = document.getElementById('bot-persona-preview');
    if (!sel || !preview) return;
    const p = personas.find(x => x.id === sel.value);
    if (!p) { preview.style.display = 'none'; return; }
    preview.style.display = 'block';
    preview.innerHTML = `<b style="color:#b259ff">${escapeHTML(p.name)}</b> · ${escapeHTML(p.gender)}${p.age?' · Age '+p.age:''}${p.career?' · '+p.career:''}${p.country?' · '+p.country:''}${p.year?' · '+p.year:''}<br>${p.appearance ? '<span>'+escapeHTML(p.appearance.substring(0,80))+'</span>' : ''}`;
}
