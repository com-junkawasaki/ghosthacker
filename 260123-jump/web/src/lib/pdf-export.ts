import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Panel } from '$lib/gen/proto/storyboard_pb';

export type ExportMode = 'storyboard' | 'manga' | 'script' | 'shooting';

interface ExportOptions {
	panels: Panel[];
	episodeId: string;
	episodeTitle: string;
	mode: ExportMode;
}

/**
 * Export the current view to PDF
 */
export async function exportToPdf(options: ExportOptions): Promise<void> {
	const { panels, episodeId, episodeTitle, mode } = options;
	
	switch (mode) {
		case 'storyboard':
			await exportStoryboardPdf(panels, episodeId, episodeTitle);
			break;
		case 'manga':
			await exportMangaPdf(panels, episodeId, episodeTitle);
			break;
		case 'script':
			await exportScriptPdf(panels, episodeId, episodeTitle);
			break;
		case 'shooting':
			await exportShootingPdf(panels, episodeId, episodeTitle);
			break;
	}
}

/**
 * Export Storyboard view to PDF - Grid layout with thumbnails
 */
async function exportStoryboardPdf(panels: Panel[], episodeId: string, episodeTitle: string): Promise<void> {
	const pdf = new jsPDF({
		orientation: 'landscape',
		unit: 'mm',
		format: 'a4'
	});
	
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const margin = 10;
	const panelWidth = (pageWidth - margin * 2 - 15) / 4; // 4 panels per row
	const panelHeight = (pageHeight - margin * 2 - 30) / 2; // 2 rows per page
	
	// Group panels by page
	const pageGroups = groupPanelsByPage(panels);
	let currentPdfPage = 0;
	let panelIndex = 0;
	
	// Title page
	pdf.setFontSize(24);
	pdf.text('Storyboard', pageWidth / 2, 30, { align: 'center' });
	pdf.setFontSize(16);
	pdf.text(episodeTitle, pageWidth / 2, 45, { align: 'center' });
	pdf.setFontSize(12);
	pdf.text(`Episode: ${episodeId}`, pageWidth / 2, 55, { align: 'center' });
	pdf.text(`Total Pages: ${Object.keys(pageGroups).length}`, pageWidth / 2, 65, { align: 'center' });
	pdf.text(`Generated: ${new Date().toLocaleString('ja-JP')}`, pageWidth / 2, 75, { align: 'center' });
	
	// Content pages
	for (const [pageNum, pagePanels] of Object.entries(pageGroups)) {
		pdf.addPage();
		currentPdfPage++;
		
		// Page header
		pdf.setFontSize(14);
		pdf.text(`Page ${pageNum}`, margin, margin + 5);
		
		// Draw panels
		for (let i = 0; i < pagePanels.length; i++) {
			const panel = pagePanels[i];
			if (!panel) continue;
			
			const data = panel.data;
			const col = i % 4;
			const row = Math.floor(i / 4);
			const x = margin + col * (panelWidth + 5);
			const y = margin + 15 + row * (panelHeight + 10);
			
			// Panel border
			pdf.setDrawColor(100);
			pdf.setLineWidth(0.5);
			pdf.rect(x, y, panelWidth, panelHeight - 20);
			
			// Panel number
			pdf.setFontSize(10);
			pdf.setTextColor(100);
			pdf.text(`Panel ${panel.panel}`, x + 2, y + 5);
			
			// Shot type
			if (data?.shot) {
				pdf.setFontSize(8);
				pdf.text(data.shot, x + 2, y + 10);
			}
			
			// Visual description (truncated)
			if (data?.visualNote) {
				pdf.setFontSize(7);
				pdf.setTextColor(50);
				const visual = data.visualNote.substring(0, 100) + (data.visualNote.length > 100 ? '...' : '');
				const lines = pdf.splitTextToSize(visual, panelWidth - 4);
				pdf.text(lines.slice(0, 4), x + 2, y + 18);
			}
			
			// Dialogue summary
			if (data?.dialogue && data.dialogue.length > 0) {
				const firstDialogue = data.dialogue[0];
				if (firstDialogue) {
					pdf.setFontSize(7);
					pdf.setTextColor(0, 100, 0);
					const speaker = firstDialogue.speaker ?? '';
					const text = firstDialogue.text?.substring(0, 50) ?? '';
					const dialogueText = `${speaker}: ${text}...`;
					pdf.text(dialogueText, x + 2, y + panelHeight - 25);
				}
			}
			
			pdf.setTextColor(0);
			panelIndex++;
		}
		
		// Footer
		pdf.setFontSize(8);
		pdf.setTextColor(150);
		pdf.text(`${episodeTitle} - Storyboard`, margin, pageHeight - 5);
		pdf.text(`Page ${currentPdfPage}`, pageWidth - margin - 20, pageHeight - 5);
	}
	
	pdf.save(`storyboard_${episodeId}_${Date.now()}.pdf`);
}

