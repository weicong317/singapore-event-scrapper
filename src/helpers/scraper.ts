import puppeteer, { Browser, Page } from "puppeteer";
import pLimit from "p-limit";
import { format, parseISO, isBefore } from "date-fns";

import { logger, saveScrapedResult } from "./";
import { Period, Event, EventGeneralInfo, EventDetailInfo } from "../entities";

const limit = pLimit(5);
const isDev = process.env.NODE_ENV === "development";

/**
 * Scrapes general information about events from the results list.
 *
 * @param page - An instance of Puppeteer's Page used to extract event details.
 *
 * @returns A promise that resolves to an array of EventGeneralInfo objects, each representing
 *          a scraped event with general details such as title, URL, category, type, and price.
 */
const scrapeEvents = async (page: Page): Promise<EventGeneralInfo[]> => {
	let events: EventGeneralInfo[] = [];

	try {
		events = await page.$$eval("div.search-results-panel-content div section ul", (uls) => {
			const targetUl = Array.from(uls).find((ul) =>
				ul.className.startsWith("SearchResultPanelContentEventCardList")
			);

			if (!targetUl) {
				return [];
			}

			const listItems = Array.from(targetUl.querySelectorAll("li"));

			return listItems
				.map((li) => {
					const detailSection = li.querySelector("section.event-card-details");

					if (!detailSection) return null;

					const anchor = detailSection.querySelector("a");
					const title = anchor?.textContent?.trim() || "";
					const url = anchor?.href || "";
					const category = anchor?.getAttribute("data-event-category") || null;
					const type = anchor?.getAttribute("data-event-paid-status") || null;

					const priceDiv = Array.from(detailSection.querySelectorAll("div")).find((div) =>
						div.className.includes("priceWrapper")
					);
					const priceText = priceDiv?.textContent?.trim() || "";
					const priceMatch = priceText.match(/[\d,.]+/);
					const priceValue = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, "")) : null;

					return {
						title,
						url,
						category,
						type,
						price: priceValue,
					};
				})
				.filter(Boolean) as Event[];
		});
	} catch (error) {
		logger.error({ error }, "Failed to scrape events");
	}

	return events;
};

/**
 * Scrapes event search results from Eventbrite Singapore for a specified period.
 *
 * This function navigates through the Eventbrite search results pages for a given period,
 * extracting general information about the events listed on those pages. It continues to
 * scrape results from subsequent pages if available, until no more pages are left.
 *
 * @param browser - An instance of Puppeteer's Browser used to open new pages.
 * @param period - The time period for which events are to be scraped (e.g., next month).
 *
 * @returns A promise that resolves to an array of EventGeneralInfo objects, each representing
 *          a scraped event with general details such as title, URL, category, type, and price.
 */
const scrapeSearchResults = async (
	browser: Browser,
	period: Period
): Promise<EventGeneralInfo[]> => {
	const events: EventGeneralInfo[] = [];
	let hasNextPage = false;
	let pageNumber = 1;

	const page = await browser.newPage();
	try {
		do {
			const url = `https://www.eventbrite.sg/d/singapore/events--${period}/?page=${pageNumber}&cur=SGD`;

			// Navigate to the page
			logger.info(`Scraping ${url}`);
			await page.goto(url, {
				waitUntil: "networkidle0",
				timeout: 60000,
			});

			// Scrape the search results
			const newEvents = await scrapeEvents(page);
			events.push(...newEvents);
			logger.info(`Scraped ${url}`);

			// Check if there is a next page
			const nextButton =
				(await page.$(
					'div.search-results-panel-content div footer ul li[data-testid="page-next-wrapper"] > button'
				)) !== null;

			if (nextButton) {
				logger.info("Next page is available");
				hasNextPage = true;
				pageNumber++;
			} else {
				logger.info("End of search results");
				hasNextPage = false;
			}
		} while (hasNextPage);
	} catch (error) {
		logger.error({ error }, "Failed to scrape search results");
	} finally {
		try {
			await page.close();
		} catch (error) {
			logger.warn({ error }, "Failed to close page");
		}
	}

	return events;
};

