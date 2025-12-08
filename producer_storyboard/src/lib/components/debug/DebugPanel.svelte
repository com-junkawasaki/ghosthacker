<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	type Props = {
		store: {
			loading: boolean;
			error: Error | null;
			data: any;
			fetching: boolean;
		};
		storeName: string;
		visible?: boolean;
	};

	let { store, storeName, visible = false }: Props = $props();

	let expanded = $state(false);
	let requestDetails = $state<any[]>([]);
	let responseDetails = $state<any[]>([]);

	onMount(() => {
		if (browser) {
			// Intercept fetch calls
			const originalFetch = globalThis.fetch;
			globalThis.fetch = async function (...args) {
				const [url, init] = args;
				const urlStr = typeof url === 'string' ? url : url.toString();
				
				// Only capture GraphQL requests
				if (urlStr.includes('/graphql')) {
					const requestInfo = {
						url: urlStr,
						method: init?.method || 'GET',
						headers: init?.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {},
						body: init?.body,
						timestamp: Date.now(),
					};

					requestDetails = [...requestDetails, requestInfo];
					console.log('[DebugPanel] Captured request:', requestInfo);

					try {
						const response = await originalFetch.apply(this, args);
						const clonedResponse = response.clone();
						
						const responseInfo: any = {
							url: requestInfo.url,
							status: response.status,
							statusText: response.statusText,
							headers: Object.fromEntries(response.headers.entries()),
							timestamp: Date.now(),
						};

						// Try to read body
						try {
							const contentType = response.headers.get('content-type');
							if (contentType?.includes('application/json')) {
								const data = await clonedResponse.json();
								responseInfo.body = data;
							} else {
								const text = await clonedResponse.text();
								responseInfo.body = text.substring(0, 500);
							}
						} catch (e) {
							responseInfo.bodyError = String(e);
						}

						responseDetails = [...responseDetails, responseInfo];
						console.log('[DebugPanel] Captured response:', responseInfo);
						return response;
					} catch (error) {
						const errorInfo = {
							url: requestInfo.url,
							error: String(error),
							timestamp: Date.now(),
						};
						responseDetails = [...responseDetails, errorInfo];
						console.error('[DebugPanel] Request error:', errorInfo);
						throw error;
					}
				}
				
				return originalFetch.apply(this, args);
			};
		}
	});

	function toggleExpanded() {
		expanded = !expanded;
	}

	function formatValue(value: any, depth = 0): string {
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (typeof value === 'string') return `"${value}"`;
		if (typeof value === 'object') {
			if (depth > 2) return '{...}';
			const entries = Object.entries(value)
				.slice(0, 10)
				.map(([k, v]) => `${k}: ${formatValue(v, depth + 1)}`);
			return `{ ${entries.join(', ')}${Object.keys(value).length > 10 ? ', ...' : ''} }`;
		}
		return String(value);
	}

	function copyToClipboard(text: string) {
		if (browser) {
			navigator.clipboard.writeText(text);
		}
	}
</script>

