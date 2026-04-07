import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, CheckCircle, AlertCircle, Clock, WifiOff, TrendingUp, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

const statusConfig = {
  connected: {
    icon: CheckCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200"
  },
  disconnected: {
    icon: WifiOff,
    color: "text-slate-500",
    bg: "bg-slate-100",
    badge: "bg-slate-100 text-slate-800 border-slate-200"
  },
  pending: {
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-100",
    badge: "bg-amber-100 text-amber-800 border-amber-200"
  },
  error: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-100",
    badge: "bg-red-100 text-red-800 border-red-200"
  }
};

export default function ChannelCard({ channel, index, onEdit, onUpdate }) {
  const config = statusConfig[channel.status] || statusConfig.disconnected;
  const StatusIcon = config.icon;

  const handleToggleStatus = async () => {
    const newStatus = channel.status === 'connected' ? 'disconnected' : 'connected';
    onUpdate(channel.id, { status: newStatus });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center`}>
                <StatusIcon className={`w-6 h-6 ${config.color}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">{channel.name}</h3>
                <p className="text-sm text-slate-500 capitalize">{channel.type}</p>
              </div>
            </div>
            <Badge variant="secondary" className={`${config.badge} border font-medium`}>
              {channel.status}
            </Badge>
          </div>

          {channel.status === 'connected' && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-lg font-bold text-slate-800">
                  <Calendar className="w-4 h-4" />
                  {channel.monthly_bookings || 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">Monthly Bookings</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-lg font-bold text-slate-800">
                  <TrendingUp className="w-4 h-4" />
                  ${(channel.monthly_revenue || 0).toFixed(0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Monthly Revenue</p>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Commission Rate</span>
              <span className="font-semibold text-slate-800">{channel.commission_rate || 0}%</span>
            </div>
            {channel.last_sync && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Last Sync</span>
                <span className="font-semibold text-slate-800">
                  {format(new Date(channel.last_sync), "MMM d, HH:mm")}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onEdit(channel)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button
              variant={channel.status === 'connected' ? 'destructive' : 'default'}
              className={channel.status === 'connected' ? '' : 'bg-slate-900 hover:bg-slate-800'}
              onClick={handleToggleStatus}
            >
              {channel.status === 'connected' ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}