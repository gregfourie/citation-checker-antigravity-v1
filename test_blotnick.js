const cheerio = require('cheerio');

async function doFetch() {
  const url = 'https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=' + encodeURIComponent('https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=Blotnick%20v%20Turecki&method=all&results=20&meta=/saflii');
  const res = await fetch(url);
  const body = await res.text();
  const $ = cheerio.load(body);
  const titles = [];
  $('li').each((_, el) => {
    titles.push($(el).find('a').first().text().trim());
  });
  console.log("Blotnick Results:", titles.length, titles[0]);
}

doFetch();
