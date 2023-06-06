const markup = require('tired-markup');
const htmlparser = require('node-html-parser');

module.exports = {
	encoding: 'utf8',
	process: function (contents, attributes) {
		// Process the HTML markup
		const theMarkup = markup.parse(contents);
		const compiled = markup.compile(theMarkup, attributes);

		return htmlparser.parse(compiled);
	}
}