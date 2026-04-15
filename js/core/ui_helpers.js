// ui_helpers.js - Basic UI helper functions
// Depends on: core/utils.js (escapeHTML)

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setAttr(id, attr, val) {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, val);
}

function autoResize(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(msg, bgColor = '#0a1a0a', textColor = '#22c55e') {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);background:${bgColor};color:${textColor};padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.4)`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function logError(msg, detail) {
    console.error(`[ERROR] ${msg}`, detail || '');
}

function logSync(msg, detail) {
    console.log(`[SYNC] ${msg}`, detail || '');
}

function diceSpin(btn) {
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-dice"></i>';
    setTimeout(() => btn.innerHTML = originalText, 300);
}

function setDiceLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    }
}
