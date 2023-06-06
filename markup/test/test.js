const fs = require('fs');
// const HTMLParser = require('node-html-parser');
const markup = require('../main.js');

const contents = fs.readFileSync('index.html', 'utf8');

const theMarkup = markup.parse(contents);
const compiled = markup.compile(theMarkup, {
	attr: {
		title: "Hello world",
		hello: {
			world: "here we go"
		}
	},
	template: {
		title: "Template title"
	},
});

console.log(compiled);