import { CitationEngine } from './src/lib/extractor';

const text = `Rural Maintenance (Pty) Ltd v Maluti-A-Phofung Local Municipality (2017) 38 ILJ 295
(CC)
Plascon-Evans Paints Ltd v
Van Riebeeck Paints (Pty) Ltd 1984 (3) SA 623 (A) at p 634H – I.
In Leica14, Van Niekerk J considered the impact of the LAC decision
in In PE Rack 4100 CC v Sanders & others (2013) 34 ILJ 1477 (LAC),
and stated as follows:
“[22]… the Labour Appeal Court adopted an approach in which the
application or otherwise of s 197 was held to be dependent on the
answers to two questions (at paragraph 14):
(i) Does the transaction concerned create rights and
obligations that require one entity to transfer something in
favour of or for the benefit of another or to another?
(ii) If the answer to the first question is in the affirmative,
does the obligation imposed within the transaction
14 Swanepoel and Others v Leica Geosystems AG and Others (2014) 35 ILJ 2877 (LC),
confirmed on appeal to the LAC - Kruger and Others v Aciel Geomatics (Pty) Ltd 37 (ILJ)
2567 (LAC).`;

const normalizedText = text.replace(/([^\n])\n([^\n])/g, '$1 $2');
console.log('Normalized text subset:', normalizedText.substring(0, 200));

const results = CitationEngine.extractCitations(normalizedText);

console.log(JSON.stringify(results, null, 2));
