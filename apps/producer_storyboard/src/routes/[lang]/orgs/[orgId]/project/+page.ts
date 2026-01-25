/**
 * SSR Load function for project list page
 * Uses grpc-go API instead of GraphQL
 */
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const { orgId } = params;
	
	// Debug logging helper
	const debugLog = (location: string, message: string, data: Record<string, unknown>, hypothesisId: string) => {
		const logEntry = {
			location,
			message,
			data,
			timestamp: Date.now(),
			sessionId: 'debug-session',
			runId: 'run1',
			hypothesisId,
		};
		console.log('[DEBUG]', logEntry);
		if (typeof window !== 'undefined') {
			try {
				fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(logEntry),
				}).catch(() => {});
			} catch (e) {
				// Ignore fetch errors
			}
		}
	};
	
	// #region agent log
	debugLog('[orgId]/project/+page.ts:7', 'Project page load started', { orgId }, 'E');
	// #endregion
	
	try {
		const response = await fetch('/api/projects', {
			headers: {
				'X-Org-Id': orgId,
			},
		});
		
		// #region agent log
		debugLog('[orgId]/project/+page.ts:18', 'Project API response received', { orgId, status: response.status, ok: response.ok }, 'E');
		// #endregion
		
		if (!response.ok) {
			throw new Error(`Failed to fetch projects: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		// #region agent log
		debugLog('[orgId]/project/+page.ts:28', 'Project page load successful', { orgId, projectsCount: data.projects?.length || 0 }, 'E');
		// #endregion
		
		return {
			projects: data.projects || [],
		};
	} catch (error) {
		// #region agent log
		debugLog('[orgId]/project/+page.ts:35', 'Project page load error', { orgId, error: String(error), errorName: (error as Error)?.name, errorMessage: (error as Error)?.message }, 'E');
		// #endregion
		
		console.error('[Project Load] Error:', error);
		return {
			projects: [],
		};
	}
};
