import { parseDocument } from './src/app/actions';

async function run() {
  const formData = new FormData();
  formData.append('text', "Independent Institute of Education (Pty) Ltd v KwaZulu-Natal Law Society and Others 2020 (2) SA 325 (CC)");
  
  const res = await parseDocument(formData);
  console.log(JSON.stringify(res, null, 2));
}

run();
