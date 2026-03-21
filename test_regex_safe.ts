const NP = "[A-Za-z\\s&()\\-',\\u2018\\u2019\\u201C\\u201D]"; // removed . from NP

// we allow . if it's NOT followed by a space!
const safeChar = `(?:${NP}|\\.(?!\\s))`;

const pattern = new RegExp(`([A-Z]${safeChar}+?v\\.?\\s${safeChar}+?)\\s(\\d{4})\\s\\((\\d+)\\)\\sSA\\s(\\d+)\\s\\(([A-Z]+)\\)`, 'g');

const text = "Hello world. This is a paragraph. The court said in Independent Institute of Education (Pty) Ltd v KwaZulu-Natal Law Society and Others 2020 (2) SA 325 (CC) that things are okay.";
const matches = Array.from(text.matchAll(pattern));

console.log(matches.map(m => m[1]));
