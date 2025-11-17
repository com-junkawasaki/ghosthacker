/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/export-epub
 * 
 * EPUB export functionality - generates EPUB 3.0 format files
 */
package ports

import (
	"archive/zip"
	"context"
	"fmt"
	"html"
	"strings"

	"github.com/gftd/epub-editor-graphql-go/graph/model"
)

// ExportEpub exports EPUB to ZIP file (EPUB 3.0 format)
func ExportEpub(ctx context.Context, pool *Neo4jPool, epubID string) ([]byte, error) {
	// Get EPUB data
	epub, err := pool.GetEpub(ctx, epubID)
	if err != nil {
		return nil, fmt.Errorf("failed to get EPUB: %w", err)
	}
	if epub == nil {
		return nil, fmt.Errorf("EPUB not found")
	}

	// Create ZIP buffer
	buf := make([]byte, 0, 1024*1024) // Pre-allocate 1MB
	zipWriter := zip.NewWriter(&buffer{data: &buf})
	defer zipWriter.Close()

	// mimetype file (must be first, uncompressed)
	mimetypeFile, err := zipWriter.CreateHeader(&zip.FileHeader{
		Name:   "mimetype",
		Method: zip.Store, // Uncompressed
	})
	if err != nil {
		return nil, err
	}
	mimetypeFile.Write([]byte("application/epub+zip"))

	// META-INF/container.xml
	containerFile, err := zipWriter.Create("META-INF/container.xml")
	if err != nil {
		return nil, err
	}
	containerXML := `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
	containerFile.Write([]byte(containerXML))

	// OEBPS/package.opf
	opfFile, err := zipWriter.Create("OEBPS/package.opf")
	if err != nil {
		return nil, err
	}
	opfContent, err := generateOPF(epub)
	if err != nil {
		return nil, err
	}
	opfFile.Write([]byte(opfContent))

	// OEBPS/toc.ncx
	ncxFile, err := zipWriter.Create("OEBPS/toc.ncx")
	if err != nil {
		return nil, err
	}
	ncxContent, err := generateNCX(epub)
	if err != nil {
		return nil, err
	}
	ncxFile.Write([]byte(ncxContent))

	// OEBPS/chapters/*.html
	for i, chapter := range epub.Chapters {
		filename := fmt.Sprintf("OEBPS/chapter_%d.html", i+1)
		chapterFile, err := zipWriter.Create(filename)
		if err != nil {
			return nil, err
		}
		htmlContent := generateChapterHTML(chapter)
		chapterFile.Write([]byte(htmlContent))
	}

	// OEBPS/Images/* (media files)
	for _, chapter := range epub.Chapters {
		for _, media := range chapter.Media {
			if media.Type == "image" {
				filename := fmt.Sprintf("OEBPS/Images/%s", getFilenameFromURL(media.URL))
				mediaFile, err := zipWriter.Create(filename)
				if err != nil {
					return nil, err
				}
				// Note: In production, fetch actual media file content
				mediaFile.Write([]byte(""))
			}
		}
	}

	zipWriter.Close()
	return buf, nil
}

func generateOPF(epub *model.Epub) (string, error) {
	var sb strings.Builder
	sb.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	sb.WriteString(`<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0">` + "\n")
	sb.WriteString(`  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` + "\n")
	sb.WriteString(fmt.Sprintf(`    <dc:identifier id="book-id">%s</dc:identifier>`+"\n", escapeXML(epub.ID)))
	sb.WriteString(fmt.Sprintf(`    <dc:title>%s</dc:title>`+"\n", escapeXML(epub.Title)))
	sb.WriteString(fmt.Sprintf(`    <dc:language>%s</dc:language>`+"\n", epub.Language))

	for _, meta := range epub.Metadata {
		switch meta.Key {
		case "author":
			sb.WriteString(fmt.Sprintf(`    <dc:creator>%s</dc:creator>`+"\n", escapeXML(meta.Value)))
		case "publisher":
			sb.WriteString(fmt.Sprintf(`    <dc:publisher>%s</dc:publisher>`+"\n", escapeXML(meta.Value)))
		case "date":
			sb.WriteString(fmt.Sprintf(`    <dc:date>%s</dc:date>`+"\n", escapeXML(meta.Value)))
		case "rights":
			sb.WriteString(fmt.Sprintf(`    <dc:rights>%s</dc:rights>`+"\n", escapeXML(meta.Value)))
		}
	}

	sb.WriteString(`  </metadata>` + "\n")
	sb.WriteString(`  <manifest>` + "\n")

	// Add chapters
	for i := range epub.Chapters {
		id := fmt.Sprintf("chapter_%d", i+1)
		href := fmt.Sprintf("chapter_%d.html", i+1)
		sb.WriteString(fmt.Sprintf(`    <item id="%s" href="%s" media-type="application/xhtml+xml"/>`+"\n", id, href))
	}

	// Add media
	for _, chapter := range epub.Chapters {
		for _, media := range chapter.Media {
			id := fmt.Sprintf("media_%s", media.ID)
			href := fmt.Sprintf("Images/%s", getFilenameFromURL(media.URL))
			sb.WriteString(fmt.Sprintf(`    <item id="%s" href="%s" media-type="%s"/>`+"\n", id, href, media.MimeType))
		}
	}

	sb.WriteString(`    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>` + "\n")
	sb.WriteString(`  </manifest>` + "\n")
	sb.WriteString(`  <spine toc="toc">` + "\n")

	for i := range epub.Chapters {
		idref := fmt.Sprintf("chapter_%d", i+1)
		sb.WriteString(fmt.Sprintf(`    <itemref idref="%s"/>`+"\n", idref))
	}

	sb.WriteString(`  </spine>` + "\n")
	sb.WriteString(`</package>` + "\n")

	return sb.String(), nil
}