/**
 * Scrapes detailed information about an event from its event page on Eventbrite.
 *
 * This function navigates to the event page, extracts the event's organizer, location, and date,
 * and returns an object with the extracted information. If the event's date is past the current
 * date, the function returns null.
 *
 * @param browser - An instance of Puppeteer's Browser used to open a new page.
 * @param url - The URL of the event page to scrape.
 *
 * @returns A promise that resolves to an object with the event's organizer, location, and date, or
 *          null if the event's date is past the current date.
 */
const scrapeEventDetails = async (
	browser: Browser,
	url: string
): Promise<EventDetailInfo | null> => {
	let eventDetail: EventDetailInfo | null = null;

	const page = await browser.newPage();

	try {
		logger.info(`Scraping ${url}`);
		const response = await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
		if (response && response.status() === 404) {
			logger.info(`${url} not found`);
			return null;
		}

		// Having this button means event is expired, so no need to scrape
		const detailsButton = await page.$('button[data-testid="view-event-details-button"]');
		if (detailsButton) {
			return null;
		}

		eventDetail = await page.evaluate(() => {
			const organizerEl = document.querySelector(
				'div[data-testid="organizerBrief"] strong[class^="organizer-listing-info"]'
			);
			const organizer = organizerEl?.textContent?.trim() || null;

			const datetimeAttr = document.querySelector("time.start-date")?.getAttribute("datetime");
			const date = datetimeAttr || null;

			const locationDiv = document.querySelector("div.location-info");
			let location: string | null = null;
			if (locationDiv) {
				const mapToggle = locationDiv.querySelector(".map-button-toggle");
				if (mapToggle) mapToggle.remove();
				location = locationDiv.textContent?.trim() || null;
			}

			return {
				organizer,
				location,
				date,
			};
		});
		if (eventDetail.date) {
			const parsedDate = parseISO(eventDetail.date);
			const isPassed = isBefore(parsedDate, new Date());

			if (isPassed) return null;

			eventDetail.date = format(parsedDate, "dd-MM-yyyy") || null;
		}

		logger.info(`Scraped ${url}`);
	} catch (error) {
		logger.error({ error, url }, "Failed to scrape event details");
	} finally {
		try {
			await page.close();
		} catch (error) {
			logger.warn({ url, error }, "Failed to close page");
		}
	}

	return eventDetail;
};

const scrapeDetails = async (browser: Browser, events: EventGeneralInfo[]): Promise<Event[]> => {
	const eventsWithDetails: Event[] = [];
	logger.info("Scraping event details");
	await Promise.allSettled(
		events.map((event) =>
			limit(async () => {
				const details = await scrapeEventDetails(browser, event.url);
				if (details) {
					eventsWithDetails.push({ ...event, ...details });
				}
			})
		)
	);
	logger.info("Scraped event details");
	return eventsWithDetails;
};

/**
 * Scrapes upcoming events from Eventbrite Singapore for a specified period.
 *
 * This function launches a Puppeteer browser instance, navigates to the Eventbrite
 * website, and scrapes event data for the given period. It extracts general event
 * information and further scrapes detailed information for each event. The scraped
 * data is then output to a json.
 *
 * @param period - An optional parameter specifying the time period for which to
 *                 scrape events. Defaults to the next month.
 */
export const scrapeUpcomingEvents = async (period: Period = Period.NEXT_MONTH) => {
	logger.info(`Start scraping upcoming ${period} events from Eventbrite Singapore`);

	// Launch the browser
	const browser = await puppeteer.launch({
		headless: !isDev,
		slowMo: isDev ? 250 : undefined,
	});

	// Scrape
	const events = await scrapeSearchResults(browser, period);
	const eventsWithDetails = await scrapeDetails(browser, events);

	// Save result as json
	const folder = saveScrapedResult(eventsWithDetails);

	await browser.close();

	logger.info(`Scraped ${period} events`);

	return folder;
};
