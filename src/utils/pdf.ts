export async function downloadPDF(filename = 'resume.pdf') {
  const element = document.getElementById('resume-preview');
  if (!element) return;

  const html2pdf = (await import('html2pdf.js')).default;

  await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
    } as Record<string, unknown>)
    .from(element)
    .save();
}
