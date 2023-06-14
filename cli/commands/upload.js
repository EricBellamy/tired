const fs = require('fs-extra');
const getDirectoryFiles = require('tired-get-directory-files');
const colorLog = require('tired-color-log');

const bunnyCache = (require('tired-disk-cache'))(".tired/cache/bunnycdn");

const env = require('../env.js');
const BunnyCDN = require('../lib/bunnycdn.js');

// Attempt to load the user config
if (global.tired_config.cdn === undefined) throw new Error('tired.json must specify a "cdn" object');
else if (global.tired_config.cdn.website === undefined) throw new Error('tired.json "cdn" must specify a "website" object');
else if (global.tired_config.cdn.website.username === undefined) throw new Error('tired.json "cdn.website" must specify a "username" string');
else if (global.tired_config.cdn.website.key === undefined) throw new Error('tired.json "cdn.website" must specify a "key" string');

const imageUploader = new BunnyCDN(env.cdn.image.key, env.cdn.image.username, env.cdn.image.cdn_id, env.cdn.account_key);
const websiteUploader = new BunnyCDN(global.tired_config.cdn.website.key, global.tired_config.cdn.website.username, global.tired_config.cdn.website.cdn_id, global.tired_config.cdn.account_key);

const BUNNY_CONCURRENCY = 10;
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
	let updatedCount = 0;

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
				updatedCount++;
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

	return updatedCount;
}

async function uploadIncludesImages() {
	let updatedCount = 0;

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
		const uploadFilePath = `${global.tired_config.name}/${relativePath}`;

		// bunnyCache.remove(filepath);

		promises.push(deployFile(imageUploader, filepath, uploadFilePath, {
			success: function () {
				updatedCount++;
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

	return updatedCount;
}

async function uploadSitemapFile() {
	let updatedCount = 0;

	const filepath = ".tired/dist/sitemap.txt";
	await deployFile(websiteUploader, filepath, "sitemap.txt", {
		success: function () {
			updatedCount++;
			colorLog("deploy.js",
				colorLog.normal("Uploaded dist file "),
				colorLog.normal2(filepath)
			);
		},
		failure: function () {
			// Remove cache for next build
			bunnyCache.remove(filepath);
			colorLog("deploy.js",
				colorLog.normal("Failed to upload dist file "),
				colorLog.normal2(filepath)
			);
		}
	});

	return updatedCount;
}

async function uploadConfigFiles() {
	let updatedCount = 0;

	if (global.tired_config.upload != undefined) {
		for (const filepath of global.tired_config.upload) {
			await deployFile(websiteUploader, filepath, filepath, {
				success: function () {
					updatedCount++;
					colorLog("deploy.js",
						colorLog.normal("Uploaded tired.json \"upload\" file "),
						colorLog.normal2(filepath)
					);
				},
				failure: function () {
					// Remove cache for next build
					bunnyCache.remove(filepath);
					colorLog("deploy.js",
						colorLog.normal("Failed to upload tired.json \"upload\" file "),
						colorLog.normal2(filepath)
					);
				}
			})
		}
	}

	return updatedCount;
}

// Integrate bunnycdn cache into every file upload
module.exports = async function (purgeWebsiteCache = true) {
	console.time("upload");

	let updatedWebsiteCount = 0;

	// Upload /exports files
	updatedWebsiteCount += await uploadExportFiles();
	bunnyCache.save();

	// Upload /includes jpg & png
	let updatedImageCount = await uploadIncludesImages();
	bunnyCache.save();

	// Upload .tired/dist/sitemap.txt
	updatedWebsiteCount += await uploadSitemapFile();
	bunnyCache.save();

	// Upload tired.json "upload" files
	updatedWebsiteCount += await uploadConfigFiles();
	bunnyCache.save();

	if(0 < updatedImageCount) imageUploader.purge();
	if(purgeWebsiteCache && 0 < updatedWebsiteCount) websiteUploader.purge();

	console.timeEnd("upload");

	return updatedWebsiteCount;
}