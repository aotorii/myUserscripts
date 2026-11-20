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

## Region-locked manga sites since 2026/10
Due to Japanese platforms' [security measure](https://en.wikipedia.org/wiki/Geo-blocking) in response to [critical PHP vulnerabilities](https://en.wikipedia.org/wiki/PHP2Shell) and non-stop cyberattacks, a number of online manga sites are influenced and restrict access from oversea IP without a stated time limit. For archival purposes as well as everyone's information, I'd like to list the ones I have encountered so far. You might notice that some of them pop up a maintenance notification instead of a geoblocking one.

  - [cmoa](https://www.cmoa.jp/)
  - [comici](https://comics.comici.jp/) cooperation sites
    <details>
    <summary>Expand</summary>

      - [asacomi](https://asacomi.jp/)
      - [bibibi-comic](https://bibibi-comic.com/)
      - [booklista](https://studio.booklista.co.jp/)
      - [championcross](https://championcross.jp/)
      - [comic-growl](https://comic-growl.com/)
      - [comic-room-base](https://comic-room-base.com/)
      - [comic-ryu](https://comic-ryu.jp/)
      - [comicpash](https://comicpash.jp/)
      - [comicride](https://comicride.jp/)
      - [comirela](https://comirela.com/)
      - [corkagency](https://ebookstore.corkagency.com/)
      - [g-comi](https://g-comi.jp/)
      - [hanayume](https://hanayume.com/)
      - [hayacomic](https://hayacomic.jp/)
      - [heros-web](https://heros-web.com/)
      - [kimicomi](https://kimicomi.com/)
      - [magkan](https://kansai.mag-garden.co.jp/)
      - [manga-bang](https://comics.manga-bang.com/)
      - [manga-zegra](https://manga-zegra.com/)
      - [mangabu](https://mangabu.jp/)
      - [mangalt](https://mangalt.jp/)
      - [mangaspa](https://mangaspa.nikkan-spa.jp/)
      - [namicomic](https://namicomic.jp/)
      - [piacomic](https://piacomic.jp/)
      - [ruelle](https://comic.j-nbooks.jp/)
      - [takecomic](https://takecomic.jp/)
      - [younganimal](https://younganimal.com/)
      - [youngchampion](https://youngchampion.jp/)

    </details>

  - [gamers](https://www.gamers.co.jp/)
