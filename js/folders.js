// ══ FOLDER SYSTEM ══
const FOLDER_EMOJIS = ['📁','📂','⭐','💜','💙','❤️','🔥','🌸','🎮','🏠','🎵','📚','🌙','✨','🐱','🐶','💎','🎯','🌈','🍀'];

// ── Open "Create folder" sheet from header button ──
function openFolderManager() {
    const body = document.getElementById('folder-modal-body');
    document.getElementById('folder-modal-title').textContent = '📁 Folders';
    body.innerHTML = '';

    // ── Create new section ──
    const createBox = document.createElement('div');
    createBox.style.cssText = 'background:#0c0c0c;border:1px solid #2a2a2a;border-radius:14px;padding:14px;margin-bottom:16px';

    let chosenEmoji = '📁';

    const emojiDisplay = document.createElement('div');
    emojiDisplay.style.cssText = 'font-size:28px;text-align:center;cursor:pointer;margin-bottom:10px;padding:8px;background:#111;border:1px solid #333;border-radius:10px;user-select:none';
    emojiDisplay.textContent = chosenEmoji;
    emojiDisplay.title = 'Tap to pick icon';

    const emojiRow = document.createElement('div');
    emojiRow.style.cssText = 'display:none;flex-wrap:wrap;gap:6px;margin-bottom:10px';
    FOLDER_EMOJIS.forEach(em => {
        const btn = document.createElement('button');
        btn.style.cssText = 'font-size:20px;padding:5px 7px;border-radius:8px;border:2px solid transparent;background:#111;cursor:pointer';
        btn.textContent = em;
        btn.onclick = () => {
            chosenEmoji = em;
            emojiDisplay.textContent = em;
            emojiRow.style.display = 'none';
            emojiRow.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
            btn.style.borderColor = '#0084ff';
        };
        emojiRow.appendChild(btn);
    });
    emojiDisplay.onclick = () => { emojiRow.style.display = emojiRow.style.display === 'none' ? 'flex' : 'none'; };

    const nameInput = document.createElement('input');
    nameInput.className = 'folder-modal-input';
    nameInput.placeholder = 'Folder name…';
    nameInput.maxLength = 30;
    nameInput.style.marginBottom = '10px';

    const createBtn = document.createElement('button');
    createBtn.className = 'folder-modal-btn';
    createBtn.textContent = '+ Create Folder';
    createBtn.onclick = () => {
        const name = nameInput.value.trim();
        if (!name) { nameInput.style.borderColor = '#f87171'; nameInput.focus(); return; }
        folders.push({ id: 'f_' + Date.now(), name, icon: chosenEmoji, memberIds: [], collapsed: false });
        saveFolders();
        renderBotList();
        openFolderManager(); // refresh list
    };

    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:11px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px';
    lbl.textContent = 'New Folder';
    createBox.appendChild(lbl);
    createBox.appendChild(emojiDisplay);
    createBox.appendChild(emojiRow);
    createBox.appendChild(nameInput);
    createBox.appendChild(createBtn);
    body.appendChild(createBox);

    // ── Existing folders ──
    if (folders.length > 0) {
        const hdrEl = document.createElement('div');
        hdrEl.style.cssText = 'font-size:11px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px';
        hdrEl.textContent = 'Existing Folders';
        body.appendChild(hdrEl);

        folders.forEach(f => {
            const count = (f.memberIds || []).length;
            const row = document.createElement('div');
            row.className = 'folder-item-row';
            row.innerHTML = `
                <span style="font-size:20px">${f.icon||'📁'}</span>
                <div style="flex:1;min-width:0">
                    <div style="font-size:14px;font-weight:bold;color:#eee">${escapeHTML(f.name)}</div>
                    <div style="font-size:11px;color:#555">${count} character${count!==1?'s':''}</div>
                </div>
                <button onclick="event.stopPropagation();openFolderEdit('${f.id}')" style="background:none;border:none;color:#555;font-size:18px;cursor:pointer;padding:4px 8px">⋯</button>
            `;
            body.appendChild(row);
        });
    }

    document.getElementById('folder-modal-overlay').classList.add('open');
}

