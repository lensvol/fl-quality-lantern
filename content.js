// Here we inject our code into the context of the page itself, since we need to patch its XHR mechanisms.
var s = document.createElement('script');
s.src = chrome.runtime.getURL('inject.js');
s.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);
console.log("[FL Apocyan Mirage] Inserting interceptor...");
