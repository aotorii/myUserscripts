// ==UserScript==
// @name         Comipo Scraper
// @namespace    http://tampermonkey.net/
// @version      0.9.1
// @description  Turn pages manually
// @author       You
// @match        https://play.comipo.app/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==


// Run this in console if you would like to auto turn pages

// const nav = getEventListeners(window).keydown[2].listener;
// let lastSrc = window._getCurrentImg()?.src;
// window._autoTurn = setInterval(async () => {
//     nav({ key: 'ArrowLeft' });
//     await new Promise(r => setTimeout(r, 1500));
//     const img = window._getCurrentImg();
//     if (!img) return;
//     if (img.src === lastSrc) {
//         clearInterval(window._autoTurn);
//         console.log('Last page reached');
//         return;
//     }
//     lastSrc = img.src;
// }, 2000);

(function () {
    'use strict';

    window._getCurrentImg = null;
    window._savePage = null;

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
        let lastSrc = null;
        let saving = false;

        const dirHandle = await window.showDirectoryPicker();

        const stopBtn = document.createElement('button');
        stopBtn.innerText = 'Stop';
        stopBtn.style.cssText = 'position:fixed;bottom:60px;right:20px;z-index:99999;padding:10px 20px;font-size:16px;cursor:pointer;background:#f44336;color:white;border:none;border-radius:8px;';
        document.body.appendChild(stopBtn);

        const getCurrentImg = () => {
            const imgs = [...document.querySelectorAll('img')]
                .filter(i => i.naturalWidth >= 500 && i.naturalHeight >= 1000)
                ;

            if (imgs.length === 0) return null;

            const viewportCenter = window.innerWidth / 2;
            return imgs.reduce((closest, img) => {
                const rect = img.getBoundingClientRect();
                const dist = Math.abs(rect.left + img.width / 2 - viewportCenter);
                const closestRect = closest.getBoundingClientRect();
                const closestDist = Math.abs(closestRect.left + closest.width / 2 - viewportCenter);
                return dist < closestDist ? img : closest;
            });
        };

        const savePage = (img) => {
            return new Promise((resolve) => {
                const filename = `${title}_${String(pageNum).padStart(3, '0')}.png`;
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);

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

        window._getCurrentImg = getCurrentImg;
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
                    const current = getCurrentImg();
                    if (!current || current.src === lastSrc) return;
                    lastSrc = current.src;
                    await savePage(current);
                } finally {
                    saving = false;
                }
            }, 500);
        });

        window._observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['src'] });

        const first = getCurrentImg();
        if (!first) { console.error('No image found'); return; }
        lastSrc = first.src;
        await savePage(first);

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

