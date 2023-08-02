import {
  GM_getValue,
  GM_setValue,
  GM_deleteValue,
  GM_registerMenuCommand,
  GM_unregisterMenuCommand,
  GM_webRequest,
} from "$";
import gmFetch from "@sec-ant/gm-fetch";
import { createStore } from "zustand/vanilla";
import {
  persist,
  createJSONStorage,
  StateStorage,
  subscribeWithSelector,
} from "zustand/middleware";
import { html, css } from "code-tag";
import init, { minify } from "minify-html-wasm";

// 预设样式
// TODO: Prevent images from spanning across pages
const stylePreset = css`
  @font-face {
    font-family: "汉仪旗黑50S";
    src: url("https://fastly.jsdelivr.net/gh/Sec-ant/weread-scraper/public/fonts/HYQiHei_50S.woff2");
  }
  @font-face {
    font-family: "汉仪旗黑65S";
    src: url("https://fastly.jsdelivr.net/gh/Sec-ant/weread-scraper/public/fonts/HYQiHei_65S.woff2");
  }
  @font-face {
    font-family: "汉仪楷体";
    src: url("https://fastly.jsdelivr.net/gh/Sec-ant/weread-scraper/public/fonts/HYKaiTiS.woff2");
  }
  @font-face {
    font-family: "方正仿宋";
    src: url("https://fastly.jsdelivr.net/gh/Sec-ant/weread-scraper/public/fonts/FZFSJW.woff2");
  }
  @font-face {
    font-family: "PingFang SC";
    src: url("https://fastly.jsdelivr.net/gh/Sec-ant/weread-scraper/public/fonts/PingFang-SC-Regular.woff2");
  }
  .readerChapterContent {
    break-after: page;
    /* 支持旧版本浏览器 */
    page-break-after: always;
  }
`;

// 初始化用来存储书籍内容的元素
const htmlElement = document.createElement("html");
const headElement = document.createElement("head");
const styleElement = document.createElement("style");
const bodyElement = document.createElement("body");
headElement.insertAdjacentHTML("beforeend", html`<meta charset="utf-8" />`);
headElement.append(styleElement);
htmlElement.append(headElement, bodyElement);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const wasmInitPromise = gmFetch(__WASM_URL__).then(init);

// 初始化一个 Mutation Observer 用来监测书籍页面内容 DOM 元素 preRenderContainer 的出现
const preRenderContainerObserver = new MutationObserver(async () => {
  const preRenderContainer = document.querySelector(
    ".preRenderContainer:not([style])"
  );
  if (!preRenderContainer) {
    return;
  }
  const preRenderContent =
    preRenderContainer.querySelector("#preRenderContent");
  if (!preRenderContent) {
    return;
  }
  scraperPageStore.setState({
    preRenderContainer: preRenderContainer.cloneNode(
      true
    ) as typeof preRenderContainer,
  });
});

interface ChapterLevelList {
  [k: string]: string;
}

// session storage 用来存取是否正在进行内容抓取这一状态和章节层级列表
interface ScraperSessionState {
  scraping: boolean;
  chapterLevelList: ChapterLevelList;
}

const scraperSessionInitialState: ScraperSessionState = {
  scraping: false,
  chapterLevelList: {},
};

const scraperSessionStore = createStore<ScraperSessionState>()(
  subscribeWithSelector(
    persist(() => scraperSessionInitialState, {
      name: "scraper-session-storage",
      storage: createJSONStorage(() => sessionStorage),
    })
  )
);

// GM storage 用来存取用户设定：翻页时间间隔（毫秒）、是否内联图片
const GMStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return GM_getValue(name);
  },
  setItem: (name: string, value: string): void => {
    GM_setValue(name, value);
  },
  removeItem: (name: string): void => {
    GM_deleteValue(name);
  },
};

interface BooleanOption {
  name: string;
  value: boolean;
}

interface ScraperGMState {
  clickInterval: number;
  booleanOptions: BooleanOption[];
}

