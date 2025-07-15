import RNHTMLtoPDF from 'react-native-html-to-pdf';

import { InspectionItem, Inspection } from '@/types';
import { AssignedCategory } from '@/types/checklist';
import { PRE_INSPECTION_CHECKLIST } from '@/constants/checklists';

/**
 * Generates a PDF report from inspection data
 */
export async function generateInspectionPDF(
  inspection: Inspection,
  categories: AssignedCategory[],
  onProgress?: (message: string, current: number, total: number) => void
): Promise<string> {
  // Check if RNHTMLtoPDF is available
  if (!RNHTMLtoPDF || !RNHTMLtoPDF.convert) {
    throw new Error('PDF library not available. Please check installation and rebuild the app.');
  }

  const html = await createInspectionHTML(inspection, categories, onProgress);
  
  // Update progress before the blocking PDF conversion
  onProgress?.('Converting to PDF...', 0, 1);
  
  // Small delay to let UI update
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const options = {
    html,
    fileName: `inspection_${inspection.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
    directory: 'Documents',
    base64: false,
  };

  try {
    // This is the blocking operation we can't avoid
    const pdf = await RNHTMLtoPDF.convert(options);
    return pdf.filePath || '';
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error('Failed to generate PDF report');
  }
}

/**
 * Creates HTML content for the inspection report
 */
async function createInspectionHTML(
  inspection: Inspection, 
  categories: AssignedCategory[],
  onProgress?: (message: string, current: number, total: number) => void
): Promise<string> {
  // Convert images to base64 for embedding with progress updates
  const categoriesWithBase64: any[] = [];
  const totalImages = categories.reduce((sum, cat) => sum + cat.assignedItems.length, 0);
  let processedImages = 0;
  
  for (const category of categories) {
    const itemsWithBase64: any[] = [];
    
    for (let i = 0; i < category.assignedItems.length; i++) {
      const item = category.assignedItems[i];
      processedImages++;
      
      // Update progress
      onProgress?.(`Processing photo ${processedImages}/${totalImages}...`, processedImages, totalImages);
      
      const base64Image = await convertImageToBase64(item.photoUri);
      itemsWithBase64.push({
        ...item,
        base64Image
      });
      
      // Allow UI to update between downloads
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    categoriesWithBase64.push({
      ...category,
      assignedItems: itemsWithBase64
    });
  }
  
  onProgress?.('Creating PDF document...', totalImages, totalImages);
  
  // Allow UI to update before starting PDF generation
  await new Promise(resolve => setTimeout(resolve, 100));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Inspection Report - ${inspection.name}</title>
      <style>
        ${getReportCSS()}
      </style>
    </head>
    <body>
      <div class="report-container">
        ${generateHeaderHTML(inspection)}
        ${generateSummaryHTML(inspection, categoriesWithBase64)}
        ${generateCategoriesHTML(categoriesWithBase64)}
        ${generateFooterHTML()}
      </div>
    </body>
    </html>
  `;
}

/**
 * Convert image URI to base64 for PDF embedding
 */
async function convertImageToBase64(uri: string): Promise<string> {
  try {
    // Check if it's already a local file
    if (uri.startsWith('file://') || uri.startsWith('/')) {
      // Local file - would need FileSystem API to read
      // For now, return a placeholder since we're dealing with remote URLs
      return createPlaceholderImage();
    }
    
    // Remote URL - download and convert
    const response = await fetch(uri);
    
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return createPlaceholderImage();
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = () => {
        console.error('Failed to convert blob to base64');
        resolve(createPlaceholderImage());
      };
      reader.readAsDataURL(blob);
    });
    
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    return createPlaceholderImage();
  }
}

/**
 * Create a placeholder image for failed downloads
 */
function createPlaceholderImage(): string {
  return 'data:image/svg+xml;base64,' + btoa(`
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" fill="#f0f0f0" stroke="#ddd" stroke-width="2"/>
      <text x="150" y="100" text-anchor="middle" fill="#999" font-family="Arial" font-size="14">
        Photo not available
      </text>
      <text x="150" y="120" text-anchor="middle" fill="#999" font-family="Arial" font-size="12">
        (Download failed)
      </text>
    </svg>
  `);
}

/**
 * Generate header HTML
 */
function generateHeaderHTML(inspection: Inspection): string {
  return `
    <header class="report-header">
      <h1>Pre-Inspection Report</h1>
      <div class="inspection-details">
        <h2>${inspection.name}</h2>
        <p><strong>Date:</strong> ${new Date(inspection.createdAt).toLocaleDateString()}</p>
        <p><strong>Address:</strong> ${inspection.location.address || 'Location provided'}</p>
        <p><strong>Status:</strong> ${inspection.status}</p>
      </div>
    </header>
  `;
}

/**
 * Generate summary HTML
 */
