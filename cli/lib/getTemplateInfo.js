const getDirectoryFiles = require('tired-get-directory-files');
const modifiedCache = (require('tired-disk-cache'))(".tired/cache/library/modified");

module.exports = function (htmlManager) {
	let templates = {
		filepaths: [],
		modified: {},
		data: {}
	}
	templates.modified = {};

	// If template data has changed, rebuild changed objects
	const dataFiles = getDirectoryFiles.byFileType("templates/data", [".json"], false);
	for (const filepath of dataFiles) {
		templates.filepaths.push(filepath);

		const templateKey = filepath.substring("templates/data".length + 1, filepath.lastIndexOf(".json"));

		// Check if template data has been modified
		const oldModified = modifiedCache.get(filepath);
		const addedFile = htmlManager.library.add(filepath);
		const newModified = modifiedCache.get(filepath);

		templates.modified[filepath] = {
			old: oldModified,
			new: newModified
		}

		templates.data[templateKey] = addedFile.contents;
	}

	return templates;
}