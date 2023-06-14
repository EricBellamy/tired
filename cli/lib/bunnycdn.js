const fs = require('fs');
const axios = require("axios");

const bunnyCache = (require('tired-disk-cache'))(".tired/cache/bunnycdn");

class Uploader {
	API_KEY;
	STORAGE_NAME;
	CDN_ID;
	ACCOUNT_KEY;
	constructor(API_KEY, STORAGE_NAME, CDN_ID, ACCOUNT_KEY) {
		this.API_KEY = API_KEY;
		this.STORAGE_NAME = STORAGE_NAME;
		this.CDN_ID = CDN_ID;
		this.ACCOUNT_KEY = ACCOUNT_KEY;

		this.init();
	}
	init() {
		const baseURL = `https://storage.bunnycdn.com`;
		this.client = axios.create({
			baseURL: `${baseURL}/${this.STORAGE_NAME}/`,
			headers: {
				AccessKey: this.API_KEY
			},
			maxContentLength: Infinity,
			maxBodyLength: Infinity
		});

		if (this.CDN_ID != undefined) {
			this.purgeClient = axios.create({
				baseURL: `https://api.bunny.net/pullzone/${this.CDN_ID}/purgeCache`,
				headers: {
					AccessKey: this.ACCOUNT_KEY,
					"content-type": "application/json"
				},
				maxContentLength: Infinity,
				maxBodyLength: Infinity
			});
		}
	}
	async purge() {
		try {
			const response = await this.purgeClient({
				method: 'POST'
			});

			if (response.status === 204) return { status: true };
			return { status: false };

		} catch (err) {
			console.log(err);
			return { status: false };
		}
	}
	async uploadData(data, UPLOAD_FILE_PATH) {
		try {
			if (UPLOAD_FILE_PATH[0] != "/") UPLOAD_FILE_PATH = "/" + UPLOAD_FILE_PATH;
			const response = await this.client({
				method: 'PUT',
				url: UPLOAD_FILE_PATH,
				data: data
			});

			if (response.status === 201) return { status: true, cache: false };
			return { status: false };

		} catch (err) {
			console.log(err);
			return { status: false };
		}
	}
	async uploadFile(INPUT_FILE_PATH, UPLOAD_FILE_PATH) {
		try {
			const modified = fs.lstatSync(INPUT_FILE_PATH).mtimeMs;
			const cachedModified = bunnyCache.get(INPUT_FILE_PATH);

			if (modified != cachedModified) {
				const file = fs.createReadStream(INPUT_FILE_PATH);
				const uploadResponse = await this.uploadData(file, UPLOAD_FILE_PATH);
				if (uploadResponse.status) bunnyCache.set(INPUT_FILE_PATH, modified);
				return uploadResponse;
			} else return { status: true, cache: true };
		} catch (err) {
			console.log(err);
			return { status: false };
		}
	}
}

module.exports = Uploader;