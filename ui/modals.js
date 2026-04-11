// modals.js - Modal management
// Depends on: core/ui_helpers.js (showToast)

function showBioPopup(botId) {
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    
    const modal = document.getElementById('bio-modal');
    if (!modal) return;
    
    const content = document.getElementById('bio-content');
    if (content) {
        content.innerHTML = `
            <div class="bio-header">
                <h2>${escapeHTML(bot.name)}</h2>
                <span class="bio-close" onclick="closeBioPopup()">&times;</span>
            </div>
            <div class="bio-body">
                ${bot.gender ? `<p><strong>Gender:</strong> ${bot.gender}</p>` : ''}
                ${bot.age ? `<p><strong>Age:</strong> ${bot.age}</p>` : ''}
                ${bot.appearance ? `<p><strong>Appearance:</strong> ${escapeHTML(bot.appearance)}</p>` : ''}
                ${bot.bio ? `<p><strong>Background:</strong> ${escapeHTML(bot.bio)}</p>` : ''}
                ${bot.prompt ? `<p><strong>Personality:</strong> ${escapeHTML(bot.prompt)}</p>` : ''}
            </div>
        `;
    }
    
    modal.style.display = 'flex';
}

function closeBioPopup() {
    const modal = document.getElementById('bio-modal');
    if (modal) modal.style.display = 'none';
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    }
}
