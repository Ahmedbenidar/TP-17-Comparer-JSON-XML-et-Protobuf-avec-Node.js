const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const { construireEquipe } = require('./src/donnees');
const json = require('./src/format-json');
const xml = require('./src/format-xml');
const protobuf = require('./src/format-protobuf');

const DOSSIER_SORTIE = path.join(__dirname, 'sortie');
const TAILLES = [3, 100, 1000];
const REPETITIONS = 200;

const FORMATS = [
  { cle: 'json', libelle: 'JSON', encoder: json.encoder, decoder: json.decoder, extension: 'json' },
  { cle: 'xml', libelle: 'XML', encoder: xml.encoder, decoder: xml.decoder, extension: 'xml' },
  { cle: 'protobuf', libelle: 'Protobuf', encoder: protobuf.encoder, decoder: protobuf.decoder, extension: 'bin' }
];

function octets(valeur) {
  return Buffer.byteLength(valeur);
}

function pourcentage(reference, valeur) {
  if (reference === 0) return '0.0';
  return (((reference - valeur) / reference) * 100).toFixed(1);
}

function ecartJson(reference, valeur) {
  const ratio = ((valeur - reference) / reference) * 100;
  const signe = ratio > 0 ? '+' : '';
  return `${signe}${ratio.toFixed(1)}%`;
}

function ligne(caractere = '-', longueur = 78) {
  return caractere.repeat(longueur);
}

function canonique(valeur) {
  if (Array.isArray(valeur)) {
    return `[${valeur.map(canonique).join(',')}]`;
  }
  if (valeur && typeof valeur === 'object') {
    const cles = Object.keys(valeur).sort();
    return `{${cles.map((c) => `${JSON.stringify(c)}:${canonique(valeur[c])}`).join(',')}}`;
  }
  return JSON.stringify(valeur);
}

// Comparaison insensible a l'ordre des cles : Protobuf relit les champs
// dans l'ordre des numeros du schema, pas dans l'ordre de l'objet d'origine.
function identiques(a, b) {
  return canonique(a) === canonique(b);
}

function mesurer(format, equipe, iterations) {
  const debut = process.hrtime.bigint();
  let charge = null;
  for (let i = 0; i < iterations; i += 1) {
    charge = format.encoder(equipe);
  }
  const finEncodage = process.hrtime.bigint();

  let objet = null;
  for (let i = 0; i < iterations; i += 1) {
    objet = format.decoder(charge);
  }
  const finDecodage = process.hrtime.bigint();

  const taille = typeof charge === 'string' ? octets(charge) : charge.length;
  const tailleGzip = zlib.gzipSync(typeof charge === 'string' ? Buffer.from(charge, 'utf8') : charge).length;

  return {
    charge,
    objet,
    taille,
    tailleGzip,
    msEncodage: Number(finEncodage - debut) / 1e6 / iterations,
    msDecodage: Number(finDecodage - finEncodage) / 1e6 / iterations
  };
}

function formater(ms) {
  return ms.toFixed(4).padStart(9, ' ');
}

function traiterTaille(nombre) {
  const equipe = construireEquipe(nombre);
  const referenceJson = JSON.stringify(equipe);

  console.log(ligne('='));
  console.log(`EQUIPE DE ${nombre} COLLABORATEUR(S) - projet : ${equipe.projet}`);
  console.log(ligne('='));
  console.log('Format     | Octets | Gzip   | vs JSON | Encodage ms | Decodage ms | Aller-retour');
  console.log(ligne('-'));

  const resultats = [];
  FORMATS.forEach((format) => {
    const mesure = mesurer(format, equipe, REPETITIONS);
    const fiable = identiques(mesure.objet, equipe);
    resultats.push({ format, mesure, fiable });

    console.log(
      [
        format.libelle.padEnd(10),
        String(mesure.taille).padStart(6),
        String(mesure.tailleGzip).padStart(6),
        ecartJson(octets(referenceJson), mesure.taille).padStart(7),
        formater(mesure.msEncodage),
        formater(mesure.msDecodage),
        fiable ? 'identique' : 'ECART'
      ].join(' | ')
    );
  });

  console.log(ligne('-'));

  const parTaille = [...resultats].sort((a, b) => a.mesure.taille - b.mesure.taille);
  const plusPetit = parTaille[0];
  const plusGros = parTaille[parTaille.length - 1];
  console.log(
    `Plus compact : ${plusPetit.format.libelle} (${plusPetit.mesure.taille} octets) - ` +
      `soit ${pourcentage(plusGros.mesure.taille, plusPetit.mesure.taille)}% de moins que ${plusGros.format.libelle}`
  );

  const parEncodage = [...resultats].sort((a, b) => a.mesure.msEncodage - b.mesure.msEncodage);
  const parDecodage = [...resultats].sort((a, b) => a.mesure.msDecodage - b.mesure.msDecodage);
  console.log(
    `Encodage le plus rapide : ${parEncodage[0].format.libelle} ` +
      `(${parEncodage[0].mesure.msEncodage.toFixed(4)} ms) - decodage le plus rapide : ` +
      `${parDecodage[0].format.libelle} (${parDecodage[0].mesure.msDecodage.toFixed(4)} ms)`
  );
  console.log(`Mesures moyennes sur ${REPETITIONS} executions.`);
  console.log('');

  return resultats;
}

