// Change the name of this to build.js after

const fs = require('fs-extra');
const path = require('path');
const colorLog = require('tired-color-log');
const getDirectoryFiles = require('tired-get-directory-files');

const htmlManager = new (require('tired-html-manager'))("include");
const includeCache = (require('tired-disk-cache'))(".tired/cache/includes");
const modifiedCache = (require('tired-disk-cache'))(".tired/cache/library/modified");

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

function buildFilepath(filepath, index, max) {
	colorLog("host.js",
		colorLog.normal(`[${index}/${max}] (`),
		colorLog.normal2(colorLog.percentage(index, max)),
		colorLog.normal(") "),
		colorLog.normal("Building page "),
		colorLog.normal2(filepath)
	);
	const file = htmlManager.loadFile(filepath, {
		title: "Test title here",
	}, {
		holiday: {
			pages: []
		}
	});

	// Write the compiled file to dist
	let distFilePath = filepath;
	if (filepath.indexOf("pages/") === 0) distFilePath = distFilePath.substring("pages/".length);
	distFilePath = `.tired/dist/${distFilePath}`;
	fs.ensureDirSync(path.dirname(distFilePath));
	fs.writeFileSync(distFilePath, file.toString());
}

let promiseConcurrency = 10;
async function buildFilepaths(filepaths) {
	let modifiedFilepaths = [];
	for (const filepath of filepaths) {
		if (fileInStructureWasModified(filepath)) modifiedFilepaths.push(filepath);
	}

	if (0 < modifiedFilepaths.length) {
		colorLog("host.js", colorLog.normal("Building "), colorLog.normal2(modifiedFilepaths.length), colorLog.normal(" pages..."));
		let filepath;
		const modifiedFileLen = modifiedFilepaths.length;
		let promises = [];
		for (let a = 0; a < modifiedFileLen; a++) {
			promises.push(new Promise(resolve => {
				filepath = modifiedFilepaths[a];
				buildFilepath(filepath, a + 1, modifiedFileLen);
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

// Run a build where we look up all file paths in the repo and build them
module.exports = async function () {
	// Get the HTML files
	const filepaths = getHTMLPages();
	await build(filepaths);
}

// Only builds specified HTML files
module.exports.targets = build;

module.exports.fromIncludes = async function (filepaths) {
	let changedPagePaths = [];
	const pagepaths = getHTMLPages();

	for (const filepath of filepaths) {
		if(pagepaths.indexOf(filepath) === -1){
			htmlManager.library.updateModified(filepath);
		}
	}

	for (const pagepath of pagepaths) {
		if (filepaths.indexOf(pagepath) != -1) {
			changedPagePaths.push(pagepath);
			continue;
		}

		const includedFiles = includeCache.get(pagepath);
		for (const filepath of filepaths) {
			if (includedFiles[filepath] != undefined) {
				changedPagePaths.push(pagepath);
				continue;
			}
		}
	}


	if (0 < changedPagePaths.length) {
		build(changedPagePaths);
	}
}