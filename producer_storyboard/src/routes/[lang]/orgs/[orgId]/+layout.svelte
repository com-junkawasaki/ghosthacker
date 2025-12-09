<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getAuth, getOrganization } from 'svelte-clerk';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	const auth = getAuth();
	const org = getOrganization();

	// Default language
	const DEFAULT_LANG = 'ja';

	// React to organization changes and redirect if needed
	$effect(() => {
		if (!browser) return;

		const { lang, orgId: urlOrgId } = $page.params;
		const currentOrgId = $org?.id;
		const isAuthenticated = $auth?.isAuthenticated;

		// Only redirect if user is authenticated and has an organization
		if (!isAuthenticated || !currentOrgId) {
			// If user is not authenticated or has no organization, allow access
			// but don't redirect (they might be signing in or selecting an org)
			return;
		}

		// If user is authenticated and has an organization, but URL doesn't match
		if (urlOrgId && currentOrgId !== urlOrgId) {
			console.log('[Layout] Organization mismatch, redirecting...', {
				currentOrgId,
				urlOrgId,
			});
			// Redirect to current organization
			const currentPath = $page.url.pathname;
			const newPath = currentPath.replace(`/${urlOrgId}`, `/${currentOrgId}`);
			goto(newPath, { replaceState: true });
			return;
		}

		// If user is authenticated and has an organization, but URL doesn't have orgId
		// or has placeholder "select" orgId
		if (!urlOrgId || urlOrgId === 'select') {
			console.log('[Layout] No orgId or placeholder orgId in URL, redirecting...', { 
				currentOrgId, 
				urlOrgId 
			});
			const currentPath = $page.url.pathname;
			const newPath = currentPath.replace(/\/orgs\/[^/]*/, `/orgs/${currentOrgId}`);
			if (!newPath.includes('/orgs/')) {
				// If path doesn't have orgs segment, insert it
				const currentLang = $page.params.lang || DEFAULT_LANG;
				const pathWithoutLang = currentPath.replace(`/${currentLang}`, '');
				const newPathWithOrg = `/${currentLang}/orgs/${currentOrgId}${pathWithoutLang}`;
				goto(newPathWithOrg, { replaceState: true });
			} else {
				goto(newPath, { replaceState: true });
			}
			return;
		}
	});

	// Validate lang parameter
	$effect(() => {
		if (!browser) return;

		const { lang } = $page.params;
		if (lang && lang !== DEFAULT_LANG && lang !== 'en') {
			// Redirect to default lang if invalid
			const currentPath = $page.url.pathname;
			const newPath = currentPath.replace(`/${lang}`, `/${DEFAULT_LANG}`);
			goto(newPath, { replaceState: true });
		}
	});
</script>

<slot />
