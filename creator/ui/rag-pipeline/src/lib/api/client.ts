// API client for communicating with the wasmCloud API component

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export class ApiClient {
	private baseUrl: string;

	constructor(baseUrl: string = API_BASE_URL) {
		this.baseUrl = baseUrl;
	}

	async get<T>(path: string): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return response.json();
	}

	async post<T>(path: string, data: unknown): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return response.json();
	}

	async put<T>(path: string, data: unknown): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return response.json();
	}

	async delete(path: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: 'DELETE',
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
	}
}

export const apiClient = new ApiClient();
