import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Printer, Download } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ComplaintReportGenerator({ complaints, selectedIds, onClose }) {
  const [generating, setGenerating] = useState(false);

  const selectedComplaints = complaints.filter(c => selectedIds.includes(c.id));

  const handlePrint = async () => {
    setGenerating(true);
    
    // Preload all images to ensure they're available for printing
    const images = document.querySelectorAll('.evidence-image');
    const imagePromises = Array.from(images).map((img, index) => {
      return new Promise((resolve, reject) => {
        // If image is already loaded, resolve immediately
        if (img.complete && img.naturalHeight !== 0) {
          resolve();
          return;
        }
        
        // Set up load and error handlers
        const handleLoad = () => {
          img.removeEventListener('load', handleLoad);
          img.removeEventListener('error', handleError);
          resolve();
        };
        
        const handleError = () => {
          img.removeEventListener('load', handleLoad);
          img.removeEventListener('error', handleError);
          console.warn(`Image ${index + 1} failed to load:`, img.src);
          // Resolve anyway to not block printing, but log the error
          resolve();
        };
        
        img.addEventListener('load', handleLoad);
        img.addEventListener('error', handleError);
        
        // Force reload if src exists but image hasn't loaded
        if (img.src && !img.complete) {
          const currentSrc = img.src;
          img.src = '';
          setTimeout(() => {
            img.src = currentSrc;
          }, 100);
        }
        
        // Timeout after 10 seconds
        setTimeout(() => {
          img.removeEventListener('load', handleLoad);
          img.removeEventListener('error', handleError);
          resolve(); // Resolve anyway to not block printing
        }, 10000);
      });
    });
    
    await Promise.all(imagePromises);
    
    // Additional delay to ensure all images are rendered
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setGenerating(false);
    window.print();
  };

  const statusLabels = {
    new: "New",
    in_progress: "In Progress",
    resolved: "Resolved"
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle className="text-xl md:text-2xl flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Complaints Report Preview
          </DialogTitle>
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handlePrint} 
              className="bg-slate-900 hover:bg-slate-800"
              disabled={generating}
            >
              <Printer className="w-4 h-4 mr-2" />
              {generating ? 'Loading Images...' : 'Print / Save as PDF'}
            </Button>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </DialogHeader>

        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-content, .print-content * {
              visibility: visible;
            }
            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .page-break {
              page-break-after: always;
            }
            @page {
              margin: 1.5cm;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
              display: block !important;
              page-break-inside: avoid;
            }
          }
          .evidence-image {
            max-width: 100%;
            height: auto;
            display: block;
          }
        `}</style>

        <div className="print-content mt-6">
          {/* Report Header */}
          <div className="mb-8 border-b-2 border-slate-900 pb-4">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Non-Compliance Reports
            </h1>
            <div className="text-sm text-slate-600">
              <p><strong>Generated:</strong> {format(new Date(), 'PPP')} at {format(new Date(), 'p')}</p>
              <p><strong>Total Reports:</strong> {selectedComplaints.length}</p>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-slate-600 mb-1">New</div>
              <div className="text-2xl font-bold text-blue-600">
                {selectedComplaints.filter(c => c.status === 'new').length}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-slate-600 mb-1">In Progress</div>
              <div className="text-2xl font-bold text-amber-600">
                {selectedComplaints.filter(c => c.status === 'in_progress').length}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-slate-600 mb-1">Resolved</div>
              <div className="text-2xl font-bold text-emerald-600">
                {selectedComplaints.filter(c => c.status === 'resolved').length}
              </div>
            </div>
          </div>

          {/* Individual Complaints */}
          {selectedComplaints.map((complaint, index) => (
            <div key={complaint.id} className={index < selectedComplaints.length - 1 ? "page-break" : ""}>
              <Card className="mb-6 border-2 border-slate-200">
                <CardHeader className="bg-slate-50 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-900 mb-2">
                        {complaint.title}
                      </CardTitle>
                      <div className="text-sm text-slate-600">
                        <p><strong>Report #:</strong> {complaint.id}</p>
                        <p><strong>Status:</strong> {statusLabels[complaint.status]}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-slate-600 mb-1">Date & Time</p>
                      <p className="text-slate-900">
                        {format(new Date(complaint.reported_date), 'PPP')} at {complaint.reported_time}
                      </p>
                    </div>
                    {complaint.location && (
                      <div>
                        <p className="font-semibold text-slate-600 mb-1">Location</p>
                        <p className="text-slate-900">{complaint.location}</p>
                      </div>
                    )}
                    {complaint.related_plate && (
                      <div>
                        <p className="font-semibold text-slate-600 mb-1">Vehicle Registration</p>
                        <p className="font-mono font-bold text-slate-900">{complaint.related_plate}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-slate-600 mb-2">Description</p>
                    <p className="text-slate-900 whitespace-pre-wrap">{complaint.description}</p>
                  </div>

                  {complaint.image_url && (
                    <div>
                      <p className="font-semibold text-slate-600 mb-2">Photo Evidence</p>
                      <div className="border-2 border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <img
                          src={complaint.image_url}
                          alt="Evidence"
                          className="evidence-image"
                          style={{ maxHeight: '500px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                          loading="eager"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          onLoad={(e) => {
                            // Ensure image is visible when loaded
                            e.target.style.display = 'block';
                            const errorDiv = e.target.nextElementSibling;
                            if (errorDiv) errorDiv.style.display = 'none';
                          }}
                          onError={(e) => {
                            console.error('Image failed to load:', complaint.image_url);
                            e.target.style.display = 'none';
                            const errorDiv = e.target.nextElementSibling;
                            if (errorDiv) errorDiv.style.display = 'block';
                          }}
                        />
                        <div style={{ display: 'none', padding: '20px', textAlign: 'center', color: '#64748b' }}>
                          Image unavailable - check connection or URL: {complaint.image_url}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4 mt-4 text-xs text-slate-500">
                    <p><strong>Record Created:</strong> {format(new Date(complaint.created_date), 'PPP')}</p>
                    {complaint.updated_date && (
                      <p><strong>Last Updated:</strong> {format(new Date(complaint.updated_date), 'PPP')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Report Footer */}
          <div className="mt-8 pt-4 border-t-2 border-slate-900 text-center text-sm text-slate-600">
            <p>End of Report - {selectedComplaints.length} complaint(s) included</p>
            <p className="mt-1">Generated by ParkingLog Management System</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}