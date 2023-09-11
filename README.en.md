# WeRead Scraper

[![npm](https://img.shields.io/npm/v/weread-scraper)](https://www.npmjs.com/package/weread-scraper/v/latest)
[![Greasy Fork](https://img.shields.io/greasyfork/v/450169)](https://greasyfork.org/scripts/450169@latest)
[![Greasy Fork](https://img.shields.io/greasyfork/dt/450169)](https://greasyfork.org/scripts/450169@latest)

[中文介绍](README.md)

Export WeRead books as HTML files.

**v2 is under development, discussions: https://github.com/Sec-ant/weread-scraper/pull/27**

## Usage

1. Install [this script](https://greasyfork.org/scripts/450169@latest) in [Tampermonkey](https://tampermonkey.net/).

2. Go to [WeRead website](https://weread.qq.com/), select the book you want to save and browse to the book's first page by clicking the **开始阅读** button (e.g., [《永恒的终结》](https://weread.qq.com/web/reader/f6432a905b73c0f64797a8d)) or select a page from the table of contents.

3. Left-click on the Tampermonkey browser extension icon and click **Start Scraping** in the pop-up menu.

4. Wait for the content scraping process to finish. When it's done, the script will automatically save an HTML document to your local machine.

5. Click **Cancel Scraping** to cancel the current scraping process.

6. Click **Stop Scraping & Save** to stop the current scraping process and save the scraped content.

7. Click **Set Click Interval** to set the automatic page turning time interval, in milliseconds (ms).

8. Click **Inline Images** to set whether images are inlined in the document, that is, whether images can be loaded offline. ✔ indicates that the feature is enabled, and ✘ indicates that the feature is disabled.

9. Click **Display Annotations** to set whether to display book annotations. ✔ indicates that the feature is enabled, and ✘ indicates that the feature is disabled.

## Local Build

```bash
git clone https://github.com/Sec-ant/weread-scraper.git
cd weread-scraper
npm i
npm run build
```

## Frequently Asked Questions

1. **Is ViolentMonkey supported?**

    This script uses the [webRequest API](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/webRequest) to listen for related network requests. Since [ViolentMonkey does not support the webRequest API](https://github.com/violentmonkey/violentmonkey/issues/583), this script is not supported for installation with ViolentMonkey.

2. **Is a shorter page turning time interval better?**

    When turning pages, the browser sends a request to Tencent's server to retrieve content. If a book has many pages and the page turning time interval is too short, it may trigger anti-crawling mechanisms, making it impossible to retrieve book content for a period of time. Therefore, this time interval should be adjusted according to actual conditions.

3. **Why is there still a waiting time when I set the page turning time interval to 0?**

    In addition to the time spent on network requests, in order to minimize file size as much as possible, the script also performs [minification](<https://en.wikipedia.org/wiki/Minification_(programming)>) processing on content, which takes some time.

4. **Why are there no comments, notes, etc. in the scraped book?**

    This information can be seen as being in different "layers" from the book's content information. This script mainly targets the "layer" of book content, and other information is not currently processed, but code contributions are welcome.

5. **Why is it released as a user script instead of a browser extension or executable file?**

    User scripts are a very low-cost form of distribution for users. Browser extensions require handling the web store submitting process, and this script's functionality makes it difficult, while offline loading in developer mode is not a good experience; if made into an executable file, additional account login issues would need to be addressed, increasing workload.

6. **How can I convert an HTML file into a PDF file?**

    It is recommended to open the saved HTML file with [Firefox browser](http://www.firefox.com/) and print it as a PDF file using the browser's print function. Other browsers can also be tried, but Firefox performs better when printing large numbers of pages and is less likely to freeze. You can also try using [Pandoc](https://pandoc.org/), which supports a wide variety of document format conversions.

7. **Can paid content be scraped?**

    This script can scrape content that can be viewed. If the content is paid for, you need to pay for it first before you can scrape it.

8. **Do I need to install additional fonts?**

    This script provides some necessary fonts using web fonts (they are [here](https://github.com/Sec-ant/weread-scraper/tree/main/public/fonts)), so even if you don't have these fonts installed on your system, you can still get properly rendered results, but note that web fonts will have some loading delay.

9. **Can I use this script for commercial activities?**

    This script is distributed under the MIT license, which allows you to freely use and distribute the source code and build results of this script as long as you include the original copyright and license notice in your distribution. However, any infringement of the books on WeRead and the fonts (see [《Hanyi Font Library's Personal Non-Commercial Notice》](https://www.hanyi.com.cn/faq-doc-1)) during use is the personal behavior of the user and has nothing to do with this script. Although the license does not restrict these behaviors, the author does not encourage commercial distribution of this script or the sale of pirated books for profit using this script.

10. **How does this script work?**

    When WeRead renders book page content, it first typesets the text content into a container, then draws it onto a [\<canvas\>](https://developer.mozilla.org/docs/Web/HTML/Element/canvas) to turn it into an image format, and deletes the original container with text that has been typeset. This script intercepts this container at the appropriate time and saves its contents.

11. **I also want to participate in development and contribute code, but every time I open the browser developer tools on the WeRead page, I get stuck in an infinite `debugger` breakpoint loop. What should I do?**

    You can disable breakpoints in your browser, but then you won't be able to debug by setting breakpoints where you need them. It is recommended that you check out my other repository [a2d2-firefox](https://github.com/Sec-ant/a2d2-firefox), which uses GitHub Actions to continuously pull the latest version of Firefox browser source code, replace the `debugger` keyword with another keyword, and automatically compile and release Firefox browsers for Windows/Linux/macOS platforms. When debugging with these browsers, `debugger` breakpoints will not be triggered and breakpoint locations can be customized.

12. **This repository only has pre-built source code. Where can I download the built script file?**

    jsDelivr: https://cdn.jsdelivr.net/npm/weread-scraper@latest/dist/weread-scraper.user.js

    Greasy Fork: https://greasyfork.org/scripts/450169@latest/code/weread-scraper.user.js