const scraperGMInitialState: ScraperGMState = {
  clickInterval: 0,
  booleanOptions: [
    {
      name: "Inline Images",
      value: false,
    },
  ],
};

const scraperGMStore = createStore<ScraperGMState>()(
  subscribeWithSelector(
    persist(() => scraperGMInitialState, {
      name: "scraper-gm-storage",
      storage: createJSONStorage(() => GMStorage),
    })
  )
);

// 页面 storage 用来存取关于页面的一些状态信息（翻页前和结束抓取时会被重置）
interface ScraperPageState {
  preRenderContainer: Element | null;
  pageContentLoaded: boolean;
  isNewChapter: boolean;
  timeout: number;
  pageContentLoadedCleanUp: () => void;
}

const scraperPageInitialState: ScraperPageState = {
  preRenderContainer: null,
  pageContentLoaded: false,
  isNewChapter: false,
  timeout: 0,
  pageContentLoadedCleanUp: () => {
    /* void */
  },
};

const scraperPageStore = createStore<ScraperPageState>()(
  subscribeWithSelector(() => scraperPageInitialState)
);

// 开始抓取书籍内容时应该执行的函数
function scrapingOn() {
  GM_webRequest(
    [
      // 阻截微信读书的阅读进度请求，避免抓取过程中的翻页信息被记录为阅读进度
      // 发出这个请求表示此时页面已经加载完毕
      {
        selector: "https://weread.qq.com/web/book/read*",
        action: "cancel",
      },
      // 订阅微信读书的章节内容获取请求
      // 发出这个请求表示内容为新章节，否则为接续页
      // chapter/e_* 是 epub 格式，chapter/t_* 是 txt 格式
      // 将请求重定向到一个没有被加入到 @match 的网址会让请求正常发出
      // 但仍可以正常触发回调函数
      {
        selector: "https://weread.qq.com/web/book/chapter/*",
        action: {
          redirect: "https://chapter.invalid",
        },
      },
    ],
    (info) => {
      switch (info) {
        case "cancel":
          scraperPageStore.setState({
            pageContentLoaded: true,
          });
          break;
        case "redirect":
          scraperPageStore.setState({
            isNewChapter: true,
          });
          break;
      }
    }
  );
  // 开始监测文档中的 preRenderContainer 元素
  preRenderContainerObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  // 订阅页面加载完毕事件，添加相应的回调函数，并存储相应的收尾函数
  const unsub = subscribePageContentLoaded();
  scraperPageStore.setState({
    pageContentLoadedCleanUp: getPageContentLoadedCleanUpFunction(unsub),
  });
}

// 停止抓取书籍内容时应该执行的函数
function scrapingOff() {
  // 执行取消订阅页面加载完毕事件的收尾函数
  scraperPageStore.getState().pageContentLoadedCleanUp();
  // 停止监测文档中的 preRenderContainer 元素
  preRenderContainerObserver.disconnect();
  // 取消订阅微信读书的阅读进度请求和章节内容获取请求
  GM_webRequest([], () => {
    /* void */
  });
}

// 订阅抓取状态，并根据状态执行相应的函数
scraperSessionStore.subscribe(
  (state) => state.scraping,
  (scraping) => {
    if (scraping) {
      scrapingOn();
    } else {
      scrapingOff();
    }
  },
  {
    fireImmediately: true,
  }
);

