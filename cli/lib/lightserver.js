// light-server -s dist -w dist/*.html
const LightServer = require('light-server');

module.exports = async function (port, reload = false, http2 = false) {
	const serverConfig = {
		port: port,
		watchexps: [],
		proxypaths: ['/'],
		serve: '.tired/dist'
	}
	if (reload === false) {
		serverConfig.noReload = true;
		serverConfig.quiet = false;
	}

	if (http2) serverConfig.http2 = true;

	const server = new LightServer(serverConfig);
	server.start();
}