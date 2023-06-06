const sass = require('node-sass');

module.exports = {
	encoding: 'utf8',
	onePerPage: true, // only one path per HTML file allowed
	head: true,
	preprocess: function (contents) {
		const result = sass.renderSync({
			data: contents,
			includePaths: [ './includes/scss/' ],
			outputStyle: 'compressed'
		});

		return `<style>${result.css.toString().trim()}</style>`;
	}
}