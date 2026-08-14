// ==UserScript==
// @name         DMM Copy Date
// @namespace    http://tampermonkey.net/
// @version      0.9.0
// @description  Add a button to copy the release date as YYMMDD format
// @author       You
// @match        https://www.dmm.co.jp/dc/doujin/-/detail/=/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    function addCopyButton() {
        const title = [...document.querySelectorAll('.informationList__ttl')]
            .find(el => el.textContent.trim() === '配信開始日');
        if (!title) return;

        const dateElement = title.nextElementSibling;
        if (!dateElement) return;

        if (dateElement.querySelector('.tm-copy-date-btn')) return;

        const text = dateElement.textContent.trim();
        const match = text.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
        if (!match) return;

        const [, year, month, day] = match;
        const copyText = year.slice(2) + month + day;
        const button = document.createElement('button');

        button.className = 'tm-copy-date-btn';
        button.textContent = 'copy';
        button.type = 'button';
        button.style.marginLeft = '6px';
        button.style.padding = '1px 6px';
        button.style.fontSize = '11px';
        button.style.cursor = 'pointer';
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(copyText);
                button.textContent = 'copied';
                setTimeout(() => {
                    button.textContent = 'copy';
                }, 1000);
            } catch (error) {
                console.error('error:', error);
                button.textContent = 'error';
            }

        });
        dateElement.appendChild(button);
    }
    addCopyButton();
})();