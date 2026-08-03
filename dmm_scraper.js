// ==UserScript==
// @name         DMM Scraper
// @namespace    http://tampermonkey.net/
// @version      0.9.0
// @author       You
// @match        https://book.dmm.com/*
// @match        https://book.dmm.co.jp/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      ebook04.dmm.com
// @connect      ebook04.dmm.co.jp
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const _origFetch = unsafeWindow.fetch.bind(unsafeWindow);
  unsafeWindow.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    const res = await _origFetch(...args);
    if (url && url.includes('/viewerapi/auth/')) {
      res.clone().json().then(data => {
        if (data.status === '200' && data.url) {
          unsafeWindow._lastBaseUrl = data.url;
          console.log('Captured base URL:', data.url);
        } else {
          console.warn('Auth response missing expected fields:', data);
        }
      }).catch(err => console.warn('Failed to parse auth response:', err));
    }
    return res;
  };

  function gmFetch(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        responseType: "arraybuffer",
        onload: res => res.status === 200
          ? resolve(res.response)
          : reject(new Error(`HTTP ${res.status} for ${url}`)),
        onerror: reject
      });
    });
  }

  async function fetchManifest(baseUrl) {
    const res = await fetch(baseUrl + "configuration_pack.json", { credentials: 'include' });
    if (!res.ok) throw new Error(`Manifest fetch failed: HTTP ${res.status}`);
    return res.json();
  }

  function buildPageList(configPack, baseUrl) {
    const pages = [];
    for (const entry of configPack.configuration.contents) {
      const type = entry.type === 'bmp' ? 'jpeg' : entry.type;
      const fileData = configPack[entry.file];
      if (!fileData || fileData.Linear === 0) continue;

      for (let i = 0; i < fileData.FileLinkInfo.PageCount; i++) {
        const linkInfo = fileData.FileLinkInfo.PageLinkInfoList[i];
        const pathNoExt = entry.file + '/' + linkInfo.Page.No;
        const url = baseUrl + pathNoExt + '.' + type;

        const dw = linkInfo.Page.DummyWidth, dh = linkInfo.Page.DummyHeight;
        let dummyWidth, dummyHeight, pattern;
        if (typeof dw === 'number' && typeof dh === 'number') {
          dummyWidth = dw; dummyHeight = dh;
          let sum = 0;
          for (let c = 0; c < pathNoExt.length; c++) sum += pathNoExt.charCodeAt(c);
          pattern = sum % 4 + 1; // the pattern derivation
        }
        pages.push({ url, dummyWidth, dummyHeight, pattern, label: entry.file });
      }
    }
    return pages;
  }

  // the descramble tile math from publus-viewer.js?20260622
  // needs to remath the whole thing if DMM updates its bundle
  function Vn(n, e, t, r) { return n * r + (n >= e ? t : 0); }
  function Fu(n, e, t) { return (n + 61 * t) % e; }
  function Qi(n, e, t, r, i) {
    const s = i % 2 == 1;
    let a, l, u;
    return u = n < e ? s : !s, u ? (l = t, a = 0) : (l = r - t, a = t), (n + 53 * i + 59 * t) % l + a;
  }
  function es(n, e, t, r, i) {
    const s = i % 2 == 1;
    let a, l, u;
    return u = n < t ? s : !s, u ? (l = r - e, a = e) : (l = e, a = 0), (n + 67 * i + e + 71) % l + a;
  }
  function Xu(n, e, t) { return (n + 73 * t) % e; }
  function Wu(n, e, t) {
    return (function (r, i, s, a = 64, l = 64) {
      const u = Math.floor(r / a), c = Math.floor(i / l), d = r % a, h = i % l;
      let f, g, v, b, p, m, T, $, z, j, E, y;
      const L = new Array();
      if (f = u - 43 * s % u, f = f % u == 0 ? (u - 4) % u : f, f = f == 0 ? u - 1 : f, g = c - 47 * s % c, g = g % c == 0 ? (c - 4) % c : g, g = g == 0 ? c - 1 : g, d > 0 && h > 0 && (v = f * a, b = g * l, L.push({ srcX: v, srcY: b, destX: v, destY: b, width: d, height: h })), h > 0) for (T = 0; T < u; T++) z = Fu(T, u, s), j = Qi(z, f, g, c, s), p = Vn(z, f, d, a), m = j * l, v = Vn(T, f, d, a), b = g * l, L.push({ srcX: v, srcY: b, destX: p, destY: m, width: a, height: h });
      if (d > 0) for ($ = 0; $ < c; $++) j = Xu($, c, s), z = es(j, f, g, u, s), p = z * a, m = Vn(j, g, h, l), v = f * a, b = Vn($, g, h, l), L.push({ srcX: v, srcY: b, destX: p, destY: m, width: d, height: l });
      for (T = 0; T < u; T++) for ($ = 0; $ < c; $++) z = (T + 29 * s + 31 * $) % u, j = ($ + 37 * s + 41 * z) % c, E = z >= es(j, f, g, u, s) ? d : 0, y = j >= Qi(z, f, g, c, s) ? h : 0, p = z * a + E, m = j * l + y, v = T * a + (T >= f ? d : 0), b = $ * l + ($ >= g ? h : 0), L.push({ srcX: v, srcY: b, destX: p, destY: m, width: a, height: l });
      return L;
    })(n, e, t);
  }

  async function captureAndDescramble(pageInfo) {
    const buf = await gmFetch(pageInfo.url);
    const blob = new Blob([buf], { type: 'image/jpeg' });
    const bitmap = await createImageBitmap(blob);
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = bitmap.width;
    srcCanvas.height = bitmap.height;
    srcCanvas.getContext('2d').drawImage(bitmap, 0, 0);
    if (pageInfo.pattern === undefined) return srcCanvas;

    const realWidth = bitmap.width - pageInfo.dummyWidth;
    const realHeight = bitmap.height - pageInfo.dummyHeight;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = realWidth;
    outCanvas.height = realHeight;
    const outCtx = outCanvas.getContext('2d');
    const tiles = Wu(bitmap.width, bitmap.height, pageInfo.pattern);
    for (const t of tiles) {
      outCtx.drawImage(srcCanvas, t.destX, t.destY, t.width, t.height, t.srcX, t.srcY, t.width, t.height);
    }
    return outCanvas;
  }

  async function scrapeAll(baseUrl) {
    baseUrl = baseUrl || unsafeWindow._lastBaseUrl;
    if (!baseUrl) {
      console.error('No base URL available. Reload the reader page first (to capture it), or pass one explicitly.');
      return;
    }
    console.log('Using base URL:', baseUrl);
    console.log('Fetching manifest...');
    const cfg = await fetchManifest(baseUrl);
    const pages = buildPageList(cfg, baseUrl);
    console.log(`Found ${pages.length} pages`);

    const dirHandle = await window.showDirectoryPicker();
    for (let i = 0; i < pages.length; i++) {
      try {
        const canvas = await captureAndDescramble(pages[i]);
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const fileHandle = await dirHandle.getFileHandle(
          `image_${String(i + 1).padStart(3, '0')}.png`, { create: true }
        );
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        console.log(`${i + 1}/${pages.length} — ${pages[i].label}`);
      } catch (e) {
        console.error(`page ${i + 1} (${pages[i].label}):`, e);
      }
      await new Promise(r => setTimeout(r, 150));
    }
    console.log('Done');
  }

  unsafeWindow._dmmScraper = { gmFetch, fetchManifest, buildPageList, captureAndDescramble, scrapeAll };
  console.log('DMM scraper loaded. Run \'_dmmScraper.scrapeAll()\' to start scraping.');
})();