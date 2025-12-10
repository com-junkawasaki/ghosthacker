<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { useClerkContext } from 'svelte-clerk';

	const clerk = useClerkContext();
	const user = clerk?.user;
	const auth = clerk?.auth;

	// Form state
	let firstName = $state('');
	let lastName = $state('');
	let emailAddress = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	// Initialize form with user data
	onMount(() => {
		if (!browser || !user) return;

		firstName = user.firstName || '';
		lastName = user.lastName || '';
		emailAddress = user.emailAddresses?.[0]?.emailAddress || '';
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!clerk?.clerk || !auth?.userId) return;

		isSubmitting = true;
		errorMessage = null;
		successMessage = null;

		try {
			// Update user profile using Clerk API
			const updates: Record<string, string> = {};
			
			if (firstName !== (user?.firstName || '')) {
				updates.firstName = firstName;
			}
			if (lastName !== (user?.lastName || '')) {
				updates.lastName = lastName;
			}

			// Update profile if there are changes
			if (Object.keys(updates).length > 0) {
				// Use Clerk's user update method
				// svelte-clerk provides access to Clerk instance through clerk.clerk
				const clerkInstance = clerk.clerk as any;
				if (clerkInstance?.user?.update && typeof clerkInstance.user.update === 'function') {
					await clerkInstance.user.update(updates);
					// Refresh user data after update
					// The user object will be updated automatically by Clerk
				} else {
					throw new Error('Clerk user update method not available. Please use Clerk account management page.');
				}
			} else {
				// No changes to update
				successMessage = '変更がありません';
				setTimeout(() => {
					successMessage = null;
				}, 3000);
				return;
			}

			successMessage = 'プロフィールを更新しました';
			
			// Clear success message after 3 seconds
			setTimeout(() => {
				successMessage = null;
			}, 3000);
		} catch (error) {
			console.error('[Profile] Update error:', error);
			errorMessage = error instanceof Error ? error.message : 'プロフィールの更新に失敗しました';
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		// Reset form to original values
		if (user) {
			firstName = user.firstName || '';
			lastName = user.lastName || '';
			emailAddress = user.emailAddresses?.[0]?.emailAddress || '';
		}
		errorMessage = null;
		successMessage = null;
	}

	const userInitials = $derived.by(() => {
		if (!user) return 'U';
		if (firstName && lastName) {
			return `${firstName[0]}${lastName[0]}`.toUpperCase();
		}
		if (firstName) {
			return firstName[0].toUpperCase();
		}
		if (emailAddress) {
			return emailAddress[0].toUpperCase();
		}
		return 'U';
	});
</script>

<div class="profile-container">
	<div class="profile-content">
		<div class="profile-header">
			<h1>プロフィール設定</h1>
			<p class="profile-subtitle">アカウント情報を管理します</p>
		</div>

		{#if errorMessage}
			<div class="alert alert-error">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<circle cx="8" cy="8" r="6" stroke-width="1.5" />
					<path d="M8 5V8M8 11H8.01" stroke-width="1.5" stroke-linecap="round" />
				</svg>
				<span>{errorMessage}</span>
			</div>
		{/if}

		{#if successMessage}
			<div class="alert alert-success">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<path
						d="M13 4L6 11L3 8"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				<span>{successMessage}</span>
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="profile-form">
			<div class="form-section">
				<h2>プロフィール画像</h2>
				<div class="avatar-section">
					<div class="avatar-preview">
						{#if user?.imageUrl}
							<img src={user.imageUrl} alt="Profile" />
						{:else}
							<span class="avatar-initials">{userInitials}</span>
						{/if}
					</div>
					<p class="avatar-note">
						プロフィール画像は Clerk のアカウント管理ページで変更できます
					</p>
				</div>
			</div>

			<div class="form-section">
				<h2>基本情報</h2>
				<div class="form-group">
					<label for="firstName">名</label>
					<input
						id="firstName"
						type="text"
						bind:value={firstName}
						placeholder="名を入力"
						disabled={isSubmitting}
					/>
				</div>

				<div class="form-group">
					<label for="lastName">姓</label>
					<input
						id="lastName"
						type="text"
						bind:value={lastName}
						placeholder="姓を入力"
						disabled={isSubmitting}
					/>
				</div>

				<div class="form-group">
					<label for="emailAddress">メールアドレス</label>
					<input
						id="emailAddress"
						type="email"
						bind:value={emailAddress}
						placeholder="メールアドレス"
						disabled={true}
					/>
					<p class="form-note">メールアドレスは Clerk のアカウント管理ページで変更できます</p>
				</div>
			</div>

			<div class="form-actions">
				<button type="button" class="btn btn-secondary" onclick={handleCancel} disabled={isSubmitting}>
					キャンセル
				</button>
				<button type="submit" class="btn btn-primary" disabled={isSubmitting}>
					{#if isSubmitting}
						<span>更新中...</span>
					{:else}
						<span>更新</span>
					{/if}
				</button>
			</div>
		</form>

		<div class="profile-footer">
			<button
				type="button"
				class="btn btn-link"
				onclick={() => {
					if (clerk?.clerk) {
						clerk.clerk.openUserProfile();
					}
				}}
			>
				Clerk アカウント管理ページを開く
			</button>
		</div>
	</div>
</div>

<style>
	.profile-container {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		min-height: 100vh;
		background-color: var(--sb-bg-primary, #1a1a1a);
		color: var(--sb-text-primary, #ffffff);
		padding: 2rem;
	}

	.profile-content {
		max-width: 600px;
		width: 100%;
	}

	.profile-header {
		margin-bottom: 2rem;
	}

	.profile-header h1 {
		font-size: 2rem;
		margin-bottom: 0.5rem;
		color: var(--sb-text-primary, #ffffff);
	}

	.profile-subtitle {
		color: var(--sb-text-secondary, #cccccc);
		font-size: 0.875rem;
	}

	.alert {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}

	.alert-error {
		background-color: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #fca5a5;
	}

	.alert-success {
		background-color: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		color: #86efac;
	}

	.alert svg {
		flex-shrink: 0;
	}

	.profile-form {
		background-color: var(--sb-bg-secondary, #2a2a2a);
		border: 1px solid var(--sb-border-color, #404040);
		border-radius: 0.5rem;
		padding: 2rem;
	}

	.form-section {
		margin-bottom: 2rem;
	}

	.form-section:last-of-type {
		margin-bottom: 0;
	}

	.form-section h2 {
		font-size: 1.25rem;
		margin-bottom: 1rem;
		color: var(--sb-text-primary, #ffffff);
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--sb-text-secondary, #cccccc);
	}

	.form-group input {
		width: 100%;
		padding: 0.75rem;
		background-color: var(--sb-bg-primary, #1a1a1a);
		border: 1px solid var(--sb-border-color, #404040);
		border-radius: 0.375rem;
		color: var(--sb-text-primary, #ffffff);
		font-size: 0.875rem;
		transition: border-color 0.2s;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--sb-accent-primary, #3b82f6);
	}

	.form-group input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-note {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--sb-text-tertiary, #999999);
	}

	.avatar-section {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1rem;
	}

	.avatar-preview {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		overflow: hidden;
		background-color: var(--sb-accent-primary, #3b82f6);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--sb-border-color, #404040);
	}

	.avatar-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-initials {
		color: white;
		font-size: 1.5rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.avatar-note {
		font-size: 0.75rem;
		color: var(--sb-text-tertiary, #999999);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid var(--sb-border-color, #404040);
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background-color: var(--sb-accent-primary, #3b82f6);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--sb-accent-primary-hover, #2563eb);
	}

	.btn-secondary {
		background-color: var(--sb-bg-tertiary, #3a3a3a);
		color: var(--sb-text-primary, #ffffff);
		border: 1px solid var(--sb-border-color, #404040);
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: var(--sb-bg-primary, #1a1a1a);
	}

	.btn-link {
		background: none;
		color: var(--sb-accent-primary, #3b82f6);
		padding: 0.5rem 0;
		text-decoration: underline;
	}

	.btn-link:hover {
		color: var(--sb-accent-primary-hover, #2563eb);
	}

	.profile-footer {
		margin-top: 2rem;
		text-align: center;
	}
</style>
