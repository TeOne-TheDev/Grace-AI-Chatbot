// bot_form.js -- Bot creation/editing (saveBot, renderBotList, deleteBot)
// Depends on: shared.js globals (bots, groups, saveBots, closeScreen, openScreen,
//             t, initAppTags, clearPersonalityTags, PREGNANCY_SPEED, escapeHTML)
// _makeBotCardDOM + _makeGroupCardDOM are defined in grchat/chat.js (DOM element versions)

function saveBot() {
    try {
    const name = document.getElementById('bot-name').value.trim();
    if(!name) return alert(t('needName'));

    const newBot = {
        id: Date.now().toString(),
        name,
        gender: document.getElementById('bot-gender').value,
        age: document.getElementById('bot-age') ? (document.getElementById('bot-age').value.trim() || '') : '',
        career: document.getElementById('bot-career') ? (document.getElementById('bot-career').value.trim() || '') : '',
        socialRelation: document.getElementById('bot-social-relation') ? (document.getElementById('bot-social-relation').value.trim() || '') : '',
        familyRelation: document.getElementById('bot-family-relation') ? (document.getElementById('bot-family-relation').value.trim() || '') : '',
        emotionalRelation: document.getElementById('bot-emotional-relation') ? (document.getElementById('bot-emotional-relation').value.trim() || '') : '',
        year: document.getElementById('bot-year') ? (document.getElementById('bot-year').value.trim() || '') : '',
        country: document.getElementById('bot-country') ? (document.getElementById('bot-country').value.trim() || '') : '',
        avatar: document.getElementById('bot-av-url').value.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        model: document.getElementById('bot-model')?.value || '',
        appearance: document.getElementById('bot-app').value.trim(),
        bio: document.getElementById('bot-bio').value.trim(),
        prompt: document.getElementById('bot-prompt').value.trim(),
        context: document.getElementById('bot-context').value.trim(),
        imgStyle: document.getElementById('bot-img-style').value,
        portraitUrl: document.getElementById('bot-portrait-url').value || '',
        useBg: document.getElementById('bot-use-bg').checked,
        personaId: document.getElementById('bot-persona-id')?.value || '',
        series: (document.getElementById('bot-series')?.value || '').trim(),
        schedule: null,
        virtualMinutes: 9 * 60,
        ageStartDay: Math.floor(Math.random() * 365),
        dynBio: {},
        geneticTraits: (typeof selectedTraits !== 'undefined' && selectedTraits.size) ? [...selectedTraits.keys()] : [],
        history: []
    };

    // Auto-select random personality traits if none selected
    if (typeof selectedTraits !== 'undefined' && selectedTraits.size === 0) {
        if (typeof rollRandomPersonalityTraits === 'function') {
            rollRandomPersonalityTraits();
            // Update geneticTraits after random selection
            newBot.geneticTraits = [...selectedTraits.keys()];
            // CRITICAL: re-read prompt AFTER trait roll (renderTraitChips updates the textarea)
            newBot.prompt = document.getElementById('bot-prompt').value.trim();
        }
    }

    bots.unshift(newBot);
    saveBots();
    renderBotList();
    closeScreen('sc-create');
    ['bot-name','bot-bio','bot-prompt','bot-av-url','bot-context','bot-portrait-url'].forEach(id => document.getElementById(id).value = '');
    initAppTags('');
    const ageEl = document.getElementById('bot-age'); if(ageEl) ageEl.value = '';
    const careerEl = document.getElementById('bot-career'); if(careerEl) careerEl.value = '';
    const socialRelEl = document.getElementById('bot-social-relation'); if(socialRelEl) socialRelEl.value = '';
    const familyRelEl = document.getElementById('bot-family-relation'); if(familyRelEl) familyRelEl.value = '';
    const emotionalRelEl = document.getElementById('bot-emotional-relation'); if(emotionalRelEl) emotionalRelEl.value = '';
    const yearEl = document.getElementById('bot-year'); if(yearEl) yearEl.value = '';
    const countryEl = document.getElementById('bot-country'); if(countryEl) countryEl.value = '';
    document.getElementById('av-preview').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='75' height='75'%3E%3Ccircle cx='37.5' cy='37.5' r='37.5' fill='%23000000'/%3E%3C/svg%3E";
    document.getElementById('portrait-preview').style.display = 'none';
    document.getElementById('bot-use-bg').checked = false;
    document.getElementById('bot-img-style').value = 'photorealism';
    const drawSpan = document.getElementById('lbl-draw-btn');
    if(drawSpan) drawSpan.innerText = t('drawBtn');
    if (typeof clearPersonalityTags === 'function') clearPersonalityTags();
    } catch(err) { alert('Save error: ' + err.message); }
}

