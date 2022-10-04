const Subscription = require('egg').Subscription;
const parseString = require('xml2js').parseString;
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const puppeteer = require('puppeteer');
class UpdateCache extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: '60m', // 1 分钟间隔
      type: 'all', // 指定所有的 worker 都需要执行
      immediate: true,
    };
  }
  // 让模拟的网页滚动到最低端触发懒加载
  async autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise(resolve => {
        const STEP = 200;
        const TIME_INTERVAL = 200;

        let totalHeight = 0;

        const timer = setInterval(() => {
        // eslint-disable-next-line no-undef
          const totalDistance = document.body.scrollHeight - window.innerHeight;

          // eslint-disable-next-line no-undef
          window.scrollBy(0, STEP);
          totalHeight += STEP;

          console.log('progress', totalHeight / totalDistance);

          if (totalHeight >= totalDistance) {
            clearInterval(timer);
            resolve();
          }
        }, TIME_INTERVAL);
      });
    });
  }
  // 产生网页截图文件
  async fileGenarate(pageUrl, foldPath, date) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(pageUrl, {
      waitUntil: 'networkidle0',
    });
    await this.autoScroll(page);
    const filePath = `${foldPath}/${date}`;
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath);
    }
    if (!fs.existsSync(`${filePath}/${await page.title()}`)) {
      await page.screenshot({ path: `${filePath}/${await page.title()}.png`, fullPage: true });
      await page.pdf({ path: `${filePath}/${await page.title()}.pdf` });
    }
    await browser.close();
  }
  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const res = await this.ctx.curl(this.config.rssUrl, {
      dataType: 'text',
    });
    // 解析xml字符串
    parseString(res.data, async (err, result) => {
      this.ctx.logger.info('some request data: %j', result);
      const list = result.rss.channel[0].item;
      const foldPath = path.resolve(this.config.logger.dir, './file');
      if (!fs.existsSync(foldPath)) {
        fs.mkdirSync(foldPath);
      }
      for (const item of list) {
        try {
          if (/文稿|睡前消息/g.test(item.title[0])) {
            console.log('item', item);
            await this.fileGenarate(item.link[0], foldPath, moment(item.pubDate[0]).format('yyyy-MM-DD'));
          }
        } catch (error) {
          this.ctx.logger.error(error);
        }
      }
    });

  }
}

module.exports = UpdateCache;
