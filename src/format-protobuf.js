const path = require('path');
const protobuf = require('protobufjs');

const CHEMIN_PROTO = path.join(__dirname, '..', 'proto', 'equipe.proto');

// keepCase conserve les noms de champs du fichier .proto : sans cette option
// protobufjs renomme salaire_mensuel en salaireMensuel et l'aller-retour
// ne redonne plus l'objet de depart.
const racine = new protobuf.Root();
racine.loadSync(CHEMIN_PROTO, { keepCase: true });
const TypeEquipe = racine.lookupType('tp17.formats.v1.Equipe');

function encoder(equipe) {
  const erreur = TypeEquipe.verify(equipe);
  if (erreur) {
    throw new Error(`Objet non conforme au schema Protobuf : ${erreur}`);
  }
  return TypeEquipe.encode(TypeEquipe.create(equipe)).finish();
}

function decoder(buffer) {
  return TypeEquipe.toObject(TypeEquipe.decode(buffer), { defaults: true });
}

module.exports = { encoder, decoder, TypeEquipe };
