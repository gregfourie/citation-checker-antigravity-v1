const STR = "Independent Institute of Education (Pty) Ltd v KwaZulu-Natal Law Society and Others4";
const match = STR.match(/([A-Z][A-Za-z\s&()\-'.,]+?v\.?\s[A-Za-z\s&()\-'.,]+?)(?:\s*\d*\s*$)/);
console.log(match ? "Matched: " + match[1] : "No match");
