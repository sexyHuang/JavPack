// ==UserScript==
// @name            JavDB.style
// @namespace       JavDB.style@blc
// @version         0.0.1
// @author          blc
// @description     样式调整
// @match           https://javdb.com/*
// @icon            https://javdb.com/favicon.ico
// @resource        style https://github.com/sexyHuang/JavPack/raw/main/static/JavDB.style.user.css
// @run-at          document-start
// @grant           GM_getResourceText
// @grant           GM_addStyle
// ==/UserScript==

GM_addStyle(GM_getResourceText("style"));