/**
 * Export Manga view to PDF - Full page manga layout
 */
async function exportMangaPdf(panels: Panel[], episodeId: string, episodeTitle: string): Promise<void> {
	const pdf = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'b5' // Standard manga size
	});
	
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const margin = 8;
	
	// Group panels by page
	const pageGroups = groupPanelsByPage(panels);
	
	// Title page
	pdf.setFontSize(20);
	pdf.text(episodeTitle, pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
	pdf.setFontSize(12);
	pdf.text('Manga Layout', pageWidth / 2, pageHeight / 2, { align: 'center' });
	pdf.setFontSize(10);
	pdf.text(`${Object.keys(pageGroups).length} Pages`, pageWidth / 2, pageHeight / 2 + 15, { align: 'center' });
	
	// Content pages
	for (const [pageNum, pagePanels] of Object.entries(pageGroups)) {
		pdf.addPage();
		
		// Calculate panel layout based on count
		const panelCount = pagePanels.length;
		const layout = getMangaLayout(panelCount);
		
		const contentWidth = pageWidth - margin * 2;
		const contentHeight = pageHeight - margin * 2 - 10;
		
		let panelIdx = 0;
		for (const row of layout) {
			const rowHeight = contentHeight / layout.length;
			const rowY = margin + (layout.indexOf(row)) * rowHeight;
			
			for (let col = 0; col < row; col++) {
				if (panelIdx >= pagePanels.length) break;
				
				const panel = pagePanels[panelIdx];
				if (!panel) {
					panelIdx++;
					continue;
				}
				
				const data = panel.data;
				const panelW = contentWidth / row - 2;
				const panelH = rowHeight - 4;
				const panelX = margin + col * (panelW + 2);
				const panelY = rowY + 2;
				
				// Panel frame
				pdf.setDrawColor(0);
				pdf.setLineWidth(1);
				pdf.rect(panelX, panelY, panelW, panelH);
				
				// Visual placeholder with description
				pdf.setFillColor(245, 245, 245);
				pdf.rect(panelX + 1, panelY + 1, panelW - 2, panelH * 0.6, 'F');
				
				if (data?.visualNote) {
					pdf.setFontSize(6);
					pdf.setTextColor(100);
					const lines = pdf.splitTextToSize(data.visualNote, panelW - 4);
					pdf.text(lines.slice(0, 3), panelX + 2, panelY + 5);
				}
				
				// Dialogue bubbles
				if (data?.dialogue) {
					let dialogueY = panelY + panelH * 0.65;
					for (const d of data.dialogue.slice(0, 2)) {
						if (d.text) {
							pdf.setFontSize(7);
							pdf.setTextColor(0);
							// Draw speech bubble
							pdf.setDrawColor(0);
							pdf.setLineWidth(0.3);
							const bubbleHeight = 8;
							pdf.roundedRect(panelX + 3, dialogueY - 2, panelW - 6, bubbleHeight, 2, 2);
							const text = d.text.substring(0, 40) + (d.text.length > 40 ? '...' : '');
							pdf.text(text, panelX + 5, dialogueY + 3);
							dialogueY += bubbleHeight + 2;
						}
					}
				}
				
				pdf.setTextColor(0);
				panelIdx++;
			}
		}
		
		// Page number
		pdf.setFontSize(10);
		pdf.setTextColor(0);
		pdf.text(pageNum, pageWidth / 2, pageHeight - 5, { align: 'center' });
	}
	
	pdf.save(`manga_${episodeId}_${Date.now()}.pdf`);
}

