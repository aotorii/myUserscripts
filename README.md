Just some userscripts seasoned with my vibecoding. Chrome only.

## VGMdb album formatted info copy

Author: [kahpaibe](https://github.com/kahpaibe/userscripts/tree/main)

## VGMdb album page tweaks

Author: [kahpaibe](https://github.com/kahpaibe/userscripts/tree/main)

## Comipo scraper
Run this in console if you would like to auto turn pages. Adjust the interval based on your network status.

```javascript
const nav = getEventListeners(window).keydown
  .find(l => l.listener.toString().includes('ArrowLeft') && l.listener.toString().includes('pageIndexDispatch'))
  ?.listener;
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

## Gaugau/Gaugau-like scraper
These use the same approach to extract whole pages from blobs.

```javascript
window._autoTurn = setInterval(async () => {
  __sreaderFunc__.keyDown({ 
    keyCode: 37, charCode: 0, shiftKey: false,
    target: document.body,
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

## Magapoke scraper
Check [haruneko](https://github.com/manga-download/haruneko)

## DMM scraper
Run this in console to start the scraper.

```javascript
_dmmScraper.scrapeAll()
```

If you find the saved images are all scrambled without throwing any error, this means DMM has just updated its viewer bundle, in which case the descramble tile math the scraper is using needs to be updated accordingly. A cat-and-mouse game with nothing critical, until the next time DMM restructures and breaks the whole thing as always.