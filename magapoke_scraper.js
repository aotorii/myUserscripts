// ==UserScript==
// @name         Magapoke Scraper
// @namespace    http://tampermonkey.net/
// @version      0.9.1
// @description  haruneko
// @author       haruneko
// @match        https://pocket.shonenmagazine.com/title/*/episode/*
// @grant        GM_xmlhttpRequest
// @connect      mgpk-cdn.magazinepocket.com
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const _origAddEventListener = window.addEventListener.bind(window);
    window.addEventListener = function (type, listener, ...args) {
        if (type === 'blur') return;
        return _origAddEventListener(type, listener, ...args);
    };

    const API_BASE = 'https://api.pocket.shonenmagazine.com/';
    const HASH_HEADER = 'X-Manga-Hash';
    const HASH_SEED = [
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
    ].join('_');
    const FIXED_HEADERS = {
        'x-manga-is-crawler': 'false',
        'x-manga-platform': '3',
    };
    const CHARSET_EVEN = 'svdk0m7acl';
    const CHARSET_ODD = 'q6jtf2xnog';
    const COL_NUM = 4;
    const MULTIPLE_NUM = 8;

    const getHexFromBytes = (bytes) =>
        Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const getBytesFromUTF8 = (text) =>
        new TextEncoder().encode(text);

    const computeSHA = async (text, algorithm) => {
        const hash = await crypto.subtle.digest(algorithm, getBytesFromUTF8(text));
        return getHexFromBytes(new Uint8Array(hash));
    };

    const computeHash = async (parameters, seed) => {
        parameters.sort();
        const paramHashes = await Promise.all(
            [...parameters.entries()].map(async ([key, value]) => [
                await computeSHA(key, 'SHA-256'),
                await computeSHA(value, 'SHA-512'),
            ].join('_'))
        );
        const aggregateHash = await computeSHA(paramHashes.join(','), 'SHA-256');
        return computeSHA(aggregateHash + seed, 'SHA-512');
    };

    const fetchAPI = async (endpoint, params) => {
        const payload = new URLSearchParams(params);
        const uri = new URL(endpoint, API_BASE);
        uri.search = payload.toString();
        uri.searchParams.set('version', '6.0.0');
        uri.searchParams.set('platform', '3');

        const hash = await computeHash(uri.searchParams, HASH_SEED);
        const res = await fetch(uri.toString(), {
            method: 'GET',
            credentials: 'include',
            headers: { ...FIXED_HEADERS, [HASH_HEADER]: hash },
        });
        return res.json();
    };

    const computeSeed32 = (seed, charset, titleId, episodeId) => {
        let parsedInt = 0n;
        for (const char of seed) {
            const index = charset.indexOf(char);
            if (index !== -1) parsedInt = parsedInt * 10n + BigInt(index);
            else break;
        }
        const parsedUInt32 = Number(parsedInt & 0xFFFFFFFFn);
        const combined = (titleId >>> 0) + (episodeId >>> 0);
        return (parsedUInt32 ^ combined) >>> 0;
    };

    function* createXorShift32(seed) {
        const e = Uint32Array.of(seed);
        for (; ;) {
            e[0] ^= e[0] << 13;
            e[0] ^= e[0] >>> 17;
            e[0] ^= e[0] << 5;
            yield e[0];
        }
    }

    const shuffleArrayWithPRNG = (array, seed) => {
        const t = createXorShift32(seed);
        return array
            .map(r => [t.next().value, r])
            .sort((a, b) => +(a[0] > b[0]) - +(b[0] > a[0]))
            .map(r => r[1]);
    };

    function* generateScrambleMapping(gridSize, seed) {
        yield* shuffleArrayWithPRNG(
            [...Array(gridSize ** 2)].map((_, r) => r),
            seed
        ).map((s, r) => ({
            source: { x: s % gridSize, y: Math.floor(s / gridSize) },
            dest: { x: r % gridSize, y: Math.floor(r / gridSize) },
        }));
    }

    const getLCM = (a, b) => {
        const gcd = (s, r) => s ? gcd(r % s, s) : r;
        return a * b / gcd(a, b);
    };

    const computeLCMBlockDimensions = (width, height, gridSize) => {
        if (width < gridSize || height < gridSize) return null;
        const s = getLCM(gridSize, MULTIPLE_NUM);
        if (width > s && height > s) {
            width = Math.floor(width / s) * s;
            height = Math.floor(height / s) * s;
        }
        return { width: Math.floor(width / gridSize), height: Math.floor(height / gridSize) };
    };

    const computeGridBlockDimensions = (width, height, gridSize) => {
        if (width < gridSize * MULTIPLE_NUM || height < gridSize * MULTIPLE_NUM) return null;
        const s = Math.floor(width / MULTIPLE_NUM);
        const r = Math.floor(height / MULTIPLE_NUM);
        return { width: Math.floor(s / gridSize) * MULTIPLE_NUM, height: Math.floor(r / gridSize) * MULTIPLE_NUM };
    };

    const unscramble = async (blob, seed, version) => {
        const bitmap = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);

        const dims = version === 1
            ? computeLCMBlockDimensions(bitmap.width, bitmap.height, COL_NUM)
            : computeGridBlockDimensions(bitmap.width, bitmap.height, COL_NUM);

        if (!dims) return blob;

        for (const c of generateScrambleMapping(COL_NUM, seed)) {
            ctx.drawImage(bitmap,
                c.source.x * dims.width, c.source.y * dims.height, dims.width, dims.height,
                c.dest.x * dims.width, c.dest.y * dims.height, dims.width, dims.height
            );
        }
        return canvas.convertToBlob({ type: 'image/png' });
    };

    const saveBlob = async (dirHandle, filename, blob) => {
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        console.log(`Saved ${filename}`);
    };

    const fetchImage = (url) => new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            responseType: 'blob',
            onload: (res) => resolve(res.response),
            onerror: (err) => reject(err),
        });
    });

    window.addEventListener('load', () => {
        setTimeout(() => {
            const btn = document.createElement('button');
            btn.innerText = 'Start Scraper';
            btn.style.cssText = 'position:fixed;top:20px;left:20px;z-index:99999;padding:10px 20px;font-size:16px;cursor:pointer;background:#4CAF50;color:white;border:none;border-radius:8px;';
            document.body.appendChild(btn);

            btn.onclick = async () => {
                btn.remove();

                const title = prompt('Episode');
                const dirHandle = await window.showDirectoryPicker();

                const stopBtn = document.createElement('button');
                stopBtn.innerText = 'Stop';
                stopBtn.style.cssText = 'position:fixed;top:20px;left:20px;z-index:99999;padding:10px 20px;font-size:16px;cursor:pointer;background:#f44336;color:white;border:none;border-radius:8px;';
                document.body.appendChild(stopBtn);
                let stopped = false;
                stopBtn.onclick = () => { stopped = true; stopBtn.remove(); };

                const pathParts = location.pathname.split('/');
                const titleId = parseInt(pathParts[2]);
                const episodeId = parseInt(pathParts[4]);

                console.log('Fetching viewer API...');
                const { page_list, scramble_seed, scramble_ver } = await fetchAPI('./web/episode/viewer', {
                    episode_id: episodeId.toString(),
                });

                console.log(`${page_list.length} pages, seed: ${scramble_seed}, ver: ${scramble_ver}`);

                const charset = titleId % 2 === 0 ? CHARSET_EVEN : CHARSET_ODD;
                const seed = typeof scramble_seed === 'string'
                    ? computeSeed32(scramble_seed, charset, titleId, episodeId)
                    : scramble_seed ?? 1;
                const version = scramble_ver ?? -1;
                console.log(`Computed seed: ${seed}, version: ${version}`);

                let pageNum = 1;
                for (const pageUrl of page_list) {
                    if (stopped) break;

                    console.log(`Fetching page ${pageNum}...`);
                    const blob = await fetchImage(pageUrl);

                    console.log(`Unscrambling page ${pageNum}...`);
                    const unscrambled = await unscramble(blob, seed, version);

                    const filename = `${title}_${String(pageNum).padStart(3, '0')}.png`;
                    await saveBlob(dirHandle, filename, unscrambled);
                    pageNum++;
                }

                if (!stopped) {
                    stopBtn.remove();
                    console.log('All pages saved');
                }
            };
        }, 2000);
    });
})();