/**
 * Export Script view to PDF - Screenplay format
 */
async function exportScriptPdf(panels: Panel[], episodeId: string, episodeTitle: string): Promise<void> {
	const pdf = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	});
	
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const margin = 25;
	const lineHeight = 5;
	let y = margin;
	let pageNum = 1;
	
	const checkNewPage = (requiredSpace: number) => {
		if (y + requiredSpace > pageHeight - margin) {
			pdf.addPage();
			pageNum++;
			y = margin;
			// Header on new page
			pdf.setFontSize(8);
			pdf.setTextColor(150);
			pdf.text(`${episodeTitle} - Script`, margin, 10);
			pdf.text(`Page ${pageNum}`, pageWidth - margin - 15, 10);
			pdf.setTextColor(0);
		}
	};
	
	// Title page
	pdf.setFontSize(24);
	pdf.text(episodeTitle, pageWidth / 2, 60, { align: 'center' });
	pdf.setFontSize(14);
	pdf.text('SCRIPT', pageWidth / 2, 75, { align: 'center' });
	pdf.setFontSize(12);
	pdf.text(episodeId, pageWidth / 2, 90, { align: 'center' });
	pdf.setFontSize(10);
	pdf.text(`Generated: ${new Date().toLocaleString('ja-JP')}`, pageWidth / 2, 110, { align: 'center' });
	
	// Group panels by page
	const pageGroups = groupPanelsByPage(panels);
	
	for (const [scenePageNum, pagePanels] of Object.entries(pageGroups)) {
		pdf.addPage();
		pageNum++;
		y = margin;
		
		// Scene header
		pdf.setFontSize(12);
		pdf.setFont('helvetica', 'bold');
		pdf.text(`PAGE ${scenePageNum}`, margin, y);
		y += lineHeight * 2;
		
		// Environment/Location from first panel
		const firstPanel = pagePanels[0];
		if (firstPanel?.data?.environment) {
			pdf.setFontSize(10);
			pdf.setFont('helvetica', 'bold');
			pdf.text(firstPanel.data.environment.toUpperCase(), margin, y);
			y += lineHeight * 1.5;
		}
		
		pdf.setFont('helvetica', 'normal');
		
		for (const panel of pagePanels) {
			if (!panel) continue;
			const data = panel.data;
			
			checkNewPage(40);
			
			// Panel header
			pdf.setFontSize(10);
			pdf.setFont('helvetica', 'bold');
			pdf.text(`PANEL ${panel.panel}`, margin, y);
			
			if (data?.shot) {
				pdf.setFont('helvetica', 'italic');
				pdf.text(`(${data.shot})`, margin + 25, y);
			}
			y += lineHeight * 1.5;
			
			// Action/Visual description
			if (data?.visualNote) {
				pdf.setFont('helvetica', 'normal');
				pdf.setFontSize(10);
				const lines = pdf.splitTextToSize(data.visualNote, pageWidth - margin * 2);
				for (const line of lines) {
					checkNewPage(lineHeight);
					pdf.text(line, margin, y);
					y += lineHeight;
				}
				y += lineHeight * 0.5;
			}
			
			// Dialogue
			if (data?.dialogue) {
				for (const d of data.dialogue) {
					checkNewPage(20);
					
					// Character name (centered, uppercase)
					if (d.speaker) {
						pdf.setFont('helvetica', 'bold');
						pdf.setFontSize(10);
						pdf.text(d.speaker.toUpperCase(), pageWidth / 2, y, { align: 'center' });
						y += lineHeight;
					}
					
					// Dialogue text (centered, narrower margins)
					if (d.text) {
						pdf.setFont('helvetica', 'normal');
						pdf.setFontSize(10);
						const dialogueMargin = 50;
						const lines = pdf.splitTextToSize(d.text, pageWidth - dialogueMargin * 2);
						for (const line of lines) {
							checkNewPage(lineHeight);
							pdf.text(line, pageWidth / 2, y, { align: 'center' });
							y += lineHeight;
						}
					}
					y += lineHeight;
				}
			}
			
			y += lineHeight;
		}
	}
	
	pdf.save(`script_${episodeId}_${Date.now()}.pdf`);
}