func generateNCX(epub *model.Epub) (string, error) {
	var sb strings.Builder
	sb.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	sb.WriteString(`<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">` + "\n")
	sb.WriteString(`  <head>` + "\n")
	sb.WriteString(fmt.Sprintf(`    <meta name="dtb:uid" content="%s"/>`+"\n", epub.ID))
	sb.WriteString(`    <meta name="dtb:depth" content="1"/>` + "\n")
	sb.WriteString(`    <meta name="dtb:totalPageCount" content="0"/>` + "\n")
	sb.WriteString(`    <meta name="dtb:maxPageNumber" content="0"/>` + "\n")
	sb.WriteString(`  </head>` + "\n")
	sb.WriteString(`  <docTitle>` + "\n")
	sb.WriteString(fmt.Sprintf(`    <text>%s</text>`+"\n", escapeXML(epub.Title)))
	sb.WriteString(`  </docTitle>` + "\n")
	sb.WriteString(`  <navMap>` + "\n")

	for i, chapter := range epub.Chapters {
		playOrder := i + 1
		id := fmt.Sprintf("chapter_%d", playOrder)
		src := fmt.Sprintf("chapter_%d.html", playOrder)
		sb.WriteString(fmt.Sprintf(`    <navPoint id="%s" playOrder="%d">`+"\n", id, playOrder))
		sb.WriteString(fmt.Sprintf(`      <navLabel><text>%s</text></navLabel>`+"\n", escapeXML(chapter.Title)))
		sb.WriteString(fmt.Sprintf(`      <content src="%s"/>`+"\n", src))
		sb.WriteString(`    </navPoint>` + "\n")
	}

	sb.WriteString(`  </navMap>` + "\n")
	sb.WriteString(`</ncx>` + "\n")

	return sb.String(), nil
}

func generateChapterHTML(chapter *model.Chapter) string {
	var sb strings.Builder
	sb.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	sb.WriteString(`<!DOCTYPE html>` + "\n")
	sb.WriteString(`<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">` + "\n")
	sb.WriteString(`  <head>` + "\n")
	sb.WriteString(`    <meta charset="UTF-8"/>` + "\n")
	sb.WriteString(fmt.Sprintf(`    <title>%s</title>`+"\n", escapeXML(chapter.Title)))
	sb.WriteString(`  </head>` + "\n")
	sb.WriteString(`  <body>` + "\n")
	sb.WriteString(fmt.Sprintf(`    <h1>%s</h1>`+"\n", escapeXML(chapter.Title)))
	sb.WriteString(chapter.ContentHTML)
	sb.WriteString(`  </body>` + "\n")
	sb.WriteString(`</html>` + "\n")

	return sb.String()
}

func escapeXML(s string) string {
	return html.EscapeString(s)
}

func getFilenameFromURL(url string) string {
	parts := strings.Split(url, "/")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return "image"
}

// buffer implements io.Writer for zip.Writer
type buffer struct {
	data *[]byte
}

func (b *buffer) Write(p []byte) (n int, err error) {
	*b.data = append(*b.data, p...)
	return len(p), nil
}

