// img_service.js - Image service management
// Depends on: core/storage.js (safeSetItem, safeGetItem), core/utils.js (maskApiKey), api/keys.js (getGroqKeys, getRandomPollinationsKey)

function getImageService() {
    return safeGetItem('image_service', 'pollinations');
}

function setImageService(service) {
    safeSetItem('image_service', service);
}

function getImgModel() {
    return safeGetItem('img_model', 'flux');
}

function setImgModel(model) {
    safeSetItem('img_model', model);
}

function getImgStyleOverride() {
    return safeSetItem('img_style_override', '');
}

function setImgStyleOverride(style) {
    safeSetItem('img_style_override', style);
}

function syncImgStyleSelect() {
    const select = document.getElementById('bot-img-style');
    if (!select) return;
    
    const override = getImgStyleOverride();
    if (override) {
        select.value = override;
    }
}

function selectImgModel(model) {
    setImgModel(model);
    syncChatImgModelBtns();
    syncImgModelBtns();
}

function syncChatImgModelBtns() {
    const btns = document.querySelectorAll('.img-model-btn');
    const current = getImgModel();
    
    btns.forEach(btn => {
        const model = btn.dataset.model;
        if (model === current) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function syncImgModelBtns() {
    const btns = document.querySelectorAll('.img-model-btn');
    const current = getImgModel();
    
    btns.forEach(btn => {
        const model = btn.dataset.model;
        if (model === current) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function maskApiKey(key) {
    if (!key || key.length < 10) return '';
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
}
