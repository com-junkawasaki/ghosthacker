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
			// #region agent log
			debugLog('sign-in/[...path]/+page.svelte:63', 'Auth state changed', { 
				userId, 
				orgId, 
				hasAuth: !!auth, 
				hasOrganization: !!organization,
				hasUser: !!user,
				hasSession: !!session,
				pathname: $page.url.pathname
			}, 'A');
			// #endregion
		}
	});

	function handleSignOut() {
		if (!clerk) {
			console.error('[SignIn] Clerk instance not available');
			return;
		}

		try {
			clerk.signOut();
			goto('/sign-in', { replaceState: true });
		} catch (error) {
			console.error('[SignIn] Sign out error:', error);
		}
	}

	function goToProject(e?: Event) {
		if (e) {
			e.preventDefault();
		}

		const currentUserId = userId;
		const currentOrgId = orgId;

		// #region agent log
		debugLog('sign-in/[...path]/+page.svelte:105', 'goToProject called', { eventType: e?.type, hasEvent: !!e }, 'D');
		// #endregion

		if (!currentUserId || !currentOrgId) {
			console.warn('[SignIn] Cannot navigate: missing userId or orgId', { currentUserId, currentOrgId });
			return;
		}

		const url = `/${$page.params.lang || 'ja'}/orgs/${currentOrgId}/project`;

		// #region agent log
		debugLog('sign-in/[...path]/+page.svelte:112', 'URL computed', { url, userId: currentUserId, orgId: currentOrgId, authExists: !!auth, organizationExists: !!organization, clerkLoaded: isLoaded }, 'A');
		// #endregion

		console.log('[SignIn] Navigating to project page:', {
			url,
			userId: currentUserId,
			orgId: currentOrgId,
		});

		// Use window.location.href for more reliable navigation in some cases
		if (browser && typeof window !== 'undefined') {
			try {
				// #region agent log
				debugLog('sign-in/[...path]/+page.svelte:130', 'Before delay', { currentUrl: window.location.href, targetUrl: url }, 'B');
				// #endregion

				// Small delay to ensure state is updated
				setTimeout(() => {
					// #region agent log
					debugLog('sign-in/[...path]/+page.svelte:135', 'Before window.location.href assignment', { targetUrl: url, currentUrl: window.location.href }, 'B');
					// #endregion

					console.log('[SignIn] Using window.location.href for navigation');
					window.location.href = url;

					// #region agent log
					debugLog('sign-in/[...path]/+page.svelte:142', 'After window.location.href assignment', { targetUrl: url, assigned: true }, 'B');
					// #endregion
				}, 100);
			} catch (error) {
				// #region agent log
				debugLog('sign-in/[...path]/+page.svelte:148', 'Navigation error caught', { error: String(error), errorName: (error as Error)?.name, errorMessage: (error as Error)?.message }, 'B');
				// #endregion

				console.error('[SignIn] Navigation error:', error);
				// Fallback to goto
				// #region agent log
				debugLog('sign-in/[...path]/+page.svelte:155', 'Using goto fallback (SSR)', { url }, 'C');
				// #endregion

				try {
					goto(url);
				} catch (gotoError) {
					// #region agent log
					debugLog('sign-in/[...path]/+page.svelte:161', 'goto error caught', { error: String(gotoError), errorName: (gotoError as Error)?.name, errorMessage: (gotoError as Error)?.message }, 'C');
					// #endregion

					console.error('[SignIn] Navigation error:', gotoError);
				}
			}
		} else {
			goto(url);
		}
	}

	const signInRedirectUrl = $derived(() => {
		const lang = $page.params.lang || 'ja';
		if (orgId) {
			return `/${lang}/orgs/${orgId}/project`;
		}
		return `/${lang}/orgs/select/project`;
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
							debugLog('sign-in/[...path]/+page.svelte:161', 'Button clicked', { buttonType: 'project-link', eventType: e.type, isTrusted: e.isTrusted }, 'D');
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

<style>
	.sign-in-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 2rem;
		background-color: var(--sb-bg-primary, #1a1a1a);
		color: var(--sb-text-primary, #ffffff);
	}

	.sign-in-content {
		width: 100%;
		max-width: 400px;
		text-align: center;
	}

	.authenticated-section {
		padding: 2rem;
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1rem;
	}

	.project-link,
	.logout-button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 1rem;
		transition: background-color 0.2s;
	}

	.project-link {
		background-color: var(--primary-color, #3b82f6);
		color: white;
	}

	.project-link:hover {
		background-color: var(--primary-hover, #2563eb);
	}

	.logout-button {
		background-color: transparent;
		color: var(--sb-text-primary, #ffffff);
		border: 1px solid var(--sb-border, rgba(255, 255, 255, 0.1));
	}

	.logout-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}
</style>
