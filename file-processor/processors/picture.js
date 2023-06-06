const pictureCache = (require('tired-disk-cache'))(".tired/cache/picture");
const pictureSizeCache = (require('tired-disk-cache'))(".tired/cache/analyize/picture");

const formatAttributes = require('tired-format-attributes');

module.exports = {
	contents: false,
	preprocess: function (contents) {
		return "";
	},
	element: function (cachekey, path, attributes, contents) {
		const combinedKey = pictureCache.key(cachekey, path, JSON.stringify(attributes));
		const cacheItem = pictureCache.get(combinedKey);
		// pictureSizeCache.get(combinedKey)
		// Get the picture size cache and somehow check that the sizes cached for this item are the same as the sizes we most recently analyzed
		if (cacheItem != undefined) {
			return cacheItem.element;
		} else {
			// id="${attributes.attr.id}"
			if(path[0] != "/") path = "/" + path;
			path = process.env.BASE_IMAGE_PATH + path;

			const newCacheItem = `<picture ${formatAttributes(attributes.attr, ["src", "alt"])}>
			<img src="${path}" alt="${attributes.attr.alt}" loading="lazy" decoding="async">
			</picture>`;
			pictureCache.set(combinedKey, {
				sizes: "",
				element: newCacheItem
			});
			return newCacheItem;
		}
	}
}