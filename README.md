Just some userscripts seasoned with my vibecoding. Chrome only.

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

## Firecross scraper
Same as above.

```javascript
const nav = getEventListeners(window).keydown
  .find(l => l.listener.toString().includes('actionArrowKey'))
  ?.listener;
window._autoTurn = setInterval(async () => {
  nav({ key: 'ArrowLeft', stopPropagation: () => {}, preventDefault: () => {} });
  await new Promise(r => setTimeout(r, 3000));
  const changed = await window._waitForPageChange();
  if (!changed) {
    clearInterval(window._autoTurn);
    console.log('Last page reached');
  }
}, 3500);
```

## Gaugau scraper
Same as comipo scraper.

```javascript
window._autoTurn = setInterval(async () => {
  __sreaderFunc__.keyDown({ 
    keyCode: 37, charCode: 0, shiftKey: false,
    preventDefault: () => {}, stopPropagation: () => {}
  });
  const changed = await window._waitForPageChange();
  if (!changed) {
    clearInterval(window._autoTurn);
    console.log('Last page reached');
    return;
  }
  await window._saveCurrentPages();
}, 3000);
```