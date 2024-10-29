// ==UserScript==
// @name            JavDB.search
// @namespace       JavDB.search@blc
// @version         0.0.1
// @author          blc
// @description     快捷搜索
// @match           https://javdb.com/*
// @icon            https://javdb.com/favicon.ico
// @require         https://github.com/sexyHuang/JavPack/raw/main/libs/JavPack.Grant.lib.js
// @run-at          document-start
// @grant           GM_openInTab
// ==/UserScript==

(function () {
  const IS_SEARCH = location.pathname.startsWith("/search");
  const IS_DETAIL = location.pathname.startsWith("/v/");

  document.addEventListener("keydown", async (e) => {
    if (e.ctrlKey && e.code === "Slash") {
      const txt = await navigator.clipboard.readText();
      if (!txt) return;

      const url = `${location.origin}/search?q=${txt}`;
      if (!IS_SEARCH && !IS_DETAIL) return Grant.openTab(url);
      location.href = url;
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.code !== "Slash") return;
    const { nodeName } = document.activeElement;
    if (["INPUT", "TEXTAREA"].includes(nodeName)) return;

    const input = document.querySelector("#video-search");
    if (!input) return;

    input.focus();
    input.select();
  });
})();
