// ==UserScript==
// @name         Search in Amazon
// @namespace    http://tampermonkey.net/
// @version      0.9.0
// @description  Add a button to search BW items in Amazon
// @author       You
// @match        https://bookwalker.jp/de*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    function addSearchButton() {
        const titleElement = document.querySelector('h1.t-c-product-main-data__title')
        if (!titleElement) return;

        if (titleElement.parentElement.querySelector('.amazon-search-btn')) return;

        const title = titleElement.textContent.trim();
        const button = document.createElement('button');

        button.className = 'amazon-search-btn';
        button.textContent = 'search';
        Object.assign(button.style, {
            marginLeft: '6px',
            padding: '2.5px 6px',
            fontSize: '11px',
            lineHeight: '1.2',
            display: 'inline-block',
            color: '#111111',
            background: 'linear-gradient(to bottom, #ffd814, #ffa41c)',
            border: '1px solid #a88734',
            borderRadius: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            verticalAlign: 'middle',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
            appearance: 'none',
            WebkitAppearance: 'none'
        });
        button.addEventListener('click', async () => {
            const cleanTitle = title.replace(/\s*(?:【.*?】|\[.*?\]|［.*?］|（.*?）|\(.*?\)|「.*?」|『.*?』)\s*/g, '');
            const amazonUrl =
                'https://www.amazon.co.jp/s?k=' +
                encodeURIComponent(cleanTitle);
            window.open(amazonUrl, '_blank');
        });
        titleElement.appendChild(button);
    }
    addSearchButton();
})();