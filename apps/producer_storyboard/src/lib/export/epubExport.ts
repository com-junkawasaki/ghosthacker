/**
 * EPUB Export Utility for Novel Editor
 * Exports novel chapters as EPUB file
 */

export interface Chapter {
	title: string;
	content: string; // HTML content
	order: number;
}

/**
 * Export novel chapters as EPUB
 * TODO: Implement full EPUB generation using epub-gen or similar library
 */
export async function exportEpub(
	projectId: string,
	title: string,
	author: string,
	chapters: Chapter[]
): Promise<Blob> {
	// Basic EPUB structure (simplified)
	// In production, use a library like epub-gen or epub.js
	
	const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
	
	// Create EPUB content (simplified - would need proper EPUB structure)
	const epubContent = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
	<metadata>
		<dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">${escapeXml(title)}</dc:title>
		<dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">${escapeXml(author)}</dc:creator>
		<dc:identifier id="book-id">${projectId}</dc:identifier>
		<dc:language>ja</dc:language>
	</metadata>
	<manifest>
		<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
		${sortedChapters.map((_, index) => 
			`<item id="chapter-${index}" href="chapter-${index}.xhtml" media-type="application/xhtml+xml"/>`
		).join('\n\t\t')}
	</manifest>
	<spine>
		<itemref idref="nav"/>
		${sortedChapters.map((_, index) => 
			`<itemref idref="chapter-${index}"/>`
		).join('\n\t\t')}
	</spine>
</package>`;

	// TODO: Implement proper EPUB file generation
	// This is a placeholder - would need to create proper EPUB structure with:
	// - mimetype file
	// - META-INF/container.xml
	// - OEBPS/content.opf
	// - OEBPS/chapter files
	// - ZIP compression
	
	// For now, return a text blob as placeholder
	return new Blob([epubContent], { type: 'application/epub+zip' });
}

function escapeXml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/**
 * Download EPUB file
 */
export function downloadEpub(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename.endsWith('.epub') ? filename : `${filename}.epub`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

