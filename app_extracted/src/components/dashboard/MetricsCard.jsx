import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

const colorSchemes = {
  blue: {
    bg: "bg-blue-500",
    light: "bg-blue-50",
    text: "text-blue-600",
    trend: "text-blue-600"
  },
  emerald: {
    bg: "bg-emerald-500", 
    light: "bg-emerald-50",
    text: "text-emerald-600",
    trend: "text-emerald-600"
  },
  violet: {
    bg: "bg-violet-500",
    light: "bg-violet-50", 
    text: "text-violet-600",
    trend: "text-violet-600"
  },
  amber: {
    bg: "bg-amber-500",
    light: "bg-amber-50",
    text: "text-amber-600", 
    trend: "text-amber-600"
  }
};

export default function MetricsCard({ 
  title, 
  value, 
  total, 
  icon: Icon, 
  trend, 
  color = "blue" 
}) {
  const scheme = colorSchemes[color];
  const isPositiveTrend = trend?.startsWith('+');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm">
        <div className={`absolute top-0 right-0 w-32 h-32 ${scheme.light} rounded-full transform translate-x-8 -translate-y-8 opacity-60`} />
        
        <CardContent className="p-6 relative">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${scheme.light}`}>
              <Icon className={`w-6 h-6 ${scheme.text}`} />
            </div>
            {trend && (
              <div className={`flex items-center gap-1 text-sm font-medium ${
                isPositiveTrend ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {isPositiveTrend ? 
                  <TrendingUp className="w-4 h-4" /> : 
                  <TrendingDown className="w-4 h-4" />
                }
                {trend}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wider">
              {title}
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-800">
                {value}
              </span>
              {total && (
                <span className="text-lg text-slate-500">
                  / {total}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}