// ── Edit a specific folder (rename, remove members, delete) ──
function openFolderEdit(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    document.getElementById('folder-modal-title').textContent = (folder.icon||'📁') + ' ' + folder.name;
    const body = document.getElementById('folder-modal-body');
    body.innerHTML = '';

    // Members
    const members = (folder.memberIds||[]).map(id => bots.find(b=>b.id===id)||groups.find(g=>g.id===id)).filter(Boolean);
    if (members.length) {
        const mHdr = document.createElement('div');
        mHdr.style.cssText = 'font-size:11px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px';
        mHdr.textContent = 'Members';
        body.appendChild(mHdr);
        const mBox = document.createElement('div');
        mBox.style.cssText = 'background:#0c0c0c;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;margin-bottom:14px';
        members.forEach(m => {
            const r = document.createElement('div');
            r.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #181818';
            r.innerHTML = `<span style="flex:1;font-size:14px;color:#eee">${escapeHTML(m.name)}</span>
                <button style="background:#2a0000;border:1px solid #550000;color:#f87171;border-radius:8px;padding:3px 10px;font-size:12px;cursor:pointer"
                    onclick="removeMemberFromFolder('${folderId}','${m.id}')">Remove</button>`;
            mBox.appendChild(r);
        });
        body.appendChild(mBox);
    } else {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:12px;color:#555;text-align:center;padding:16px;background:#0c0c0c;border:1px solid #2a2a2a;border-radius:12px;margin-bottom:14px';
        empty.textContent = 'No characters yet - long-press a card and choose "Add to Folder"';
        body.appendChild(empty);
    }

    // Rename
    const renameBox = document.createElement('div');
    renameBox.style.cssText = 'display:flex;gap:8px;margin-bottom:10px';
    renameBox.innerHTML = `<input id="rename-folder-input" class="folder-modal-input" style="margin:0;flex:1" value="${escapeHTML(folder.name)}" placeholder="Rename…">
        <button onclick="renameFolder('${folderId}')" style="background:#0084ff;color:#fff;border:none;border-radius:12px;padding:11px 16px;font-size:13px;font-weight:bold;cursor:pointer">Save</button>`;
    body.appendChild(renameBox);

    // Delete
    const delBtn = document.createElement('button');
    delBtn.style.cssText = 'width:100%;background:#2a0000;border:1px solid #550000;color:#f87171;border-radius:12px;padding:11px;font-size:14px;cursor:pointer;margin-bottom:10px';
    delBtn.textContent = '�-� Delete Folder (characters stay)';
    delBtn.onclick = () => deleteFolder(folderId);
    body.appendChild(delBtn);

    // Back
    const back = document.createElement('button');
    back.style.cssText = 'width:100%;background:none;border:none;color:#555;font-size:13px;cursor:pointer;padding:4px';
    back.textContent = '← Back';
    back.onclick = openFolderManager;
    body.appendChild(back);
}

// ── "Add to Folder" picker (opened from long-press ctx menu) ──
function openAddToFolderModal(botId) {
    if (!botId) return;
    const bot = bots.find(b=>b.id===botId) || groups.find(g=>g.id===botId);
    if (!bot) return;

    document.getElementById('folder-modal-title').textContent = '📁 Add to Folder';
    const body = document.getElementById('folder-modal-body');
    body.innerHTML = '';

    const note = document.createElement('div');
    note.style.cssText = 'font-size:13px;color:#888;margin-bottom:14px;text-align:center';
    note.innerHTML = `Move <b style="color:#eee">${escapeHTML(bot.name)}</b> into a folder`;
    body.appendChild(note);

    if (!folders.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:13px;color:#555;text-align:center;padding:24px 0';
        empty.innerHTML = 'No folders yet.<br><span style="font-size:11px">Tap 📁 in the header to create one first.</span>';
        body.appendChild(empty);
    } else {
        // Remove from any current folder first (so we can move between folders)
        const currentFolder = folders.find(f => (f.memberIds||[]).includes(botId));

        folders.forEach(f => {
            const isHere = (f.memberIds||[]).includes(botId);
            const row = document.createElement('div');
            row.className = 'folder-item-row';
            row.style.borderRadius = '12px';
            row.style.marginBottom = '6px';
            row.style.background = isHere ? '#0a1a0a' : '';
            row.style.border = isHere ? '1px solid #22c55e44' : '1px solid #1a1a1a';
            row.innerHTML = `
                <span style="font-size:22px">${f.icon||'📁'}</span>
                <div style="flex:1">
                    <div style="font-size:14px;font-weight:bold;color:${isHere?'#4ade80':'#eee'}">${escapeHTML(f.name)}</div>
                    <div style="font-size:11px;color:#555">${(f.memberIds||[]).length} character${(f.memberIds||[]).length!==1?'s':''}</div>
                </div>
                ${isHere ? '<span style="color:#4ade80;font-size:13px;font-weight:bold">✓ Here</span>' : '<span style="color:#0084ff;font-size:13px">→ Move</span>'}
            `;
            row.onclick = () => {
                if (isHere) return; // already here
                // Remove from current folder if any
                folders.forEach(ff => { ff.memberIds = (ff.memberIds||[]).filter(id => id !== botId); });
                // Add to selected folder
                if (!f.memberIds) f.memberIds = [];
                f.memberIds.push(botId);
                saveFolders();
                renderBotList();
                closeFolderModal();
            };
            body.appendChild(row);
        });

        // Option to remove from folder
        if (currentFolder) {
            const removeBtn = document.createElement('button');
            removeBtn.style.cssText = 'width:100%;background:#1a1a1a;border:1px solid #2a2a2a;color:#888;border-radius:12px;padding:11px;font-size:13px;cursor:pointer;margin-top:8px';
            removeBtn.textContent = '✕ Remove from folder';
            removeBtn.onclick = () => {
                folders.forEach(ff => { ff.memberIds = (ff.memberIds||[]).filter(id => id !== botId); });
                saveFolders(); renderBotList(); closeFolderModal();
            };
            body.appendChild(removeBtn);
        }
    }

    document.getElementById('folder-modal-overlay').classList.add('open');
}

function removeMemberFromFolder(folderId, memberId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    folder.memberIds = (folder.memberIds||[]).filter(id => id !== memberId);
    saveFolders(); renderBotList();
    openFolderEdit(folderId);
}

function renameFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    const v = (document.getElementById('rename-folder-input').value||'').trim();
    if (!v) return;
    folder.name = v;
    saveFolders(); renderBotList();
    openFolderEdit(folderId);
}

function deleteFolder(folderId) {
    if (!confirm('Delete this folder? Characters inside will stay on the home screen.')) return;
    folders = folders.filter(f => f.id !== folderId);
    saveFolders(); renderBotList(); closeFolderModal();
}

function closeFolderModal() {
    document.getElementById('folder-modal-overlay').classList.remove('open');
}