function ecrireFichiers(resultats, nombre) {
  const suffixe = String(nombre).padStart(4, '0');
  resultats.forEach(({ format, mesure }) => {
    const nom = `equipe-${suffixe}.${format.extension}`;
    const cible = path.join(DOSSIER_SORTIE, nom);
    fs.writeFileSync(cible, mesure.charge);
    const tailleDisque = fs.statSync(cible).size;
    console.log(`  ecrit ${nom.padEnd(18)} ${String(tailleDisque).padStart(7)} octets sur disque`);
  });
}

function analyserIndentation(nombre) {
  const equipe = construireEquipe(nombre);
  const compact = JSON.stringify(equipe);
  const indente = JSON.stringify(equipe, null, 2);

  console.log(ligne('='));
  console.log(`EXTENSION 1 - Impact de l'indentation JSON (${nombre} collaborateurs)`);
  console.log(ligne('='));
  console.log(`JSON compact   : ${String(octets(compact)).padStart(7)} octets`);
  console.log(`JSON indente 2 : ${String(octets(indente)).padStart(7)} octets`);
  console.log(
    `Surcout de l'indentation : +${octets(indente) - octets(compact)} octets ` +
      `(+${(((octets(indente) - octets(compact)) / octets(compact)) * 100).toFixed(1)}%)`
  );
  console.log("L'indentation ne change pas les donnees mais gonfle inutilement le volume transmis.");
  console.log('');
}

function inspecterBinaire(chemin) {
  const buffer = fs.readFileSync(chemin);
  console.log(ligne('='));
  console.log('EXTENSION 2 - Inspection des premiers octets du fichier Protobuf');
  console.log(ligne('='));
  const premier = buffer.subarray(0, 32);
  const hex = Array.from(premier)
    .map((o) => o.toString(16).padStart(2, '0'))
    .join(' ');
  console.log(`Fichier : ${path.basename(chemin)} (${buffer.length} octets)`);
  console.log(`32 premiers octets : ${hex}`);
  console.log('Aucun nom de champ visible : seuls les numeros de champ et les valeurs sont stockes.');
  console.log('');
}

function main() {
  fs.rmSync(DOSSIER_SORTIE, { recursive: true, force: true });
  fs.mkdirSync(DOSSIER_SORTIE, { recursive: true });

  console.log('');
  console.log('BENCHMARK DE SERIALISATION : JSON vs XML vs PROTOBUF');
  console.log(`Node.js ${process.version} - protobufjs + xml-js`);
  console.log('');

  TAILLES.forEach((nombre) => {
    const resultats = traiterTaille(nombre);
    ecrireFichiers(resultats, nombre);
    console.log('');
  });

  const verif = protobuf.decoder(fs.readFileSync(path.join(DOSSIER_SORTIE, 'equipe-0003.bin')));
  console.log(ligne('='));
  console.log('Relecture du fichier binaire Protobuf equipe-0003.bin depuis le disque');
  console.log(ligne('='));
  verif.collaborateur.forEach((c) => {
    console.log(
      `  #${c.identifiant} ${c.nom.padEnd(22)} ${c.ville.padEnd(11)} ` +
        `${String(c.salaire_mensuel).padStart(6)} MAD  teletravail=${c.teletravail}`
    );
  });
  console.log('');

  analyserIndentation(100);
  inspecterBinaire(path.join(DOSSIER_SORTIE, 'equipe-0003.bin'));

  console.log(`Dossier de sortie : ${DOSSIER_SORTIE}`);
  console.log('Benchmark termine.');
}

main();
