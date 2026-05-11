(function () {
    const btn = document.createElement('button');
    btn.innerText = 'Start Scraper';
    btn.style.cssText = 'position:fixed;top:20px;left:20px;z-index:99999;padding:10px 20px;font-size:16px;cursor:pointer;background:#4CAF50;color:white;border:none;border-radius:8px;';
    document.body.appendChild(btn);

    btn.onclick = async () => {
        btn.remove();

        const title = prompt('Episode');
        let pageNum = '1';
        let dirHandle = null;
        let pendingRequests = 0;
        let saving = false;

        dirHandle = await window.showDirectoryPicker();

        const saveCanvas = (canvas, num) => {
            return new Promise((resolve) => {
                const filename = `${title}_${String(num).padStart(3, '0')}.png`;
                canvas.toBlob(async (blob) => {
                    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    console.log(`✅ Saved ${filename}`);
                    resolve();
                }, 'image/png');
            });
        };

        const saveCurrentPages = async () => {
            if (saving) return;
            saving = true;

            await new Promise(r => setTimeout(r, 1000));

            const canvases = [...document.querySelectorAll('canvas')]
                .filter(c => c.width > 500);

            //   for (const canvas of canvases) {
            //     await saveCanvas(canvas, pageNum);
            //     pageNum++;
            //   }
            if (canvases.length > 0) {
                await saveCanvas(canvases[0], pageNum);
                pageNum++;
            }

            saving = false;
        };

        if (window._origFetch) fetch = window._origFetch;
        window._origFetch = fetch;

        window.fetch = function (...args) {
            const url = args[0];
            if (typeof url === 'string' && url.includes('diazepam_hybrid.php')) {
                pendingRequests++;
                return window._origFetch.apply(this, args).then(async res => {
                    pendingRequests--;
                    if (pendingRequests === 0) {
                        await saveCurrentPages();
                    }
                    return res;
                });
            }
            return window._origFetch.apply(this, args);
        };

        await saveCurrentPages();
    };
})();