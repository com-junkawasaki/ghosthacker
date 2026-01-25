<script lang="ts">
	import type { Sponsor, CreateSponsorRequest, UpdateSponsorRequest } from '$lib/types/sponsor';

	type Props = {
		orgId: string;
		projectId: string;
		sponsor?: Sponsor;
		onSaved?: () => void;
		onCancel?: () => void;
	};

	let { orgId, projectId, sponsor, onSaved, onCancel }: Props = $props();

	let name = $state(sponsor?.name || '');
	let industry = $state(sponsor?.industry || '');
	let contactEmail = $state(sponsor?.contactEmail || '');
	let contactPhone = $state(sponsor?.contactPhone || '');
	let website = $state(sponsor?.website || '');
	let address = $state(sponsor?.address || '');
	let budgetMin = $state(sponsor?.budgetMin || '');
	let budgetMax = $state(sponsor?.budgetMax || '');
	let notes = $state(sponsor?.notes || '');
	let status = $state(sponsor?.status || 'prospect');
	let saving = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit() {
		if (!name.trim()) {
			error = 'スポンサー名は必須です';
			return;
		}

		try {
			saving = true;
			error = null;

			if (sponsor) {
				// Update
				const response = await fetch(`/api/sponsors/${sponsor.id}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						'X-Org-Id': orgId,
					},
					body: JSON.stringify({
						name,
						industry: industry || undefined,
						contactEmail: contactEmail || undefined,
						contactPhone: contactPhone || undefined,
						website: website || undefined,
						address: address || undefined,
						budgetMin: budgetMin || undefined,
						budgetMax: budgetMax || undefined,
						notes: notes || undefined,
						status,
					} as UpdateSponsorRequest),
				});

				if (!response.ok) {
					throw new Error('Failed to update sponsor');
				}
			} else {
				// Create
				const response = await fetch('/api/sponsors', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-Org-Id': orgId,
					},
					body: JSON.stringify({
						orgId,
						projectId,
						name,
						industry: industry || undefined,
						contactEmail: contactEmail || undefined,
						contactPhone: contactPhone || undefined,
						website: website || undefined,
						address: address || undefined,
						budgetMin: budgetMin || undefined,
						budgetMax: budgetMax || undefined,
						notes: notes || undefined,
					} as CreateSponsorRequest),
				});

				if (!response.ok) {
					throw new Error('Failed to create sponsor');
				}
			}

			onSaved?.();
		} catch (err) {
			error = err instanceof Error ? err.message : '保存に失敗しました';
		} finally {
			saving = false;
		}
	}
</script>

<div class="sponsor-form-container">
	<h2 class="form-title">{sponsor ? 'スポンサーを編集' : '新しいスポンサーを追加'}</h2>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	<form onsubmit|preventDefault={handleSubmit} class="sponsor-form">
		<div class="form-group">
			<label for="name">スポンサー名 *</label>
			<input id="name" type="text" bind:value={name} required class="form-input" />
		</div>

		<div class="form-row">
			<div class="form-group">
				<label for="industry">業種</label>
				<input id="industry" type="text" bind:value={industry} class="form-input" />
			</div>

			<div class="form-group">
				<label for="status">ステータス</label>
				<select id="status" bind:value={status} class="form-select">
					<option value="prospect">候補</option>
					<option value="contacted">連絡済み</option>
					<option value="negotiating">交渉中</option>
					<option value="approved">承認済み</option>
					<option value="rejected">却下</option>
				</select>
			</div>
		</div>

		<div class="form-row">
			<div class="form-group">
				<label for="contactEmail">メールアドレス</label>
				<input id="contactEmail" type="email" bind:value={contactEmail} class="form-input" />
			</div>

			<div class="form-group">
				<label for="contactPhone">電話番号</label>
				<input id="contactPhone" type="tel" bind:value={contactPhone} class="form-input" />
			</div>
		</div>

		<div class="form-group">
			<label for="website">ウェブサイト</label>
			<input id="website" type="url" bind:value={website} class="form-input" />
		</div>

		<div class="form-group">
			<label for="address">住所</label>
			<textarea id="address" bind:value={address} class="form-textarea" rows="2"></textarea>
		</div>

		<div class="form-row">
			<div class="form-group">
				<label for="budgetMin">最小予算（円）</label>
				<input id="budgetMin" type="number" bind:value={budgetMin} class="form-input" />
			</div>

			<div class="form-group">
				<label for="budgetMax">最大予算（円）</label>
				<input id="budgetMax" type="number" bind:value={budgetMax} class="form-input" />
			</div>
		</div>

		<div class="form-group">
			<label for="notes">備考</label>
			<textarea id="notes" bind:value={notes} class="form-textarea" rows="4"></textarea>
		</div>

		<div class="form-actions">
			<button type="button" onclick={onCancel} class="cancel-button" disabled={saving}>
				キャンセル
			</button>
			<button type="submit" class="submit-button" disabled={saving}>
				{saving ? '保存中...' : '保存'}
			</button>
		</div>
	</form>
</div>

<style>
	.sponsor-form-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 1.5rem;
		background-color: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
	}

	.form-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 1.5rem 0;
	}

	.error-message {
		padding: 0.75rem;
		background-color: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 6px;
		color: #ef4444;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.sponsor-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
	}

	.form-input,
	.form-select,
	.form-textarea {
		padding: 0.5rem 0.75rem;
		background-color: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: #ffffff;
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.2s;
	}

	.form-input:focus,
	.form-select:focus,
	.form-textarea:focus {
		border-color: #3b82f6;
	}

	.form-textarea {
		resize: vertical;
		font-family: inherit;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.cancel-button,
	.submit-button {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-button {
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.7);
	}

	.cancel-button:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.05);
		color: #ffffff;
	}

	.submit-button {
		background-color: #3b82f6;
		border: none;
		color: #ffffff;
	}

	.submit-button:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.cancel-button:disabled,
	.submit-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
