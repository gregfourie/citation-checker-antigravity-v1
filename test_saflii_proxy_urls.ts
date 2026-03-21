import * as cheerio from 'cheerio';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SEARCH_URL = 'https://www.saflii.org/cgi-bin/sinosrch-adw.cgi';

async function testSearch(query: string) {
  const searchUrl = `${SEARCH_URL}?query=${encodeURIComponent(query)}&method=all&results=20`;
  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  const titles: {title: string, href: string}[] = [];
  $('li').each((_, el) => {
    const a = $(el).find('a').first();
    titles.push({ title: a.text().trim(), href: a.attr('href') || '' });
  });
  console.log(`Query: ${query}`);
  console.log(titles.slice(0, 5));
}

async function run() {
  await testSearch('Independent Institute of Education (Pty) Ltd v KwaZulu-Natal Law Society and Others');
}

run();
