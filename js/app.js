if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../sw.js').then(
        () => console.log('Service Worker has registered')
    );
}

/*
var deferredPrompt = undefined;

window.addEventListener('beforeinstallprompt', (ev) => {
    console.log('beforeinstallprompt received');
    ev.preventDefault();
    deferredPrompt = ev;
    return false;
});
*/