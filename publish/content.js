// Brainia Extension Detection Script
(function () {
    // Inject a flag so the website knows Brainia is installed
    document.documentElement.setAttribute('data-brainia-installed', 'true');

    // Also send a custom event for dynamic checking
    window.dispatchEvent(new CustomEvent('BrainiaInstalled'));

    console.log("[Brainia] Presence detected by host.");
})();
