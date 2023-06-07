// Change the name of this to build.js after

const fs = require('fs-extra');
const path = require('path');
const hash = require('object-hash');

const colorLog = require('tired-color-log');
const getDirectoryFiles = require('tired-get-directory-files');

const htmlManager = new (require('tired-html-manager'))("include");
const includeCache = (require('tired-disk-cache'))(".tired/cache/includes");
const modifiedCache = (require('tired-disk-cache'))(".tired/cache/library/modified");
const templateCache = (require('tired-disk-cache'))(".tired/cache/templates");

// Sets the path that gets prepended to all images
process.env.BASE_IMAGE_PATH = "https://dev.tipsybartender.com";

function fileInStructureWasModified(filepath) {
	// Check if the base filepath was modified
	const modifiedTime = htmlManager.library.getUncachedModified(filepath);
	const cachedModifiedTime = modifiedCache.get(filepath);
	if (modifiedTime != cachedModifiedTime) return true;

	// Check if any of the includes were modified
	const includeSrcModified = includeCache.get(filepath);
	for (key in includeSrcModified) {
		const cachedIncludeModified = includeSrcModified[key];
		const libraryModified = modifiedCache.get(key);
		if (cachedIncludeModified != libraryModified) {
			return true;
		}
	}

	return false;
}

function buildFile(file, index, max) {
	colorLog("host.js",
		colorLog.normal(`[${index}/${max}] (`),
		colorLog.normal2(colorLog.percentage(index, max)),
		colorLog.normal(") "),
		colorLog.normal("Building page "),
		colorLog.normal2(file.path)
	);
	let fileData = file.data != undefined ? file.data : {};
	let templateData = file.templateData != undefined ? file.templateData : {};
	const loadedFile = htmlManager.loadFile(file.path, file.data, {
		holiday: {
			pages: []
		}
	});

	// Write the compiled file to dist
	let distFilePath = file.path;
	if(file.distPath != undefined) distFilePath = file.distPath;
	else if (file.path.indexOf("pages/") === 0) distFilePath = distFilePath.substring("pages/".length);
	distFilePath = `.tired/dist/${distFilePath}`;
	fs.ensureDirSync(path.dirname(distFilePath));
	fs.writeFileSync(distFilePath, loadedFile.toString());
}

let promiseConcurrency = 10;
async function buildFilepaths(files, templateData) {
	let modifiedFiles = [];
	for (const file of files) {
		if (file.force || fileInStructureWasModified(file.path)) modifiedFiles.push(file);
	}

	if (0 < modifiedFiles.length) {
		colorLog("host.js", colorLog.normal("Building "), colorLog.normal2(modifiedFiles.length), colorLog.normal(" pages..."));
		let filepath;
		const modifiedFileLen = modifiedFiles.length;
		let promises = [];
		for (let a = 0; a < modifiedFileLen; a++) {
			promises.push(new Promise(resolve => {
				file = modifiedFiles[a];
				buildFile(file, a + 1, modifiedFileLen);
				resolve();
			}));
			// If last or concurrency limit
			if (a === modifiedFileLen - 1 || promiseConcurrency < promises.length) {
				await Promise.all(promises);
				promises = [];
			}
		}
		includeCache.save();
		modifiedCache.save();
		templateCache.save();
	}
}

async function build(filepaths) {
	console.time("build");
	await buildFilepaths(filepaths);
	console.timeEnd("build");
}

function getHTMLPages() {
	const rootFiles = getDirectoryFiles.byFileType(".", [".html"], false);
	for (let a = 0; a < rootFiles.length; a++) {
		if (rootFiles[a].indexOf("./") === 0) rootFiles[a] = rootFiles[a].substring(2);
	}

	return rootFiles.concat(getDirectoryFiles.byFileType("pages", [".html"]));
}

