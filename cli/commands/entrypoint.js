#!/usr/bin/env node
const arguments = process.argv.splice(2);

// Load the tired config file
const fs = require('fs');
try {
	global.tired_config = fs.readFileSync('tired.json');
} catch (err) {
	console.log(err);
	throw new Error('Must provide a tired.json config file');
}
try {
	global.tired_config = JSON.parse(global.tired_config);
} catch (err) {
	throw new Error('tired.json config file must be valid JSON');
}
if (global.tired_config.name === undefined) throw new Error('tired.json must specify a "name" object');

async function handlecli(arguments) {
	switch (arguments[0]) {
		case "build":
			require('./build.js')();
			break;
		case "host":
			require('./host.js')(3000);
			break;
		case "deploy":
			await require('./deploy.js')();
			break;
		default:
			if (arguments[0] != undefined) {
				const port = parseInt(arguments[0]);
				if (!isNaN(port)) require('./host.js')(port);
			}
			break;
	}
}
handlecli(arguments);