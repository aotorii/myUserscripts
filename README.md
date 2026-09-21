Just some userscripts seasoned with my vibecoding. Chrome/Firefox.

## VGMdb album formatted info copy

Author: [kahpaibe](https://github.com/kahpaibe/userscripts/tree/main)

## VGMdb album page tweaks

Author: [kahpaibe](https://github.com/kahpaibe/userscripts/tree/main)


## Auto-turn pages for manga scrapers
Run the following scripts in console (F12) if you would like to auto turn pages. Adjust the interval based on your network status.

### Comipo scraper

```javascript
let lastSrc = window._getCurrentImg()?.src;
window._autoTurn = setInterval(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        code: 'ArrowLeft',
        keyCode: 37,
        which: 37,
        bubbles: true,
        cancelable: true,
    }));
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

### Firecross scraper

```javascript
window._autoTurn = setInterval(async () => {
  window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'ArrowLeft',
    code: 'ArrowLeft',
    keyCode: 37,
    which: 37,
    bubbles: true,
    cancelable: true,
  }));
  await new Promise(r => setTimeout(r, 3000));
  const changed = await window._waitForPageChange();
  if (!changed) {
    clearInterval(window._autoTurn);
    console.log('Last page reached');
  }
}, 3500);
```

### Gaugau scraper

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

### Manga-one scraper

```javascript
let lastPages = window._getCurrentPages().map(img => img.src);
window._autoTurn = setInterval(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        code: 'ArrowLeft',
        keyCode: 37,
        which: 37,
        bubbles: true,
        cancelable: true,
    }));
    await new Promise(r => setTimeout(r, 2000));
    const pages = window._getCurrentPages();
    if (!pages.length) return;
    const currentPages = pages.map(img => img.src);
    const same = currentPages.length === lastPages.length && currentPages.every((src, i) => src === lastPages[i]);
    if (same) {
        clearInterval(window._autoTurn);
        console.log('Last page reached');
        return;
    }
    lastPages = currentPages;
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