import puppeteer from "puppeteer";

async function main() {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	await page.goto("https://books.toscrape.com");

	const titles = await page.$$eval(".product_pod h3 a", (elements) =>
		elements.map((el) => el.getAttribute("title")),
	);

	console.log("Book titles:", titles);
	await browser.close();
}

main().catch(console.error);
