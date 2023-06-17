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
		const keyAppearances = {};
		while (0 < includes.length) {
			for (const include of includes) {
				// Get the library src
				const src = library.getSrc(include.getAttribute('src'));
				this.includedPaths[src] = library.getCachedModified(src);

				// Get this src from the library
				const requestedLibraryFile = library.getFile(src);
				if (requestedLibraryFile === false) throw new Error(`No library file found for src: "${src}" in HTML file: "${this.path}"`);

				const includeKey = include.getAttribute('key');
				let keyCount = -1;
				if (includeKey != undefined){
					if(keyAppearances[includeKey] === undefined) keyAppearances[includeKey] = -1;
					keyAppearances[includeKey]++;
					keyCount = keyAppearances[includeKey];
				}

				// Compile the library file
				const includeContents = requestedLibraryFile.compile(this.path, {
					attr: include.attributes,
					root: attributes.root,
					template: attributes.template
				}, library, keyCount);

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

		// Handle quotations in links from how strings are parsed
		const links = this.parsed.querySelectorAll("a");
		for (const link of links) {
			const href = link.getAttribute("href");
			try {
				if (href[0] === '"') link.setAttribute("href", href.substring(1, href.length - 1));
			} catch (err) {
				console.log(link.toString());
				throw new Error(err);
			}
		}

		// Add a preconnect to our CDN domain
		this.parsed.querySelector('head').insertAdjacentHTML("beforeend", `<link rel="preconnect" href="https://${global.tired_config.cdn.domain}">`);

		includeCache.set(this.path, this.includedPaths);
	}
	saveFile() {
		// Save file to disk
	}
	toString() {
		return this.parsed.toString();
	}
}