function generateSummaryHTML(inspection: Inspection, categories: AssignedCategory[]): string {
  const totalItems = Object.keys(inspection.items || {}).length;
  const categorizedItems = categories.reduce((sum, cat) => sum + cat.assignedItems.length, 0);
  const completedRequirements = categories.reduce((sum, cat) => {
    if (!cat.completion) return sum;
    return sum + cat.completion.fulfilled.filter(item => item.required).length;
  }, 0);
  
  return `
    <section class="summary">
      <h3>Inspection Summary</h3>
      <div class="summary-stats">
        <div class="stat">
          <span class="stat-number">${totalItems}</span>
          <span class="stat-label">Total Photos</span>
        </div>
        <div class="stat">
          <span class="stat-number">${categorizedItems}</span>
          <span class="stat-label">Categorized</span>
        </div>
        <div class="stat">
          <span class="stat-number">${completedRequirements}</span>
          <span class="stat-label">Required Items Complete</span>
        </div>
      </div>
    </section>
  `;
}

/**
 * Generate categories HTML
 */
function generateCategoriesHTML(categories: AssignedCategory[]): string {
  return categories
    .filter(cat => cat.assignedItems.length > 0) // Only show categories with photos
    .map(category => `
      <section class="category">
        <h3>${category.definition.name}</h3>
        
        ${category.completion ? generateRequirementsHTML(category.completion) : ''}
        
        <div class="photos-grid">
          ${category.assignedItems.map(item => `
            <div class="photo-item">
              ${item.base64Image ? `<img src="${item.base64Image}" alt="${item.label || 'Inspection Photo'}" />` : ''}
              <div class="photo-details">
                <p class="photo-label">${item.label || 'Unlabeled'}</p>
                <p class="photo-tags">${(item.tags || []).join(', ')}</p>
                ${item.audioTranscription ? `<p class="photo-transcript">"${item.audioTranscription}"</p>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `).join('');
}

/**
 * Generate requirements checklist HTML
 */
function generateRequirementsHTML(completion: any): string {
  const allItems = [...completion.fulfilled, ...completion.missing];
  if (allItems.length === 0) return '';
  
  return `
    <div class="requirements">
      <h4>Requirements Checklist</h4>
      <ul class="requirements-list">
        ${allItems.map(item => `
          <li class="requirement ${completion.fulfilled.includes(item) ? 'completed' : 'missing'}">
            <span class="requirement-icon">${completion.fulfilled.includes(item) ? '✓' : (item.required ? '!' : '○')}</span>
            <span class="requirement-text">${item.name}</span>
            ${item.requireDatasheet ? '<span class="datasheet-icon">📋</span>' : ''}
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

/**
 * Generate footer HTML
 */
function generateFooterHTML(): string {
  return `
    <footer class="report-footer">
      <p>Generated on ${new Date().toLocaleString()}</p>
      <p>🤖 Generated with Claude Code</p>
    </footer>
  `;
}

/**
 * CSS styles for the report
 */
function getReportCSS(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: white;
    }
    
    .report-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .report-header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #007AFF;
      padding-bottom: 20px;
    }
    
    .report-header h1 {
      color: #007AFF;
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .inspection-details h2 {
      font-size: 20px;
      margin: 10px 0;
    }
    
    .summary {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    
    .summary-stats {
      display: flex;
      justify-content: space-around;
      margin-top: 15px;
    }
    
    .stat {
      text-align: center;
    }
    
    .stat-number {
      display: block;
      font-size: 24px;
      font-weight: bold;
      color: #007AFF;
    }
    
    .stat-label {
      font-size: 14px;
      color: #666;
    }
    
    .category {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .category h3 {
      color: #007AFF;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    
    .requirements {
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .requirements h4 {
      margin-bottom: 10px;
      color: #333;
    }
    
    .requirements-list {
      list-style: none;
    }
    
    .requirement {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      padding: 5px;
    }
    
    .requirement.completed {
      color: #28a745;
      text-decoration: line-through;
    }
    
    .requirement.missing .requirement-icon {
      color: #dc3545;
    }
    
    .requirement-icon {
      margin-right: 8px;
      font-weight: bold;
      width: 16px;
    }
    
    .requirement-text {
      flex: 1;
    }
    
    .datasheet-icon {
      margin-left: 8px;
      font-size: 12px;
    }
    
    .photos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .photo-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    
    .photo-item img {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
    
    .photo-details {
      padding: 15px;
    }
    
    .photo-label {
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .photo-tags {
      color: #666;
      font-size: 14px;
      margin-bottom: 5px;
    }
    
    .photo-transcript {
      font-style: italic;
      color: #555;
      font-size: 14px;
      border-left: 3px solid #007AFF;
      padding-left: 10px;
    }
    
    .report-footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #666;
      font-size: 14px;
    }
    
    @media print {
      .report-container {
        padding: 0;
      }
      
      .category {
        page-break-before: auto;
      }
    }
  `;
}