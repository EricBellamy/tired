const fs = require('fs');

const pictureCache = (require('tired-disk-cache'))(".tired/cache/picture");
const pagePictureSourceCache = (require('tired-disk-cache'))(".tired/cache/analyize/picture");

const formatAttributes = require('tired-format-attributes');
const getFileType = require('tired-get-file-type');

function getSourceData(cachekey, attributeKey) {
	if (attributeKey === undefined && !pagePictureSourceCache.has(cachekey)) return;

	const sourceCache = pagePictureSourceCache.get(cachekey);
	if (sourceCache === undefined) return;
	else return sourceCache[attributeKey];
}

module.exports = {
	contents: false,
	preprocess: function (contents) {
		return "";
	},
	element: function (cachekey, path, attributes, contents, appearanceNum) {
		// console.log(cachekey);
		// setInfo.sources.push(`<img src="{IMAGE_SRC}" ${sourceAttributes}${imgLoadingString} width="${filePaths.sizeOf.width}" height="${imageHeight}">`);

		// cachekey --> index.html
		const combinedKey = pictureCache.key(cachekey, path, JSON.stringify(attributes.attr));
		const cacheItem = pictureCache.get(combinedKey);

		// Get the picture size cache and somehow check that the sizes cached for this item are the same as the sizes we most recently analyzed
		if (cacheItem != undefined) {
			return cacheItem.element;
		} else {
			// console.log(attributes);
			const relatedSourceData = getSourceData(cachekey, attributes.attr.key);

			// id="${attributes.attr.id}"
			if (path[0] != "/") path = "/" + path;
			if (path.indexOf("/includes") === 0) path = "/" + global.tired_config.name + path.substring("/includes".length);
			path = process.env.BASE_IMAGE_PATH + path;

			const imgAttributes = {
				src: path,
				alt: attributes.attr.alt
			}

			let loadingInfo = {
				eager: false,
				string: `decoding="async" `
			}
			if (attributes.attr.eager != undefined) {
				loadingInfo.eager = true;
				loadingInfo.string += `loading="eager"`;
			}

			let sourceTagString = '';
			if (relatedSourceData) {
				imgAttributes.width = relatedSourceData.dimensions.width;
				imgAttributes.height = relatedSourceData.dimensions.height;
				imgAttributes.src += `?width=${imgAttributes.width}`;

				// Replace the image src & type
				let relatedSourceTag = relatedSourceData.srcset.replaceAll("{IMAGE_SRC}", path);
				relatedSourceTag = relatedSourceTag.replaceAll("{IMAGE_TYPE}", getFileType.nodot(path));
				sourceTagString += relatedSourceTag;

				// If the element isn't forcefully eager, and we've seen this element less than the analyzed allowed eager number
				if (loadingInfo.eager === false && appearanceNum < relatedSourceData.eagerNum) {
					loadingInfo.eager = true;
					loadingInfo.string += `loading="eager"`;
				}
			} else {
				if (attributes.attr.width != undefined) {
					imgAttributes.width = attributes.attr.width;
					sourceTagString += `<source srcset="${path}?width=${imgAttributes.width} 2x" type="image/${getFileType.nodot(path)}">`;
				}
				if (attributes.attr.height != undefined) {
					imgAttributes.height = attributes.attr.height;
					if (attributes.attr.width === undefined) sourceTagString += `<source srcset="${path}?height=${imgAttributes.height} 2x" type="image/${getFileType.nodot(path)}">`;
				}
			}

			if (loadingInfo.eager === false) loadingInfo.string += `loading="lazy"`;


			const newCacheItem = `<picture ${formatAttributes(attributes.attr, ["src", "alt", "width", "height"])}>
				${sourceTagString}
				<img ${formatAttributes(imgAttributes)} ${loadingInfo.string}>
			</picture>`;
			pictureCache.set(combinedKey, {
				sizes: "",
				element: newCacheItem
			});
			return newCacheItem;
		}
	}
}