import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors = {
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200", 
  checked_in: "bg-blue-100 text-blue-800 border-blue-200",
  checked_out: "bg-slate-100 text-slate-800 border-slate-200",
  no_show: "bg-orange-100 text-orange-800 border-orange-200"
};

export default function RecentBookings({ bookings, isLoading }) {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-800">Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
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
        <CardTitle className="text-xl font-bold text-slate-800">Recent Bookings</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {bookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all duration-300 bg-white/50"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-800 truncate">{booking.guest_name}</h4>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(booking.check_in), "MMM d")} - {format(new Date(booking.check_out), "MMM d")}
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-semibold text-slate-800 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {booking.total_amount?.toFixed(0)}
                </div>
                <Badge 
                  variant="secondary" 
                  className={`mt-1 ${statusColors[booking.status] || statusColors.confirmed} border text-xs`}
                >
                  {booking.status?.replace('_', ' ')}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
        
        {bookings.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No Recent Bookings</h3>
            <p className="text-slate-500">New bookings will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}