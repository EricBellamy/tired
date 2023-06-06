const regex = {
	log: /{{\s*([\s\S]*?)\s*}}/m,
	markup: /<\?\s*([\s\S]*?)\s*\?>/m
}

module.exports = function (html) {
	let evalString = `
		const node = {
			text: "",
			add: function(text){
				this.text += text;
			}
		}
		const log = function(text = ""){
			if(typeof text === 'object') text = JSON.stringify(text);
			node.add(text);
		}
		function run(){
	`;

	let matched;

	// Replace all {{ variable }} statements with log statements
	matched = html.match(regex.log);
	while (matched != null) {
		html = html.replace(matched[0], `<?log(${matched[1]})?>`);
		matched = html.match(regex.log);
	}

	// Process all javascript includes
	matched = html.match(regex.markup);
	while (matched != null) {
		// Add the before match
		const beforeMatch = html.substring(0, matched.index);
		if (0 < beforeMatch.length) evalString += `node.add(\`${beforeMatch}\`);`;

		// Add the matched
		if (0 < matched[1].length) {
			if (matched[1].slice(-1)[0] != ";") matched[1] += ";";
			evalString += matched[1];
		}

		// Delete consumed text & find the next match
		html = html.substring(matched.index + matched[0].length);
		matched = html.match(regex.markup);
	}
	if (0 < html.length) evalString += `node.add(\`${html}\`);`;
	evalString += `return node.text;}run();`;

	return evalString;
}