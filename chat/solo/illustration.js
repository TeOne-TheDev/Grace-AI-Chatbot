// chat/solo/illustration.js - Scene illustration for solo chat
// Depends on: images/img_generation.js (generatePortraitUnified), core/storage.js (saveIllusUrl), core/ui_helpers.js (showToast, logError), api/keys.js (getGroqKeys)

async function illusByMsgId(msgId) {
    if (!curId) return;
    if (_illustInProgress) return;
    
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    
    const msg = bot.history.find(m => m.msgId === msgId);
    if (!msg) return;
    
    if (!getGroqKeys().length) {
        alert('Please set your API key first');
        return;
    }
    
    _illustInProgress = true;
    showToast('🎨 Generating illustration...', '#0a1a0a', '#f97316');
    
    try {
        const prompt = `Scene illustration for roleplay: ${msg.content.substring(0, 500)}. Character: ${bot.name}, ${bot.gender}, ${bot.appearance || ''}. Style: ${bot.imgStyle || 'photorealism'}`;
        
        const portraitUrl = await generatePortraitUnified(bot.id, bot.imgStyle || 'photorealism');
        
        msg.illustUrl = portraitUrl;
        saveIllusUrl(msgId, portraitUrl);
        saveBots();
        renderChat();
        
        showToast('✅ Illustration generated!', '#0a1a0a', '#22c55e');
    } catch (e) {
        logError('illusByMsgId failed', e.message);
        alert('Generation failed');
    }
    
    _illustInProgress = false;
}
