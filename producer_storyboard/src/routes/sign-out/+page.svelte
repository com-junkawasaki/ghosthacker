<script lang="ts">
	import { SignOutButton } from 'svelte-clerk';
</script>

<div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background-color: #1a1a1a; color: #ffffff; flex-direction: column; gap: 2rem;">
	<h1 style="font-size: 2rem;">サインアウト</h1>
	<SignOutButton redirectUrl="/sign-in">
		<button slot="button" style="padding: 1rem 2rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem;">
			サインアウト
		</button>
	</SignOutButton>
</div>


