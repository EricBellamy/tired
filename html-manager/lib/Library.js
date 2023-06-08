const fs = require('fs-extra');
const path = require('path');
const fileProcessor = require('tired-file-processor');
const LibraryFile = require('./LibraryFile.js');

const modifiedCache = (require('tired-disk-cache'))(".tired/cache/library/modified");

module.exports = class Library {
	directory;
	files = {};
	constructor(baseDirectory) {
		this.directory = baseDirectory;
	}
	getSrc(src) {
		if(src[0] === "/") src = src.substring(1);
		const extname = path.extname(src).substring(1);
		return `${this.directory}/${extname}/${src}`;
	}
	getFile(src){
		return this.files[src] != undefined ? this.files[src] : false;
	}
	getCachedModified(filepath){
		return modifiedCache.get(filepath);
	}
	getUncachedModified(filepath){
		return fs.lstatSync(filepath).mtimeMs;
	}
	updateModified(filepath){
		const modifiedTime = this.getUncachedModified(filepath);
		modifiedCache.set(filepath, modifiedTime);
		return modifiedTime;
	}
	add(filepath) {
		const extname = path.extname(filepath).substring(1);
		const processor = fileProcessor.processor(extname);
		let encoding, contents;

		if(processor.contents != false){
			encoding = processor.encoding;
			contents = fs.readFileSync(filepath, encoding);
		}
		this.updateModified(filepath);
		this.files[filepath] = new LibraryFile(filepath, extname, contents);

		return this.files[filepath];
	}
	isLibraryFile(path){
		return path.substring(0, this.directory.length) === this.directory;
	}
}