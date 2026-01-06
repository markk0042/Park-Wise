import { supabaseAdmin } from '../config/supabase.js';
import { listParkingLogs } from '../services/parkingLog.service.js';
import { sendReportEmail } from '../services/email.service.js';
import { generateReportPDF } from '../services/pdf.service.js';

const countTable = async (table, filter) => {
  let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
};

export const getDashboardSummary = async (_req, res, next) => {
  try {
    const [vehicleCount, activeVehicleCount, parkingLogCount, complaintCount] = await Promise.all([
      countTable('vehicles'),
      countTable('vehicles', (q) => q.eq('is_active', true)),
      countTable('parking_logs'),
      countTable('complaints'),
    ]);

    res.json({
      vehicles: vehicleCount,
      activeVehicles: activeVehicleCount,
      parkingLogs: parkingLogCount,
      complaints: complaintCount,
    });
  } catch (err) {
    next(err);
  }
};

export const sendReport = async (req, res, next) => {
  try {
    const { email, startDate, endDate, format = 'csv' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Fetch logs for the date range
    const logs = await listParkingLogs({ startDate, endDate, limit: 10000 });

    if (logs.length === 0) {
      return res.status(400).json({ error: 'No logs found for the selected date range' });
    }

    // Sort logs by permit number (same as frontend)
    const sortedLogs = [...logs].sort((a, b) => {
      const getPermitNumber = (log) => {
        if (log.notes?.includes("Permit:")) {
          const match = log.notes.match(/Permit:\s*(.+?)(?:\s*-|$)/);
          const permitStr = match ? match[1].trim() : log.notes.replace("Permit:", "").trim();
          const numMatch = permitStr.match(/\d+/);
          return numMatch ? parseInt(numMatch[0], 10) : 999999;
        }
        return 999999;
      };
      return getPermitNumber(a) - getPermitNumber(b);
    });

    let attachment = null;
    let attachmentFilename = '';

    if (format === 'pdf') {
      // Generate PDF
      const pdfBuffer = await generateReportPDF(sortedLogs, startDate, endDate);
      attachment = {
        filename: `Park_Wise_Report_${startDate}_${endDate}.pdf`,
        content: pdfBuffer.toString('base64'),
        contentType: 'application/pdf'
      };
      attachmentFilename = attachment.filename;
    } else {
      // Generate CSV content (same format as frontend)
      const csvLines = [];
      csvLines.push('"","","Car Park Report","",""');
      csvLines.push('"Registrations","","Permits","","DD/MM/YY"');
      
      sortedLogs.forEach(log => {
        let permitNumber = "";
        if (log.notes?.includes("Permit:")) {
          const match = log.notes.match(/Permit:\s*(.+?)(?:\s*-|$)/);
          permitNumber = match ? match[1].trim() : log.notes.replace("Permit:", "").trim();
        } else if (log.notes?.includes("No permit")) {
          permitNumber = "No Permit";
        }
        
        const formattedDate = new Date(log.log_date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        });
        
        csvLines.push(`"${log.registration_plate}","","${permitNumber}","","${formattedDate}"`);
      });

      const csvContent = csvLines.join("\n");
      const BOM = "\uFEFF";
      const csvWithBOM = BOM + csvContent;
      
      attachment = {
        filename: `Park_Wise_Report_${startDate}_${endDate}.csv`,
        content: Buffer.from(csvWithBOM).toString('base64'),
        contentType: 'text/csv'
      };
      attachmentFilename = attachment.filename;
    }

    // Send email
    const result = await sendReportEmail(email, {
      startDate,
      endDate,
      logs: sortedLogs,
      attachment,
      format
    });

    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to send email',
        devMode: result.devMode 
      });
    }

    res.json({ 
      success: true, 
      message: `${format.toUpperCase()} report sent successfully`,
      devMode: result.devMode 
    });
  } catch (err) {
    next(err);
  }
};
