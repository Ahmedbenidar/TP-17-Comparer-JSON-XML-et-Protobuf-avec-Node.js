const NOMS = [
  'Youssef El Amrani',
  'Salma Benjelloun',
  'Karim Ouazzani',
  'Nadia Cherkaoui',
  'Hamza Berrada',
  'Ihsane Tazi',
  'Mehdi Lahlou',
  'Ghita Sefrioui',
  'Othmane Bouzid',
  'Rim El Fassi',
  'Anas Chraibi',
  'Soukaina Idrissi'
];

const VILLES = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Fes',
  'Tanger',
  'Agadir',
  'Oujda',
  'Meknes'
];

function collaborateur(index) {
  return {
    identifiant: index + 1,
    nom: NOMS[index % NOMS.length],
    ville: VILLES[index % VILLES.length],
    salaire_mensuel: 6200 + ((index * 733) % 14500),
    teletravail: index % 3 === 0
  };
}

function construireEquipe(nombre, projet = 'Migration microservices - plateforme facturation') {
  const collaborateurs = [];
  for (let i = 0; i < nombre; i += 1) {
    collaborateurs.push(collaborateur(i));
  }
  return { projet, collaborateur: collaborateurs };
}

module.exports = { construireEquipe };
