# Singapore Event Scrapper

Scrapes upcoming physical and online events happening in Singapore (by default next month) from Eventbrite Singapore and outputs structured event data for further analysis or integration.

## 🧭 Features

- Crawls Eventbrite Singapore for events.
- Detects both physical (in-person) and online events.
- Cleans and transforms coverage, formatting date, time, price, etc.
- Outputs structured JSON and CSV files for easy consumption.
- Generates a simple and brief report in markdown format for easy understanding before the need of diving into the data.

## 🔧 Installation

```bash
git clone https://github.com/weicong317/singapore-event-scrapper.git
cd singapore-event-scrapper
npm install
```

## ⚙️ Configuration

No manual configuration is needed for basic usage. By default, the scraper fetches events happening in next month.

If you wish to change the scraping date range (e.g., to just this week), you can modify the following line:

```ts
// src/index.ts, around line 6
const folder = await scrapeUpcomingEvents(Period.NEXT_MONTH); // change this period value as needed
```

## 🚀 Usage

### Run the scraper

```bash
npm run build
npm run start
```

Or directly with `ts-node` (development mode):

```bash
npm run dev
```

## 🗂️ Output

Scraped data will be saved in a subfolder under the `results/` directory. The subfolder is named using the current epoch timestamp at runtime, ensuring unique results for each run.

For example:

```
results/1749965521840/
```

Inside this folder, three files will be generated:

- `results.json` — Structured event data in JSON format, easy to use programmatically.
- `results.csv` — Same data in CSV format, suitable for Excel or Google Sheets.
- `report.md` — A human-readable markdown summary report of the scraping session (e.g., event counts, categories, price).

> Both the `results/` folder and the timestamped subfolder will be automatically created if they don’t already exist.

### Example JSON:

```json
[
	{
		"title": "In Song '25",
		"url": "https://www.eventbrite.sg/e/...",
		"category": "music",
		"type": "paid",
		"price": 24,
		"organizer": "Victoria Chorale",
		"location": "Victoria Concert Hall 11 Empress Place ##01-02 Singapore, 179558 Singapore",
		"date": "12-07-2025"
	}
]
```

## 🧩 How it works

1. **Scrape**: Launches a headless browser using `puppeteer` to scrape Eventbrite's search result pages.
2. **Normalize**: Extracts essential fields from each event (e.g. title, category, date, location, price, organizer, etc.).
3. **Transform**: Uses `date-fns` to format and convert date/time fields as needed.
4. **Serialize**:
   - Saves results as both `JSON` and `CSV` using `fs` and `papaparse`.
   - Generates a concise Markdown report (`report.md`) with brief summary statistics and key insights.

## ✅ Prerequisites

- Node.js
- npm
- Internet access

## 📄 License

MIT License – See [LICENSE](LICENSE) for details.
