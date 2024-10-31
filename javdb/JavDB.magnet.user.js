// ==UserScript==
// @name            JavDB.magnet
// @namespace       JavDB.magnet@blc
// @version         0.0.1
// @author          blc
// @description     磁链扩展
// @match           https://javdb.com/v/*
// @icon            https://javdb.com/favicon.ico
// @require         https://github.com/sexyHuang/JavPack/raw/main/libs/JavPack.Grant.lib.js
// @require         https://github.com/sexyHuang/JavPack/raw/main/libs/JavPack.Magnet.lib.js
// @require         https://github.com/sexyHuang/JavPack/raw/main/libs/JavPack.Req.lib.js
// @require         https://github.com/sexyHuang/JavPack/raw/main/libs/JavPack.ReqMagnet.lib.js
// @require         https://github.com/sexyHuang/JavPack/raw/main/libs/JavPack.Util.lib.js
// @connect         btdig.com
// @run-at          document-end
// @grant           GM_xmlhttpRequest
// @grant           GM_openInTab
// ==/UserScript==

Util.upLocal();
const SPACIAL_CODE_PREFIX = {
  MIUM: (code) => `300${code}`,
}

const normalizeCode = (code = '') => {
  const prefix = code.split("-")[0].toUpperCase();
  if (SPACIAL_CODE_PREFIX[prefix]) {
    return SPACIAL_CODE_PREFIX[prefix](code);
  }
  return code;
}


(function () {
  const TARGET_ID = "x-magnet";
  const HOST = "https://btdig.com";

  const transToByte = Magnet.useTransByte();
  const hdSize = parseFloat(transToByte("2GB"));
  const minSize = parseFloat(transToByte("300MB"));

  const ZH_STR = '<span class="tag is-warning is-small is-light">字幕</span>';
  const CRACK_STR = '<span class="tag is-info is-small is-light">破解</span>';
  const HD_STR = '<span class="tag is-primary is-small is-light">高清</span>';

  const code = normalizeCode(document.querySelector(".first-block .value").textContent.trim());
  const magnetsNode = document.querySelector("#magnets-content");

  magnetsNode.insertAdjacentHTML(
    "beforebegin",
    `<div class="buttons are-small mb-1">
      <a class="button is-success" id="${TARGET_ID}" href="${HOST}/search?q=${code}" target="_blank">
        <span class="icon is-small"><i class="icon-check-circle"></i></span><span>BTDigg</span>
      </a>
      <button class="button is-success">
        <span class="icon is-small"><i class="icon-check-circle"></i></span><span>自动去重</span>
      </button>
      <button class="button is-success">
        <span class="icon is-small"><i class="icon-check-circle"></i></span><span>综合排序</span>
      </button>
    </div>`,
  );

  const mid = `magnet_${location.pathname.split("/").pop()}`;
  const magnets = localStorage.getItem(mid);

  const refactor = (insert = []) => {
    magnetsNode.innerHTML =
      [...magnetsNode.querySelectorAll(".item.columns")]
        .map((item) => {
          const meta = item.querySelector(".meta")?.textContent.trim() ?? "";
          return {
            url: item.querySelector(".magnet-name a").href,
            name: item.querySelector(".name")?.textContent ?? "",
            meta: meta.replace("個", "个"),
            size: meta.split(",")[0],
            hd: !!item.querySelector(".tags .is-primary"),
            zh: !!item.querySelector(".tags .is-warning"),
            date: item.querySelector(".time")?.textContent ?? "",
          };
        })
        .concat(insert)
        .map(({ url, name, meta, files, size, zh, hd, ...item }) => {
          url = url.split("&")[0].toLowerCase();

          // eslint-disable-next-line no-eq-null, eqeqeq
          if (meta == null) {
            meta = [];
            if (size) meta.push(size);
            if (files) meta.push(`${files}个文件`);
            meta = meta.join(", ");
          }

          size = transToByte(size);

          if (!zh) zh = Magnet.zhReg.test(name);

          const crack = Magnet.crackReg.test(name);

          if (!hd) hd = parseFloat(size) >= hdSize;

          return { ...item, url, name, meta, size, zh, crack, hd };
        })
        .filter(({ size }) => parseFloat(size) > minSize)
        .reduce((acc, cur) => {
          const index = acc.findIndex((item) => item.url === cur.url);

          if (index === -1) {
            acc.push(cur);
          } else if (!acc[index].meta.includes(",") && cur.meta.includes(",")) {
            acc[index].meta = cur.meta;
          }

          return acc;
        }, [])
        .toSorted(Magnet.magnetSort)
        .map(({ url, name, meta, zh, crack, hd, date }, idx) => {
          const odd = !(idx % 2) ? " odd" : "";
          const hash = url.split(":").pop();

          zh = zh ? ZH_STR : "";
          crack = crack ? CRACK_STR : "";
          hd = hd ? HD_STR : "";

          return `
          <div class="item columns is-desktop${odd}">
            <div class="magnet-name column is-four-fifths">
              <a href="${url}" data-hash="${hash}" title="右键点击跳转以查看链接详情">
                <span class="name">${name}</span><br>
                <span class="meta">${meta}</span><br>
                <div class="tags">${zh}${crack}${hd}</div>
              </a>
            </div>
            <div class="date column"><span class="time">${date}</span></div>
            <div class="buttons column">
              <button class="button is-info is-small copy-to-clipboard" data-clipboard-text="${url}" type="button">
                复制
              </button>
            </div>
          </div>
          `;
        })
        .join("") || "暂无数据";
  };

  if (magnets) {
    refactor(JSON.parse(magnets));
  } else {
    refactor();

    const target = document.getElementById(TARGET_ID);
    const iconNode = target.querySelector("i");

    const onfinally = () => target.classList.remove("is-loading");

    const onerror = () => {
      target.classList.replace("is-success", "is-warning");
      iconNode.setAttribute("class", "icon-close");
    };

    const onload = (res) => {
      if (!res) return onerror();
      localStorage.setItem(mid, JSON.stringify(res));
      res.length ? refactor(res) : iconNode.setAttribute("class", "icon-check-circle-o");
    };

    target.classList.add("is-loading");
    ReqMagnet.btdig(code).then(onload).catch(onerror).finally(onfinally);
  }

  magnetsNode.addEventListener("contextmenu", (e) => {
    const target = e.target.closest("a");
    if (!target) return;

    const { hash } = target.dataset;
    if (!hash) return;

    e.preventDefault();
    e.stopPropagation();
    Grant.openTab(`${HOST}/${hash}`);
  });
})();
