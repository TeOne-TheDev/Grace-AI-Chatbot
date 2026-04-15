// text.js - Text formatting utilities
// Depends on: utils.js (escapeHTML)

function formatBubbleContent(text) {
    if (text === null || text === undefined || typeof text !== 'string') return '';
    text = text.replace(/<\s+i\s*>/gi, '<i>').replace(/<\s*\/\s*i\s*>/gi, '</i>');
    text = text.replace(/\b_I\b/g, 'I');
    text = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
    text = text.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
    text = text.replace(/EMOTION::[\s\S]*/i, '').trim();
    text = text.replace(/([.!?])\s+([a-z])/g, (m, p, l) => p + ' ' + l.toUpperCase());
    text = text.charAt(0).toUpperCase() + text.slice(1);
    let cleaned = text.replace(/(\b\w{2,}\b)(\s+\1){4,}/gi, '$1...');
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '<b>$1</b>');
    cleaned = cleaned.replace(/_([^_\n]+)_/g, '<i>$1</i>');
    cleaned = cleaned.replace(/\*/g, '');
    cleaned = cleaned.replace(/\[([^\]]{1,150})\]/g, '<b>$1</b>');
    cleaned = cleaned.replace(/\(([^)\n]+)\)/g, (_, t) => '\x01T' + t + '\x01T');
    const iSegs = [];
    cleaned = cleaned.replace(/<(i|b)>([\s\S]*?)<\/\1>/gi, (_, tag, content) => {
        iSegs.push({ tag, content });
        return '\x01I' + (iSegs.length - 1) + '\x01';
    });
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function restoreI(s) {
        s = s.replace(/\x01L(\d+)\x01/g, (_, n) => {
            const item = iSegs[parseInt(n)];
            return `<${item.tag}>` + esc(item.content) + `</${item.tag}>`;
        });
        s = s.replace(/\x01I(\d+)\x01/g, (_, n) => {
            const item = iSegs[parseInt(n)];
            return `<${item.tag}>` + esc(item.content) + `</${item.tag}>`;
        });
        s = s.replace(/\x01T([^\x01]*)\x01T/g, (_, t) => '<span class="usr-thought" title="Inner thought — AI senses but cannot directly read">(' + esc(t) + ')</span>');
        return s;
    }
    const splitParts = cleaned.split(/("(?:[^"]*)")/);
    let result = '';
    splitParts.forEach((part, i) => {
        if (i % 2 === 1) {
            result += '<span class="speech-text">' + restoreI(esc(part)) + '</span>';
        } else {
            if (part) {
                let _p = restoreI(esc(part));
                _p = _p.replace(/\n/g, '<br>');
                result += '<span class="action-text">' + _p + '</span>';
            }
        }
    });
    if (!result) {
        let _res = esc(cleaned);
        _res = _res.replace(/\n/g, '<br>');
        return _res;
    }
    return result;
}

function cleanReply(text) {
    text = text.replace(/<thinking>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
    text = text.replace(/<<[^>]{1,60}>>[:\s]*/g, '').trim();
    text = text.replace(/^[^: \n]{1,30}:\s*/, '').trim();
    text = text.replace(/\n*[A-Z][A-Z\s]{1,20}::[^:\n]{0,30}::[\s\S]*/g, '').trim();
    text = text.replace(/EMOTION::[^\n]*/i, '').trim();
    text = text.replace(/\n+[A-Z]{3,}[\W]{0,5}\s*$/g, '').trim();
    text = text.replace(/(\b[\w']{2,}\b)(\W+\1){5,}/gi, (match, word) => word + '...');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/\s*\*+\s*$/, '').trim();
    text = text.replace(/[^.!?]*\byou\s+(ask|say|whisper|reply|answer|smile|laugh|look|lean|move|reach|take|grab|nod|shake|turn|walk|stand|sit|touch|pull|push|kiss|hug|hold|suggest|add|continue|tease|joke|wonder)[^.!?"]*[.!?]?/gi, '').trim();
    text = text.replace(/["""][^"""]*["""]\s*,?\s*you\s+\w+[^.!?]*[.!?]?/gi, '').trim();
    text = text.replace(/\s{2,}/g, ' ').replace(/^[,;\s]+/, '').trim();
    text = text.replace(/\bthe user\b/gi, 'you');
    text = text.replace(/\bthe User\b/gi, 'you');
    text = text.replace(/,\s*quotes\s+(")/gi, '. $1');
    text = text.replace(/\bquotes\s+(")/gi, '$1');
    text = text.replace(/\bin quotes\b\s*/gi, '');
    text = text.replace(/\bquote:\s*/gi, '');
    text = text.replace(/""/g, '"');
    text = text.replace(/"'([^"'\n]+)'"/g, '"$1"');
    text = text.replace(/"'/g, '"').replace(/([.!?,])'"/g, '$1"');
    return text;
}
