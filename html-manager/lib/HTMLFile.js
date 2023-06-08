const fs = require('fs-extra');
const fileProcessor = require('tired-file-processor');
const HTMLParser = require('node-html-parser');
const includeCache = (require('tired-disk-cache'))(".tired/cache/includes");

module.exports = class HTMLFile {
	path;
	parsed;
	includedPaths = {};
	constructor(path, contents, attributes = {}, library) {
		this.path = path;
		this.parsed = fileProcessor.process(path, 'html', contents, attributes);

		// Set the parent to either the body tag or just whatever we have
		this.parsedBodyTag = this.parsed.querySelector("body");
		if (this.parsedBodyTag === null) this.parsedBodyTag = this.parsed;

		this.loadNested(attributes, library);

		fileProcessor.clearUsed();
	}
	// Load all of the <include> tags and their nested <include> tags recursively
	loadNested(attributes, library) {
		let includes = this.parsed.querySelectorAll("include");
		let count = 0;
		while (0 < includes.length) {
			for (const include of includes) {
				// Get the library src
				const src = library.getSrc(include.getAttribute('src'));
				this.includedPaths[src] = library.getCachedModified(src);

				// Get this src from the library
				const requestedLibraryFile = library.getFile(src);
				if (requestedLibraryFile === false) throw new Error(`No library file found for src: "${src}" in HTML file: "${this.path}"`);

				// Compile the library file
				const includeContents = requestedLibraryFile.compile(this.path, {
					attr: include.attributes,
					root: attributes.root,
					template: attributes.template
				}, library);

				// Handle nested HTML library files
				if (requestedLibraryFile.type === "html") {
					// Get the first child until there are no more children
					let inside = includeContents;
					while (inside.childNodes.length != 0) {
						const children = inside.childNodes;

						let hadNonTextChild = false;
						for (let a = 0; a < children.length; a++) {
							if (children[a].nodeType != 3) {
								// These tags are not elligible
								switch (children[a].rawTagName) {
									case "include":
									case "meta":
									case "link":
									case "script":
									case "style":
										continue;
										break;
								}

								inside = children[a];

								// If we find a <head> tag, stop any further search
								if (children[a].rawTagName === "head") break;
								hadNonTextChild = true;
								break;
							}
						}
						if (!hadNonTextChild) break; // no further children found, break loop
					}

					// Insert the children into this inner wrapper
					inside.innerHTML += include.innerHTML;
					include.replaceWith(includeContents);
				} else {
					// If there's only one per page, append to end of document
					if (requestedLibraryFile.onePerPage()) {
						if (requestedLibraryFile.head()) {
							include.replaceWith("");
							this.parsedBodyTag.insertAdjacentHTML("afterbegin", includeContents);
						} else {
							include.replaceWith("");
							this.parsedBodyTag.insertAdjacentHTML("beforeend", includeContents);
						}
					} else {
						include.replaceWith(includeContents);
					}
				}
			}

			count++;
			if (50 < count) {
				throw new Error(`Infinite loop in HTML file: ${this.path}`);
				break;
			}
			includes = this.parsed.querySelectorAll("include");
		}

		includeCache.set(this.path, this.includedPaths);
	}
	saveFile() {
		// Save file to disk
	}
	toString() {
		return this.parsed.toString();
	}
}