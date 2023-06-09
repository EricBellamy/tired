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
if (global.tired_config.url === undefined) throw new Error('tired.json must specify a "url" object');
else {
	if(global.tired_config.url.indexOf("http") === -1) global.tired_config.url = "https://" + global.tired_config.url;
	if(global.tired_config.url.slice(-1)[0] === "/") global.tired_config.url = global.tired_config.url.substring(0, global.tired_config.url.length - 1);
}

async function handlecli(arguments) {
	switch (arguments[0]) {
		case "build":
			process.env.target = "prod";
			require('./build.js')();
			break;
		case "host":
			process.env.target = "dev";
			require('./host.js')(3000);
			break;
		case "deploy":
			process.env.target = "prod";
			await require('./deploy.js')();
			break;
		default:
			if (arguments[0] != undefined) {
				process.env.target = "dev";
				const port = parseInt(arguments[0]);
				if (!isNaN(port)) require('./host.js')(port);
			}
			break;
	}
}
handlecli(arguments);