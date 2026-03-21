const http = require('https');
const url = 'https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=' + encodeURIComponent('https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=S%20v%20Makwanyane&method=all&results=20');
http.get(url, (res) => {
  if(res.statusCode === 302 || res.statusCode === 301) {
    http.get(res.headers.location, (res2) => {
        let data = ''; res2.on('data', c => data += c);
        res2.on('end', () => console.log('DATA:', data.substring(0, 300)));
    });
  } else {
    let data = ''; res.on('data', c => data += c);
    res.on('end', () => console.log('DATA:', data.substring(0, 300)));
  }
});
