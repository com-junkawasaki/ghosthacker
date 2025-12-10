<script lang="ts">
	import { browser } from '$app/environment';
	import { useClerkContext } from 'svelte-clerk';
	import { page } from '$app/stores';

	const clerk = useClerkContext();
	const auth = clerk?.auth;
	const user = clerk?.user;
	const organization = clerk?.organization;

	let expanded = $state(true);
	let serverAuthData = $state<any>(null);
	let initialAuthState = $state<any>(null);

	// Load server-side auth data
	async function loadServerAuth() {
		try {
			const response = await fetch('/api/auth-status');
			if (response.ok) {
				serverAuthData = await response.json();
			}
		} catch (error) {
			console.error('[ClerkAuthDebugPanel] Failed to load server auth:', error);
		}
	}

	// Get initial auth state from page data if available
	if (browser) {
		loadServerAuth();
		// Try to get initial auth state from page data
		$effect(() => {
			const layoutData = $page.data;
			if (layoutData && 'initialAuthState' in layoutData) {
				initialAuthState = (layoutData as any).initialAuthState;
			}
		});
	}

	function toggleExpanded() {
		expanded = !expanded;
	}

	function copyToClipboard(text: string) {
		if (browser) {
			navigator.clipboard.writeText(text);
		}
	}

	const authState = $derived({
		clerkExists: clerk !== undefined && clerk !== null,
		authExists: auth !== undefined,
		userExists: user !== undefined,
		organizationExists: organization !== undefined,
		userId: auth?.userId ?? null,
		orgId: auth?.orgId ?? null,
		organizationId: organization?.id ?? null,
		sessionId: auth?.sessionId ?? null,
		isSignedIn: auth?.userId != null,
		userEmail: user?.primaryEmailAddress?.emailAddress ?? null,
		userName: user?.fullName ?? user?.firstName ?? null,
		orgName: organization?.name ?? null,
		orgSlug: organization?.slug ?? null,
	});
</script>

