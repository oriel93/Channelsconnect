import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle, MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const quickTips = [
  {
    title: "Getting Started",
    content: "New to the platform? Click 'Setup Assistant' to get guided through the complete setup process."
  },
  {
    title: "Calendar Sync",
    content: "Keep your availability updated by connecting your iCal calendars from other booking platforms."
  },
  {
    title: "API Integration",
    content: "Connect your channel account to automatically sync rates and availability across all channels."
  },
  {
    title: "Photo Upload",
    content: "High-quality photos increase bookings by up to 40%. Upload multiple images for better results."
  }
];

export default function QuickHelp({ onOpenGuide }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Help Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700"
          size="icon"
        >
          <HelpCircle className="w-6 h-6" />
        </Button>
      </div>

      {/* Help Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-24 right-6 z-50 w-80"
          >
            <Card className="shadow-2xl border-0">
              <CardContent className="p-0">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-800">Quick Help</h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="p-4 space-y-3">
                  <Button 
                    onClick={() => {
                      onOpenGuide();
                      setIsOpen(false);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Open Setup Assistant
                  </Button>
                  
                  <div className="space-y-2">
                    {quickTips.map((tip, index) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-lg">
                        <h4 className="font-medium text-slate-800 text-sm mb-1">{tip.title}</h4>
                        <p className="text-xs text-slate-600">{tip.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}