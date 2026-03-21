import { extractPartyNames } from './src/lib/saflii';

const display1 = "CC) Plascon-Evans Paints Ltd v Van Riebeeck Paints (Pty) Ltd 1984 (3) SA 623 (A)";
const display2 = "Rural Maintenance (Pty) Ltd v Maluti-A-Phofung Local Municipality (2017) 38 ILJ 295 (CC)";
const display3 = "Swanepoel and Others v Leica Geosystems AG and Others (2014) 35 ILJ 2877 (LC)";

console.log(extractPartyNames(display1));
console.log(extractPartyNames(display2));
console.log(extractPartyNames(display3));
