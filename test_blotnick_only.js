const cheerio = require('cheerio');

async function doFetch() {
  const url = 'https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=' + encodeURIComponent('https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=Blotnick&method=all&results=20&meta=/saflii');
  const res = await fetch(url);
  const body = await res.text();
  const $ = cheerio.load(body);
  const links = [];
  $('li').each((_, el) => {
    const a = $(el).find('a').first();
    const href = a.attr('href') || '';
    if (href.includes('/za/cases/')) links.push(a.text().trim());
  });
  console.log("Blotnick Results:", links.length, links[0]);
}

doFetch();
