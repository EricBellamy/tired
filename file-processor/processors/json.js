module.exports = {
	preprocess: function (contents) {
		return JSON.parse(contents);
	}
}