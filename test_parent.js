const cheerio = require('cheerio');

async function doFetch() {
  const url = 'https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=' + encodeURIComponent('https://saflii.org/cgi-bin/sinosrch-adw.cgi?query=blotnick');
  const res = await fetch(url);
  const body = await res.text();
  const $ = cheerio.load(body);
  
  $('a').each((_, el) => {
    const text = $(el).text();
    if (text.includes("Pro-Khaya")) {
      console.log("Found Link:", text);
      console.log("Parent Tag:", el.parent.name);
      console.log("Grandparent Tag:", el.parent.parent ? el.parent.parent.name : 'none');
    }
  });
}

doFetch();
