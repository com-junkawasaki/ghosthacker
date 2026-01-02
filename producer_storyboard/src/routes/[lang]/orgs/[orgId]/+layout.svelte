<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { useClerkContext } from 'svelte-clerk';
	import type { LayoutData } from './$types';

	const { data: _data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
	// data is available through $page.data, but we keep it for type safety

	const clerk = useClerkContext();
	const auth = clerk?.auth;
	const organization = clerk?.organization;

	// Default language
	const DEFAULT_LANG = 'ja';

	// React to organization changes and redirect if needed
	$effect(() => {
		if (!browser) return;

		const { orgId: urlOrgId } = $page.params;
		const currentOrgId = organization?.id || auth?.orgId;
		const isAuthenticated = auth?.userId != null;

		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'+layout.svelte:19',message:'Client-side org check',data:{urlOrgId,currentOrgId,organizationId:organization?.id,authOrgId:auth?.orgId,isAuthenticated,userId:auth?.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
		// #endregion

		// Only redirect if user is authenticated and has an organization
		if (!isAuthenticated || !currentOrgId) {
			// If user is not authenticated or has no organization, allow access
			// but don't redirect (they might be signing in or selecting an org)
			return;
		}

		// If user is authenticated and has an organization, but URL doesn't match
		if (urlOrgId && currentOrgId !== urlOrgId) {
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'+layout.svelte:34',message:'Organization mismatch detected - will redirect',data:{currentOrgId,urlOrgId,currentPath:$page.url.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
			// #endregion
			
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

{@render children()}


