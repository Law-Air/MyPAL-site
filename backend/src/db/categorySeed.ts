// Seed identică aplicată fiecărui site nou MyPAL (PF).
// NU conține codurile F-... (Fin-Air) sau J07/J08 (Fin-Air only) —
// acelea aparțin proiectului Fin-Air, o baza de date separată.
// Domeniul 'rezervari_simulari' (Vivix) e gol deliberat — lista primită
// de la Mircea/Safix nu acoperă acest domeniu inca ("crochiu" in lucru).

export interface CategorySeed {
  code: string;
  domain: 'conta' | 'juridic' | 'rezervari_simulari' | 'audit';
  name: string;
}

export const MYPAL_CATEGORY_SEED: CategorySeed[] = [
  // Venituri
  { code: 'V01', domain: 'conta', name: 'Salarii nete' },
  { code: 'V02', domain: 'conta', name: 'Bonusuri/sporuri' },
  { code: 'V03', domain: 'conta', name: 'Chirii incasate' },
  { code: 'V04', domain: 'conta', name: 'Dividende' },
  { code: 'V05', domain: 'conta', name: 'Colaborari/freelance' },
  { code: 'V06', domain: 'conta', name: 'Alte venituri' },
  // Cheltuieli
  { code: 'C01', domain: 'conta', name: 'Locuinta' },
  { code: 'C02', domain: 'conta', name: 'Rate si credite' },
  { code: 'C03', domain: 'conta', name: 'Alimentare/gospodarie' },
  { code: 'C04', domain: 'conta', name: 'Transport/carburant' },
  { code: 'C05', domain: 'conta', name: 'Educatie/cursuri' },
  { code: 'C06', domain: 'conta', name: 'Sanatate/medicamente' },
  { code: 'C07', domain: 'conta', name: 'Divertisment/iesiri' },
  { code: 'C08', domain: 'conta', name: 'Imbracaminte' },
  { code: 'C09', domain: 'conta', name: 'Economii/rezerve' },
  { code: 'C10', domain: 'conta', name: 'Alte cheltuieli' },
  // Juridic (comun MyPAL + Fin-Air; J07/J08 excluse — doar Fin-Air)
  { code: 'J01', domain: 'juridic', name: 'Contracte de munca/prestari servicii' },
  { code: 'J02', domain: 'juridic', name: 'Contracte de inchiriere/proprietate' },
  { code: 'J03', domain: 'juridic', name: 'Acte de proprietate (imobile, terenuri)' },
  { code: 'J04', domain: 'juridic', name: 'Documente succesiune/mostenire' },
  { code: 'J05', domain: 'juridic', name: 'Litigii/dispute in curs' },
  { code: 'J06', domain: 'juridic', name: 'Datorii/popriri/executari' },
  { code: 'J09', domain: 'juridic', name: 'Alte documente juridice' },
  // Audit (transversal)
  { code: 'A01', domain: 'audit', name: 'Documente lipsa/incomplete' },
  { code: 'A02', domain: 'audit', name: 'Discrepante suma declarata vs. document' },
  { code: 'A03', domain: 'audit', name: 'Termene fiscale nerespectate' },
  { code: 'A04', domain: 'audit', name: 'Riscuri semnalate, necorectate' },
];
