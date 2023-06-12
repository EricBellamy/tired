const fs = require('fs');
const path = require('path');
const colorLog = require('tired-color-log');
const getDirectoryFiles = require('tired-get-directory-files');

const getTemplateInfo = require('../lib/getTemplateInfo.js');
const htmlManager = new (require('tired-html-manager'))("includes");

function loadLogicFile(filename) {
	let logicFile;
	try {
		logicFile = require(path.join(process.cwd(), filename));
	} catch (err) {
		console.log(err);
		return false;
	}
	return logicFile;
}

module.exports = async function (filename) {
	const templateInfo = getTemplateInfo(htmlManager);
	if (filename === undefined) {
		colorLog("logic.js",
			colorLog.error("must specify \""),
			colorLog.error2("all"),
			colorLog.error("\" or a target logic filename"),
		);
	} else if (filename === "all") {
		// Load all of them first, make sure they're successful
		const loadedFiles = [];
		const logicFilePaths = getDirectoryFiles.byFileType("logic", [".js"]);
		for (const logicFilePath of logicFilePaths) {
			loadedFiles.push(loadLogicFile(logicFilePath));
		}

		// Run
		for (const loadedFile of loadedFiles) await loadedFile(templateInfo.data);

	} else {
		if (path.extname(filename) === "") filename += ".js";
		const loadedFile = loadLogicFile(`logic/${filename}`);
		if (loadedFile != false) await loadedFile(templateInfo.data);
	}
}