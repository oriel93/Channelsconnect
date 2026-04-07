import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig = {
  connected: {
    icon: CheckCircle,
    color: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    text: "Connected"
  },
  disconnected: {
    icon: WifiOff,
    color: "bg-slate-400", 
    badge: "bg-slate-100 text-slate-800 border-slate-200",
    text: "Disconnected"
  },
  pending: {
    icon: Clock,
    color: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800 border-amber-200", 
    text: "Pending"
  },
  error: {
    icon: AlertCircle,
    color: "bg-red-500",
    badge: "bg-red-100 text-red-800 border-red-200",
    text: "Error"
  }
};

export default function ChannelStatusGrid({ channels, isLoading }) {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-800">Channel Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-xl">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-xl font-bold text-slate-800">Channel Status</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((channel, index) => {
            const config = statusConfig[channel.status] || statusConfig.disconnected;
            const StatusIcon = config.icon;
            
            return (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all duration-300 bg-white/50"
              >
                <div className="relative">
                  <div className={`w-12 h-12 ${config.color} rounded-full flex items-center justify-center shadow-lg`}>
                    <StatusIcon className="w-6 h-6 text-white" />
                  </div>
                  {channel.logo_url && (
                    <img 
                      src={channel.logo_url} 
                      alt={channel.name}
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white bg-white"
                    />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate">{channel.name}</h3>
                  <p className="text-sm text-slate-500 capitalize">{channel.type}</p>
                </div>
                
                <Badge variant="secondary" className={`${config.badge} border font-medium`}>
                  {config.text}
                </Badge>
              </motion.div>
            );
          })}
        </div>
        
        {channels.length === 0 && (
          <div className="text-center py-12">
            <Wifi className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No Channels Connected</h3>
            <p className="text-slate-500 mb-4">Connect your first booking channel to get started</p>
            <Button className="bg-slate-900 hover:bg-slate-800">
              Connect Channel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}