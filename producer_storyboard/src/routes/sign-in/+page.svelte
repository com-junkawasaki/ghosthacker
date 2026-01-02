<script lang="ts">
	import { SignIn, SignedOut, SignedIn, useClerkContext } from 'svelte-clerk';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	
	// Debug logging helper - works in both dev and production
	const debugLog = (location: string, message: string, data: Record<string, unknown>, hypothesisId: string) => {
		const logEntry = {
			location,
			message,
			data,
			timestamp: Date.now(),
			sessionId: 'debug-session',
			runId: 'run1',
			hypothesisId,
			env: typeof window !== 'undefined' ? (window as unknown as { __VERCEL_ENV?: string }).__VERCEL_ENV || 'unknown' : 'server',
		};
		
		// Always log to console for Vercel production logs
		console.log('[DEBUG]', logEntry);
		
		// Try to send to debug endpoint (only works in dev/local)
		if (browser && typeof window !== 'undefined') {
			try {
				fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(logEntry),
				}).catch(() => {});
			} catch (e) {
				// Ignore fetch errors in production
			}
		}
	};

	const clerk = useClerkContext();
	const auth = clerk?.auth;
	const organization = clerk?.organization;
	const user = clerk?.user;
	const session = clerk?.session;
	
	// Try multiple sources for userId and orgId
	// auth.user might contain the user object with id
	const authUser = $derived(auth?.user);
	const orgId = $derived(
		auth?.orgId || 
		organization?.id || 
		session?.lastActiveOrganizationId ||
		null
	);
	const isLoaded = $derived(clerk?.isLoaded);
	const userId = $derived(
		auth?.userId || 
		authUser?.id ||
		user?.id || 
		session?.userId ||
		clerk?.clerk?.user?.id ||
		null
	);

	// Debug: Log auth state when it changes
	$effect(() => {
		if (isLoaded && clerk) {
			try {
				// Get cookies for debugging
				const cookies = typeof document !== 'undefined' ? document.cookie.split(';').reduce((acc, cookie) => {
					const [name, value] = cookie.trim().split('=');
					if (name && (name.includes('clerk') || name.includes('__session') || name.includes('__client'))) {
						acc[name] = value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : '';
					}
					return acc;
				}, {} as Record<string, string>) : {};
				
				// Log each property separately for better visibility
				console.group('[SignIn] Client auth state');
				console.log('Timestamp:', new Date().toISOString());
				console.log('Clerk exists:', !!clerk);
				console.log('Clerk keys:', Object.keys(clerk));
				console.log('Auth exists:', !!auth);
				console.log('Auth keys:', auth ? Object.keys(auth) : []);
				console.log('Auth userId:', auth?.userId ?? null);
				console.log('Auth orgId:', auth?.orgId ?? null);
				console.log('Auth sessionId:', auth?.sessionId ?? null);
				console.log('User exists:', !!user);
				console.log('User id:', user?.id ?? null);
				console.log('Session exists:', !!session);
				console.log('Session keys:', session ? Object.keys(session) : []);
				console.log('Session userId:', session?.userId ?? null);
				console.log('Organization exists:', !!organization);
				console.log('Organization id:', organization?.id ?? null);
				console.log('Derived userId:', userId);
				console.log('Derived orgId:', orgId);
				console.log('Clerk instance user id:', clerk?.clerk?.user?.id ?? null);
				console.log('Cookies:', cookies);
				// buildClerkProps returns { initialState: { userId, orgId, sessionId, ... } }
				const serverAuthState = $page.data?.initialState;
				console.log('Server auth state (from layout):', serverAuthState ?? null);
				console.log('Server vs Client mismatch:', {
					serverAuthenticated: !!serverAuthState?.userId,
					clientAuthenticated: !!userId,
					serverUserId: serverAuthState?.userId ?? null,
					clientUserId: userId,
					serverOrgId: serverAuthState?.orgId ?? null,
					clientOrgId: orgId,
				});
				console.groupEnd();
			} catch (error) {
				console.error('[SignIn] Error logging auth state:', error);
			}
		}
	});

	async function handleSignOut() {
		if (!clerk?.clerk) {
			console.error('[SignIn] Clerk instance not available');
			return;
		}
		try {
			console.log('[SignIn] Attempting to sign out...');
			await clerk.clerk.signOut();
			console.log('[SignIn] Sign out successful, redirecting to /sign-in');
			goto('/sign-in', { replaceState: true });
		} catch (error) {
			console.error('[SignIn] Sign out error:', error);
		}
	}

	const DEFAULT_LANG = 'ja';

	// Compute project management page URL based on organization
	const projectManagementUrl = $derived(
		orgId ? `/${DEFAULT_LANG}/orgs/${orgId}/project` : `/${DEFAULT_LANG}/orgs/select/project`
	);

	async function goToProject(e?: Event) {
		// #region agent log
		debugLog('sign-in/+page.svelte:105', 'goToProject called', { eventType: e?.type, hasEvent: !!e }, 'D');
		// #endregion
		
		e?.preventDefault();
		
		// Use derived values instead of direct auth access
		const currentUserId = userId;
		const currentOrgId = orgId;
		const url = projectManagementUrl;
		
		// #region agent log
		debugLog('sign-in/+page.svelte:112', 'URL computed', { url, userId: currentUserId, orgId: currentOrgId, authExists: !!auth, organizationExists: !!organization, clerkLoaded: isLoaded }, 'A');
		// #endregion
		
		console.log('[SignIn] Navigating to project page:', {
			url,
			userId: currentUserId,
			orgId: currentOrgId,
			authExists: !!auth,
			organizationExists: !!organization,
			clerkLoaded: isLoaded,
			currentPath: typeof window !== 'undefined' ? window.location.pathname : null,
		});
		
		// If SignedIn component is rendered, we trust Clerk's authentication state
		// Even if userId is null, we can still navigate to org selection page
		// The org selection page will handle the case where user needs to select/create an org
		
		// Wait a bit for auth state to sync, then navigate
		// This ensures the session cookie is properly set before navigation
		if (typeof window !== 'undefined') {
			// #region agent log
			debugLog('sign-in/+page.svelte:130', 'Before delay', { currentUrl: window.location.href, targetUrl: url }, 'B');
			// #endregion
			
			// Small delay to ensure auth state is synced
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// #region agent log
			debugLog('sign-in/+page.svelte:135', 'Before window.location.href assignment', { targetUrl: url, currentUrl: window.location.href }, 'B');
			// #endregion
			
			console.log('[SignIn] Using window.location.href for navigation');
			// Use full page reload to ensure server-side auth check works
			try {
				window.location.href = url;
				
				// #region agent log
				debugLog('sign-in/+page.svelte:142', 'After window.location.href assignment', { targetUrl: url, assigned: true }, 'B');
				// #endregion
			} catch (error) {
				// #region agent log
				debugLog('sign-in/+page.svelte:148', 'Navigation error caught', { error: String(error), errorName: (error as Error)?.name, errorMessage: (error as Error)?.message }, 'B');
				// #endregion
				
				console.error('[SignIn] Navigation error:', error);
			}
		} else {
			// Fallback to goto for SSR (though this shouldn't happen in a click handler)
			// #region agent log
			debugLog('sign-in/+page.svelte:155', 'Using goto fallback (SSR)', { url }, 'C');
			// #endregion
			
			try {
				await goto(url, { replaceState: true });
			} catch (error) {
				// #region agent log
				debugLog('sign-in/+page.svelte:161', 'goto error caught', { error: String(error), errorName: (error as Error)?.name, errorMessage: (error as Error)?.message }, 'C');
				// #endregion
				
				console.error('[SignIn] Navigation error:', error);
			}
		}
	}

	// Redirect target (fallback + force) - organization選択ページ
	const signInRedirectUrl = $derived(() => {
		return `/${DEFAULT_LANG}/orgs/select/project`;
	});
