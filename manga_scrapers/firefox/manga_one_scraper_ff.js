// ==UserScript==
// @name         Manga-one Scraper (Firefox)
// @namespace    http://tampermonkey.net/
// @version      0.9.0
// @description  Scraper for manga-one
// @author       You
// @match        https://manga-one.com/manga/*/chapter/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';
    const btn = document.createElement('button');
    setTimeout(() => {
        btn.innerText = 'Start Scraper';
        btn.style.cssText = 'position:fixed;bottom:60px;right:20px;z-index:99999;padding:10px 20px;font-size:16px;cursor:pointer;background:#4CAF50;color:white;border:none;border-radius:8px;';
        document.body.appendChild(btn);
    }, 3000);
    btn.onclick = async () => {
        btn.remove();
        const title = prompt('Episode');
        let pageNum = 1;
        let lastPages = null;
        let saving = false;
        const stopBtn = document.createElement('button');
        stopBtn.innerText = 'Stop';
        stopBtn.style.cssText = 'position:fixed;bottom:60px;right:20px;z-index:99999;padding:10px 20px;font-size:16px;cursor:pointer;background:#f44336;color:white;border:none;border-radius:8px;';
        document.body.appendChild(stopBtn);

        const getSpreadLeftValues = () => {
            const imgs = [...document.querySelectorAll('img')]
                .filter(i => i.naturalWidth === 720 && i.naturalHeight === 1020);
            return [...new Set(
                imgs.map(i => Math.round(i.getBoundingClientRect().left))
            )].filter(left => left >= 0 && left < window.innerWidth)
                .sort((a, b) => a - b)
                .slice(0, 2);
        };

        const getCurrentPages = () => {
            const imgs = [...document.querySelectorAll('img')]
                .filter(i => i.naturalWidth === 720 && i.naturalHeight === 1020);
            const leftValues = getSpreadLeftValues().reverse();
            return leftValues
                .map(targetLeft =>
                    imgs.find(i => Math.round(i.getBoundingClientRect().left) === targetLeft)
                )
                .filter(Boolean);
        };

        const savePage = (img) => {
            return new Promise((resolve) => {
                const filename = `${title}_${String(pageNum).padStart(3, '0')}.png`;
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);
                canvas.toBlob(async (blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    console.log(`Saved ${filename}`);
                    pageNum++;
                    resolve();
                }, 'image/png');
            });
        };

        window._getCurrentPages = getCurrentPages;
        window._savePage = savePage;

        if (window._observer) {
            window._observer.disconnect();
        }
        await new Promise(resolve => setTimeout(resolve, 1000));

        window._observer = new MutationObserver(() => {
            if (saving) return;
            saving = true;
            setTimeout(async () => {
                try {
                    const pages = getCurrentPages();
                    if (pages.length === 0) return;

                    const currentSrcs = pages.map(img => img.src);
                    const same =
                        currentSrcs.length === lastPages.length &&
                        currentSrcs.every((src, i) => src === lastPages[i]);
                    if (same) return;

                    lastPages = currentSrcs;
                    for (const img of pages) {
                        await savePage(img);
                    }
                } finally {
                    saving = false;
                }
            }, 500);
        });

        window._observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['src'] });

        const first = getCurrentPages();
        if (!first.length) { console.error('No image found'); return; }
        lastPages = first.map(img => img.src);
        for (const img of first) {
            await savePage(img);
        }
        stopBtn.onclick = () => {
            stopBtn.remove();
            if (window._observer) {
                window._observer.disconnect();
                console.log('Observer stopped');
            }
            if (window._autoTurn) {
                clearInterval(window._autoTurn);
                console.log('autoTurn stopped');
            }
        };
    };
})();