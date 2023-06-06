const fs = require('fs');
const path = require('path');
module.exports = function (directoryPath, ignorePaths = [], allowNested = true, first = true) {
	if (directoryPath[directoryPath.length - 1] != "/") directoryPath += "/"; // Ensure ending slash
	if (first) {
		for (let a = 0; a < ignorePaths.length; a++) ignorePaths[a] = directoryPath + ignorePaths[a];
	}

	const files = []
	fs.readdirSync(directoryPath, { withFileTypes: true }).forEach(item => {
		const filepath = directoryPath + item.name;

		for (const ignorePath of ignorePaths) {
			if (filepath.indexOf(ignorePath) === 0) return;
		}

		// Recursively load nested directory files
		if (item.isDirectory()) {
			if (allowNested) {
				const nestedFiles = module.exports(filepath, ignorePaths, true, false);
				files.push.apply(files, nestedFiles);
			}

		} else files.push(filepath);
	})
	return files;
}

module.exports.byFileType = function (directoryPath, filetypes = [], allowNested = true, first = true) {
	if (directoryPath[directoryPath.length - 1] != "/") directoryPath += "/"; // Ensure ending slash

	const files = []
	fs.readdirSync(directoryPath, { withFileTypes: true }).forEach(item => {
		const filepath = directoryPath + item.name;

		// Recursively load nested directory files
		if (item.isDirectory()) {
			if (allowNested) {
				const nestedFiles = module.exports(filepath, ignorePaths, true, false);
				files.push.apply(files, nestedFiles);
			}
		} else {
			const filetype = path.extname(item.name);
			if (filetypes.indexOf(filetype) != -1) files.push(filepath);
		}
	})
	return files;
}