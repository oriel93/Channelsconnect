import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, CheckCircle } from "lucide-react";

export default function AddChannelDialog({ open, onOpenChange, onAdd, availableChannels }) {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [formData, setFormData] = useState({
    api_key: "",
    property_id: "",
    username: ""
  });
  const [step, setStep] = useState(1);

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedChannel) return;

    const channelData = {
      name: selectedChannel.name,
      type: selectedChannel.type,
      status: "pending",
      commission_rate: selectedChannel.commission,
      logo_url: selectedChannel.logo,
      connection_details: formData
    };

    await onAdd(channelData);
    setStep(1);
    setSelectedChannel(null);
    setFormData({ api_key: "", property_id: "", username: "" });
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep(1);
    setSelectedChannel(null);
    setFormData({ api_key: "", property_id: "", username: "" });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800">
            {step === 1 ? "Add New Channel" : `Connect ${selectedChannel?.name}`}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableChannels.map((channel) => (
                <Card 
                  key={channel.name}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-slate-300"
                  onClick={() => handleChannelSelect(channel)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img 
                        src={channel.logo} 
                        alt={channel.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="font-semibold text-slate-800">{channel.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {channel.type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">
                      Commission: {channel.commission}%
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedChannel && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <img 
                src={selectedChannel.logo} 
                alt={selectedChannel.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-semibold text-slate-800">{selectedChannel.name}</h3>
                <p className="text-sm text-slate-500">Commission: {selectedChannel.commission}%</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  placeholder="Enter your API key"
                  value={formData.api_key}
                  onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="property_id">Property ID</Label>
                <Input
                  id="property_id"
                  placeholder="Enter your property ID"
                  value={formData.property_id}
                  onChange={(e) => setFormData({...formData, property_id: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="username">Username (if required)</Label>
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                className="bg-slate-900 hover:bg-slate-800"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Connect Channel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}