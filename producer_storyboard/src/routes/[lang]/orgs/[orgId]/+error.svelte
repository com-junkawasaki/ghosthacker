<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	const { status, error: errorProp }: { status: number; error: App.Error } = $props();

	const { lang } = $page.params;
	const DEFAULT_LANG = 'ja';
	const currentLang = lang || DEFAULT_LANG;

	const errorOrgId = $derived((errorProp as { orgId?: string })?.orgId || $page.params.orgId);
	const errorMessage = $derived(errorProp?.message || '');
	
	// Determine if this is specifically an organization access error (403) or a general error
	const isOrgAccessError = $derived(status === 403);
	const displayTitle = $derived(isOrgAccessError ? '組織へのアクセスが拒否されました' : 'エラーが発生しました');
	const displayMessage = $derived(
		errorMessage || 
		(isOrgAccessError ? '組織へのアクセスが拒否されました' : `エラーが発生しました (${status})`)
	);

	function goToSelectOrg() {
		goto(`/${currentLang}/orgs/select/project`);
	}

	function goToHome() {
		goto(`/${currentLang}/orgs/select/project`);
	}
</script>

<div class="error-container">
	<div class="error-content">
		<h1>{displayTitle}</h1>
		<p class="error-code">Status: {status}</p>
		<p class="error-message">
			{displayMessage}
		</p>
		{#if isOrgAccessError && errorOrgId}
			<p class="error-description">
				指定された組織（{errorOrgId}）にアクセスする権限がありません。
				この組織のメンバーではないか、組織IDが無効です。
			</p>
		{:else if !isOrgAccessError}
			<p class="error-description">
				ページの読み込み中にエラーが発生しました。再度お試しください。
			</p>
		{:else}
			<p class="error-description">
				組織へのアクセス権限がありません。
			</p>
		{/if}
		<div class="error-actions">
		<button class="btn-primary" onclick={goToSelectOrg}>
			組織を選択
		</button>
		<button class="btn-secondary" onclick={goToHome}>
			ホームに戻る
		</button>
		</div>
	</div>
</div>

<style>
	.error-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background-color: var(--sb-bg-primary, #1a1a1a);
		color: var(--sb-text-primary, #ffffff);
		padding: 2rem;
	}

	.error-content {
		max-width: 600px;
		text-align: center;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 1rem;
		color: var(--sb-text-primary, #ffffff);
	}

	.error-code {
		font-size: 0.875rem;
		color: var(--sb-text-tertiary, #888888);
		margin-bottom: 0.5rem;
		font-family: monospace;
	}

	.error-message {
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
		color: var(--sb-text-secondary, #cccccc);
	}

	.error-description {
		font-size: 1rem;
		margin-bottom: 2rem;
		color: var(--sb-text-tertiary, #999999);
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn-primary,
	.btn-secondary {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-primary {
		background-color: var(--sb-accent-primary, #3b82f6);
		color: white;
	}

	.btn-primary:hover {
		background-color: var(--sb-accent-primary-hover, #2563eb);
	}

	.btn-secondary {
		background-color: var(--sb-bg-secondary, #2a2a2a);
		color: var(--sb-text-primary, #ffffff);
		border: 1px solid var(--sb-border-color, #404040);
	}

	.btn-secondary:hover {
		background-color: var(--sb-bg-tertiary, #3a3a3a);
	}
</style>


