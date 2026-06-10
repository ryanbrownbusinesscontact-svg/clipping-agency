#!/usr/bin/env node
/*
 * scaffold-campaign.js — legt das Geruest fuer eine neue Kampagne an.
 *
 * Nutzung:
 *   node scaffold-campaign.js <campaign-id> [--root "C:\\Users\\priva\\Clipping Agency"]
 *
 * Tut genau drei Dinge (deterministisch, idempotent):
 *   1) campaigns/<id>/ anlegen (+ raw-footage/ und clips/ Unterordner fuer die Pipeline)
 *   2) _TEMPLATE.campaign.json -> campaigns/<id>/campaign.json kopieren
 *   3) im kopierten campaign.json die "id" auf <id> setzen
 *
 * Bricht ab (Exit 2), wenn campaign.json schon existiert -> nie ueberschreiben.
 * Das Ausfuellen der Felder macht Claude danach per Edit (Urteilsarbeit).
 */
const fs = require('fs');
const path = require('path');

const [, , id, ...rest] = process.argv;
if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('FEHLER: gueltige kebab-case <campaign-id> noetig. Bsp: node scaffold-campaign.js jacks-dining-room');
  process.exit(1);
}
const rootIdx = rest.indexOf('--root');
const ROOT = rootIdx >= 0 ? rest[rootIdx + 1] : 'C:\\Users\\priva\\Clipping Agency';

const tmpl = path.join(ROOT, 'campaigns', '_TEMPLATE.campaign.json');
const dir = path.join(ROOT, 'campaigns', id);
const out = path.join(dir, 'campaign.json');

if (!fs.existsSync(tmpl)) { console.error(`FEHLER: Template fehlt: ${tmpl}`); process.exit(1); }
if (fs.existsSync(out)) { console.error(`ABBRUCH: ${out} existiert bereits — wird NICHT ueberschrieben.`); process.exit(2); }

// Pipeline-Ordner: raw-footage/ (Station 2, Longform-Quellen) + clips/ (Station 3+, pro Video)
fs.mkdirSync(path.join(dir, 'raw-footage'), { recursive: true });
fs.mkdirSync(path.join(dir, 'clips'), { recursive: true });

const data = JSON.parse(fs.readFileSync(tmpl, 'utf8'));
delete data._TEMPLATE_NOTE; // Template-Hinweis nicht in die echte Kampagne uebernehmen
data.id = id;
fs.writeFileSync(out, JSON.stringify(data, null, 2));

console.log(`OK: ${path.relative(ROOT, out)} angelegt (id=${id}).`);
console.log(`Naechster Schritt: Felder in ${path.relative(ROOT, out)} per Edit ausfuellen.`);
