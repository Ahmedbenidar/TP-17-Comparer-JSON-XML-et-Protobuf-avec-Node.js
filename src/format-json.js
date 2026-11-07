function encoder(equipe) {
  return JSON.stringify(equipe);
}

function decoder(texte) {
  return JSON.parse(texte);
}

module.exports = { encoder, decoder };
