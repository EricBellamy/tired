const processors = {
	'html': require('./processors/html.js'),
	'scss': require('./processors/scss.js'),
	'js': require('./processors/js.js'),
	'jpg': require('./processors/picture.js'),
	'png': require('./processors/picture.js'),
};

let used = {};
module.exports.process = function (path, filetype, contents, attributes) {
	if (processors[filetype] != undefined) {
		if (processors[filetype].onePerPage) used[path] = true;
		if (processors[filetype].process != undefined) return processors[filetype].process(contents, attributes);
	}
	return contents;
}

module.exports.preprocess = function (path, filetype, contents) {
	if (processors[filetype] != undefined) {
		if (processors[filetype].preprocess != undefined) return processors[filetype].preprocess(contents);
	}
	return contents;
}

module.exports.canuse = function (path) {
	return used[path] === undefined;
}
module.exports.use = function(path, filetype){
	if (processors[filetype] != undefined){
		if (processors[filetype].onePerPage) used[path] = true;
	}
}
module.exports.processor = function(filetype){
	return processors[filetype] != undefined ? processors[filetype] : {};
}

module.exports.clearUsed = function(){
	used = {};
}