function renderBotList() {
    const list = document.getElementById('bot-list');
    list.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'bot-grid-wrap';

    // Collect all bot IDs that are in folders
    const botIdsInFolders = new Set();
    if (typeof folders !== 'undefined' && folders.length > 0) {
        folders.forEach(f => {
            if (f.memberIds) {
                f.memberIds.forEach(id => botIdsInFolders.add(id));
            }
        });
    }

    // Render folders first
    if (typeof folders !== 'undefined' && folders.length > 0) {
        folders.forEach(f => {
            if (!f.memberIds || f.memberIds.length === 0) return;
            
            const folderRow = document.createElement('div');
            folderRow.className = 'folder-row';
            
            const header = document.createElement('div');
            header.className = 'folder-header';
            header.innerHTML = `
                <span class="folder-icon">${f.icon || '📁'}</span>
                <span class="folder-name">${escapeHTML(f.name)}</span>
                <span class="folder-count">${f.memberIds.length}</span>
                <span class="folder-chevron ${f.collapsed ? '' : 'open'}">▶</span>
            `;
            header.onclick = () => {
                f.collapsed = !f.collapsed;
                saveFolders();
                renderBotList();
            };
            folderRow.appendChild(header);
            
            if (!f.collapsed) {
                const folderGrid = document.createElement('div');
                folderGrid.className = 'folder-grid';
                
                f.memberIds.forEach(id => {
                    const bot = bots.find(b => b.id === id);
                    const grp = groups.find(g => g.id === id);
                    
                    if (bot) {
                        const card = typeof _makeBotCardDOM === 'function' ? _makeBotCardDOM(bot, false) : null;
                        if (card) folderGrid.appendChild(card);
                    } else if (grp) {
                        const card = typeof _makeGroupCardDOM === 'function' ? _makeGroupCardDOM(grp) : null;
                        if (card) folderGrid.appendChild(card);
                    }
                });
                
                folderRow.appendChild(folderGrid);
            }
            
            grid.appendChild(folderRow);
        });
    }

    // Render groups (not in folders)
    const allItems = [];
    groups.forEach(grp => {
        if (botIdsInFolders.has(grp.id)) return; // Skip if in folder
        const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
        if (!members.length) return;
        allItems.push({ type: 'group', data: grp, ts: grp.lastChatted || 0 });
    });
    
    // Render bots (not in folders)
    bots.forEach(bot => {
        if (bot.hidden) return;
        if (botIdsInFolders.has(bot.id)) return; // Skip if in folder
        allItems.push({ type: 'bot', data: bot, ts: bot.lastChatted || 0 });
    });
    
    allItems.sort((a, b) => b.ts - a.ts);

    if (allItems.length === 0 && (typeof folders === 'undefined' || folders.length === 0 || folders.every(f => !f.memberIds || f.memberIds.length === 0))) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;padding:60px 20px;color:var(--text-sub);grid-column:1/-1';
        empty.innerHTML = '<div style="font-size:48px;margin-bottom:16px">&#10024;</div><div style="font-size:18px;font-weight:bold;color:var(--text-main);margin-bottom:8px">No characters yet</div><div style="font-size:14px;margin-bottom:24px">Create your first AI character</div>';
        const emBtn = document.createElement('button');
        emBtn.style.cssText = 'background:#0084ff;color:#fff;border:none;padding:12px 28px;border-radius:20px;font-size:15px;font-weight:bold;cursor:pointer';
        emBtn.textContent = '+ Create character';
        emBtn.onclick = function(){ openScreen('sc-create'); };
        empty.appendChild(emBtn);
        list.appendChild(empty);
        return;
    }

    allItems.forEach(item => {
        const card = item.type === 'group'
            ? (typeof _makeGroupCardDOM === 'function' ? _makeGroupCardDOM(item.data) : null)
            : (typeof _makeBotCardDOM  === 'function' ? _makeBotCardDOM(item.data, false) : null);
        if (card) grid.appendChild(card);
    });
    list.appendChild(grid);
}

function deleteBot(id) {
    const bot = bots.find(b => b.id === id);
    if (!bot) return;
    if (!confirm('Delete character "' + bot.name + '"? This cannot be undone.')) return;
    bots = bots.filter(b => b.id !== id);
    saveBots();
    renderBotList();
}
