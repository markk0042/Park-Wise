import PDFDocument from 'pdfkit';

/**
 * Generate PDF report from parking logs
 * @param {Array} logs - Array of parking log objects
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateReportPDF = async (logs, startDate, endDate) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('Car Park Report', { align: 'center' });
      doc.moveDown(0.5);
      
      // Date range
      const dateRange = startDate === endDate 
        ? startDate 
        : `${startDate} to ${endDate}`;
      doc.fontSize(12).font('Helvetica').text(`Date Range: ${dateRange}`, { align: 'center' });
      doc.moveDown(1);

      // Statistics
      const greenCount = logs.filter(l => l.parking_type === 'Green').length;
      const yellowCount = logs.filter(l => l.parking_type === 'Yellow').length;
      const redCount = logs.filter(l => l.parking_type === 'Red').length;

      doc.fontSize(10).font('Helvetica-Bold').text('Summary:', { continued: false });
      doc.font('Helvetica').text(`Total Vehicles: ${logs.length}`);
      doc.text(`Green Permits: ${greenCount}`);
      doc.text(`Yellow Permits: ${yellowCount}`);
      doc.text(`Unregistered (Red): ${redCount}`);
      doc.moveDown(1);

      // Table header
      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidths = [120, 100, 100, 100]; // Registration, Permit, Date, Type
      const rowHeight = 20;

      // Header row
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Registration', tableLeft, tableTop);
      doc.text('Permit', tableLeft + colWidths[0], tableTop);
      doc.text('Date', tableLeft + colWidths[0] + colWidths[1], tableTop);
      doc.text('Type', tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop);
      
      // Draw header line
      doc.moveTo(tableLeft, tableTop + 15)
         .lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableTop + 15)
         .stroke();

      // Data rows
      let currentY = tableTop + rowHeight;
      doc.fontSize(9).font('Helvetica');
      
      logs.forEach((log, index) => {
        // Check if we need a new page
        if (currentY > 750) {
          doc.addPage();
          currentY = 50;
        }

        let permitNumber = "";
        if (log.notes?.includes("Permit:")) {
          const match = log.notes.match(/Permit:\s*(.+?)(?:\s*-|$)/);
          permitNumber = match ? match[1].trim() : log.notes.replace("Permit:", "").trim();
        } else if (log.notes?.includes("No permit")) {
          permitNumber = "No Permit";
        } else {
          permitNumber = "-";
        }

        const formattedDate = new Date(log.log_date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        });

        const parkingType = log.parking_type || 'Unknown';

        doc.text(log.registration_plate || '-', tableLeft, currentY);
        doc.text(permitNumber, tableLeft + colWidths[0], currentY);
        doc.text(formattedDate, tableLeft + colWidths[0] + colWidths[1], currentY);
        doc.text(parkingType, tableLeft + colWidths[0] + colWidths[1] + colWidths[2], currentY);

        // Draw row line
        doc.moveTo(tableLeft, currentY + 15)
           .lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY + 15)
           .stroke();

        currentY += rowHeight;
      });

      // Footer
      doc.fontSize(8).font('Helvetica').text(
        `Generated on ${new Date().toLocaleDateString('en-GB')} - Park Wise`,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};


