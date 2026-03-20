const cheerio = require('cheerio');

async function doFetch(urlStr) {
  const url = 'https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=' + encodeURIComponent(urlStr);
  const res = await fetch(url);
  const body = await res.text();
  const $ = cheerio.load(body);
  const links = [];
  $('li').each((_, el) => {
    const a = $(el).find('a').first();
    const href = a.attr('href') || '';
    if (href.includes('/za/cases/') || href.includes('/cases/') || href.includes('cases/')) links.push(href);
  });
  console.log("Found:", links.length, links[0]);
}

doFetch('https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=Blotnick');
doFetch('https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=Blotnick&method=all&results=20&meta=/saflii');
