const fs = require('fs-extra');
const getDirectoryFiles = require('tired-get-directory-files');
const colorLog = require('tired-color-log');

const bunnyCache = (require('tired-disk-cache'))(".tired/cache/bunnycdn");

const env = require('../env.js');
const BunnyCDN = require('../lib/bunnycdn.js');

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

const BUNNY_CONCURRENCY = 5;
async function waitForPromises(promises, concurrency) {
	if (concurrency === undefined) {
		if (0 < promises.length) {
			await Promise.all(promises);
			return [];
		}
	} else if (concurrency <= promises.length) {
		await Promise.all(promises);
		return [];
	}
	return promises;
}

async function deployFile(uploader, INPUT_PATH, OUTPUT_PATH, callbacks) {
	const response = await uploader.uploadFile(INPUT_PATH, OUTPUT_PATH);
	if (response.status === true) {
		if (response.cache != true && callbacks.success) callbacks.success();
	} else if (callbacks.failure) callbacks.failure();
}

async function uploadExportFiles() {
	let promises = [];
	const FOLDER_PATH = "exports";
	// Get all files in the .tired/dist directory
	const uploadFilepaths = getDirectoryFiles(FOLDER_PATH, [".DS_Store"]);
	const maxLen = uploadFilepaths.length;
	for (let a = 0; a < maxLen; a++) {
		const filepath = uploadFilepaths[a];
		const relativePath = filepath.substring(FOLDER_PATH.length + 1);
		const uploadFilePath = `exports/${relativePath}`;

		promises.push(deployFile(websiteUploader, filepath, uploadFilePath, {
			success: function () {
				colorLog("deploy.js",
					colorLog.normal(`[${a + 1}/${maxLen}] (`),
					colorLog.normal2(colorLog.percentage(a + 1, maxLen)),
					colorLog.normal(") "),
					colorLog.normal("Uploaded exports file "),
					colorLog.normal2(relativePath)
				);
			},
			failure: function () {
				// Remove cache for next build
				bunnyCache.remove(filepath);
				colorLog("deploy.js",
					colorLog.normal(`[${a + 1}/${maxLen}] (`),
					colorLog.normal2(colorLog.percentage(a + 1, maxLen)),
					colorLog.normal(") "),
					colorLog.normal("Failed to upload exports file "),
					colorLog.normal2(relativePath)
				);
			}
		}));
		promises = await waitForPromises(promises, BUNNY_CONCURRENCY);
	}
	promises = await waitForPromises(promises);
}

async function uploadIncludesImages() {
	let promises = [];
	const FOLDER_PATH = "includes";
	// Get all files in the .tired/dist directory
	const jpgImages = getDirectoryFiles.byFileType(FOLDER_PATH + "/jpg", [".jpg", ".jpeg"]);
	const pngImages = getDirectoryFiles.byFileType(FOLDER_PATH + "/png", [".png"]);

	const uploadFilepaths = jpgImages.concat(pngImages);
	const maxLen = uploadFilepaths.length;
	for (let a = 0; a < maxLen; a++) {
		const filepath = uploadFilepaths[a];
		const relativePath = filepath.substring(FOLDER_PATH.length + 1);
		const uploadFilePath = `${userEnv.name}/${relativePath}`;

		// bunnyCache.remove(filepath);

		promises.push(deployFile(imageUploader, filepath, uploadFilePath, {
			success: function () {
				colorLog("deploy.js",
					colorLog.normal(`[${a + 1}/${maxLen}] (`),
					colorLog.normal2(colorLog.percentage(a + 1, maxLen)),
					colorLog.normal(") "),
					colorLog.normal("Uploaded includes file "),
					colorLog.normal2(relativePath)
				);
			},
			failure: function () {
				// Remove cache for next build
				bunnyCache.remove(filepath);
				colorLog("deploy.js",
					colorLog.normal(`[${a + 1}/${maxLen}] (`),
					colorLog.normal2(colorLog.percentage(a + 1, maxLen)),
					colorLog.normal(") "),
					colorLog.normal("Failed to upload includes file "),
					colorLog.normal2(relativePath)
				);
			}
		}));
		promises = await waitForPromises(promises, BUNNY_CONCURRENCY);
	}
	promises = await waitForPromises(promises);
}

// Integrate bunnycdn cache into every file upload
module.exports = async function () {
	console.time("upload");

	// Upload /exports files
	await uploadExportFiles();
	bunnyCache.save();

	// Upload /includes jpg & png
	await uploadIncludesImages();
	bunnyCache.save();

	console.timeEnd("upload");
}