function getTemplatePages() {
	const pagesToBuild = [];

	// If a template file has changed, rebuild all objects
	const templateFiles = getDirectoryFiles.byFileType("templates/html", [".html"], false);
	const templateFilesByKey = {};
	for (let a = 0; a < templateFiles.length; a++) {
		const key = templateFiles[a].substring("templates/html".length + 1, templateFiles[a].lastIndexOf(".html"));
		templateFilesByKey[key] = { path: templateFiles[a], modified: false };

		// Check if template file itself has been modified
		const oldModified = htmlManager.library.getCachedModified(templateFiles[a]);
		const newModified = htmlManager.library.updateModified(templateFiles[a]);

		if (oldModified != newModified) templateFilesByKey[key].modified = true;
	}

	// If template data has changed, rebuild changed objects
	const dataFiles = getDirectoryFiles.byFileType("templates/data", [".json"], false);
	for (const dataFile of dataFiles) {
		const templateKey = dataFile.substring("templates/data".length + 1, dataFile.lastIndexOf(".json"));
		const relatedTemplateFile = templateFilesByKey[templateKey];

		// Check if template data has been modified
		const oldModified = modifiedCache.get(dataFile);
		const addedFile = htmlManager.library.add(dataFile);
		const newModified = modifiedCache.get(dataFile);

		// If template HTML modified, rebuild all objects
		if (relatedTemplateFile.modified) {
			for (const page of addedFile.contents.pages) {
				const cachekey = dataFile + "-" + page.name; // template_path.html + object.name
				const currentValue = hash.MD5(page); // hash.MD5(object.attributes)

				pagesToBuild.push({
					path: relatedTemplateFile.path,
					distPath: `${templateKey}/${page.name}.html`,
					data: page,
					force: true
				});
				templateCache.set(cachekey, currentValue);
			}
			continue;
		}

		// Otherwise, check if data objects have been modified
		if (oldModified != newModified) {
			for (const page of addedFile.contents.pages) {
				const cachekey = dataFile + "-" + page.name; // template_path.html + object.name
				const currentValue = hash.MD5(page); // hash.MD5(object.attributes)

				// Check cache to see if each data object has changed
				const cachedValue = templateCache.get(cachekey);
				if (currentValue != cachedValue) {
					pagesToBuild.push({
						path: relatedTemplateFile.path,
						distPath: `${templateKey}/${page.name}.html`,
						data: page,
						force: true
					});
					templateCache.set(cachekey, currentValue);
				}
			}
		}
	}

	return pagesToBuild;
}


// Run a build where we look up all file paths in the repo and build them
module.exports = async function () {
	// Get the HTML files
	let filepaths = getHTMLPages();
	for (let a = 0; a < filepaths.length; a++) {
		filepaths[a] = { path: filepaths[a], data: {} };
	}

	// Get template pages
	const templatePages = getTemplatePages();

	await build(filepaths.concat(templatePages));
}

// Only builds specified HTML files
module.exports.targets = build;

module.exports.fromIncludes = async function (filepaths) {
	// Get template pages
	const templatePages = getTemplatePages();

	let changedPagePaths = [];
	const pagepaths = getHTMLPages();

	// Check if the filepath is a page path
	for (const filepath of filepaths) {
		if (pagepaths.indexOf(filepath) === -1) {
			htmlManager.library.updateModified(filepath);
		}
	}

	// Find the page paths associated with the provided include paths
	for (const pagepath of pagepaths) {
		if (filepaths.indexOf(pagepath) != -1) {
			changedPagePaths.push({ path: pagepath, data: {} });
			continue;
		}

		const includedFiles = includeCache.get(pagepath);
		for (const filepath of filepaths) {
			if (includedFiles[filepath] != undefined) {
				changedPagePaths.push({ path: pagepath, data: {} });
				continue;
			}
		}
	}

	// Build the changed paths
	const allChangedPaths = changedPagePaths.concat(templatePages);
	if (0 < allChangedPaths.length) {
		build(allChangedPaths);
	}
}