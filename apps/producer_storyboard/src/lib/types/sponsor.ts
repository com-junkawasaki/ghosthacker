export type SponsorStatus = 
	| 'prospect'
	| 'contacted'
	| 'negotiating'
	| 'approved'
	| 'rejected';

export type SponsorEventType =
	| 'contact'
	| 'meeting'
	| 'proposal'
	| 'response'
	| 'status_change';

export type SponsorPostVisibility = 'public' | 'org' | 'private';

export interface Sponsor {
	id: string;
	orgId: string;
	projectId?: string;
	name: string;
	industry?: string;
	contactEmail?: string;
	contactPhone?: string;
	website?: string;
	address?: string;
	budgetMin?: string;
	budgetMax?: string;
	preferences?: Record<string, string>;
	status: SponsorStatus;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface SponsorContact {
	id: string;
	sponsorId: string;
	contactName: string;
	role?: string;
	email?: string;
	phone?: string;
	isPrimary: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface SponsorHistory {
	id: string;
	sponsorId: string;
	eventType: SponsorEventType;
	eventDate: string;
	description?: string;
	metadata?: Record<string, string>;
	createdAt: string;
}

export interface SponsorPost {
	id: string;
	orgId: string;
	sponsorId: string;
	title: string;
	content: string;
	visibility: SponsorPostVisibility;
	postedAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateSponsorRequest {
	orgId: string;
	projectId?: string;
	name: string;
	industry?: string;
	contactEmail?: string;
	contactPhone?: string;
	website?: string;
	address?: string;
	budgetMin?: string;
	budgetMax?: string;
	preferences?: Record<string, string>;
	notes?: string;
}

export interface UpdateSponsorRequest {
	sponsorId: string;
	name?: string;
	industry?: string;
	contactEmail?: string;
	contactPhone?: string;
	website?: string;
	address?: string;
	budgetMin?: string;
	budgetMax?: string;
	preferences?: Record<string, string>;
	status?: SponsorStatus;
	notes?: string;
}

export interface CreateSponsorContactRequest {
	sponsorId: string;
	contactName: string;
	role?: string;
	email?: string;
	phone?: string;
	isPrimary: boolean;
}

export interface CreateSponsorHistoryRequest {
	sponsorId: string;
	eventType: SponsorEventType;
	eventDate?: string;
	description?: string;
	metadata?: Record<string, string>;
}

export interface ContactSponsorRequest {
	sponsorId: string;
	contactMethod: string;
	description: string;
	contactDate?: string;
	metadata?: Record<string, string>;
}

export interface CreateSponsorPostRequest {
	orgId: string;
	sponsorId: string;
	title: string;
	content: string;
	visibility: SponsorPostVisibility;
}
