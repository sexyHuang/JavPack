// ==UserScript==
// @name            JavDB.quickLook
// @namespace       JavDB.quickLook@blc
// @version         0.0.1
// @author          blc
// @description     快速查看
// @match           https://javdb.com/*
// @exclude         https://javdb.com/v/*
// @icon            https://javdb.com/favicon.ico
// @require         https://github.com/sexyHuang/JavPack/raw/main/libs/JavPack.Grant.lib.js
// @require         https://github.com/sexyHuang/JavPack/raw/main/libs/JavPack.Req.lib.js
// @require         https://github.com/sexyHuang/JavPack/raw/main/libs/JavPack.Util.lib.js
// @connect         self
// @run-at          document-end
// @grant           GM_xmlhttpRequest
// @grant           GM_openInTab
// @grant           GM_addStyle
// ==/UserScript==

Util.upLocal();

(function () {
  const TARGET_SELECTOR = ".movie-list .item";
  if (!document.querySelector(TARGET_SELECTOR)) return;

  function createModal() {
    const MODAL_ID = "x-quicklook";

    GM_addStyle(`
    #${MODAL_ID} .modal-card-head {
      gap: 0.5rem;
    }
    #${MODAL_ID} .modal-card-title {
      flex: 1;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #${MODAL_ID} .carousel {
      aspect-ratio: 420 / 283;
      background: #aa9084;

      & :is(img, video) {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
    #${MODAL_ID} .carousel-container .btn {
      position: absolute;
      top: 50%;
      z-index: 1;
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      box-shadow: 2px 4px 12px rgb(0 0 0 / 8%);
      opacity: 0.5;
      transition: all 0.3s cubic-bezier(0, 0, 0.5, 1);
      transform: translateY(-50%);

      &:hover {
        opacity: 1;
      }

      &.carousel-prev {
        left: 1rem;
      }

      &.carousel-next {
        right: 1rem;
      }
    }
    #${MODAL_ID} .info-block {
      padding-top: 0.5rem;

      &:not(:last-child) {
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #ededed;
      }
    }
    :root[data-theme="dark"] #${MODAL_ID} {
      & .carousel {
        background: #222;
      }

      & .info-block {
        border-color: #4a4a4a;
      }
    }
    `);

    document.body.insertAdjacentHTML(
      "beforeend",
      `<div id="${MODAL_ID}" class="modal">
        <div class="modal-background"></div>
        <div class="modal-card">
          <header class="modal-card-head p-3">
            <p class="modal-card-title is-clipped">快速查看</p>
            <button class="button is-success is-small">详情</button>
          </header>
          <section class="modal-card-body p-3">获取中...</section>
        </div>
      </div>`,
    );

    const modal = document.getElementById(MODAL_ID);
    const modalTitle = modal.querySelector(".modal-card-title");
    const modalBody = modal.querySelector(".modal-card-body");
    return { modal, modalTitle, modalBody };
  }

  const { modal, modalTitle, modalBody } = createModal();
  let currElem = null;
  let isActive = false;

  const handleMouseover = (e) => {
    if (currElem || isActive) return;

    const target = e.target.closest(TARGET_SELECTOR);
    if (target) currElem = target;
  };

  const handleMouseout = ({ relatedTarget }) => {
    if (!currElem || isActive) return;

    while (relatedTarget) {
      if (relatedTarget === currElem) return;
      relatedTarget = relatedTarget.parentNode;
    }

    currElem = null;
  };

  const handleSpace = (e) => {
    if (document.activeElement.closest("video")) return;
    e.preventDefault();
    e.stopPropagation();
    toggleModal();
  };

  const handleEnter = (e) => {
    if (!isActive) return;
    e.preventDefault();
    e.stopPropagation();
    hideModal();
    Grant.openTab(modal.dataset.href);
  };

  const handleEscape = (e) => {
    if (!isActive) return;
    e.preventDefault();
    e.stopPropagation();
    hideModal();
  };

  const handleInput = (e) => {
    if (!currElem) return;
    if (e.code === "Space") handleSpace(e);
    if (e.code === "Enter" || e.code === "KeyF") handleEnter(e);
    if (e.code === "Escape") handleEscape(e);
  };

  document.addEventListener("mouseover", handleMouseover);
  document.addEventListener("mouseout", handleMouseout);
  document.addEventListener("keydown", handleInput);

  function toggleModal() {
    isActive ? hideModal() : showModal();
  }

  function hideModal() {
    modal.classList.remove("is-active");
  }

  function showModal() {
    modal.classList.add("is-active");

    const { href, title } = currElem.querySelector("a");
    if (href === modal.dataset.href && modalBody.innerHTML !== "获取失败") return;

    modal.dataset.href = href;
    modalTitle.textContent = title;
    modalBody.innerHTML = "获取中...";

    const mid = href.split("/").pop();
    const detailsMid = `details_${mid}`;
    const details = localStorage.getItem(detailsMid);
    const trailer = localStorage.getItem(`trailer_${mid}`);
    if (details) return createDom(JSON.parse(details), trailer);

    Req.tasks(href, [parseElem])
      .then((res) => {
        if (!res) {
          modalBody.innerHTML = "获取失败";
          return;
        }

        localStorage.setItem(detailsMid, JSON.stringify(res));
        if (href === modal.dataset.href) createDom(res, trailer);
      })
      .catch(() => {
        modalBody.innerHTML = "获取失败";
      });
  }

  function parseElem(dom) {
    const cover = dom.querySelector(".column-video-cover img")?.src;
    if (!cover) return;

    const trailer = dom.querySelector("#preview-video source")?.getAttribute("src");

    const info = [];
    for (const item of dom.querySelectorAll(".movie-panel-info > .panel-block")) {
      const title = item.querySelector("strong")?.textContent;
      if (!title) continue;

      const value = item.querySelector("span.value")?.innerHTML;
      if (value) info.push({ title, value });
    }

    const screenshoots = [];
    for (const item of dom.querySelectorAll(".preview-images > .tile-item")) screenshoots.push(item.href);

    return { cover, trailer, info, screenshoots };
  }

  function createDom({ cover, trailer, info, screenshoots }, _trailer) {
    let innerHTML = '<div class="is-relative carousel-container"><div class="is-relative carousel">';

    const carousel = [];
    const video = trailer || _trailer;

    if (video) {
      carousel.push(`<video src="${video}" controls muted poster="${cover}" class="is-block"></video>`);
    } else {
      carousel.push(`<img src="${cover}" alt="cover" class="is-block">`);
    }

    for (const item of screenshoots) carousel.push(`<img src="${item}" alt="screenshoot" class="is-hidden">`);
    innerHTML += carousel.join("");
    innerHTML += "</div>";

    if (carousel.length > 1) {
      const classes = [
        "has-text-dark",
        "has-background-light",
        "is-size-3",
        "has-text-centered",
        "is-clipped",
        "is-unselectable",
        "is-clickable",
        "btn",
      ].join(" ");
      innerHTML += `<div class="${classes} carousel-prev">🔙</div>`;
      innerHTML += `<div class="${classes} carousel-next">🔜</div>`;
    }
    innerHTML += "</div>";

    for (const { title, value } of info) {
      innerHTML += `<div class="info-block"><strong>${title}</strong>&nbsp;<span class="value">${value}</span></div>`;
    }

    modalBody.innerHTML = innerHTML;
  }

  function handleCarouselNav(nav) {
    const curr = modalBody.querySelector(".carousel .is-block");

    let target = curr.nextElementSibling ?? curr.parentElement.firstElementChild;
    if (nav === "prev") target = curr.previousElementSibling ?? curr.parentElement.lastElementChild;

    curr.classList.replace("is-block", "is-hidden");
    target.classList.replace("is-hidden", "is-block");
  }

  modal.addEventListener("click", (e) => {
    const { target } = e;
    if (target.classList.contains("is-success")) handleEnter(e);
    if (target.classList.contains("carousel-prev")) handleCarouselNav("prev");
    if (target.classList.contains("carousel-next")) handleCarouselNav("next");
    if (target.nodeName !== "A") return;

    e.preventDefault();
    e.stopPropagation();
    Grant.openTab(target.href);
  });

  function controlVideo() {
    const video = modalBody.querySelector("video");
    if (!video) return;

    const modalActive = modal.classList.contains("is-active");
    const videoActive = video.classList.contains("is-block");
    const videoPaused = video.paused;

    if (!modalActive) {
      if (!videoPaused) video.pause();
      return video.blur();
    }

    if (videoActive && videoPaused) {
      video.focus();
      video.play();
    }

    if (!videoActive && !videoPaused) video.pause();
  }

  const callback = (mutationList) => {
    for (const { target } of mutationList) {
      if (target.classList.contains("modal")) isActive = target.classList.contains("is-active");
      controlVideo();
    }
  };

  const options = { subtree: true, childList: true, attributeFilter: ["class"], characterData: false };
  const observer = new MutationObserver(callback);
  observer.observe(modal, options);
})();
