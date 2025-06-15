import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import Papa from "papaparse";

import { Event } from "../entities";
import { logger } from "./";

export const resultFilename = "results";

const generateResultDir = (folder: string) => {
	const dir = path.resolve(process.cwd(), "results", folder);
	if (!existsSync(dir)) {
		logger.info("Creating result directory");
		mkdirSync(dir, { recursive: true });
	}
	return dir;
};

export const saveScrapedResult = (eventsWithDetails: Event[]) => {
	const folder = Date.now().toString();
	const dir = generateResultDir(folder);
	logger.info({ folder }, "Saving result");
	saveJson(dir, `${resultFilename}.json`, eventsWithDetails);
	saveCSV(dir, `${resultFilename}.csv`, eventsWithDetails);
	logger.info("Saved result");
	return folder;
};

export const saveGeneralReport = (folder: string, markdownText: string) => {
	const dir = generateResultDir(folder);
	logger.info({ folder }, "Saving report");
	saveMarkdown(dir, "report.md", markdownText);
	logger.info("Saved report");
};

const saveJson = (dir: string, fileName: string, eventsWithDetails: Event[]) => {
	const savePath = path.join(dir, fileName);
	writeFileSync(savePath, JSON.stringify(eventsWithDetails, null, 2), "utf-8");
};

const saveCSV = (dir: string, fileName: string, eventsWithDetails: Event[]) => {
	const csv = Papa.unparse(eventsWithDetails);
	const savePath = path.join(dir, fileName);
	writeFileSync(savePath, csv, "utf-8");
};

const saveMarkdown = (dir: string, fileName: string, markdownText: string) => {
	const savePath = path.join(dir, fileName);
	writeFileSync(savePath, markdownText, "utf-8");
};
