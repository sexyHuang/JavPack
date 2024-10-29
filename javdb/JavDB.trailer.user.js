// ==UserScript==
// @name            JavDB.trailer
// @namespace       JavDB.trailer@blc
// @version         0.0.1
// @author          blc
// @description     预告片
// @match           https://javdb.com/*
// @icon            https://javdb.com/favicon.ico
// @require         https://github.com/sexyHuang/JavPack/raw/main/libs/JavPack.Req.lib.js
// @require         https://github.com/sexyHuang/JavPack/raw/main/libs/JavPack.ReqTrailer.lib.js
// @require         https://github.com/sexyHuang/JavPack/raw/main/libs/JavPack.Util.lib.js
// @connect         pacopacomama.com
// @connect         caribbeancom.com
// @connect         tokyo-hot.com
// @connect         10musume.com
// @connect         muramura.tv
// @connect         1pondo.tv
// @connect         heyzo.com
// @connect         dmm.co.jp
// @connect         jav.land
// @connect         self
// @run-at          document-end
// @grant           GM_xmlhttpRequest
// @grant           GM_addStyle
// ==/UserScript==

Util.upLocal();

function isUncensored(dom = document) {
  return dom.querySelector(".title.is-4").textContent.includes("無碼");
}

function getStudio(dom = document) {
  return [...dom.querySelectorAll(".movie-panel-info > .panel-block")]
    .find((item) => item.querySelector("strong")?.textContent === "片商:")
    ?.querySelector(".value").textContent;
}

function getTrailer(dom = document) {
  return dom.querySelector("#preview-video source")?.getAttribute("src");
}

function useVideo() {
  const onKeydown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const { code, target } = e;
    if (code === "KeyM") target.muted = !target.muted;
    if (code === "KeyW" || code === "ArrowUp") target.volume += 0.1;
    if (code === "KeyA" || code === "ArrowLeft") target.currentTime -= 2;
    if (code === "KeyS" || code === "ArrowDown") target.volume -= 0.1;
    if (code === "KeyD" || code === "ArrowRight") target.currentTime += 4;
  };

  const onVolumechange = ({ target }) => localStorage.setItem("volume", target.volume);

  return (src, poster) => {
    const video = document.createElement("video");

    video.src = src;
    video.title = "";
    video.poster = poster;
    video.controls = true;
    video.preload = "none";
    video.volume = localStorage.getItem("volume") ?? 0.2;

    video.addEventListener("keydown", onKeydown);
    video.addEventListener("volumechange", onVolumechange);
    return video;
  };
}

const createVideo = useVideo();
const getDmm = ReqTrailer.useDmm();
const guessStudio = ReqTrailer.useStudio();

(function () {
  const { pathname: PATHNAME } = location;
  if (!PATHNAME.startsWith("/v/")) return;

  const container = document.querySelector(".column-video-cover");
  if (!container) return;

  const mid = `trailer_${PATHNAME.split("/").pop()}`;

  const setTrailer = (trailer) => {
    if (!trailer || container.querySelector("video")) return;

    localStorage.setItem(mid, trailer);
    const cover = container.querySelector("img");
    const video = createVideo(trailer, cover.src);
    cover.replaceWith(video);

    container.addEventListener("click", (e) => {
      if (e.target.closest(".play-button")) return;

      e.preventDefault();
      e.stopPropagation();
      video.focus();

      if (video.paused) {
        video.style.zIndex = 11;
        return video.play();
      }

      video.style.zIndex = "auto";
      video.pause();
    });
  };

  let trailer = localStorage.getItem(mid);
  if (trailer) return setTrailer(trailer);

  trailer = getTrailer();
  if (trailer) return setTrailer(trailer);

  const code = document.querySelector(".first-block .value").textContent;

  trailer = ReqTrailer.heydouga(code);
  if (trailer) return setTrailer(trailer);

  getDmm(code).then(setTrailer);
  if (!isUncensored()) return;

  const studio = getStudio();
  if (studio) guessStudio(code, studio).then(setTrailer);
})();

