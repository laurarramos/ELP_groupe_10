const TYPES = { NOMBRE: 'nombre', MODIFIER: 'modifier', ACTION: 'action' };

const CONFIG_PAQUET = [
    { type: TYPES.NOMBRE, valeur: 0, quantite: 1 },
    { type: TYPES.NOMBRE, valeur: 1, quantite: 1 },
    { type: TYPES.NOMBRE, valeur: 2, quantite: 2 },
    { type: TYPES.NOMBRE, valeur: 3, quantite: 3 },
    { type: TYPES.NOMBRE, valeur: 4, quantite: 4 },
    { type: TYPES.NOMBRE, valeur: 5, quantite: 5 },
    { type: TYPES.NOMBRE, valeur: 6, quantite: 6 },
    { type: TYPES.NOMBRE, valeur: 7, quantite: 7 },
    { type: TYPES.NOMBRE, valeur: 8, quantite: 8 },
    { type: TYPES.NOMBRE, valeur: 9, quantite: 9 },
    { type: TYPES.NOMBRE, valeur: 10, quantite: 10 },
    { type: TYPES.NOMBRE, valeur: 11, quantite: 11 },
    { type: TYPES.NOMBRE, valeur: 12, quantite: 12 },
    { type: TYPES.MODIFIER, nom: '+2', bonus: 2, quantite: 1 },
    { type: TYPES.MODIFIER, nom: '+4', bonus: 4, quantite: 1 },
    { type: TYPES.MODIFIER, nom: '+6', bonus: 6, quantite: 1 },
    { type: TYPES.MODIFIER, nom: '+8', bonus: 8, quantite: 1 },
    { type: TYPES.MODIFIER, nom: '+10', bonus: 10, quantite: 1 },
    { type: TYPES.MODIFIER, nom: 'x2', multiplicateur: 2, quantite: 1 },
    { type: TYPES.ACTION, nom: 'FREEZE', quantite: 3 },
    { type: TYPES.ACTION, nom: 'FLIP THREE', quantite: 3 },
    { type: TYPES.ACTION, nom: 'SECOND CHANCE', quantite: 3 }
];

module.exports = { TYPES, CONFIG_PAQUET };