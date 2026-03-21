const PROXY_URL = 'https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=';
const target = 'https://www.saflii.org/za/cases/ZASCA/2021/48.html';

async function test() {
  const fetchUrl = `${PROXY_URL}${encodeURIComponent(target)}`;
  const res = await fetch(fetchUrl);
  const text = await res.text();
  console.log('Status for Direct URL via proxy:', res.status, text.substring(0, 100));
}

test();
