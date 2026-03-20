const mammoth = require('mammoth');
const fs = require('fs');

async function test() {
  const buffer = fs.readFileSync('./test heads v3.docx');
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  console.log("IndexOf Independent:", text.indexOf("Independent"));
  if (text.indexOf("Independent") !== -1) {
     const start = Math.max(0, text.indexOf("Independent") - 50);
     console.log(text.substring(start, start + 300));
  } else {
     console.log("NOT FOUND in mammoth output.");
  }
}
test();
