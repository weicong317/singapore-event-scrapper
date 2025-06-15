export enum Period {
	TOMORROW = "tomorrow",
	THIS_WEEKEND = "this-weekend",
	THIS_WEEK = "this-week",
	NEXT_WEEK = "next-week",
	THIS_MONTH = "this-month",
	NEXT_MONTH = "next-month",
}

export interface Event extends EventGeneralInfo, EventDetailInfo {}

export interface EventGeneralInfo {
	title: string;
	url: string;
	category: string | null;
	type: string | null;
	price: number | null;
}

export interface EventDetailInfo {
	organizer: string | null;
	location: string | null;
	date: string | null;
}
