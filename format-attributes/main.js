module.exports = function (attributes, ignore = []) {
	if (typeof ignore === 'string') ignore = [ignore];

	let attributeString = "";
	const keys = Object.keys(attributes);

	// Move keys with no values like <svg lazy > to the front for visibility in the html output
	keys.sort((a, b) => {
		if (attributes[a].length < attributes[b].length) return -1;
	});

	// Build the attribute string
	for (const key of keys) {
		if (ignore.includes(key)) continue;

		attributeString += key;
		if (attributes[key] != '') attributeString += `="${attributes[key]}" `;
		else attributeString += ' ';
	}
	attributeString = attributeString.trim();
	return attributeString;
}

module.exports.specific = function (attributes, targets = []) {
	let attributeString = "";
	for (const target of targets) {
		if (attributes[target] != undefined) attributeString += `${target}="${attributes[target]}" `;
	}

	attributeString = attributeString.trim();
	return attributeString;
}