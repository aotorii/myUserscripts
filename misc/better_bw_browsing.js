// ==UserScript==
// @name         Better BW Browsing
// @namespace    http://tampermonkey.net/
// @version      0.9.2
// @description  Improve my BW browsing experience
// @author       You
// @match        https://bookwalker.jp/de*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // Hide campaign elements
    const style = document.createElement('style');
    style.textContent = `
        #js-lazy-campaign-popup,
        #js-ma-floating-banner,
        .t-c-banner-slider,
        .t-p-detail__ma-embed,
        .t-c-detail-app-induction,
        .t-c-general-section.is-hidden {
            display: none !important;
        }
    `;

    document.documentElement.appendChild(style);

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

    function init() {
        addSearchButton();

        document.querySelectorAll('.t-c-general-section').forEach(section => {
            const title = section.querySelector('.t-o-heading-single');
            if ([
                'おすすめ作品特集',
                'BOOK☆WALKERの楽しみ方'
            ].includes(title?.textContent.trim())) {
                section.classList.add('is-hidden');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();