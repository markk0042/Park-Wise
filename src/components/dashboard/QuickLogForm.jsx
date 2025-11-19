
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { format } from "date-fns";

export default function QuickLogForm({ onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    registration_plate: "",
    owner_name: "",
    company: "",
    country: "Ireland",
    parking_type: "Green",
    notes: "",
    log_date: format(new Date(), "yyyy-MM-dd"),
    log_time: format(new Date(), "HH:mm")
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData);
    setFormData({
      registration_plate: "",
      owner_name: "",
      company: "",
      country: "Ireland",
      parking_type: "Green",
      notes: "",
      log_date: format(new Date(), "yyyy-MM-dd"),
      log_time: format(new Date(), "HH:mm")
    });
  };

  const parkingColors = {
    Green: "bg-emerald-50 border-emerald-200",
    Yellow: "bg-amber-50 border-amber-200",
    Blue: "bg-blue-50 border-blue-200"
  };

  const companies = [
    "BMS",
    "Crown",
    "Cunningham Group",
    "Daldrop", // Changed from "dal drop" to "Daldrop"
    "Duggan Steel",
    "Jones Engineering",
    "L&S",
    "MCR",
    "PM Group",
    "RKC",
    "Suir Engineering"
  ];

  return (
    <Card className={`shadow-lg border-2 transition-all duration-300 ${parkingColors[formData.parking_type]}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <PlusCircle className="w-6 h-6" />
          Quick Log Entry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registration_plate" className="font-semibold">
                Registration Plate *
              </Label>
              <Input
                id="registration_plate"
                value={formData.registration_plate}
                onChange={(e) => setFormData({...formData, registration_plate: e.target.value.toUpperCase()})}
                placeholder="e.g., 231-D-12345"
                required
                className="text-lg font-mono uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_name" className="font-semibold">
                Vehicle Owner Name
              </Label>
              <Input
                id="owner_name"
                value={formData.owner_name}
                onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                placeholder="Enter owner's name"
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="font-semibold">Company</Label>
              <Select
                value={formData.company}
                onValueChange={(value) => setFormData({...formData, company: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="font-semibold">Country *</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({...formData, country: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ireland">🇮🇪 Ireland</SelectItem>
                  <SelectItem value="Northern Ireland">Northern Ireland</SelectItem>
                  <SelectItem value="UK">🇬🇧 UK</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parking_type" className="font-semibold">Parking Category *</Label>
              <Select
                value={formData.parking_type}
                onValueChange={(value) => setFormData({...formData, parking_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Green">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      Green Car Park
                    </div>
                  </SelectItem>
                  <SelectItem value="Yellow">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      Yellow Car Park
                    </div>
                  </SelectItem>
                  <SelectItem value="Blue">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      Blue (Unregistered)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="log_time" className="font-semibold">Time</Label>
              <Input
                id="log_time"
                type="time"
                value={formData.log_time}
                onChange={(e) => setFormData({...formData, log_time: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="font-semibold">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any additional observations..."
              rows={2}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-6 text-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging..." : "Log Vehicle"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
