/**
 * PDF and JPEG export helpers for the Missing Blueprints report.
 * Uses html2canvas + jsPDF (browser-only, call from client components).
 */

export async function downloadReportAsImage(
  element: HTMLElement,
  filename = 'missing-blueprints-report.jpg',
) {
  if (!element) throw new Error('Report element not found');
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#0d0d0d',
    logging: false,
  });
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function downloadReportAsPdf(
  element: HTMLElement,
  filename = 'missing-blueprints-report.pdf',
) {
  if (!element) throw new Error('Report element not found');
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#0d0d0d',
    logging: false,
  });
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const maxW = pdfW - margin * 2;
  const maxH = pdfH - margin * 2;
  const aspect = canvas.width / canvas.height;
  const w = aspect > maxW / maxH ? maxW : maxH * aspect;
  const h = aspect > maxW / maxH ? maxW / aspect : maxH;
  pdf.addImage(imgData, 'JPEG', margin, margin, w, h);
  pdf.save(filename);
}