(function () {
  const TARGET_SELECTOR = ".movie-list .cover";
  if (!document.querySelector(TARGET_SELECTOR)) return;

  GM_addStyle(`
  ${TARGET_SELECTOR} video {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    background: #000;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
    object-fit: contain;

    &.fade-in {
      opacity: 1;
    }
  }
  `);

  let currElem = null;

  function handleMouse(onHover) {
    const interval = 200;
    const sensitivity = 0;

    let scrollTimer = null;
    let isScrolling = false;
    let trackSpeedInterval = null;

    let prevX = null;
    let prevY = null;
    let prevTime = null;

    let lastX = null;
    let lastY = null;
    let lastTime = null;

    const onMouseover = (e) => {
      if (currElem) return;

      const target = e.target.closest(TARGET_SELECTOR);
      if (!target) return;

      prevX = e.pageX;
      prevY = e.pageY;
      prevTime = Date.now();

      currElem = target;
      currElem.addEventListener("mousemove", onMousemove);
      trackSpeedInterval = setInterval(trackSpeed, interval);
    };

    const onMousemove = (e) => {
      lastX = e.pageX;
      lastY = e.pageY;
      lastTime = Date.now();
    };

    const trackSpeed = () => {
      let speed;

      if (!lastTime || lastTime === prevTime) {
        speed = 0;
      } else {
        speed = Math.sqrt(Math.pow(prevX - lastX, 2) + Math.pow(prevY - lastY, 2)) / (lastTime - prevTime);
      }

      if (speed <= sensitivity && isElementInViewport(currElem) && !isScrolling) {
        destroy(currElem);
        onHover(currElem);
      } else {
        prevX = lastX;
        prevY = lastY;
        prevTime = Date.now();
      }
    };

    const isElementInViewport = (elem) => {
      const rect = elem.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    };

    const onMouseout = ({ relatedTarget }) => {
      if (!currElem) return;

      let node = relatedTarget;
      while (node) {
        if (node === currElem) return;
        node = node.parentNode;
      }

      destroy(currElem);
      onLeave();
      currElem = null;
    };

    const destroy = (elem) => {
      elem.removeEventListener("mousemove", onMousemove);
      clearInterval(trackSpeedInterval);
    };

    const onLeave = () => {
      const videos = document.querySelectorAll(`${TARGET_SELECTOR} video`);
      videos.forEach((video) => {
        video.classList.remove("fade-in");
        setTimeout(() => video.remove(), 200);
      });
    };

    const onOver = () => {
      if (!currElem) return;

      destroy(currElem);
      onLeave();
      currElem = null;
    };

    const onScroll = () => {
      isScrolling = true;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrolling = false;
      }, 500);
    };

    document.addEventListener("mouseover", onMouseover);
    document.addEventListener("mouseout", onMouseout);
    document.addEventListener("visibilitychange", onOver);
    window.addEventListener("scroll", onScroll);
    window.addEventListener("blur", onOver);
  }

  function handleHover() {
    const setVideo = (elem, trailer, cover) => {
      const video = createVideo(trailer, cover);
      elem.append(video);

      video.muted = true;
      video.currentTime = 4;
      video.focus();
      video.play();

      const ctx = new AudioContext();
      const canAutoPlay = ctx.state === "running";
      ctx.close();

      if (canAutoPlay) video.muted = false;
      setTimeout(() => video.classList.add("fade-in"), 50);
    };

    const getDetails = (dom) => {
      return {
        trailer: getTrailer(dom),
        isUncensored: isUncensored(dom),
        studio: getStudio(dom),
      };
    };

    const LOAD_DMM = "x-loading-dmm";
    const LOAD_DB = "x-loading-db";

    return (elem) => {
      const { classList, dataset } = elem;
      if (classList.contains(LOAD_DMM) || classList.contains(LOAD_DB)) return;

      let { trailer, cover, mid, code } = dataset;
      if (trailer) return setVideo(elem, trailer, cover);

      if (!cover || !mid || !code) {
        const parentNode = elem.closest("a");

        cover = parentNode.querySelector("img").src;
        mid = parentNode.href.split("/").pop();
        code = parentNode.querySelector(".video-title strong").textContent;

        dataset.cover = cover;
        dataset.mid = mid;
        dataset.code = code;
      }

      const trailerMid = `trailer_${mid}`;
      trailer = localStorage.getItem(trailerMid) ?? ReqTrailer.heydouga(code);

      if (trailer) {
        dataset.trailer = trailer;
        return setVideo(elem, trailer, cover);
      }

      const setTrailer = (trailer) => {
        if (!trailer || elem.querySelector("video")) return;

        if (!dataset.trailer) {
          localStorage.setItem(trailerMid, trailer);
          dataset.trailer = trailer;
        }

        if (elem === currElem) setVideo(elem, trailer, cover);
      };

      classList.add(LOAD_DMM);
      classList.add(LOAD_DB);

      getDmm(code)
        .then(setTrailer)
        .finally(() => classList.remove(LOAD_DMM));

      ReqTrailer.tasks(`${location.origin}/v/${mid}`, [getDetails])
        .then(({ trailer, isUncensored, studio }) => {
          if (trailer) return setTrailer(trailer);
          if (isUncensored && studio) guessStudio(code, studio).then(setTrailer);
        })
        .finally(() => classList.remove(LOAD_DB));
    };
  }

  handleMouse(handleHover());
})();
