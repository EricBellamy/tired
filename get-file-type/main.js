const path = require('path');

module.exports = function(filepath){
	return path.extname(filepath);
}

module.exports.nodot = function(filepath){
	return path.extname(filepath).substring(1);
}