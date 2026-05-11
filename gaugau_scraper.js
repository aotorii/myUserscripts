// ==UserScript==
// @name         Gaugau Scraper
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Remember to switch to fullscreen mode on the viewer page and use leftarrow key to turn pages.
// @author       You
// @match        https://gaugau.futabanet.jp/list/work/*/episodes/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==


(function () {
    'use strict';

    const match = location.pathname.match(/\/episodes\/(\d+)$/);

    if (!match) {
        return;
    }

    const btn = document.createElement('button');
    btn.innerText = 'Start Scraper';
    btn.style.cssText = 'position:fixed;top:20px;left:20px;z-index:99999;padding:10px 20px;font-size:16px;cursor:pointer;background:#4CAF50;color:white;border:none;border-radius:8px;';
    document.body.appendChild(btn);

    btn.onclick = async () => {
        btn.remove();

        const title = prompt('Episode');
        let pageNum = 1;
        let lastSrcs = [];
        // let saving = false;
        let dirHandle = null;
        let isSaving = false;

        dirHandle = await window.showDirectoryPicker();

        // const getViewerWidth = () => {
        //     const viewer = document.querySelector('.viewer')
        //         || document.querySelector('[class*="viewer"]')
        //         || document.querySelector('[class*="reader"]');
        //     return viewer ? viewer.getBoundingClientRect().width : window.innerWidth;
        // };

        const getSpreadLeftValues = () => {
            const imgs = [...document.querySelectorAll('img')]
                .filter(i => i.naturalWidth === 1126 && i.naturalHeight === 536);
            return [...new Set(
                imgs.map(i => Math.round(i.getBoundingClientRect().left))
            )].filter(left => left >= 0 && left < window.innerWidth - 150)
                .sort((a, b) => a - b);
        };


        const stitchStrips = (strips) => {
            const overlap = 4; // pixels to crop from bottom of each strip
            const stripH = strips[0].naturalHeight;
            const stripW = strips[0].naturalWidth;
            const totalHeight = stripH * strips.length - overlap * (strips.length - 1);

            const canvas = document.createElement('canvas');
            canvas.width = stripW;
            canvas.height = totalHeight;
            const ctx = canvas.getContext('2d');

            strips.forEach((strip, i) => {
                const destY = i * (stripH - overlap);
                ctx.drawImage(strip, 0, 0, stripW, stripH, 0, destY, stripW, stripH);
            });

            return canvas;
        };

        const getCurrentPages = () => {
            const imgs = [...document.querySelectorAll('img')]
                .filter(i => i.naturalWidth === 1126 && i.naturalHeight === 536);
            const leftValues = getSpreadLeftValues().reverse();
            return leftValues.map(targetLeft => {
                const strips = imgs
                    .filter(i => Math.round(i.getBoundingClientRect().left) === targetLeft)
                    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
                return { canvas: stitchStrips(strips), src: strips[0].src };
            });
        };

        const getCurrentSrcs = () => getCurrentPages().map(p => p.src);

        const saveCanvas = (canvas) => {
            return new Promise((resolve) => {
                const filename = `${title}_${String(pageNum).padStart(3, '0')}.png`;
                canvas.toBlob(async (blob) => {
                    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    console.log(`✅ Saved ${filename}`);
                    pageNum++;
                    resolve();
                }, 'image/png');
            });
        };

        const saveCurrentPages = async () => {
            await new Promise(r => setTimeout(r, 500));

            const pages = getCurrentPages();
            for (const page of pages) {
                await saveCanvas(page.canvas);
            }

            lastSrcs = getCurrentSrcs();
            isSaving = false;
        };

        // const getFingerprint = () => {
        //     const imgs = [...document.querySelectorAll('img')]
        //         .filter(i => i.naturalWidth === 1126 && i.naturalHeight === 536);

        //     const leftValues = getSpreadLeftValues();
        //     if (leftValues.length === 0) return null;

        //     const firstStrip = imgs.find(i =>
        //         Math.round(i.getBoundingClientRect().left) === leftValues[0]
        //     );
        //     if (!firstStrip) return null;

        //     const canvas = document.createElement('canvas');
        //     canvas.width = firstStrip.naturalWidth;
        //     canvas.height = firstStrip.naturalHeight;
        //     canvas.getContext('2d').drawImage(firstStrip, 0, 0);
        //     const ctx = canvas.getContext('2d');

        //     const points = [
        //         [100, 100], [300, 200], [500, 300],
        //         [700, 100], [900, 400], [200, 450],
        //         [600, 50], [1000, 250]
        //     ];

        //     return points.map(([x, y]) => {
        //         const d = ctx.getImageData(x, y, 1, 1).data;
        //         return `${d[0]},${d[1]},${d[2]}`;
        //     }).join('|');
        // };

        // const isBlank = (fingerprint) => {
        //     const values = fingerprint.split('|').map(p => p.split(',').map(Number));
        //     const zeroCount = values.filter(([r]) => r === 0 || r === 255).length;
        //     return zeroCount > 5; // mostly black or white = still loading
        // };

        // let lastFP = getFingerprint();
        // let lastSaveTime = 0;

        // window._observer = setInterval(() => {
        //     if (saving) return;

        //     if (Date.now() - lastSaveTime < 2000) return;

        //     const current = getFingerprint();
        //     if (!current || current === lastFP) return;
        //     if (isBlank(current)) return;

        //     saving = true;
        //     lastFP = current;

        //     setTimeout(async () => {
        //         await saveCurrentPages();
        //         lastSaveTime = Date.now();
        //     }, 500);
        // }, 100);

        if (window._keyListener) {
            document.removeEventListener('keydown', window._keyListener, true);
        }

        window._keyListener = async (e) => {
            if (e.key !== 'ArrowLeft') return;
            if (isSaving) return;
            isSaving = true;
            await saveCurrentPages();
            isSaving = false;
        };

        document.addEventListener('keydown', window._keyListener, false);

        isSaving = true;
        const pages = getCurrentPages();
        for (const page of pages) {
            await saveCanvas(page.canvas);
        }
        isSaving = false;

        // await saveCurrentPages();
    };
})();