<div class="debug-panel">
	<button class="debug-toggle" onclick={toggleExpanded}>
		<span class="debug-title">🔐 Clerk Auth Debug</span>
		<span class="debug-status" class:authenticated={authState.isSignedIn} class:unauthenticated={!authState.isSignedIn}>
			{authState.isSignedIn ? 'Authenticated' : 'Not Authenticated'}
		</span>
	</button>

	{#if expanded}
		<div class="debug-content">
			<!-- Client-side Auth State -->
			<div class="debug-section">
				<h3 class="debug-section-title">Client-side Auth State</h3>
				<div class="debug-item">
					<span class="debug-label">Clerk Context Exists:</span>
					<span class="debug-value">{authState.clerkExists ? 'true' : 'false'}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">Auth Object Exists:</span>
					<span class="debug-value">{authState.authExists ? 'true' : 'false'}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">User Object Exists:</span>
					<span class="debug-value">{authState.userExists ? 'true' : 'false'}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">Organization Object Exists:</span>
					<span class="debug-value">{authState.organizationExists ? 'true' : 'false'}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">Is Signed In:</span>
					<span class="debug-value" class:authenticated={authState.isSignedIn}>
						{authState.isSignedIn ? 'true' : 'false'}
					</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">User ID:</span>
					<span class="debug-value">{authState.userId ?? 'null'}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">Session ID:</span>
					<span class="debug-value">{authState.sessionId ?? 'null'}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">Auth Org ID:</span>
					<span class="debug-value">{authState.orgId ?? 'null'}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">Organization ID:</span>
					<span class="debug-value">{authState.organizationId ?? 'null'}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">User Email:</span>
					<span class="debug-value">{authState.userEmail ?? 'null'}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">User Name:</span>
					<span class="debug-value">{authState.userName ?? 'null'}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">Organization Name:</span>
					<span class="debug-value">{authState.orgName ?? 'null'}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">Organization Slug:</span>
					<span class="debug-value">{authState.orgSlug ?? 'null'}</span>
				</div>
			</div>

			<!-- Full Auth Object -->
			{#if auth}
				<div class="debug-section">
					<h3 class="debug-section-title">Full Auth Object</h3>
					<pre class="debug-json">{JSON.stringify(auth, null, 2)}</pre>
					<button
						class="debug-button"
						onclick={() => copyToClipboard(JSON.stringify(auth, null, 2))}
					>
						Copy Auth JSON
					</button>
				</div>
			{/if}

			<!-- Full User Object -->
			{#if user}
				<div class="debug-section">
					<h3 class="debug-section-title">Full User Object</h3>
					<pre class="debug-json">{JSON.stringify(user, null, 2)}</pre>
					<button
						class="debug-button"
						onclick={() => copyToClipboard(JSON.stringify(user, null, 2))}
					>
						Copy User JSON
					</button>
				</div>
			{/if}

			<!-- Full Organization Object -->
			{#if organization}
				<div class="debug-section">
					<h3 class="debug-section-title">Full Organization Object</h3>
					<pre class="debug-json">{JSON.stringify(organization, null, 2)}</pre>
					<button
						class="debug-button"
						onclick={() => copyToClipboard(JSON.stringify(organization, null, 2))}
					>
						Copy Organization JSON
					</button>
				</div>
			{/if}

			<!-- Initial Auth State from Layout -->
			{#if initialAuthState}
				<div class="debug-section">
					<h3 class="debug-section-title">Initial Auth State (from Layout)</h3>
					<pre class="debug-json">{JSON.stringify(initialAuthState, null, 2)}</pre>
					<button
						class="debug-button"
						onclick={() => copyToClipboard(JSON.stringify(initialAuthState, null, 2))}
					>
						Copy Initial Auth JSON
					</button>
				</div>
			{/if}

			<!-- Server-side Auth Data -->
			{#if serverAuthData}
				<div class="debug-section">
					<h3 class="debug-section-title">Server-side Auth Data (from API)</h3>
					<pre class="debug-json">{JSON.stringify(serverAuthData, null, 2)}</pre>
					<button
						class="debug-button"
						onclick={() => copyToClipboard(JSON.stringify(serverAuthData, null, 2))}
					>
						Copy Server Auth JSON
					</button>
				</div>
			{/if}

			<!-- Cookies -->
			<div class="debug-section">
				<h3 class="debug-section-title">Cookies</h3>
				{#if browser}
					{@const cookies = document.cookie.split('; ').map(c => {
						const [name, ...rest] = c.split('=');
						return { name, value: rest.join('=') };
					})}
					{@const sessionCookies = cookies.filter(c => 
						c.name.includes('session') || 
						c.name.includes('clerk') || 
						c.name === '__session'
					)}
					<div class="debug-item">
						<span class="debug-label">Total Cookies:</span>
						<span class="debug-value">{cookies.length}</span>
					</div>
					<div class="debug-item">
						<span class="debug-label">Session-related Cookies:</span>
						<span class="debug-value">{sessionCookies.length}</span>
					</div>
					<div class="debug-item">
						<span class="debug-label">Has __session Cookie:</span>
						<span class="debug-value" class:authenticated={cookies.some(c => c.name === '__session')}>
							{cookies.some(c => c.name === '__session') ? 'true' : 'false'}
						</span>
					</div>
					{#each sessionCookies as cookie}
						<div class="debug-item">
							<span class="debug-label">{cookie.name}:</span>
							<span class="debug-value">
								{cookie.value.substring(0, 50) + (cookie.value.length > 50 ? '...' : '')}
							</span>
						</div>
					{/each}
				{:else}
					<div class="debug-item">
						<span class="debug-value">Server-side: Cookies not accessible</span>
					</div>
				{/if}
			</div>

			<!-- Current Page Info -->
			<div class="debug-section">
				<h3 class="debug-section-title">Current Page</h3>
				<div class="debug-item">
					<span class="debug-label">URL:</span>
					<span class="debug-value">{$page.url.href}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">Pathname:</span>
					<span class="debug-value">{$page.url.pathname}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">Params:</span>
					<span class="debug-value">{JSON.stringify($page.params)}</span>
				</div>
				<div class="debug-item">
					<span class="debug-label">Page Data Keys:</span>
					<span class="debug-value">{Object.keys($page.data || {}).join(', ') || 'none'}</span>
				</div>
				{#if $page.data && 'initialAuthState' in $page.data}
					<div class="debug-item">
						<span class="debug-label">Initial Auth State in Page Data:</span>
						<span class="debug-value authenticated">Found</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.debug-panel {
		position: fixed;
		top: 0;
		right: 0;
		width: 400px;
		max-height: 100vh;
		background-color: rgba(26, 26, 26, 0.95);
		border-left: 2px solid #333;
		z-index: 100; /* Lower z-index so main content is visible */
		overflow-y: auto;
		pointer-events: auto;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 12px;
		box-shadow: -4px 0 12px rgba(0, 0, 0, 0.3);
	}

	.debug-toggle {
		width: 100%;
		padding: 0.75rem 1rem;
		background-color: #2a2a2a;
		border: none;
		border-bottom: 1px solid #333;
		color: #ffffff;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-weight: 600;
	}

	.debug-toggle:hover {
		background-color: #333;
	}

	.debug-title {
		font-size: 13px;
	}

	.debug-status {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 500;
		background-color: #6b7280;
		color: #ffffff;
	}

	.debug-status.authenticated {
		background-color: #10b981;
		color: #ffffff;
	}

	.debug-status.unauthenticated {
		background-color: #ef4444;
		color: #ffffff;
	}

	.debug-content {
		padding: 1rem;
	}

	.debug-section {
		margin-bottom: 1.5rem;
	}

	.debug-section-title {
		font-size: 13px;
		font-weight: 600;
		margin-bottom: 0.75rem;
		color: #ffffff;
		border-bottom: 1px solid #333;
		padding-bottom: 0.5rem;
	}

	.debug-item {
		display: flex;
		flex-direction: column;
		margin-bottom: 0.5rem;
		gap: 0.25rem;
	}

	.debug-label {
		font-weight: 600;
		color: #9ca3af;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.debug-value {
		color: #ffffff;
		font-size: 12px;
		word-break: break-all;
	}

	.debug-value.authenticated {
		color: #10b981;
	}

	.debug-json {
		background-color: #000000;
		border: 1px solid #333;
		border-radius: 4px;
		padding: 0.75rem;
		font-size: 11px;
		color: #10b981;
		overflow-x: auto;
		max-height: 300px;
		overflow-y: auto;
		margin: 0.5rem 0;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.debug-button {
		padding: 0.5rem 1rem;
		background-color: #3b82f6;
		color: #ffffff;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 11px;
		font-weight: 500;
		margin-top: 0.5rem;
	}

	.debug-button:hover {
		background-color: #2563eb;
	}
</style>

