const fs = require('fs-extra');
const getDirectoryFiles = require('tired-get-directory-files');
const colorLog = require('tired-color-log');

const Library = require('./lib/Library.js');
const HTMLFile = require('./lib/HTMLFile.js');

const modifiedCache = (require('tired-disk-cache'))(".tired/cache/library/modified");

module.exports = class HTMLManager {
	library;
	constructor(libraryDirectory = "") {
		if (libraryDirectory.length === 0) throw new Error("Must specify a library directory to the HTML manager");
		this.library = new Library(libraryDirectory);

		this.readFilesIntoMemory();
	}
	readFilesIntoMemory() {
		const files = getDirectoryFiles(this.library.directory);
		for (const filepath of files) this.library.add(filepath);

		// Save the modified dates to disk
		modifiedCache.save();
	}
	loadFile(path, attributes = {}, templateAttributes = {}) {
		colorLog("html-manager.js", colorLog.normal("Loading includes for file "), colorLog.normal2(path));

		// Is this path a library file
		const isLibraryFile = this.library.isLibraryFile(path);

		if (isLibraryFile) this.library.add(path); // Update the library file
		else {
			console.log(path);
			this.library.updateModified(path);
			const contents = fs.readFileSync(path, 'utf8');
			return new HTMLFile(path, contents, { attr: attributes, template: templateAttributes }, this.library); // Compile the non-library file 
		}
	}
}