// 订阅页面加载完毕事件并执行相关操作，返回一个取消订阅的函数
function subscribePageContentLoaded() {
  return scraperPageStore.subscribe(
    (state) => state.pageContentLoaded,
    async (pageContentLoaded) => {
      if (!pageContentLoaded) {
        return;
      }
      // 页面加载完毕时，preRenderContainer 才是最终我们需要的结果
      const { preRenderContainer } = scraperPageStore.getState();
      if (preRenderContainer) {
        // 获取 txt 格式书籍的章节标题
        const chapterTitle =
          document.querySelector(".chapterTitle")?.textContent?.trim() ||
          undefined;
        await feed(preRenderContainer, chapterTitle);
      } else {
        console.warn("Failed to find .preRenderContainer element.");
      }
      // 寻找是否有下一页按钮
      let nextPageButton = document.querySelector(".readerFooter_button");
      if (!nextPageButton) {
        // 如果没有下一页按钮，但是有全书完的信息，则停止抓取
        const ending = document.querySelector(".readerFooter_ending");
        if (ending) {
          stopScrapingAndSave();
        }
        return;
      }
      // 如果有下一页的按钮，那么先等待用户所设定的页面翻页间隔
      await new Promise<void>((resolve) => {
        scraperPageStore.setState({
          timeout: setTimeout(() => {
            resolve();
          }, scraperGMStore.getState().clickInterval),
        });
      });
      // 清空页面加载完毕状态
      scraperPageStore.setState(scraperPageInitialState);
      // 重新获取下一页按钮
      // 如果不重新获取，这个按钮有可能会被重新渲染
      // 那么原来获取到的按钮会从文档中消失，导致无法翻页
      // TODO: 待证实
      nextPageButton = document.querySelector(".readerFooter_button");
      // 给下一页按钮施加一个点击操作，这里要注意 clientX 和 clientY 必须不为 0
      // 否则微信读书会将其判断为非人为翻页从而不执行翻页操作
      nextPageButton?.dispatchEvent(
        new MouseEvent("click", {
          clientX: 1,
          clientY: 1,
        })
      );
    }
  );
}

// 页面加载完毕事件取消订阅的收尾函数
// 接受一个取消订阅页面加载完毕事件的函数，并在取消订阅后执行相关收尾工作
function getPageContentLoadedCleanUpFunction(unsub: () => void) {
  return () => {
    // 取消订阅
    unsub();
    // 清除翻页间隔计时器
    clearTimeout(scraperPageStore.getState().timeout);
    // 重置相关的状态
    scraperPageStore.setState(scraperPageInitialState);
  };
}

