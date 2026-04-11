// keys.js - API key management
// Depends on: core/storage_shim.js (localStorage), core/utils.js (safeGetItem, safeSetItem)

function getGroqKeys() {
    const listJson = localStorage.getItem('groq_keys_list');
    if (listJson) {
        try { return JSON.parse(listJson).filter(k => k && k.length > 5); } catch (e) { }
    }

    const legacy = [
        safeGetItem('groq_key', ''),
        safeGetItem('groq_key_2', ''),
        safeGetItem('groq_key_3', '')
    ].filter(k => k.length > 5);
    if (legacy.length > 0) {
        safeSetItem('groq_keys_list', JSON.stringify(legacy));
    }
    return legacy;
}

function getNextGroqKey() {
    const keys = getGroqKeys();
    if (!keys.length) return '';
    const idx = parseInt(safeGetItem('groq_key_idx', '0') || '0', 10);
    const key = keys[idx % keys.length];
    safeSetItem('groq_key_idx', ((idx + 1) % keys.length).toString());
    return key;
}
