const url = require('url');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const link = `http://www.pbc.gov.cn/goutongjiaoliu/113456/113469/index.html`;

    const browser = await require('@/utils/puppeteer')();
    const page = await browser.newPage();
    await page.goto(link);
    const html = await page.evaluate(
        () =>
            // eslint-disable-next-line
            document.querySelector('body').innerHTML
    );
    const $ = cheerio.load(html);
    const list = $('font.newslist_style')
        .map((_, item) => {
            item = $(item);
            const a = item.find('a[title]');
            return {
                title: a.text(),
                link: url.resolve(`http://www.pbc.gov.cn`, a.attr('href')),
                pubDate: new Date(item.next('span.hui12').text()).toUTCString(),
            };
        })
        .get();

    const items = await Promise.all(
        list.map((item) =>
            ctx.cache.tryGet(item.link, async () => {
                const detailPage = await browser.newPage();
                await detailPage.goto(item.link);
                const detailHtml = await detailPage.evaluate(
                    () =>
                        // eslint-disable-next-line
                        document.querySelector('body').innerHTML
                );
                const content = cheerio.load(detailHtml);
                item.description = content('#zoom').html();
                return item;
            })
        )
    );

    browser.close();

    ctx.state.data = {
        title: '中国人民银行 - 沟通交流',
        link: link,
        item: items,
    };
};
