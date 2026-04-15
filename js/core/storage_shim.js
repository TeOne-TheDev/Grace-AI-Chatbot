// storage_shim.js
// Catch and mock localStorage/sessionStorage for strict local environments (file:// protocol)
// Prevents fatal SecurityErrors from halting script execution on mobile browsers.

(function () {
    function createMockStorage() {
        let store = {};
        return {
            getItem: function (key) { return store[key] || null; },
            setItem: function (key, value) { store[key] = String(value); },
            removeItem: function (key) { delete store[key]; },
            clear: function () { store = {}; },
            key: function (i) { return Object.keys(store)[i] || null; },
            get length() { return Object.keys(store).length; }
        };
    }

    try {
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
    } catch (e) {
        Object.defineProperty(window, 'localStorage', {
            value: createMockStorage(),
            writable: false
        });
    }

    try {
        const testKey = '__storage_test__';
        window.sessionStorage.setItem(testKey, testKey);
        window.sessionStorage.removeItem(testKey);
    } catch (e) {
        Object.defineProperty(window, 'sessionStorage', {
            value: createMockStorage(),
            writable: false
        });
    }
})();
