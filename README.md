# WeRead Scraper

[![npm](https://img.shields.io/npm/v/weread-scraper)](https://www.npmjs.com/package/weread-scraper/v/latest)
[![Greasy Fork](https://img.shields.io/greasyfork/v/450169)](https://greasyfork.org/scripts/450169@latest)
[![Greasy Fork](https://img.shields.io/greasyfork/dt/450169)](https://greasyfork.org/scripts/450169@latest)

[In English](README.en.md)

将微信读书书籍内容导出为 HTML 文件

**v2 正在开发中，关于 v2 的讨论请查看：https://github.com/Sec-ant/weread-scraper/pull/27**

## 使用方法

1. 在 [Tampermonkey](https://www.tampermonkey.net/) 中安装[这个脚本](https://greasyfork.org/scripts/450169@latest)

2. 在[微信读书网页版](https://weread.qq.com/)选择你想要保存的书籍，通过**开始阅读**按钮浏览到书籍的首页（如：[《永恒的终结》](https://weread.qq.com/web/reader/f6432a905b73c0f64797a8d)），或通过目录选择书中的某一页

3. 左键单击 Tampermonkey 浏览器扩展图标，并点击弹出菜单中的 **Start Scraping**

4. 等待内容抓取过程结束，结束后脚本将自动保存一份 HTML 文档到本地

5. 点击 **Cancel Scraping** 可以取消当前的抓取过程

6. 点击 **Stop Scraping & Save** 可以停止当前的抓取过程，并保存已抓取的内容

7. 点击 **Set Click Interval** 可以设定自动翻页时间间隔，单位为毫秒（ms）

8. 点击 **Inline Images** 可以设定是否将图片内联至文档，即是否可以在离线情况下加载图片。其中 ✔ 表示该功能开启，✘ 则表示该功能关闭

## 本地构建

```bash
git clone https://github.com/Sec-ant/weread-scraper.git
cd weread-scraper
npm i
npm run build
```

## 常见问题

1. **是否支持 ViolentMonkey？**

    本脚本使用了 [webRequest API](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/webRequest) 监听相关网络请求，由于 [ViolentMonkey 不支持 webRequest API](https://github.com/violentmonkey/violentmonkey/issues/583)，因此本脚本不支持使用 ViolentMonkey 安装。

2. **翻页时间间隔是不是越短越好？**

    翻页时浏览器会向腾讯服务器发起内容获取的请求，如果一本书页数很多且翻页时间间隔过短，则有可能触发反爬机制，从而导致一段时间内无法再获取书籍内容，所以这个时间间隔要根据实际情况调整。

3. **为什么将翻页时间间隔设为 0 时还会有等待时间？**

    除了花费在网络请求上的时间之外，为了尽可能压缩文件体积，脚本同时还会对内容做 [minification](https://zh.wikipedia.org/wiki/%E6%A5%B5%E7%B0%A1%E5%8C%96) 处理，这个过程会占用一定的时间。

4. **为什么获取到的书籍中没有注释、笔记等信息？**

    这部分信息和书籍的内容信息可以看成是不同“图层”中的信息，本脚本主要针对书籍内容这一“图层”，其它信息暂时未作处理，但欢迎贡献代码。

5. **为什么要以用户脚本的形式发布，而不做成浏览器扩展或可执行文件？**

    用户脚本是用户安装成本非常低的一种分发形式。浏览器扩展需要处理上架的流程，本脚本功能决定了它上架难度很大，而以开发者模式离线加载则体验不够好；如果做成可执行文件需要额外处理账号登录问题，会增加工作量。

6. **我该如何把 HTML 文件转换为 PDF 文件？**

    推荐使用[火狐浏览器](http://www.firefox.com/)打开保存下来的 HTML 文件，并通过浏览器的打印功能将其打印为 PDF 文件。其他浏览器也可以尝试，但是火狐浏览器在打印大量页面时速度表现会更出色，不容易出现卡顿。你也可以尝试使用 [Pandoc](https://pandoc.org/)，它支持非常多样的文档格式转换。

7. **可以抓取付费内容吗？**

    这个脚本能抓取到的是可以浏览的内容，如果内容是付费的，那么需要先付费获取书籍内容后才能抓取。

8. **需要额外安装字体吗？**

    这个脚本用网络字体的方式提供了一些必要的字体（它们在[这里](https://github.com/Sec-ant/weread-scraper/tree/main/public/fonts)），所以即使你没有在系统中安装这些字体，你也能够得到渲染正常的结果，但注意网络字体会有一定的加载延迟。

9. **我可以将这个脚本用于商业化活动中吗？**

    这个脚本以 MIT 许可证分发，MIT 许可证允许你自由地使用和分发这个脚本的源代码和构建结果，只要你在分发中包含原始版权和许可声明即可。但在使用过程中对微信读书上的书籍以及字体（见[《汉仪字库的个人非商用通知》](https://www.hanyi.com.cn/faq-doc-1)）产生的任何侵权行为，均是使用者的个人行为，与本脚本无关。虽然许可证不对这些行为做限制，但作者不鼓励商业化分发本脚本，也不鼓励利用本脚本售卖盗版书籍盈利。

10. **这个脚本的工作原理是什么？**

    微信读书在渲染书籍页面内容时，会先将文字内容排版到一个容器中，然后再将其绘制在 [\<canvas\>](https://developer.mozilla.org/docs/Web/HTML/Element/canvas) 上变为图片格式，并删除原来的存有文字、已排版好的容器。这个脚本会在合适的时机截获这个容器，并保存其中的内容。

11. **我也想参与开发、贡献代码，但是每次在微信读书页面打开浏览器开发者工具就会无限触发 `debugger` 断点，我该怎么办？**

    你可以禁用浏览器的断点，但这样你就没办法根据自己的需要打断点调试了。更推荐你查看我的另外一个仓库 [a2d2-firefox](https://github.com/Sec-ant/a2d2-firefox)，这个仓库利用了 GitHub Actions 持续拉取最新版的火狐浏览器源码，将 `debugger` 关键字替换为另外的关键字，并自动编译和发布适用于 Windows 环境的火狐浏览器。使用这个浏览器调试时不会触发 `debugger` 断点，且可以自定义断点位置。

12. **这个仓库只有构建前的源代码，我在哪里可以下载到已经构建好的脚本文件？**

    jsDelivr: https://cdn.jsdelivr.net/npm/weread-scraper@latest/dist/weread-scraper.user.js

    Greasy Fork: https://greasyfork.org/scripts/450169@latest/code/weread-scraper.user.js
