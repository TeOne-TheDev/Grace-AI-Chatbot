// bot_card.js - Bot card rendering
// Depends on: core/utils.js (escapeHTML), core/storage.js (loadPortraitUrl)

function makeBotCard(bot) {
    const portraitSrc = bot.portraitUrl === '__stored__' ? loadPortraitUrl(bot.id) : bot.portraitUrl;
    const portraitStyle = portraitSrc ? `background-image:url('${portraitSrc}');background-size:cover;background-position:center;` : '';
    
    return `
        <div class="bot-card" data-id="${bot.id}" onclick="openChat('${bot.id}')">
            <div class="bot-card-portrait" style="${portraitStyle}">
                ${!portraitSrc ? `<span class="bot-card-initial">${escapeHTML(bot.name.charAt(0))}</span>` : ''}
            </div>
            <div class="bot-card-info">
                <div class="bot-card-name">${escapeHTML(bot.name)}</div>
                <div class="bot-card-meta">${bot.gender || ''}${bot.age ? ' · ' + bot.age : ''}</div>
            </div>
        </div>
    `;
}

function makeGroupCard(grp) {
    const memberNames = grp.memberIds.map(id => {
        const bot = bots.find(b => b.id === id);
        return bot ? bot.name : '?';
    }).join(', ');
    
    return `
        <div class="bot-card" data-id="${grp.id}" onclick="openGroupChat('${grp.id}')">
            <div class="bot-card-portrait" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);">
                <span class="bot-card-initial">👥</span>
            </div>
            <div class="bot-card-info">
                <div class="bot-card-name">${escapeHTML(grp.name)}</div>
                <div class="bot-card-meta">${escapeHTML(memberNames.substring(0, 40))}${memberNames.length > 40 ? '...' : ''}</div>
            </div>
        </div>
    `;
}
