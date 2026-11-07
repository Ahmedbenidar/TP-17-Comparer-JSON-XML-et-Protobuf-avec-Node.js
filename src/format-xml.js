const convert = require('xml-js');

const OPTIONS = { compact: true, ignoreComment: true, spaces: 0 };

function encoder(equipe) {
  const corps = convert.json2xml({ equipe }, OPTIONS);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${corps}`;
}

function decoder(xml) {
  const brut = convert.xml2json(xml, { compact: true });
  const racine = JSON.parse(brut).equipe;
  const liste = [].concat(racine.collaborateur || []);
  return {
    projet: racine.projet._text,
    collaborateur: liste.map((c) => ({
      identifiant: Number(c.identifiant._text),
      nom: c.nom._text,
      ville: c.ville._text,
      salaire_mensuel: Number(c.salaire_mensuel._text),
      teletravail: c.teletravail._text === 'true'
    }))
  };
}

module.exports = { encoder, decoder };
