const fs = require('fs-extra');
const fileProcessor = require('tired-file-processor');

module.exports = class LoadedFile {
	path;
	type;
	contents;
	constructor(path, type, contents) {
		this.path = path;
		this.type = type;
		this.processor = fileProcessor.processor(this.type);
		this.contents = fileProcessor.preprocess(path, type, contents);
	}
	compile(cachekey, attributes, library) {
		if (this.type === 'html') {
			const processed = fileProcessor.process(this.path, 'html', this.contents, attributes);

			// Compile nested HTML library files
			return processed;
		} else {
			if (fileProcessor.canuse(this.path)) {
				fileProcessor.use(this.path, this.type);

				// console.log(this.path);
				if(this.processor.element) return this.processor.element(cachekey, this.path, attributes, this.contents);
				return this.contents;
			} else return "";
		}
	}
	onePerPage(){
		return this.processor.onePerPage === true;
	}
	head(){
		return this.processor.head === true;
	}
}