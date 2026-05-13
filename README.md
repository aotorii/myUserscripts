Just some userscripts

## VGMdb album formatted info copy

Author: [kahpaibe](https://github.com/kahpaibe/userscripts/tree/main)

## VGMdb album page tweaks

Author: [kahpaibe](https://github.com/kahpaibe/userscripts/tree/main)

## Comipo scraper
Run this in console if you would like to auto turn pages. Adjust the interval based on your network status.

```javascript
const nav = getEventListeners(window).keydown[2].listener;
let lastSrc = window._getCurrentImg()?.src;
window._autoTurn = setInterval(async () => {
    nav({ key: 'ArrowLeft' });
    await new Promise(r => setTimeout(r, 1500));
    const img = window._getCurrentImg();
    if (!img) return;
    if (img.src === lastSrc) {
        clearInterval(window._autoTurn);
        console.log('Last page reached');
        return;
    }
    lastSrc = img.src;
}, 2000);
```