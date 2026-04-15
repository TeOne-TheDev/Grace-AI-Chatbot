// folders.js - Folder management system
// Depends on: core/utils.js (escapeHTML), core/storage.js (safeSetItem, safeGetItem), core/ui_helpers.js (showToast), bots/bot_storage.js (saveBots)

const FOLDER_EMOJIS = ['📁', '📂', '🗂️', '📋', '🗃️', '📚', '🎯', '⭐', '💎', '🔮', '🌟', '✨', '🎨', '🎭', '🎪', '🎠', '🎡', '🎢', '🎵', '🎶'];

function openFolderManager() {
    const modal = document.getElementById('folder-modal');
    if (modal) modal.style.display = 'flex';
    renderFolderList();
}

function openFolderEdit(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    document.getElementById('folder-edit-id').value = folder.id;
    document.getElementById('folder-edit-name').value = folder.name;
    document.getElementById('folder-edit-icon').value = folder.icon || '📁';
    
    const modal = document.getElementById('folder-edit-modal');
    if (modal) modal.style.display = 'flex';
}

function openAddToFolderModal() {
    const modal = document.getElementById('add-to-folder-modal');
    if (modal) modal.style.display = 'flex';
    
    const select = document.getElementById('add-to-folder-select');
    if (select) {
        select.innerHTML = folders.map(f => `<option value="${f.id}">${f.icon} ${f.name}</option>`).join('');
    }
}

function removeMemberFromFolder(folderId, memberId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    folder.memberIds = folder.memberIds.filter(id => id !== memberId);
    saveFolders();
    renderFolderList();
    
    showToast('Removed from folder', '#0a1a0a', '#22c55e');
}

function renameFolder(folderId, newName, newIcon) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    folder.name = newName;
    folder.icon = newIcon;
    saveFolders();
    renderFolderList();
    
    showToast('Folder renamed', '#0a1a0a', '#22c55e');
}

function deleteFolder(folderId) {
    if (!confirm('Delete this folder? Characters will be moved to the main list.')) return;
    
    folders = folders.filter(f => f.id !== folderId);
    saveFolders();
    renderFolderList();
    renderBotList();
    
    showToast('Folder deleted', '#0a1a0a', '#22c55e');
}

function closeFolderModal() {
    const modal = document.getElementById('folder-modal');
    if (modal) modal.style.display = 'none';
}

function createFolder() {
    const name = document.getElementById('folder-name').value.trim();
    const icon = document.getElementById('folder-icon').value || '📁';
    
    if (!name) { alert('Please enter a folder name'); return; }
    
    const folder = {
        id: Date.now().toString(),
        name,
        icon,
        memberIds: [],
        collapsed: false
    };
    
    folders.push(folder);
    saveFolders();
    renderFolderList();
    renderBotList();
    
    document.getElementById('folder-name').value = '';
    closeFolderModal();
    
    showToast('Folder created', '#0a1a0a', '#22c55e');
}

function addToFolder(folderId, memberId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    if (!folder.memberIds) folder.memberIds = [];
    if (!folder.memberIds.includes(memberId)) {
        folder.memberIds.push(memberId);
        saveFolders();
        renderFolderList();
        renderBotList();
    }
    
    closeFolderModal();
    showToast('Added to folder', '#0a1a0a', '#22c55e');
}

function renderFolderList() {
    const container = document.getElementById('folder-list');
    if (!container) return;
    
    if (!folders.length) {
        container.innerHTML = '<div style="font-size:12px;color:var(--text-sub);font-style:italic">No folders yet.</div>';
        return;
    }
    
    container.innerHTML = folders.map(f => `
        <div class="folder-item" data-id="${f.id}">
            <span class="folder-icon">${f.icon}</span>
            <span class="folder-name">${escapeHTML(f.name)}</span>
            <span class="folder-count">${f.memberIds ? f.memberIds.length : 0}</span>
            <div class="folder-actions">
                <button onclick="openFolderEdit('${f.id}')" style="background:none;border:none;color:var(--text-sub);cursor:pointer;padding:4px"><i class="fas fa-edit"></i></button>
                <button onclick="deleteFolder('${f.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:4px"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}