{#if visible}
	<div class="debug-panel">
		<button class="debug-toggle" onclick={toggleExpanded}>
			<span class="debug-title">🐛 Debug: {storeName}</span>
			<span class="debug-status" class:loading={store.loading} class:error={!!store.error} class:success={!!store.data}>
				{#if store.loading || store.fetching}
					Loading...
				{:else if store.error}
					Error
				{:else if store.data}
					Success
				{:else}
					No Data
				{/if}
			</span>
		</button>

		{#if expanded}
			<div class="debug-content">
				<!-- Store State -->
				<div class="debug-section">
					<h3 class="debug-section-title">Store State</h3>
					<div class="debug-item">
						<span class="debug-label">Loading:</span>
						<span class="debug-value">{store.loading ? 'true' : 'false'}</span>
					</div>
					<div class="debug-item">
						<span class="debug-label">Fetching:</span>
						<span class="debug-value">{store.fetching ? 'true' : 'false'}</span>
					</div>
					<div class="debug-item">
						<span class="debug-label">Has Error:</span>
						<span class="debug-value">{store.error ? 'true' : 'false'}</span>
					</div>
					<div class="debug-item">
						<span class="debug-label">Has Data:</span>
						<span class="debug-value">{store.data ? 'true' : 'false'}</span>
					</div>
				</div>

				<!-- Error Details -->
				{#if store.error}
					<div class="debug-section">
						<h3 class="debug-section-title">Error Details</h3>
						<div class="debug-item">
							<span class="debug-label">Message:</span>
							<span class="debug-value error">{store.error.message}</span>
						</div>
						{#if store.error.stack}
							<div class="debug-item">
								<span class="debug-label">Stack:</span>
								<pre class="debug-stack">{store.error.stack}</pre>
							</div>
						{/if}
						<button
							class="debug-button"
							onclick={() => copyToClipboard(JSON.stringify(store.error, null, 2))}
						>
							Copy Error JSON
						</button>
					</div>
				{/if}

				<!-- Data Details -->
				<div class="debug-section">
					<h3 class="debug-section-title">Data</h3>
					{#if store.data}
						<div class="debug-item">
							<span class="debug-label">Type:</span>
							<span class="debug-value">{typeof store.data}</span>
						</div>
						<div class="debug-item">
							<span class="debug-label">Keys:</span>
							<span class="debug-value">
								{Object.keys(store.data).join(', ') || 'none'}
							</span>
						</div>
						<div class="debug-item">
							<span class="debug-label">Preview:</span>
							<pre class="debug-preview">{formatValue(store.data)}</pre>
						</div>
						<button
							class="debug-button"
							onclick={() => copyToClipboard(JSON.stringify(store.data, null, 2))}
						>
							Copy Data JSON
						</button>
					{:else}
						<div class="debug-item">
							<span class="debug-value">No data available</span>
						</div>
					{/if}
				</div>

				<!-- Full Data JSON -->
				{#if store.data}
					<div class="debug-section">
						<h3 class="debug-section-title">Full Data JSON</h3>
						<pre class="debug-json">{JSON.stringify(store.data, null, 2)}</pre>
						<button
							class="debug-button"
							onclick={() => copyToClipboard(JSON.stringify(store.data, null, 2))}
						>
							Copy Full JSON
						</button>
					</div>
				{/if}

				<!-- Network Requests -->
				<div class="debug-section">
					<h3 class="debug-section-title">
						Network Requests ({requestDetails.length})
					</h3>
					{#if requestDetails.length === 0}
						<div class="debug-item">
							<span class="debug-value">No requests captured yet</span>
						</div>
					{:else}
						{#each requestDetails as request, index}
							<div class="debug-network-item">
								<div class="debug-network-header">
									<span class="debug-network-method">{request.method}</span>
									<span class="debug-network-url">{request.url}</span>
									<span class="debug-network-time">
										{new Date(request.timestamp).toLocaleTimeString()}
									</span>
								</div>
								{#if responseDetails[index]}
									{@const response = responseDetails[index]}
									<div class="debug-network-response">
										<div class="debug-network-status" class:success={response.status >= 200 && response.status < 300} class:error={response.status >= 400}>
											Status: {response.status} {response.statusText}
										</div>
										{#if response.body}
											<details class="debug-network-body">
												<summary>Response Body</summary>
												<pre class="debug-json">{typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2)}</pre>
											</details>
										{/if}
										{#if response.error}
											<div class="debug-value error">Error: {response.error}</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.debug-panel {
		position: fixed;
		top: 0;
		right: 0;
		width: 400px;
		max-height: 100vh;
		background-color: #1a1a1a;
		border-left: 2px solid #333;
		z-index: 9999;
		overflow-y: auto;
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
	}

	.debug-status.loading {
		background-color: #3b82f6;
		color: #ffffff;
	}

	.debug-status.error {
		background-color: #ef4444;
		color: #ffffff;
	}

	.debug-status.success {
		background-color: #10b981;
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

	.debug-value.error {
		color: #ef4444;
	}

	.debug-stack,
	.debug-preview,
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

	.debug-network-item {
		margin-bottom: 1rem;
		padding: 0.75rem;
		background-color: #1a1a1a;
		border: 1px solid #333;
		border-radius: 4px;
	}

	.debug-network-header {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}

	.debug-network-method {
		padding: 0.25rem 0.5rem;
		background-color: #3b82f6;
		color: #ffffff;
		border-radius: 3px;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.debug-network-url {
		flex: 1;
		color: #ffffff;
		font-size: 11px;
		word-break: break-all;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}

	.debug-network-time {
		color: #9ca3af;
		font-size: 10px;
	}

	.debug-network-response {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid #333;
	}

	.debug-network-status {
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		font-size: 11px;
		font-weight: 500;
		margin-bottom: 0.5rem;
		background-color: #6b7280;
		color: #ffffff;
	}

	.debug-network-status.success {
		background-color: #10b981;
		color: #ffffff;
	}

	.debug-network-status.error {
		background-color: #ef4444;
		color: #ffffff;
	}

	.debug-network-body {
		margin-top: 0.5rem;
	}

	.debug-network-body summary {
		cursor: pointer;
		color: #9ca3af;
		font-size: 11px;
		margin-bottom: 0.25rem;
	}

	.debug-network-body summary:hover {
		color: #ffffff;
	}
</style>
