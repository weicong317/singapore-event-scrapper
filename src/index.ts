import { logger, scrapeUpcomingEvents, Statistic } from "./helpers";
import { Period } from "./entities";

const main = async () => {
	try {
		// Change the period if needed
		const folder = await scrapeUpcomingEvents(Period.NEXT_MONTH);
		new Statistic(folder).analyseResult();
	} catch (error) {
		logger.error({ error }, "Failed to scrape");
	}
};

main();
