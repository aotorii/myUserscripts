// ==UserScript==
// @name         Firecross Scraper (Firefox)
// @namespace    http://tampermonkey.net/
// @version      0.9.0
// @description  Turn pages manually
// @author       You
// @match        https://firecross.jp/reader/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const _origFetch = window.fetch.bind(window);
    window._waitForPageChange = null;

    window.fetch = async function (...args) {
        const res = await _origFetch(...args);
        try {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
            if (!url || !url.includes('diazepam_hybrid.php')) return res;

            const params = new URLSearchParams(url.split('?')[1]);
            const mode = params.get('mode');
            const file = params.get('file');

            if (mode === '8') {
                res.clone().text().then(text => {
                    const scramble = text.match(/<Scramble>(.*?)<\/Scramble>/);
                    const pageNo = text.match(/<PageNo>(.*?)<\/PageNo>/);
                    if (scramble && pageNo) {
                        window._scrambleTables = window._scrambleTables || {};
                        window._scrambleTables[pageNo[1]] = scramble[1].split(',').map(Number);
                        console.log(`Page ${pageNo[1]} captured`);
                    }
                });
            }
        } catch (e) {
            console.error('fetch intercept error:', e);
        }
        return res;
    };

    const _origImageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
        set: function (url) {
            if (typeof url === 'string' && url.includes('diazepam_hybrid.php')) {
                const params = new URLSearchParams(url.split('?')[1]);
                const mode = params.get('mode');
                const file = params.get('file');
                if (mode === '1' && file && file.endsWith('.bin')) {
                    this.addEventListener('load', () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = this.naturalWidth;
                        canvas.height = this.naturalHeight;
                        canvas.getContext('2d').drawImage(this, 0, 0);
                        window._binFiles = window._binFiles || {};
                        window._binFiles[file] = canvas.toDataURL('image/png');
                        console.log(`Captured: ${file}`);
                    }, { once: true });
                }
            }
            _origImageSrc.set.call(this, url);
        },
        get: function () {
            return _origImageSrc.get.call(this);
        }
    });

    const waitForPageChange = () => new Promise(resolve => {
        const beforeCount = Object.keys(window._binFiles || {}).length;
        const beforeTables = Object.keys(window._scrambleTables || {}).length;
        const start = Date.now();

        const check = setInterval(() => {
            const afterCount = Object.keys(window._binFiles || {}).length;
            const afterTables = Object.keys(window._scrambleTables || {}).length;

            if (afterCount > beforeCount || afterTables > beforeTables) {
                clearInterval(check);
                resolve(true);
            }

            if (Date.now() - start > 5000) {
                clearInterval(check);
                resolve(false);
            }
        }, 100);
    });

    window.addEventListener('load', () => {
        window._waitForPageChange = waitForPageChange;

        setTimeout(() => {

            const unscramble = (imageDataUrl, scrambleTable) => {
                return new Promise(resolve => {
                    const img = new Image();
                    img.onload = () => {
                        const swNum = Math.sqrt(scrambleTable.length);
                        const shNum = Math.sqrt(scrambleTable.length);
                        const tileW = Math.floor(Math.floor(img.width / swNum) / 8) * 8;
                        const tileH = Math.floor(Math.floor(img.height / shNum) / 8) * 8;
                        const coveredW = tileW * swNum;
                        const coveredH = tileH * shNum;

                        const src = document.createElement('canvas');
                        src.width = img.width;
                        src.height = img.height;
                        src.getContext('2d').drawImage(img, 0, 0);

                        const dst = document.createElement('canvas');
                        dst.width = img.width;
                        dst.height = img.height;
                        const ctx = dst.getContext('2d');

                        scrambleTable.forEach((srcIndex, dstIndex) => {
                            const dstX = (dstIndex % swNum) * tileW;
                            const dstY = Math.floor(dstIndex / swNum) * tileH;
                            const srcX = (srcIndex % swNum) * tileW;
                            const srcY = Math.floor(srcIndex / swNum) * tileH;
                            ctx.drawImage(src, srcX, srcY, tileW, tileH, dstX, dstY, tileW, tileH);
                        });

                        ctx.drawImage(src, coveredW, 0, img.width - coveredW, img.height, coveredW, 0, img.width - coveredW, img.height);
                        ctx.drawImage(src, 0, coveredH, coveredW, img.height - coveredH, 0, coveredH, coveredW, img.height - coveredH);
                        resolve(dst.toDataURL('image/png'));
                    };
                    img.src = imageDataUrl;
                });
            };

            const saveBlob = async (filename, dataUrl) => {
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                console.log(`Saved ${filename}`);
            };

            const btn = document.createElement('button');
            btn.innerText = 'Save Pages';
            btn.style.cssText = 'position:fixed;top:20px;left:20px;z-index:99999;padding:10px 20px;font-size:16px;cursor:pointer;background:#4CAF50;color:white;border:none;border-radius:8px;';
            document.body.appendChild(btn);

            btn.onclick = async () => {
                btn.remove();

                const title = prompt('Episode');

                const stopBtn = document.createElement('button');
                stopBtn.innerText = 'Stop';
                stopBtn.style.cssText = 'position:fixed;top:20px;left:20px;z-index:99999;padding:10px 20px;font-size:16px;cursor:pointer;background:#f44336;color:white;border:none;border-radius:8px;';
                document.body.appendChild(stopBtn);
                let stopped = false;
                stopBtn.onclick = () => { stopped = true; stopBtn.remove(); console.log('Stopped'); };

                const binFiles = window._binFiles || {};
                const scrambleTables = window._scrambleTables || {};

                const pages = Object.keys(binFiles)
                    .filter(f => f.endsWith('.bin'))
                    .sort((a, b) => {
                        const numA = parseInt(a.match(/(\d+)_/)[1]);
                        const numB = parseInt(b.match(/(\d+)_/)[1]);
                        return numA - numB;
                    });
                let pageNum = 1;
                for (const file of pages) {
                    if (stopped) break;

                    const pageIndex = parseInt(file.match(/(\d+)_/)[1]);
                    const table = scrambleTables[pageIndex];

                    if (!table) {
                        console.warn(`No scramble table for ${file}, skipping`);
                        continue;
                    }

                    const unscrambled = await unscramble(binFiles[file], table);
                    const filename = `${title}_${String(pageNum).padStart(3, '0')}.png`;
                    await saveBlob(filename, unscrambled);
                    pageNum++;
                }
                if (!stopped) {
                    stopBtn.remove();
                }
            };
        }, 2000);
    });

})();