/**
 * Export Shooting view to PDF - Production breakdown
 */
async function exportShootingPdf(panels: Panel[], episodeId: string, episodeTitle: string): Promise<void> {
	const pdf = new jsPDF({
		orientation: 'landscape',
		unit: 'mm',
		format: 'a4'
	});
	
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const margin = 10;
	let y = margin;
	let pageNum = 1;
	
	// Column widths
	const cols = {
		scene: 15,
		panel: 15,
		shot: 30,
		description: 80,
		characters: 40,
		props: 35,
		notes: 60
	};
	
	const drawHeader = () => {
		pdf.setFillColor(50, 50, 50);
		pdf.rect(margin, y, pageWidth - margin * 2, 8, 'F');
		pdf.setTextColor(255);
		pdf.setFontSize(8);
		pdf.setFont('helvetica', 'bold');
		
		let x = margin + 2;
		pdf.text('PAGE', x, y + 5); x += cols.scene;
		pdf.text('PANEL', x, y + 5); x += cols.panel;
		pdf.text('SHOT TYPE', x, y + 5); x += cols.shot;
		pdf.text('DESCRIPTION', x, y + 5); x += cols.description;
		pdf.text('CHARACTERS', x, y + 5); x += cols.characters;
		pdf.text('PROPS/ENV', x, y + 5); x += cols.props;
		pdf.text('NOTES/PROMPT', x, y + 5);
		
		pdf.setTextColor(0);
		pdf.setFont('helvetica', 'normal');
		y += 10;
	};
	
	const checkNewPage = (requiredSpace: number) => {
		if (y + requiredSpace > pageHeight - margin) {
			pdf.addPage();
			pageNum++;
			y = margin;
			drawHeader();
		}
	};
	
	// Title page
	pdf.setFontSize(24);
	pdf.text('SHOOTING BREAKDOWN', pageWidth / 2, 40, { align: 'center' });
	pdf.setFontSize(16);
	pdf.text(episodeTitle, pageWidth / 2, 55, { align: 'center' });
	pdf.setFontSize(12);
	pdf.text(`Episode: ${episodeId}`, pageWidth / 2, 70, { align: 'center' });
	pdf.text(`Total Panels: ${panels.length}`, pageWidth / 2, 80, { align: 'center' });
	pdf.text(`Generated: ${new Date().toLocaleString('ja-JP')}`, pageWidth / 2, 90, { align: 'center' });
	
	// Summary statistics
	const stats = calculateStats(panels);
	y = 110;
	pdf.setFontSize(10);
	pdf.text('PRODUCTION SUMMARY', margin, y);
	y += 8;
	pdf.setFontSize(9);
	pdf.text(`Total Pages: ${stats.totalPages}`, margin, y);
	pdf.text(`Total Panels: ${stats.totalPanels}`, margin + 50, y);
	pdf.text(`Unique Characters: ${stats.uniqueCharacters}`, margin + 100, y);
	pdf.text(`Unique Environments: ${stats.uniqueEnvironments}`, margin + 160, y);
	
	// Content pages
	pdf.addPage();
	pageNum++;
	y = margin;
	drawHeader();
	
	for (let i = 0; i < panels.length; i++) {
		const panel = panels[i];
		if (!panel) continue;
		
		const data = panel.data;
		const rowHeight = 12;
		checkNewPage(rowHeight);
		
		// Alternating row colors
		if (i % 2 === 0) {
			pdf.setFillColor(248, 248, 248);
			pdf.rect(margin, y - 2, pageWidth - margin * 2, rowHeight, 'F');
		}
		
		pdf.setFontSize(7);
		let x = margin + 2;
		
		// Page number
		pdf.text(String(panel.pageNumber), x, y + 3);
		x += cols.scene;
		
		// Panel number
		pdf.text(String(panel.panel), x, y + 3);
		x += cols.panel;
		
		// Shot type
		pdf.text(data?.shot ?? '-', x, y + 3);
		x += cols.shot;
		
		// Description (truncated)
		const visualNote = data?.visualNote ?? '';
		const desc = visualNote.substring(0, 60) || '-';
		pdf.text(desc + (visualNote.length > 60 ? '...' : ''), x, y + 3);
		x += cols.description;
		
		// Characters
		const characters = data?.characters?.join(', ').substring(0, 30) ?? '-';
		pdf.text(characters, x, y + 3);
		x += cols.characters;
		
		// Props/Environment
		const env = data?.environment?.substring(0, 25) ?? '-';
		pdf.text(env, x, y + 3);
		x += cols.props;
		
		// Notes (image prompt truncated)
		const imagePrompt = data?.imagePrompt ?? '';
		const notes = imagePrompt.substring(0, 45) || '-';
		pdf.text(notes + (imagePrompt.length > 45 ? '...' : ''), x, y + 3);
		
		y += rowHeight;
	}
	
	// Footer with page numbers
	const totalPdfPages = pdf.internal.pages.length - 1;
	for (let i = 2; i <= totalPdfPages; i++) {
		pdf.setPage(i);
		pdf.setFontSize(8);
		pdf.setTextColor(150);
		pdf.text(`${episodeTitle} - Shooting Breakdown`, margin, pageHeight - 5);
		pdf.text(`Page ${i - 1} of ${totalPdfPages - 1}`, pageWidth - margin - 25, pageHeight - 5);
	}
	
	pdf.save(`shooting_${episodeId}_${Date.now()}.pdf`);
}

