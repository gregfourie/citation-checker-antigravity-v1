const cheerio = require('cheerio');

async function doFetch() {
  const url = 'https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=' + encodeURIComponent('https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=Blotnick&method=all&results=20&meta=/saflii');
  const res = await fetch(url);
  const body = await res.text();
  const $ = cheerio.load(body);
  
  let found = false;
  $('a').each((_, el) => {
    const text = $(el).text();
    if (text.includes("Pro-Khaya")) {
      console.log("Long URL Found Link:", text);
      found = true;
    }
  });
  if (!found) console.log("Long URL did NOT find Pro-Khaya");
}

doFetch();
