const fs = require('fs-extra');
const path = require('path');

class Cache {
	data = {};

	cachepath;
	cachename;
	cachefilepath;

	constructor(filepath) {
		this.cachename = path.parse(filepath).name;
		this.cachepath = filepath.substring(0, filepath.lastIndexOf(this.cachename));
		this.cachefilepath = this.cachepath + this.cachename + ".json";

		try {
			const file = fs.readFileSync(this.cachefilepath, 'utf8');
			this.data = JSON.parse(file);
		} catch (err) {
			if (0 < this.cachepath.length) fs.ensureDirSync(this.cachepath);
		}
	}
	save() {
		fs.writeFileSync(this.cachefilepath, JSON.stringify(this.data));
	}
	key(...attributes) {
		let attributeString = "";
		for (const attribute of attributes) {
			attributeString += attribute;
		}
		return attributeString;
	}

	has(key) {
		return this.data[key] != undefined;
	}
	get(key) {
		return this.data[key];
	}
	set(key, value) {
		this.data[key] = value;
	}
	remove(key) {
		delete this.data[key];
	}
	clear() {
		this.data = {};
	}
}

const caches = {};
module.exports = function(filepath){
	if(caches[filepath] === undefined) caches[filepath] = new Cache(filepath);
	return caches[filepath];
}