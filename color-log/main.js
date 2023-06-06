// Standardize color logging to console
const colors = require('colors/safe');
const validColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray'];

// exports(['cyan', 'this is printed in cyan']);
module.exports = function (key, ...args) {
	if (args.slice(-1)[0] === true) console.log(); // Add a new line if the last argument is true

	const logArray = [];
	for (let a = 0; a < args.length; a++) {
		let arg = args[a];
		if (a === 0) arg[1] = `[${key}] ${arg[1]}`;

		if (validColors.indexOf(arg[0]) != -1) logArray.push(colors[arg[0]](arg[1]));
	}
	console.log(logArray.join(''));
}

function log(color, value){
	return [color, value];
}

module.exports.percentage = function(index, max){
	return ((index / max) * 100).toFixed(2) + "%";
}

module.exports.normal = log.bind(null, "green");
module.exports.normal2 = log.bind(null, "cyan");

module.exports.warning = log.bind(null, "yellow");
module.exports.warning2 = log.bind(null, "blue");

module.exports.error = log.bind(null, "red");
module.exports.error2 = log.bind(null, "magenta");