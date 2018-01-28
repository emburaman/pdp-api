const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/pdp-api');
mongoose.Promise = global.Promise;

module.exports = mongoose;