const build = require('./build.js');

async function launchServers(PORT_NUMBER){
	serverStatus = true;
	global.tired_config.server = { url: `http://127.0.0.1:${PORT_NUMBER}` };
	require('../lib/lightserver.js')(PORT_NUMBER, true);
}

let serverStatus = false;
module.exports = async function (PORT_NUMBER) {
	// Initialize watcher, runs build once on start
	require('../lib/watch.js')(async function (changedFiles, callback) {
		// An empty array is the startup build, easiest to just call build
		if(changedFiles.length === 0) await build();
		else await build.fromIncludes(changedFiles);

		callback();

		// Launch the servers after the first build for console clarity
		if(serverStatus) return;
		await launchServers(PORT_NUMBER);
	});
}