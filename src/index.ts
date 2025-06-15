import { logger, scrapeUpcomingEvents, Statistic } from "./helpers";
import { Period } from "./entities";

const main = async () => {
	try {
		const folder = await scrapeUpcomingEvents(Period.TOMORROW);
		new Statistic(folder).analyseResult();
	} catch (error) {
		logger.error({ error }, "Failed to scrape");
	}
};

main();
