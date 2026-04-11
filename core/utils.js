// utils.js - Basic utility functions
// Depends on: none

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function decodeUnicode(str) {
    if (!str) return '';
    return str.replace(/\\u([\d\w]{4})/gi, function (match, grp) {
        return String.fromCharCode(parseInt(grp, 16));
    });
}
