'use strict';

var Auto = require('./src/autocomplete');

new Auto(document.querySelector('input[name="country"]'), [
    ['NorteShopping', '1'],
    ['SportZone Barcelona', '111'],
    ['SportZone NortesShopping', '11'],
    ['SportZone Braga', '20']
]);