// 将获取到的 preRenderContainer 中的内容稍作变换并存入目标位置
async function feed(preRenderContainer: Element, chapterTitle?: string) {
  // 样式处理，样式表只添加一次即可
  if (styleElement.childNodes.length === 0) {
    const preRenderStyleElement =
      preRenderContainer.querySelector("style") || styleElement;
    // 添加预设样式和微信读书样式
    styleElement.append(stylePreset, preRenderStyleElement.innerHTML);
    // 对样式进行 minification
    await wasmInitPromise;
    styleElement.outerHTML = decoder.decode(
      minify(encoder.encode(styleElement.outerHTML), {
        minify_css: true,
      })
    );
  }
  // 内容处理
  const preRenderContent = preRenderContainer.querySelector(
    "#preRenderContent"
  ) as Element;

  // 替换图片链接
  // 如果开启了内联图片，则抓取时会下载图片并将图片链接替换为 Base64 格式的 DataURL
  if (scraperGMStore.getState().booleanOptions[0].value) {
    const fetchImagePromises: Promise<void>[] = [];
    const backgroundImageRegExp = /(?<=background-image:url\().+?(?=\))/;
    for (const image of preRenderContainer.querySelectorAll("img")) {
      const url = image.getAttribute("data-src") ?? image.src;
      if (!url) {
        continue;
      }
      fetchImagePromises.push(
        (async () => {
          try {
            const resp = await gmFetch(url);
            if (resp.ok) {
              const imageBlob = await resp.blob();
              const imageDataUrl = await blobToBase64(imageBlob);
              image.src = imageDataUrl;
            }
          } catch (e) {
            console.warn(`Failed to fetch image (${url}): ${e}`);
          }
        })()
      );
    }
    for (const element of preRenderContainer.querySelectorAll(
      '[style*="background-image:url("]'
    )) {
      const styleAttribute = element.getAttribute("style");
      if (!styleAttribute) {
        continue;
      }
      const url = styleAttribute?.match(backgroundImageRegExp)?.[0];
      if (!url) {
        continue;
      }
      fetchImagePromises.push(
        (async () => {
          try {
            const resp = await gmFetch(url);
            if (resp.ok) {
              const imageBlob = await resp.blob();
              const imageDataUrl = await blobToBase64(imageBlob);
              element.setAttribute(
                "style",
                styleAttribute.replace(backgroundImageRegExp, imageDataUrl)
              );
            }
          } catch (e) {
            console.warn(`Failed to fetch background image (${url}): ${e}`);
          }
        })()
      );
    }
    await Promise.all(fetchImagePromises);
  }
  // 如果未开启内联图片，则不会下载图片，并保留外链链接（默认行为）
  else {
    for (const image of preRenderContainer.querySelectorAll("img")) {
      image.src = image.getAttribute("data-src") ?? image.src;
    }
  }

  // 移除一些 "data-" 开头的无用的属性
  recursivelyRemoveDataAttr(preRenderContent);
  // 将多个连续的 span 元素合并为一个，减少文件体积
  collapseSpans(preRenderContent);

  // 如果是新章节，页面内容连带容器经过 minification 后插入到 body 元素最后
  if (scraperPageStore.getState().isNewChapter) {
    // 移除重复的 id
    preRenderContent.removeAttribute("id");
    // 添加章节内容 class 用于应用作用于章节的样式
    preRenderContent.classList.add("readerChapterContent");
    // 添加章节标题 data-chapter-title 属性
    // 和章节层级 data-chapter-level 属性
    // 以便于后处理
    const dataChapterTitle =
      document
        .querySelector("span.readerTopBar_title_chapter")
        ?.textContent?.trim() || "";
    preRenderContent.setAttribute("data-chapter-title", dataChapterTitle);
    preRenderContent.setAttribute(
      "data-chapter-level",
      scraperSessionStore.getState().chapterLevelList[dataChapterTitle] || "1"
    );
    // 添加章节标题元素（仅针对 txt 格式的书籍）
    typeof chapterTitle === "string" &&
      preRenderContent.insertAdjacentHTML(
        "afterbegin",
        html`<h1>${chapterTitle}</h1>`
      );
    // 将这个章节容器插入到 body 末尾
    await wasmInitPromise;
    preRenderContent.innerHTML = decoder.decode(
      minify(encoder.encode(preRenderContent.innerHTML), {})
    );
    bodyElement.insertAdjacentElement("beforeend", preRenderContent);
  }
  // 如果不是新章节，页面内容 minification 后插入到最后一个容器最后
  // TODO: 是否应该合并 <div data-wr-bd="1"> ?
  else {
    // 将容器内容插入到最后一个章节容器末尾
    await wasmInitPromise;
    bodyElement.lastElementChild?.insertAdjacentHTML(
      "beforeend",
      decoder.decode(minify(encoder.encode(preRenderContent.innerHTML), {}))
    );
  }
}

// 添加一个开启抓取的按钮
GM_registerMenuCommand("Start Scraping", startScraping);
function startScraping() {
  scraperSessionStore.setState({
    scraping: true,
    chapterLevelList: Object.fromEntries(
      [...document.querySelectorAll(".chapterItem_link")].map((e) => [
        e.textContent?.trim() || "",
        e.className.match(/(?<=chapterItem_level)\d+/)?.[0] || "1",
      ])
    ),
  });
  window.location.reload();
}

// 添加一个取消抓取的按钮
GM_registerMenuCommand("Cancel Scraping", cancelScraping);
function cancelScraping() {
  scraperSessionStore.setState({ scraping: false, chapterLevelList: {} });
  styleElement.innerHTML = "";
  bodyElement.innerHTML = "";
}

