const cheerio = require('cheerio');

async function doFetch(urlStr) {
  const url = 'https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=' + encodeURIComponent(urlStr);
  const res = await fetch(url);
  const body = await res.text();
  const $ = cheerio.load(body);
  const links = [];
  $('li').each((_, el) => {
    links.push($(el).text().trim());
  });
  console.log(urlStr, "=> Found:", links.length);
}

async function run() {
  await doFetch('https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=blotnick');
  await doFetch('https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=blotnick&method=all');
  await doFetch('https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=blotnick&meta=/saflii');
}
run();
