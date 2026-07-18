import {isDeepStrictEqual} from 'node:util';
import process from 'node:process';
import {launch, type Browser, type Page} from 'puppeteer';
import {delay} from 'unicorn-magic';
import {type SpeedData, type SpeedUnit} from './types.js';

type Options = {
	measureUpload?: boolean;
};

async function * monitorSpeed(page: Page, options?: Options): AsyncGenerator<SpeedData, void, undefined> {
	let previousResult: SpeedData | undefined;

	while (true) {
		// eslint-disable-next-line no-await-in-loop, @typescript-eslint/no-loop-func
		const result = await page.evaluate(() => {
			const $ = document.querySelector.bind(document);

			return {
				downloadSpeed: Number($('#speed-value')?.textContent) || 0,
				uploadSpeed: Number($('#upload-value')?.textContent) || 0,
				downloadUnit: ($('#speed-units')?.textContent?.trim() ?? 'Mbps') as SpeedUnit,
				downloaded: Number($('#down-mb-value')?.textContent?.trim()) || 0,
				uploadUnit: ($('#upload-units')?.textContent?.trim() ?? 'Mbps') as SpeedUnit,
				uploaded: Number($('#up-mb-value')?.textContent?.trim()) || 0,
				latency: Number($('#latency-value')?.textContent?.trim()) || 0,
				bufferBloat: Number($('#bufferbloat-value')?.textContent?.trim()) || 0,
				userLocation: $('#user-location')?.textContent?.trim() ?? '',
				serverLocations: $('#server-locations')?.textContent?.split('|').map(location => location.trim()).filter(Boolean) ?? [],
				userIp: $('#user-ip')?.textContent?.trim() ?? '',
				isDone: Boolean($('#speed-value.succeeded') && $('#upload-value.succeeded')),
			};
		});

		if (result.downloadSpeed > 0 && !isDeepStrictEqual(result, previousResult)) {
			yield result;
		}

		if (result.isDone || (options && !options.measureUpload && result.uploadSpeed)) {
			return;
		}

		previousResult = result;

		// eslint-disable-next-line no-await-in-loop
		await delay({seconds: 0.1});
	}
}

async function createPage(browser: Browser): Promise<Page> {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			// eslint-disable-next-line no-await-in-loop
			return await browser.newPage();
		} catch (error: unknown) {
			if (attempt === 2) {
				throw error;
			}

			// Chromium can expose its DevTools connection before a new page target is ready on ARMv7.
			// eslint-disable-next-line no-await-in-loop
			await delay({seconds: 1});
		}
	}

	throw new Error('Chromium did not create a page.');
}

export default async function * api(options?: Options): AsyncGenerator<SpeedData, void, undefined> {
	const browser = await launch({
		executablePath: process.env['PUPPETEER_EXECUTABLE_PATH'],
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-dev-shm-usage',
			'--disable-gpu',
			'--no-zygote',
			'--single-process',
			'--ignore-certificate-errors',
		],
		headless: true,
	});

	try {
		// Chromium needs a moment to finish creating page targets on slower ARM devices.
		await delay({seconds: 1});
		const page = await createPage(browser);
		await page.goto('https://fast.com');

		for await (const result of monitorSpeed(page, options)) {
			yield result;
		}
	} finally {
		await browser.close();
	}
}
