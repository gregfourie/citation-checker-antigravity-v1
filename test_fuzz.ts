// @ts-ignore
import * as fuzz from 'fuzzball';

const str1 = "Independent Institute of Education (Pty) Ltd v KwaZulu-Natal Law Society and Others".toLowerCase();
const str2 = "Independent Institute of Education (Pty) Limited v Kwazulu-Natal Law Society and Others (CCT68/19) [2019] ZACC 47; 2020 (2) SA 325 (CC); (2020 (4) BCLR 495 (CC) (11 December 2019)".toLowerCase();

console.log('token_set_ratio:', fuzz.token_set_ratio(str1, str2));
console.log('partial_ratio:', fuzz.partial_ratio(str1, str2));
