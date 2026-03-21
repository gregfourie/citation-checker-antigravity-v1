const https = require('https');
https.get("https://www.saflii.org/cgi-bin/sinosrch-adw.cgi?query=S%20v%20Makwanyane&method=all&results=20", {
  headers: { "User-Agent": "Mozilla/5.0" }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Data length:', data.length, 'Contains Makwanyane:', data.includes('Makwanyane')));
}).on('error', (e) => console.log('Error:', e));
