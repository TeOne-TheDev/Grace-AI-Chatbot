// screens.js - Screen management
// Depends on: core/ui_helpers.js (showToast), core/storage.js (safeSetItem, safeGetItem)

let _appStateStack = [];

function openScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.add('off'));
    
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('off');
        _pushAppState(screenId);
    }
}

function closeScreen(screenId) {
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('off');
    }
    
    const home = document.getElementById('sc-home');
    if (home) {
        home.classList.remove('off');
    }
}

function _pushAppState(screenId) {
    _appStateStack.push(screenId);
    safeSetItem('app_state_stack', JSON.stringify(_appStateStack));
}

function showScreen(screenId) {
    openScreen(screenId);
}

function hideScreen(screenId) {
    closeScreen(screenId);
}
