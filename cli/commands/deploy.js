const fs = require('fs-extra');
const getDirectoryFiles = require('tired-get-directory-files');
const colorLog = require('tired-color-log');

const bunnyCache = (require('tired-disk-cache'))(".tired/cache/bunnycdn");

const env = require('../env.js');
const BunnyCDN = require('../lib/bunnycdn.js');
const uploadCommand = require('./upload.js');

// Attempt to load the user config
let userEnv = {};
try {
	userEnv = JSON.parse(fs.readFileSync('tired.json'));

	if (userEnv.name === undefined) throw new Error('tired.json must specify a "name" object');
	else if (userEnv.cdn === undefined) throw new Error('tired.json must specify a "cdn" object');
	else if (userEnv.cdn.website === undefined) throw new Error('tired.json "cdn" must specify a "website" object');
	else if (userEnv.cdn.website.username === undefined) throw new Error('tired.json "cdn.website" must specify a "username" string');
	else if (userEnv.cdn.website.key === undefined) throw new Error('tired.json "cdn.website" must specify a "key" string');
} catch (err) {
	throw new Error(err);
}

const imageUploader = new BunnyCDN(env.cdn.image.key, env.cdn.image.username);
const websiteUploader = new BunnyCDN(userEnv.cdn.website.key, userEnv.cdn.website.username);

const DIST_PATH = ".tired/dist";
const uploadConcurrency = 5;

async function waitForPromises(promises, concurrency) {
	if (concurrency === undefined) {
		if (0 < promises.length) {
			await Promise.all(promises);
			return [];
		}
	} else if (concurrency < promises.length) {
		await Promise.all(promises);
		return [];
	}
	return promises;
}

// Deploy .tired/dist HTML files to BunnyCDN
async function deployFile(uploader, INPUT_PATH, OUTPUT_PATH, callbacks) {
	const response = await uploader.uploadFile(INPUT_PATH, OUTPUT_PATH);
	if (response.status === true) {
		if (response.cache != true && callbacks.success) callbacks.success();
	} else if (callbacks.failure) callbacks.failure();
}

async function uploadHTMLPages() {
	let promises = [];
	// Get all files in the .tired/dist directory
	const distFilepaths = getDirectoryFiles.byFileType(DIST_PATH, [".html"]);
	const maxLen = distFilepaths.length;
	for (let a = 0; a < maxLen; a++) {
		const filepath = distFilepaths[a];
		const relativePath = filepath.substring(DIST_PATH.length + 1, filepath.lastIndexOf(".html"));
		let bunnycdnPath;
		if(relativePath === "index") bunnycdnPath = "index.html";
		else bunnycdnPath = relativePath + "/index.html";

		// bunnyCache.remove(filepath);

		promises.push(deployFile(websiteUploader, filepath, bunnycdnPath, {
			success: function () {
				colorLog("deploy.js",
					colorLog.normal(`[${a + 1}/${maxLen}] (`),
					colorLog.normal2(colorLog.percentage(a + 1, maxLen)),
					colorLog.normal(") "),
					colorLog.normal("Uploaded HTML page "),
					colorLog.normal2(relativePath + ".html")
				);
			},
			failure: function () {
				// Remove cache for next build
				bunnyCache.remove(filepath);
				colorLog("deploy.js",
					colorLog.normal(`[${a + 1}/${maxLen}] (`),
					colorLog.normal2(colorLog.percentage(a + 1, maxLen)),
					colorLog.normal(") "),
					colorLog.normal("Failed to upload HTML page "),
					colorLog.normal2(relativePath + ".html")
				);
			}
		}));
		promises = await waitForPromises(promises, uploadConcurrency);
	}
	promises = await waitForPromises(promises);
}

// Integrate bunnycdn cache into every file upload
module.exports = async function () {
	console.time("deploy");
	// bunnyCache.clear();

	await uploadHTMLPages();
	bunnyCache.save();

	// Upload /exports files
	// Upload /includes jpg & png
	await uploadCommand();

	console.timeEnd("deploy");
}