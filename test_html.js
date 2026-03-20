async function doFetch() {
  const url = 'https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=' + encodeURIComponent('https://saflii.org/cgi-bin/sinosrch-adw.cgi?query=blotnick');
  const res = await fetch(url);
  const body = await res.text();
  console.log("IndexOf Pro-Khaya:", body.indexOf("Pro-Khaya"));
  if (body.indexOf("Pro-Khaya") !== -1) {
    const start = body.indexOf("Pro-Khaya") - 100;
    console.log(body.substring(start, start + 300));
  } else {
    console.log("Length of HTML:", body.length);
  }
}

doFetch();
