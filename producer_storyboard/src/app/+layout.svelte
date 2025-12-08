<script lang="ts">
	import { setEnvironment } from '$houdini';
	import client from '$lib/graphql/client';
	import '../app/globals.css';

	setEnvironment(client);
</script>

<slot />
