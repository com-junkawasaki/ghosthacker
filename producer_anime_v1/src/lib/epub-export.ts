/**
 * ePub3エクスポート機能
 * 
 * JSON-LDからePub3形式を生成
 * OCF（Open Container Format）、OPF（Open Packaging Format）、XHTML、CSS
 * 
 * @context https://ghosthacker.gftd.co.jp/ontology#
 */
// Note: JSZip needs to be installed: pnpm add jszip
// import JSZip from 'jszip';
import type { EpubDocument, EpubEditorSettings } from './epub-settings';
import { settingsToCss } from './epub-settings';

/**
 * ePub3ドキュメントをエクスポート
 */
export async function exportEpub3(
  document: EpubDocument,
  settings: EpubEditorSettings,
  metadata: {
    title: string;
    author: string;
    language?: string;
    publisher?: string;
  }
): Promise<Blob> {
  // TODO: Install JSZip: pnpm add jszip
  // const JSZip = (await import('jszip')).default;
  // const zip = new JSZip();
  
  // Placeholder: Return empty blob for now
  // Actual implementation requires JSZip
  // TODO: Install JSZip: pnpm add jszip
  // Then uncomment the following code:
  /*
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // MIME type
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.folder('META-INF')?.file('container.xml', containerXml);

  // OEBPS/content.opf (Package Document)
  const opf = generateOPF(document, settings, metadata);
  zip.folder('OEBPS')?.file('content.opf', opf);

  // OEBPS/toc.ncx (Navigation)
  const ncx = generateNCX(document, metadata);
  zip.folder('OEBPS')?.file('toc.ncx', ncx);

  // OEBPS/stylesheet.css
  const css = settingsToCss(settings);
  zip.folder('OEBPS')?.file('stylesheet.css', css);

  // OEBPS/chapters/*.xhtml
  const chapters = document['gh:hasChapter'] || [];
  chapters.forEach((chapterRef, index) => {
    const chapterId = chapterRef['@id'];
    const xhtml = generateChapterXHTML(document, chapterId, index);
    zip.folder('OEBPS')?.folder('chapters')?.file(`chapter-${index + 1}.xhtml`, xhtml);
  });

  // ZIPファイルを生成
  return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  */
  
  // Temporary: Return empty blob until JSZip is installed
  return new Blob(['ePub3 export requires JSZip'], { type: 'application/epub+zip' });
}

/**
 * OPF（Open Packaging Format）を生成
 */
function generateOPF(
  document: EpubDocument,
  settings: EpubEditorSettings,
  metadata: { title: string; author: string; language?: string; publisher?: string }
): string {
  const chapters = document['gh:hasChapter'] || [];
  const manifestItems = chapters.map((_, index) => 
    `    <item id="chapter-${index + 1}" href="chapters/chapter-${index + 1}.xhtml" media-type="application/xhtml+xml"/>`
  ).join('\n');

  const spineItems = chapters.map((_, index) => 
    `    <itemref idref="chapter-${index + 1}"/>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${document['@id']}</dc:identifier>
    <dc:title>${metadata.title}</dc:title>
    <dc:creator>${metadata.author}</dc:creator>
    <dc:language>${metadata.language || 'en'}</dc:language>
    ${metadata.publisher ? `<dc:publisher>${metadata.publisher}</dc:publisher>` : ''}
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="stylesheet" href="stylesheet.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`;
}

/**
 * NCX（Navigation Control XML）を生成
 */
function generateNCX(
  document: EpubDocument,
  metadata: { title: string; author: string; language?: string }
): string {
  const chapters = document['gh:hasChapter'] || [];
  const navPoints = chapters.map((chapterRef, index) => {
    const chapterId = chapterRef['@id'];
    return `    <navPoint id="navpoint-${index + 1}" playOrder="${index + 1}">
      <navLabel>
        <text>Chapter ${index + 1}</text>
      </navLabel>
      <content src="chapters/chapter-${index + 1}.xhtml"/>
    </navPoint>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${document['@id']}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${metadata.title}</text>
  </docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
}

/**
 * 章のXHTMLを生成
 */
function generateChapterXHTML(
  document: EpubDocument,
  chapterId: string,
  index: number
): string {
  // TODO: 実際の章コンテンツをJSON-LDから取得
  const title = `Chapter ${index + 1}`;
  const content = '<p>Chapter content here...</p>';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="../stylesheet.css"/>
</head>
<body>
  <h1>${title}</h1>
  ${content}
</body>
</html>`;
}

/**
 * ePub3ファイルをダウンロード
 */
export async function downloadEpub3(
  document: EpubDocument,
  settings: EpubEditorSettings,
  metadata: { title: string; author: string; language?: string; publisher?: string },
  filename: string = 'book.epub'
): Promise<void> {
  const blob = await exportEpub3(document, settings, metadata);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

