import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { submitLeadToClose } from '@/api/functions';
import { toast } from 'sonner';

export default function LeadCapturePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    properties_count: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Show popup after 5 seconds if not already dismissed
    const hasSeenPopup = sessionStorage.getItem('leadPopupSeen');
    if (!hasSeenPopup) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('leadPopupSeen', 'true');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitLeadToClose(formData);
      
      if (response.data.success) {
        toast.success('Thank you! Our team will contact you soon.');
        handleClose();
      } else {
        throw new Error(response.data.error || 'Failed to submit');
      }
    } catch (error) {
      console.error('Lead submission error:', error);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={handleClose}
          >
            {/* Popup - Click event stopped from propagating */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10 bg-white rounded-full p-1 shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="grid md:grid-cols-2">
                {/* Left side - Image and branding */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-8 flex flex-col justify-center items-center text-white rounded-l-2xl relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10">
                    <img 
                      src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800&auto=format&fit=crop" 
                      alt="Property" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="relative z-10 text-center">
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png" 
                      alt="Channels Connect" 
                      className="w-24 h-24 mx-auto mb-6 bg-white rounded-xl p-3"
                    />
                    <h2 className="text-3xl font-bold mb-4">
                      One platform.<br />
                      Completely free.<br />
                      Unlimited revenue.
                    </h2>
                    <p className="text-blue-100 text-sm">
                      Have questions or doubts?<br />
                      Let's chat—we'll help you make a confident decision
                    </p>
                  </div>
                </div>

                {/* Right side - Form */}
                <div className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="popup-name" className="text-sm font-medium text-slate-700">
                        Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="popup-name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="John Smith"
                        className="mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="popup-email" className="text-sm font-medium text-slate-700">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="popup-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="john@example.com"
                        className="mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="popup-phone" className="text-sm font-medium text-slate-700">
                        Phone
                      </Label>
                      <Input
                        id="popup-phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="popup-properties" className="text-sm font-medium text-slate-700">
                        Number of properties
                      </Label>
                      <Input
                        id="popup-properties"
                        type="number"
                        value={formData.properties_count}
                        onChange={(e) => handleInputChange('properties_count', e.target.value)}
                        placeholder="5"
                        className="mt-1"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-base font-semibold"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Get Started Free'
                      )}
                    </Button>

                    <p className="text-xs text-center text-slate-500">
                      By submitting, you agree to our Terms of Service
                    </p>
                  </form>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}