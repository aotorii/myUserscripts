// ==UserScript==
// @name         Gaugau Scraper (Firefox)
// @namespace    http://tampermonkey.net/
// @version      0.9.0
// @description  Remember to switch to fullscreen mode on the viewer page and use leftarrow key to turn pages manually
// @author       You
// @match        https://gaugau.futabanet.jp/list/work/*/episodes/*
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
    btn.style.cssText = 'position:fixed;bottom:60px;right:20px;z-index:99999;padding:10px 20px;font-size:16px;cursor:pointer;background:#4CAF50;color:white;border:none;border-radius:8px;';
    document.body.appendChild(btn);

    btn.onclick = async () => {
        btn.remove();

        const title = prompt('Episode');
        let pageNum = 1;
        let lastSrcs = [];
        let isSaving = false;

        const stopBtn = document.createElement('button');
        stopBtn.innerText = 'Stop';
        stopBtn.style.cssText = 'position:fixed;bottom:60px;right:20px;z-index:99999;padding:10px 20px;font-size:16px;cursor:pointer;background:#f44336;color:white;border:none;border-radius:8px;';

        document.body.appendChild(stopBtn);

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

        const saveCurrentPages = async () => {
            await new Promise(r => setTimeout(r, 500));

            const pages = getCurrentPages();
            for (const page of pages) {
                await saveCanvas(page.canvas);
            }

            lastSrcs = getCurrentSrcs();
            isSaving = false;
        };

        window._saveCurrentPages = saveCurrentPages;
        window._getCurrentPages = getCurrentPages;

        window._waitForPageChange = () => new Promise(resolve => {
            const before = getCurrentPages().map(p => p.src).join(',');
            const start = Date.now();
            const check = setInterval(() => {
                const current = getCurrentPages().map(p => p.src).join(',');
                if (current !== before) {
                    clearInterval(check);
                    resolve(true);
                }
                if (Date.now() - start > 5000) {
                    clearInterval(check);
                    resolve(false);
                }
            }, 100);
        });

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

        stopBtn.onclick = () => {
            stopBtn.remove();
            if (window._keyListener) {
                document.removeEventListener('keydown', window._keyListener, false);
                window._keyListener = null;
                console.log('Listener stopped');
            }
            if (window._autoTurn) {
                clearInterval(window._autoTurn);
                console.log('autoTurn stopped');
            }
        };
    };
})();