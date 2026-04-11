function _keyStartEdit(maskEl, inputClass) {
    const wrapper = maskEl.parentElement;
    const input = wrapper.querySelector('.' + inputClass);
    maskEl.style.display = 'none';
    input.style.display = 'block';
    input.focus(); input.select();
    input.addEventListener('blur', function onBlur() {
        input.removeEventListener('blur', onBlur);
        const val = input.value.trim();
        input.style.display = 'none';
        maskEl.style.display = 'block';
        maskEl.innerHTML = val ? maskApiKey(val) : '<span style="color:var(--text-sub);font-style:italic;font-family:sans-serif;font-size:13px;letter-spacing:0">Tap to enter key\u2026</span>';
    }, { once: true });
}
function groqKeyStartEdit(maskEl) { _keyStartEdit(maskEl, 'groq-key-input'); }
function polKeyStartEdit(maskEl)  { _keyStartEdit(maskEl, 'pol-key-input'); }

function _buildKeyRow(k, i, totalLen, inputClass, editFn, removeFn) {
    const safe = (k || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    const masked = k ? maskApiKey(k) : '<span style="color:var(--text-sub);font-style:italic;font-family:sans-serif;font-size:13px;letter-spacing:0">Tap to enter key\u2026</span>';
    return `<div style="display:flex;gap:6px;align-items:center">
        <span style="font-size:12px;font-weight:bold;color:var(--text-sub);min-width:18px">${i+1}</span>
        <div style="flex:1;position:relative">
            <input type="text" class="form-control ${inputClass}" value="${safe}" placeholder="key..." style="width:100%;display:none">
            <div class="${inputClass}-mask form-control" onclick="${editFn}(this)" style="cursor:text;letter-spacing:1px;font-family:monospace;font-size:14px;color:var(--text-main);background:var(--input-bg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${masked}</div>
        </div>
        ${totalLen > 1 ? `<button onclick="${removeFn}(${i})" style="background:#ff444422;border:1px solid #ff444455;color:#ff6666;border-radius:8px;width:32px;height:36px;font-size:16px;cursor:pointer;flex-shrink:0">&times;</button>` : ''}
    </div>`;
}
function _collapseExpandHtml(collapsed, stateKey, expandAction, collapseAction, expandText, collapseText) {
    const icon = collapsed ? 'fa-chevron-down' : 'fa-chevron-up';
    const text = collapsed ? expandText : collapseText;
    const action = collapsed ? expandAction : collapseAction;
    return `<div onclick="${action}" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;background:var(--input-bg);border:1px dashed var(--border);border-radius:10px;cursor:pointer;color:var(--text-sub);font-size:12px"><i class="fas ${icon}"></i>&nbsp;${text}</div>`;
}

function _renderKeysList(containerId, keys, inputClass, editFn, removeFn, stateKey, renderFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const collapsed = keys.length > 2 && sessionStorage.getItem(stateKey) !== 'expanded';
    const shown = collapsed ? [keys[0]] : keys;
    let html = shown.map((k, i) => _buildKeyRow(k, i, keys.length, inputClass, editFn, removeFn)).join('');
    if (keys.length > 2) {
        const expandAction = `sessionStorage.setItem('${stateKey}','expanded');${renderFn}()`;
        const collapseAction = `sessionStorage.removeItem('${stateKey}');${renderFn}()`;
        const expandText = `${keys.length-1} more key${keys.length-2>1?'s':''} - tap to expand`;
        html += _collapseExpandHtml(collapsed, stateKey, expandAction, collapseAction, expandText, 'Collapse');
    }
    container.innerHTML = html;
}


function renderKeysList(type) {
    const isGroq = type === 'groq';
    const listKey = isGroq ? 'groq_keys_list' : 'pol_keys_list';
    const fallbackKeys = isGroq ? ['groq_key', 'groq_key_2', 'groq_key_3'] : ['pollinations_key', 'pollinations_key_2'];
    const containerId = isGroq ? 'groq-keys-list' : 'pol-keys-list';
    const inputClass = isGroq ? 'groq-key-input' : 'pol-key-input';
    const editFn = isGroq ? 'groqKeyStartEdit' : 'polKeyStartEdit';
    const removeFn = isGroq ? 'removeGroqKeyField' : 'removePolKeyField';
    const stateKey = isGroq ? 'groq_keys_expanded' : 'pol_keys_expanded';
    const renderFn = isGroq ? 'renderKeysList("groq")' : 'renderKeysList("pol")';
    
    let keys = [];
    try { keys = JSON.parse(safeGetItem(listKey, '[]')); } catch(e) {}
    if (!keys.length) keys = fallbackKeys.map(k => safeGetItem(k, '')).filter(k => k.length > 0);
    if (!keys.length) keys = [''];
    _renderKeysList(containerId, keys, inputClass, editFn, removeFn, stateKey, renderFn);
}

function addKeyField(type) {
    const isGroq = type === 'groq';
    const listKey = isGroq ? 'groq_keys_list' : 'pol_keys_list';
    const stateKey = isGroq ? 'groq_keys_expanded' : 'pol_keys_expanded';
    const inputClass = isGroq ? 'groq-key-input' : 'pol-key-input';
    const maskClass = isGroq ? 'groq-key-input-mask' : 'pol-key-input-mask';
    const renderFn = isGroq ? () => renderKeysList('groq') : () => renderKeysList('pol');
    const editFn = isGroq ? 'groqKeyStartEdit' : 'polKeyStartEdit';
    
    let keys = []; try { keys = JSON.parse(safeGetItem(listKey, '[]')); } catch(e){}
    const live = Array.from(document.querySelectorAll('.' + inputClass)).map(i => i.value.trim());
    if (live.length) keys = live;
    keys.push('');
    sessionStorage.setItem(stateKey, 'expanded');
    safeSetItem(listKey, JSON.stringify(keys));
    renderFn();
    setTimeout(() => { const m = document.querySelectorAll('.' + maskClass); if(m.length) window[editFn](m[m.length-1]); }, 50);
}

function removeKeyField(type, idx) {
    const isGroq = type === 'groq';
    const listKey = isGroq ? 'groq_keys_list' : 'pol_keys_list';
    const inputClass = isGroq ? 'groq-key-input' : 'pol-key-input';
    const renderFn = isGroq ? () => renderKeysList('groq') : () => renderKeysList('pol');
    
    const live = Array.from(document.querySelectorAll('.' + inputClass)).map(i => i.value.trim()).filter((_, i) => i !== idx);
    const keys = live.length ? live : [''];
    safeSetItem(listKey, JSON.stringify(keys));
    renderFn();
}

// Backward compatibility wrappers
function renderGroqKeysList() { renderKeysList('groq'); }
function renderPolKeysList() { renderKeysList('pol'); }

function selectImageService(service, save = true) {
    const pollBtn = document.getElementById('btn-img-svc-pollinations');
    
    if (pollBtn) pollBtn.classList.toggle('active', service === 'pollinations');
    
    if (save) {
        setImageService(service);
    }
    
    toggleImageServiceSettings(service);
}

function toggleImageServiceSettings(service) {
    const pollModelGroup = document.getElementById('pollinations-model-group');
    
    if (pollModelGroup) pollModelGroup.style.display = 'block';
}
function addGroqKeyField() { addKeyField('groq'); }
function addPolKeyField() { addKeyField('pol'); }
function removeGroqKeyField(idx) { removeKeyField('groq', idx); }
function removePolKeyField(idx) { removeKeyField('pol', idx); }

function saveSettings() {
    const groqInputs = document.querySelectorAll('.groq-key-input');
    const groqKeys = Array.from(groqInputs).map(i => i.value.trim()).filter(k => k.length > 0);
    safeSetItem('groq_keys_list', JSON.stringify(groqKeys));
    if (groqKeys.length > 0) safeSetItem('groq_key', groqKeys[0]);
    const polInputs = document.querySelectorAll('.pol-key-input');
    const polKeys = Array.from(polInputs).map(i => i.value.trim()).filter(k => k.length > 0);
    safeSetItem('pol_keys_list', JSON.stringify(polKeys));
    if (polKeys.length > 0) safeSetItem('pollinations_key', polKeys[0]);
    if (polKeys.length > 1) safeSetItem('pollinations_key_2', polKeys[1]);
    const activeModelBtn = document.querySelector('.img-model-btn.active');
    if (activeModelBtn) safeSetItem('pol_img_model', activeModelBtn.dataset.model);
    const langSel = document.getElementById('ai-lang-select');
    if (langSel) safeSetItem('ai_lang', langSel.value);
    alert(t('saved'));
    closeScreen('sc-settings');
}

function exportData() {
    const botsToExport = bots.map(bot => {
        const cleanHistory = (bot.history || []).map(msg => {
            const { illustUrl, ...rest } = msg;
            return rest; // Remove illust images, keep everything else
        });
        return { ...bot, history: cleanHistory };
    });

    const exportObj = {
        version: 'grace_v41',
        exportedAt: new Date().toISOString(),
        bots: botsToExport,
        groups: groups.map(grp => {
            const cleanHistory = (grp.history || []).map(msg => {
                const { illustUrl, ...rest } = msg;
                return rest;
            });
            return { ...grp, history: cleanHistory };
        }),
        personas: safeParse('grace_personas_v1', []),
        folders: safeParse('grace_folders_v1', []),
        settings: {
            ai_lang: safeGetItem('ai_lang', 'English'),
            grace_theme: safeGetItem('grace_theme', 'dark'),
            grace_global_bg: safeGetItem('grace_global_bg', 'false'),
            active_model_id: safeGetItem('active_model_id', ''),
            imgModel: safeGetItem('imgModel', ''),
            customImgModel: safeGetItem('customImgModel', '')
        },
        apiKeys: {
            groq_keys_list: safeGetItem('groq_keys_list', '[]'),
            groq_key_idx: safeGetItem('groq_key_idx', '0'),
            pol_keys_list: safeGetItem('pol_keys_list', '[]'),
            pol_key_idx: safeGetItem('pol_key_idx', '0')
        }
    };

    const json = JSON.stringify(exportObj);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0,10);
    a.download = `grace_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const statusEl = document.getElementById('backup-status');
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#22c55e';
        statusEl.textContent = `\u2705 Exported ${botsToExport.length} characters successfully!`;
        setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const statusEl = document.getElementById('backup-status');
            if (!data.bots && !data.groups) throw new Error('Invalid file format');

            let importedBots = 0, importedGroups = 0;

            if (data.bots && Array.isArray(data.bots)) {
                data.bots.forEach(importBot => {
                    const existingIdx = bots.findIndex(b => b.id === importBot.id);
                    if (existingIdx >= 0) {
                        bots[existingIdx] = importBot; // update
                    } else {
                        bots.push(importBot);
                    }
                    importedBots++;
                });
                saveBots();
            }

            if (data.groups && Array.isArray(data.groups)) {
                data.groups.forEach(importGrp => {
                    const existingIdx = groups.findIndex(g => g.id === importGrp.id);
                    if (existingIdx >= 0) {
                        groups[existingIdx] = importGrp;
                    } else {
                        groups.push(importGrp);
                    }
                    importedGroups++;
                });
                saveGroups();
            }

            if (data.personas && Array.isArray(data.personas)) {
                safeSetItem('grace_personas_v1', JSON.stringify(data.personas));
                personas = data.personas;
            }

            if (data.folders && Array.isArray(data.folders)) {
                safeSetItem('grace_folders_v1', JSON.stringify(data.folders));
                folders = data.folders;
            }

            if (data.apiKeys) {
                if (data.apiKeys.groq_keys_list) {
                    safeSetItem('groq_keys_list', data.apiKeys.groq_keys_list);
                }
                if (data.apiKeys.groq_key_idx) {
                    safeSetItem('groq_key_idx', data.apiKeys.groq_key_idx);
                }
                if (data.apiKeys.pol_keys_list) {
                    safeSetItem('pol_keys_list', data.apiKeys.pol_keys_list);
                }
                if (data.apiKeys.pol_key_idx) {
                    safeSetItem('pol_key_idx', data.apiKeys.pol_key_idx);
                }
            }

            if (data.settings) {
                Object.entries(data.settings).forEach(([k, v]) => {
                    if (v) safeSetItem(k, v);
                });
            }

            renderBotList();
            renderGroqKeysList();
            renderPolKeysList();

            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.color = '#22c55e';
                statusEl.textContent = `\u2705 Imported ${importedBots} characters, ${importedGroups} groups successfully!`;
                setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
            }
        } catch(err) {
            const statusEl = document.getElementById('backup-status');
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.color = '#ef4444';
                statusEl.textContent = '\u274c Error: Invalid file. ' + err.message;
                setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
            }
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}
