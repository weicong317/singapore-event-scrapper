import fs from "fs";
import path from "path";
import { format } from "date-fns";

import { Event } from "../entities";
import { saveGeneralReport, resultFilename } from "./";

export class Statistic {
	private folder: string;
	private data: Event[];
	private resultDateTime: string;
	private locations: string[];
	private typeCount: { [key: string]: number };
	private monthYearCounts: { [key: string]: number };
	private categoryCounts: { [key: string]: number };
	private organizerCounts: { [key: string]: number };

	public constructor(folder: string) {
		this.folder = folder;
		this.data = this.parseData();
		this.resultDateTime = this.convertFilenameToDateTime();
		this.locations = this.extractAllLocations();
		this.typeCount = this.extractAllTypes();
		this.monthYearCounts = this.extractEventMonthYearCounts();
		this.categoryCounts = this.extractCategoryCounts();
		this.organizerCounts = this.extractOrganizerCounts();
	}

	private parseData(): Event[] {
		const filePath = path.resolve("results", this.folder, `${resultFilename}.json`);
		const rawData = fs.readFileSync(filePath, "utf-8");
		return JSON.parse(rawData);
	}

	private convertFilenameToDateTime = () => {
		const timestamp = parseInt(this.folder, 10);
		return format(new Date(timestamp), "yyyy-MM-dd HH:mm:ss");
	};

	private extractAllLocations = () => {
		return [
			...new Set(
				this.data
					.map((event) => {
						const loc = event.location;
						if (loc?.toLowerCase().includes("singapore")) {
							return "Singapore";
						}
						return loc;
					})
					.filter(Boolean) as string[]
			),
		];
	};

	private extractAllTypes = () => {
		const typeCounts: { [key: string]: number } = {};

		this.data.forEach((event) => {
			if (event.type) {
				if (!typeCounts[event.type]) {
					typeCounts[event.type] = 0;
				}
				typeCounts[event.type]++;
			}
		});

		return typeCounts;
	};

	private extractEventMonthYearCounts = () => {
		const dateCounts: { [key: string]: number } = {};

		this.data.forEach((event) => {
			if (event.date) {
				const [, month, year] = event.date.split("-");
				const monthYear = `${year}-${month}`;

				if (!dateCounts[monthYear]) {
					dateCounts[monthYear] = 0;
				}
				dateCounts[monthYear]++;
			}
		});

		return dateCounts;
	};

	private extractCategoryCounts = () => {
		const categoryCounts: { [key: string]: number } = {};

		this.data.forEach((event) => {
			if (event.category) {
				if (!categoryCounts[event.category]) {
					categoryCounts[event.category] = 0;
				}
				categoryCounts[event.category]++;
			}
		});

		return categoryCounts;
	};

	private extractOrganizerCounts = () => {
		const organizerCounts: { [key: string]: number } = {};

		this.data.forEach((event) => {
			if (event.organizer) {
				if (!organizerCounts[event.organizer]) {
					organizerCounts[event.organizer] = 0;
				}
				organizerCounts[event.organizer]++;
			}
		});

		return organizerCounts;
	};

	public analyseResult = () => {
		const sortedMonths = Object.keys(this.monthYearCounts).sort();
		const reversedSortedCategories = Object.entries(this.categoryCounts).sort(
			(a, b) => b[1] - a[1]
		);
		const reversedSortedOrganizers = Object.entries(this.organizerCounts).sort(
			(a, b) => b[1] - a[1]
		);
		const reversedSortedPriceData = this.data
			.filter((event) => event.price != null)
			.sort((a, b) => b.price! - a.price!);

		const report = `# 📊 General Overview\n\n> Source of report was generated on **${this.resultDateTime}**, which mean any changes happened after this date time will not be reflected in this report.\n\n- Total Upcoming Events: ${this.data.length}\n- Locations (full address will be shown if not in Singapore): ${this.locations.join(", ")}\n- Types: ${Object.keys(this.typeCount).join(", ")}\n- Time Range: ${sortedMonths[0]} to ${sortedMonths[sortedMonths.length - 1]}\n\n# 🧩 Category Distribution\n\nTop 3 categories:\n\n${reversedSortedCategories
			.slice(0, 3)
			.map(
				([key, value]) =>
					`- ${key} (${value} times/${((value / this.data.length) * 100).toFixed(2)}%)`
			)
			.join("\n")}\n\nBottom 3 categories:\n\n${reversedSortedCategories
			.slice(-3)
			.map(
				([key, value]) =>
					`- ${key} (${value} times/${((value / this.data.length) * 100).toFixed(2)}%)`
			)
			.join(
				"\n"
			)}\n\n# 💵 Price Analysis\n\nTotal:\n\n- Paid event: ${this.typeCount.paid ?? 0} (${(((this.typeCount.paid ?? 0) / this.data.length) * 100).toFixed(2)}%)\n- Free event: ${this.typeCount.free ?? 0} (${(((this.typeCount.free ?? 0) / this.data.length) * 100).toFixed(2)}%)\n\nTop 3 expensive event:\n\n${reversedSortedPriceData
			.slice(0, 3)
			.map((event) => `- ${event.title} (${event.price} SGD)`)
			.join("\n")}\n\n# 📅 Date Distribution\n\n${Object.entries(this.monthYearCounts)
			.sort((a, b) => b[1] - a[1])
			.map(
				([key, value]) =>
					`- ${key} (${value} times/${((value / this.data.length) * 100).toFixed(2)}%)`
			)
			.join(
				"\n"
			)}\n\n# 👥 Organizer Distribution:\n\nTop 3 Organizers:\n\n${reversedSortedOrganizers
			.slice(0, 3)
			.map(
				([key, value]) =>
					`- ${key} (${value} times/${((value / this.data.length) * 100).toFixed(2)}%)`
			)
			.join("\n")}
`;

		// Save report as md
		saveGeneralReport(this.folder, report);
	};
}
