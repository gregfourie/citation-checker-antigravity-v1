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
  console.log("Found:", links.length);
}

doFetch('https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=Blotnick%20v%20Turecki&method=all&results=20&meta=/saflii');
doFetch('https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=Blotnick%20v%20Turecki%201944%20CPD%20100&method=auto&results=20&meta=/saflii');
