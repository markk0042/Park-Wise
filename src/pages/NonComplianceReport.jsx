import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Upload, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { createComplaint, uploadEvidence } from "@/api";

export default function NonComplianceReport() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    related_plate: "",
    location: "",
    status: "new",
    reported_date: format(new Date(), "yyyy-MM-dd"),
    reported_time: format(new Date(), "HH:mm")
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const queryClient = useQueryClient();

  const { profile: user } = useAuth();

  const uploadImageMutation = useMutation({
    mutationFn: async (file) => {
      try {
        const result = await uploadEvidence(file);
        // Handle both response formats: { file_url } or direct file_url
        const fileUrl = result?.file_url || result;
        if (!fileUrl) {
          throw new Error('No file URL returned from server');
        }
        return fileUrl;
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    },
    onSuccess: (fileUrl) => {
      setFormData({ ...formData, image_url: fileUrl });
      setUploadingImage(false);
    },
    onError: (error) => {
      setUploadingImage(false);
      const errorMessage = error?.message || error?.details?.error?.message || 'Failed to upload image. Please try again.';
      console.error('Upload failed:', error);
      alert(`Upload failed: ${errorMessage}`);
    },
  });

  const createComplaintMutation = useMutation({
    mutationFn: (complaintData) => createComplaint(complaintData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setSuccessMessage("✓ Non-compliance report submitted successfully!");
      setFormData({
        title: "",
        description: "",
        image_url: "",
        related_plate: "",
        location: "",
        status: "new",
        reported_date: format(new Date(), "yyyy-MM-dd"),
        reported_time: format(new Date(), "HH:mm")
      });
      setSelectedFile(null);
      setTimeout(() => setSuccessMessage(""), 5000);
    },
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      setUploadingImage(true);
      uploadImageMutation.mutate(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image_url) {
      alert("Please upload an image before submitting");
      return;
    }
    if (!formData.location) {
      alert("Please select a location");
      return;
    }
    await createComplaintMutation.mutate(formData);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (user.status !== 'approved') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 md:p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base md:text-lg">
            Your account is pending approval. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        <div className="mb-4 md:mb-6 text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-slate-900">Non-Compliance Report</h1>
          <p className="text-sm md:text-base text-slate-600 mt-1">
            Report parking violations or non-compliance issues with photo evidence
          </p>
        </div>

        {successMessage && (
          <div className="p-3 md:p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-sm md:text-base">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        <Card className="shadow-lg border-2 border-slate-200">
          <CardHeader className="pb-3 md:pb-4 px-4 md:px-6 bg-slate-50">
            <CardTitle className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />
              Submit Non-Compliance Report
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pt-6">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-semibold text-sm md:text-base">
                  Report Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Illegal parking in disabled bay"
                  required
                  className="text-base md:text-lg h-11 md:h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-semibold text-sm md:text-base">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Provide detailed information about the non-compliance issue..."
                  required
                  rows={5}
                  className="text-sm md:text-base"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="related_plate" className="font-semibold text-sm md:text-base">
                    Vehicle Registration (Optional)
                  </Label>
                  <Input
                    id="related_plate"
                    value={formData.related_plate}
                    onChange={(e) => setFormData({...formData, related_plate: e.target.value.toUpperCase()})}
                    placeholder="e.g., 231-D-12345"
                    className="text-base md:text-lg font-mono uppercase h-11 md:h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="font-semibold text-sm md:text-base">
                    Location *
                  </Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({...formData, location: value})}
                  >
                    <SelectTrigger className="h-11 md:h-12">
                      <SelectValue placeholder="Select parking area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Green Car Park">Green Car Park</SelectItem>
                      <SelectItem value="Yellow Car Park">Yellow Car Park</SelectItem>
                      <SelectItem value="EV Car Park">EV Car Park</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image" className="font-semibold text-sm md:text-base">
                  Photo Evidence *
                </Label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 md:p-8 text-center hover:border-slate-400 transition-colors">
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="image"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
                        <p className="text-sm text-slate-600 font-medium">Uploading image...</p>
                      </>
                    ) : formData.image_url ? (
                      <>
                        <CheckCircle className="w-12 h-12 text-emerald-500" />
                        <p className="text-sm text-emerald-600 font-medium">✓ Image uploaded successfully</p>
                        <img 
                          src={formData.image_url} 
                          alt="Uploaded evidence" 
                          className="mt-3 max-h-64 rounded-lg border-2 border-emerald-200"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('image').click();
                          }}
                          className="mt-2"
                        >
                          Change Image
                        </Button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-slate-400" />
                        <p className="text-sm text-slate-600 font-medium">
                          Click to upload photo evidence
                        </p>
                        <p className="text-xs text-slate-500">
                          PNG, JPG up to 10MB
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="reported_date" className="font-semibold text-sm md:text-base">Date</Label>
                  <Input
                    id="reported_date"
                    type="date"
                    value={formData.reported_date}
                    onChange={(e) => setFormData({...formData, reported_date: e.target.value})}
                    className="h-11 md:h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reported_time" className="font-semibold text-sm md:text-base">Time</Label>
                  <Input
                    id="reported_time"
                    type="time"
                    value={formData.reported_time}
                    onChange={(e) => setFormData({...formData, reported_time: e.target.value})}
                    className="h-11 md:h-12"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-5 md:py-6 text-base md:text-lg"
                disabled={createComplaintMutation.isPending || uploadingImage || !formData.image_url || !formData.location}
              >
                {createComplaintMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}