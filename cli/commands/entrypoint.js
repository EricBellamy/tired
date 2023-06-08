#!/usr/bin/env node
const arguments = process.argv.splice(2);

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