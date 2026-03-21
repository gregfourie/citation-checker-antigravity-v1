import fs from 'fs';
const PROXY_URL = 'https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=';
const SEARCH_URL = 'https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=test&method=all&results=20';

async function run() {
  const fetchUrl = `${PROXY_URL}${encodeURIComponent(SEARCH_URL)}`;
  const res = await fetch(fetchUrl);
  const html = await res.text();
  fs.writeFileSync('proxy_error.html', html);
  console.log('Saved to proxy_error.html');
}
run();
