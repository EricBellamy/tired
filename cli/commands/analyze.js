if (global.tired_config.analyze === undefined) throw new Error('tired.json must specify an "analyze" array of page paths');

const puppeteer = require("puppeteer");
const pagePictureSourceCache = (require('tired-disk-cache'))(".tired/cache/analyize/picture");

const headless = true;
const freshBuild = true;
const SIZE_CONFIG = {
	minSize: 360,
	maxSize: 2000,
	maxEager: 500,
	increase: 10
}
let browser, browserPage;

async function initPuppet() {
	let config = { headless: false };
	if (headless) config.headless = "new";
	browser = await puppeteer.launch(config);
	browserPage = await browser.pages().then(allPages => allPages[0]);
}

function generateSizeArray() {
	const sizes = [];
	for (let a = SIZE_CONFIG.minSize; a <= SIZE_CONFIG.maxSize; a += SIZE_CONFIG.increase) {
		if (a <= 360) sizes.push({ width: a, height: 640 });
		else if (a <= 700) sizes.push({ width: a, height: 800 });
		else sizes.push({ width: a, height: 885 });
	}
	return sizes;
}

async function changePageSize(size) {
	await browserPage.setViewport({ width: size.width, height: size.height });
}

async function navigate(url) {
	const nav = browserPage.waitForNavigation({ waitUntil: 'networkidle0' });
	await browserPage.goto(url);
	await nav;
}

async function getImageSizeUpdates() {
	// Get all the images
	// Check that our current size of the image is not less than the displayed resolution
	// If it is less, set to 150% of displayed resolution
	return await browserPage.evaluate(() => {
		const information = {};
		const windowHeight = window.innerHeight;

		// Get the picture information
		const pictures = document.querySelectorAll("picture[key]");
		for (const picture of pictures) {
			const key = picture.getAttribute("key");
			const bounds = picture.getBoundingClientRect();
			const imageWidth = Math.floor(bounds.width);
			const imageHeight = Math.floor(bounds.height);
			const isEager = window.scrollY + bounds.y <= windowHeight;

			// Images shouldn't have a 0 dimensions
			if (imageWidth === 0 || imageHeight === 0) continue;

			if (information[key] === undefined) {
				information[key] = {
					eager: {
						yes: 0,
						no: 0
					},
					width: imageWidth,
					height: imageHeight,
				};
			}
			if (isEager) information[key].eager.yes += 1;
			else information[key].eager.no += 1;
		}
		return information;
	});
}

function roundToNearestTen(number) {
	return Math.ceil(number / 10) * 10;
}

function generateSourceSets(sizes){
	let setInfo = {
		dimensions: { width: 0, height: 0 },
		sources: [],
		srcset: ""
	};

	let firstSource = true;
	for(const windowWidth in sizes){
		const imageWidth = sizes[windowWidth].width;
		const imageHeight = sizes[windowWidth].height;

		if(firstSource){
			firstSource = false;
			setInfo.dimensions = sizes[windowWidth];
			setInfo.sources.push(`<source srcset="{IMAGE_SRC}?width=${imageWidth * 2} 2x" type="image/{IMAGE_TYPE}">`);
		} else {
			setInfo.sources.push(`<source srcset="{IMAGE_SRC}?width=${imageWidth}, {IMAGE_SRC}?width=${imageWidth * 2} 2x" type="image/{IMAGE_TYPE}" media="(min-width: ${windowWidth}px)">`);
		}
	}
	setInfo.sources.reverse();
	setInfo.srcset = setInfo.sources.join("\n");
	delete setInfo.sources;
	return setInfo;
}

async function getImageSourceInfoForPage(SERVER_URL, pagePath, pageSizes) {
	let imageSizes = {};
	let navigated = false;
	for (const pagesize of pageSizes) {
		await changePageSize(pagesize);
		if (!navigated) {
			await navigate(SERVER_URL + pagePath);
			navigated = true;
		}

		// Get the picture image for this pagesize
		const imageSizeInfo = await getImageSizeUpdates();
		for (const imageKey in imageSizeInfo) {
			const currentImageWidth = imageSizeInfo[imageKey].width;
			if (imageSizes[imageKey] === undefined) {
				imageSizes[imageKey] = {
					width: 0,
					widths: {},
					eagers: []
				}
			}

			// Is the currentWidth * 1.02 larger than the last recorded width
			// Is the currentWidth less than 60% of the last recorded width
			if (
				(imageSizes[imageKey].width < currentImageWidth + Math.ceil(currentImageWidth * 0.02)) ||
				currentImageWidth / imageSizes[imageKey].width < 0.6
			) {
				const newDisplayWidth = roundToNearestTen(currentImageWidth * 1.25);
				imageSizes[imageKey].width = newDisplayWidth;
				imageSizes[imageKey].widths[pagesize.width] = {
					width: newDisplayWidth,
					height: (imageSizeInfo[imageKey].height / currentImageWidth) * newDisplayWidth
				};
			}

			// If we're under the max eager limit
			if (pagesize.width <= SIZE_CONFIG.maxEager) imageSizes[imageKey].eagers.push(imageSizeInfo[imageKey].eager.yes);
		}
	}

	// Create the image size cache here
	let imageCacheData = {};
	for(const imageKey in imageSizes){
		const image = imageSizes[imageKey];
		// Create the number of eager images for this page and image key
		const average = Math.ceil(image.eagers.reduce((sum, num) => sum + num, 0) / image.eagers.length);

		// Create the srcset data here
		const sourceInfo = generateSourceSets(image.widths);

		imageCacheData[imageKey] = {
			eagerNum: average,
			srcset: sourceInfo.srcset,
			dimensions: sourceInfo.dimensions
		};
	}
	return imageCacheData;
}

module.exports = async function () {
	console.time("analyze");
	const pagePaths = global.tired_config.analyze;
	const pageKeys = Object.keys(pagePaths);

	if (0 < pageKeys.length) {
		// Host the server
		const SERVER_URL = 'http://127.0.0.1:3000/';
		await require('./host.js').forTesting(3000, freshBuild);

		// Initiate puppeteer
		await initPuppet();

		pagePictureSourceCache.clear();

		// Analyze the page & set image data in cache
		const pageSizes = generateSizeArray();
		for (const pageKey of pageKeys) {
			const pagePath = pagePaths[pageKey];
			const pageSourceInfo = await getImageSourceInfoForPage(SERVER_URL, pagePath, pageSizes);
			pagePictureSourceCache.set(pageKey, pageSourceInfo);
		}

		await browser.close();

		pagePictureSourceCache.save();
	}
	console.timeEnd("analyze");
	process.exit();
}