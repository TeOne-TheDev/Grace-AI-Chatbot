// i18n.js - Internationalization
// Depends on: core/storage.js (safeGetItem)

const T = {
    English: {
        settingsTitle: 'Settings',
        apiKeyLabel: 'Groq API Key',
        langSelect: 'Interface & Chatbot Language',
        saveSettings: 'Save Settings',
        saved: 'Saved!',
        createTitle: 'Create Character',
        aiGen: 'Auto Generate with Llama 3.3',
        avatarLabel: 'Character Avatar',
        drawBtn: 'Gen',
        redrawBtn: 'Redraw',
        modelLabel: 'AI Model',
        genderLabel: 'Gender',
        genderM: 'Male',
        genderF: 'Female',
        nameLabel: 'Character Name',
        appLabel: 'Appearance',
        appPlaceholder: 'Ex: Tall with short black hair, sharp amber eyes, usually wears a dark jacket...',
        bioLabel: 'Background (Bio)',
        bioPlaceholder: 'Ex: A former detective who left the force after a controversial case...',
        promptLabel: 'Personality & Traits',
        promptPlaceholder: 'Ex: Cold and analytical but secretly caring. Speaks in short, direct sentences. Rarely smiles...',
        saveChar: 'Save Character',
        typing: 'AI is typing...',
        illustrate: ' Illustrate Scene',
        drawing: 'Drawing...',
        bioGender: 'Gender:',
        bioApp: 'Appearance:',
        bioBg: 'Background:',
        inputPlaceholder: 'Type a message...',
        needApp: 'Please describe the appearance first!',
        needName: 'Please enter a name!',
        needKey: 'Please set your API Key first!',
        errGen: 'Error generating character. Check API key.',
        errSend: 'Error sending message.',
        contextLabel: 'Meeting Context',
        contextHint: '(optional)',
        imgStyleLabel: '🎨 Image Style',
        portraitLabel: '🖼️ Chat Background (FHD 9:16)',
        portraitHint: 'Fill in: Gender + Name + Personality + Appearance first',
        portraitBtn: '🖼 Generate Chat Background',
        portraitDrawing: 'Drawing background...',
        useBgLabel: 'Use as chat background',
        polKeyLabel: 'Pollinations API Key',
        polKeyHint: 'Free tier - no key needed. Get key at auth.pollinations.ai',
        polKeyPlaceholder: 'Leave empty = use free tier',
        bgSettingLabel: '🖼️ Portrait Background',
        bgSettingDesc: 'When enabled, each character\'s portrait is used as their own chat background',
        bgToggleLabel: 'Use portrait as chat background',
        needFields: 'Please fill in: Gender + Name + Personality + Appearance first!',
    }
};

function getLang() {
    return safeGetItem('ai_lang', 'English');
}

function t(key) {
    const lang = getLang();
    return (T[lang] && T[lang][key]) ? T[lang][key] : (T['English'][key] || key);
}