/**
 * Group panels by page number
 */
function groupPanelsByPage(panels: Panel[]): Record<string, Panel[]> {
	const groups: Record<string, Panel[]> = {};
	for (const panel of panels) {
		const pageNum = String(panel.pageNumber);
		const group = groups[pageNum];
		if (!group) {
			groups[pageNum] = [panel];
		} else {
			group.push(panel);
		}
	}
	// Sort panels within each page
	for (const pageNum of Object.keys(groups)) {
		const group = groups[pageNum];
		if (group) {
			group.sort((a, b) => a.panel - b.panel);
		}
	}
	return groups;
}

/**
 * Get manga layout based on panel count
 */
function getMangaLayout(panelCount: number): number[] {
	switch (panelCount) {
		case 1: return [1];
		case 2: return [2];
		case 3: return [2, 1];
		case 4: return [2, 2];
		case 5: return [2, 3];
		case 6: return [2, 2, 2];
		case 7: return [2, 3, 2];
		case 8: return [2, 3, 3];
		default: return [2, 3, 3];
	}
}

/**
 * Calculate statistics for shooting breakdown
 */
function calculateStats(panels: Panel[]): {
	totalPages: number;
	totalPanels: number;
	uniqueCharacters: number;
	uniqueEnvironments: number;
} {
	const pages = new Set<number>();
	const characters = new Set<string>();
	const environments = new Set<string>();
	
	for (const panel of panels) {
		pages.add(panel.pageNumber);
		if (panel.data?.characters) {
			for (const char of panel.data.characters) {
				characters.add(char);
			}
		}
		if (panel.data?.environment) {
			environments.add(panel.data.environment);
		}
	}
	
	return {
		totalPages: pages.size,
		totalPanels: panels.length,
		uniqueCharacters: characters.size,
		uniqueEnvironments: environments.size
	};
}

/**
 * Export current view element directly to PDF using html2canvas
 */
export async function exportViewToPdf(
	elementSelector: string,
	filename: string,
	orientation: 'portrait' | 'landscape' = 'landscape'
): Promise<void> {
	const element = document.querySelector(elementSelector) as HTMLElement;
	if (!element) {
		console.error('Element not found:', elementSelector);
		return;
	}
	
	const canvas = await html2canvas(element, {
		scale: 2,
		useCORS: true,
		logging: false
	});
	
	const imgData = canvas.toDataURL('image/png');
	const pdf = new jsPDF({
		orientation,
		unit: 'mm',
		format: 'a4'
	});
	
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	
	const imgWidth = pageWidth - 20;
	const imgHeight = (canvas.height * imgWidth) / canvas.width;
	
	pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 20));
	pdf.save(filename);
}
