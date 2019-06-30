import puppeteer from 'puppeteer';

let alreadyVisited: string[] = [];
let urlsToScrapy: string[] = [];

const slugify = (url: string) => {
  const a = 'àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœøṕŕßśșțùúüûǘẃẍÿź·/_,:;'
  const b = 'aaaaaaaaceeeeghiiiimnnnooooooprssstuuuuuwxyz------'
  const p = new RegExp(a.split('').join('|'), 'g')
  return url.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with ‘and’
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
};

const imageFileRegex = /\.(png|dat|mmdb|jpg)$/;
const scrapyWpContent = async (page: puppeteer.Page, url: string, hostname: string) => {
  if (alreadyVisited.includes(url)) {
    console.log('alreadyVisited: ', url);
    return [];
  }

  alreadyVisited = [
    ...alreadyVisited,
    url,
  ];

  if (imageFileRegex.test(url)) {
    return [];
  }

  await page.goto(url);

  try {
    await page.screenshot({path: `./screens/${slugify(url)}.png`, type: 'png', fullPage: true});
  } catch (err) {
    console.log('screenshot erro: ', err);
  }

  const validLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));

    return links.map(link => link.href);
  });

  const newUrls = validLinks
    .filter(link => !alreadyVisited.includes(link))
    .filter(link => !imageFileRegex.test(link))
    .filter(link => link.includes(hostname));

  return newUrls;
};

const extractHostname = (url: string) => {
    let hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname

    if (url.indexOf("//") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];

    return hostname;
};

(async () => {
  if (process.argv.length !== 4) {
    // tslint:disable-next-line
    console.log(`usage: ${process.argv[0]} ${process.argv[1]} ${process.argv[2]} <https://urlToCrawl.com.br>`);
    return;
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const baseUrl = process.argv[3];
  const hostname = extractHostname(baseUrl);
  urlsToScrapy = [baseUrl];

  await page.goto(baseUrl);

  while (urlsToScrapy.length > 0) {
    const [url] = urlsToScrapy;

    const otherUrls = urlsToScrapy.length > 1 ? urlsToScrapy.slice(1) : [];

    try {
      const newUrls = await scrapyWpContent(page, url, hostname);

      urlsToScrapy = [...new Set([...(otherUrls || []), ...newUrls])];
    } catch (err) {
      urlsToScrapy = [...otherUrls];
    }

    console.log('scrapy: ', url);
    console.log('alreadyVisited: ', alreadyVisited.length);
    console.log('toScrapy: ', urlsToScrapy.length);
  }

  await browser.close();
})();