</script>

<div class="sign-in-container">
	<div class="sign-in-content">
		{#if !isLoaded}
			<p>読み込み中...</p>
		{:else}
			<SignedIn>
				<div class="authenticated-section">
					<p>既にログインしています</p>
					<div class="action-buttons">
						<button class="project-link" on:click={(e) => {
							// #region agent log
							debugLog('sign-in/+page.svelte:161', 'Button clicked', { buttonType: 'project-link', eventType: e.type, isTrusted: e.isTrusted }, 'D');
							// #endregion
							goToProject(e);
						}} type="button">
							プロジェクト管理ページへ
						</button>
						<button on:click={handleSignOut} class="logout-button" type="button">
							ログアウト
						</button>
					</div>
				</div>
			</SignedIn>
			<SignedOut>
				<h1>ログイン</h1>
				<SignIn
					fallbackRedirectUrl={signInRedirectUrl()}
					forceRedirectUrl={signInRedirectUrl()}
				/>
			</SignedOut>
		{/if}
	</div>
</div>

<!-- Debug panel at bottom for better visibility -->
<!-- <ClerkAuthDebugPanel /> -->

<style>
	.sign-in-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background-color: var(--sb-bg-primary, #1a1a1a);
		color: var(--sb-text-primary, #ffffff);
		padding: 2rem;
	}

	.sign-in-content {
		text-align: center;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 1rem;
	}

	p {
		color: var(--sb-text-secondary, #cccccc);
	}

	.authenticated-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.project-link {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background-color: var(--sb-accent, #007bff);
		color: #ffffff;
		text-decoration: none;
		border: none;
		border-radius: 0.5rem;
		font-weight: 500;
		transition: background-color 0.2s ease;
		cursor: pointer;
	}

	.project-link:hover {
		background-color: var(--sb-accent-hover, #0056b3);
	}

	.logout-button {
		padding: 0.75rem 1.5rem;
		background-color: transparent;
		color: var(--sb-text-secondary, #cccccc);
		border: 1px solid var(--sb-border-color, #404040);
		border-radius: 0.5rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 1rem;
	}

	.logout-button:hover {
		background-color: var(--sb-bg-secondary, #2a2a2a);
		border-color: var(--sb-accent, #007bff);
		color: var(--sb-text-primary, #ffffff);
	}
</style>
