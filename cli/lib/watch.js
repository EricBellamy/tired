const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const debounce = require('./debounce.js');

// The changed file queue
let queues = {
	a: [],
	b: [],
	target: undefined,
	targetName: "a"
}
// Switch the queue && return old queue for processing
function switchQueue() {
	const oldTargetName = queues.targetName;

	queues.targetName = oldTargetName === "a" ? "b" : "a";
	queues.target = queues[queues.targetName];

	return queues[oldTargetName];
}

let processingStatus = false;
async function processWatch(watchCallback) {
	if (processingStatus === false) {
		processingStatus = true;
		startup = false;
		const queue = switchQueue();

		// Create a reference free copy of the queue
		const changedFiles = [];
		for (let a = 0; a < queue.length; a++) {
			if (!changedFiles.includes(queue[a])) {
				changedFiles.push(queue[a]);
				queue.splice(a, 1);
				a--;
			}
		}

		// Run the watch callback
		watchCallback(changedFiles, async function () {
			processingStatus = false;
			
			// If during the build, files were changed, process again immediately
			if (queues.target.length != 0) return await processWatch(watchCallback);

			// Trigger the live reload
			if (global.tired_config.server != undefined && global.tired_config.server.url != undefined) {
				console.log(global.tired_config.server.url);
				axios(`${global.tired_config.server.url}/__lightserver__/trigger`)
			}
		});
	}
}

const chokidar = require('chokidar');

let startup = true;
const watchDelay = 500;
module.exports = function (watchCallback) {
	const processFunc = debounce(processWatch.bind(null, watchCallback), watchDelay);

	// One-liner for current directory
	const watcher = chokidar.watch('.', {
		ignored: ['.tired', '**node_modules', '**.git', '**.DS_Store', '**.lock'], // ignore dotfiles
		persistent: true
	});
	watcher.on('all', (event, filepath) => {
		const fileExt = path.extname(filepath);
		if (startup) {
			// Ignore everything and just trigger a build() that will build all page files
			processFunc();
		} else if (fileExt.length != 0) { // Actually a file
			// Push only if new
			if (!queues.target.includes(filepath)) queues.target.push(filepath);

			// Process if not already processing
			if (processingStatus === false) processFunc();
		}
	});
}