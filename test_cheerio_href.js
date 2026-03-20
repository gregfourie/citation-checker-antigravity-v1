const cheerio = require('cheerio');

async function doFetch() {
  const url = 'https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=' + encodeURIComponent('https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=Blotnick&method=all&results=20&meta=/saflii');
  const res = await fetch(url);
  const body = await res.text();
  const $ = cheerio.load(body);
  
  $('li').each((_, el) => {
    const a = $(el).find('a').first();
    const txt = a.text().trim();
    if (txt.includes('Pro-Khaya')) {
      console.log('Text:', txt);
      console.log('href:', a.attr('href'));
      console.log('HREF:', a.attr('HREF'));
      console.log('All attribs:', a[0].attribs);
    }
  });
}

doFetch();