// 添加一个停止抓取并保存书籍内容的按钮
GM_registerMenuCommand("Stop Scraping & Save", stopScrapingAndSave);
async function stopScrapingAndSave() {
  scraperSessionStore.setState({
    scraping: false,
    chapterLevelList: {},
  });
  saveContent(
    html`<!DOCTYPE html>` + htmlElement.outerHTML,
    document
      .querySelector(".readerCatalog_bookInfo_title_txt")
      ?.textContent?.trim()
  );
  styleElement.innerHTML = "";
  bodyElement.innerHTML = "";
}

// 添加一个设定翻页时间间隔的按钮
GM_registerMenuCommand("Set Click Interval", setClickInterval);
function setClickInterval() {
  const prevClickInterval = scraperGMStore.getState().clickInterval;
  let newClickInterval = parseFloat(
    window.prompt("Click interval (ms): ", prevClickInterval.toString()) || ""
  );
  if (!Number.isFinite(newClickInterval) || newClickInterval < 0) {
    newClickInterval = prevClickInterval;
  }
  scraperGMStore.setState({
    clickInterval: newClickInterval,
  });
}

// 为二值化选项添加菜单按钮和逻辑
scraperGMStore.subscribe<BooleanOption[]>(
  (state) => state.booleanOptions,
  (() => {
    const menuIds: unknown[] = [];
    return (booleanOptions) => {
      for (let i = 0; i < booleanOptions.length; ++i) {
        if (typeof menuIds[i] !== "undefined") {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          GM_unregisterMenuCommand(menuIds[0]);
        }
        menuIds[i] = GM_registerMenuCommand(
          `${booleanOptions[i].name} ${booleanOptions[i].value ? "✔" : "✘"}`,
          () => {
            toggleBooleanOptions(i);
          }
        );
      }
    };
  })(),
  {
    fireImmediately: true,
  }
);
function toggleBooleanOptions(index: number) {
  const nextBooleanOptions = [...scraperGMStore.getState().booleanOptions];
  nextBooleanOptions[index].value = !nextBooleanOptions[index].value;
  scraperGMStore.setState({
    booleanOptions: nextBooleanOptions,
  });
}

// helper 函数用于移除所有 "data-wr-id" 和 "data-wr-co" 属性
function recursivelyRemoveDataAttr(element: Element) {
  const attributes = element.attributes;
  for (let i = attributes.length - 1; i >= 0; --i) {
    const attributeName = attributes[i].name;
    if (["data-wr-id", "data-wr-co"].includes(attributeName)) {
      element.removeAttribute(attributeName);
    }
  }
  for (const child of element.children) {
    recursivelyRemoveDataAttr(child);
  }
}

// helper 函数用于判断是否是简单的 span 元素
function isSimpleSpan(element: Element | null): element is HTMLSpanElement {
  return (
    element?.tagName === "SPAN" &&
    element?.attributes.length === 0 &&
    element.innerHTML.length <= 1
  );
}

// helper 函数用于合并连续的 span 元素
function collapseSpans(element: Element) {
  for (const span of element.querySelectorAll("span")) {
    if (!isSimpleSpan(span)) {
      continue;
    }
    let nextElementSibling = span.nextElementSibling;
    while (isSimpleSpan(nextElementSibling)) {
      span.append(nextElementSibling.textContent ?? "");
      nextElementSibling.remove();
      nextElementSibling = span.nextElementSibling;
    }
  }
}

// helper 函数用于将内容保存至本地
function saveContent(content: string, fileName = "微信读书") {
  const contentBlob = new Blob([content], {
    type: "text/html;charset=utf-8",
  });
  const dummyLink = document.createElement("a");
  dummyLink.href = URL.createObjectURL(contentBlob);
  dummyLink.download = `${fileName}.html`;
  document.body.appendChild(dummyLink);
  dummyLink.click();
  document.body.removeChild(dummyLink);
  URL.revokeObjectURL(dummyLink.href);
}

// helper 函数用于将 Blob 转换为 Base64 字符串
async function blobToBase64(blob: Blob) {
  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
