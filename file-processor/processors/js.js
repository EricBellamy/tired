const terser = require('terser-sync');

module.exports = {
	encoding: 'utf8',
	onePerPage: true, // only one path per HTML file allowed
	head: false,
	preprocess: function (contents) {
		const result = terser.minifySync(contents);
		return `<script>${result.code}</script>`;
	}
}