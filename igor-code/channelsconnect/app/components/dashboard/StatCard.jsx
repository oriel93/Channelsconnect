import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';

export default function StatCard({ title, value, change, icon: Icon, iconBgColor, iconColor, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded mb-2 w-24 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded mb-1 w-16 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className={`p-3 rounded-full ${iconBgColor || 'bg-gray-100'} animate-pulse`}>
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatValue = (val) => {
    if (typeof val === 'number' && val >= 1000) {
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{formatValue(value)}</p>
            {change && <p className="text-sm text-green-600">{change}</p>}
          </div>
          <div className={`p-3 rounded-full ${iconBgColor || 'bg-gray-100'}`}>
            <Icon className={`w-6 h-6 ${iconColor || 'text-gray-600'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}