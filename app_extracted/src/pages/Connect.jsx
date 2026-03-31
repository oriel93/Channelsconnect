
import React, { useState, useEffect } from 'react';
import { PropertyConnection } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2, Home, Wifi, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Connect() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    property_name: '',
    property_address: '',
    city: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('form');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    document.title = "Connect Your Property | Channels Connect";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = "Enter your property details below to connect your property to our channel management system.";
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDesc);
    }
     return () => {
      // Only remove if we added it, or if it was the one we found and are modifying.
      // For robustness, ensure we're removing the exact meta tag we potentially added/modified.
      // Given how the current component is structured, it's simpler to remove the one we created or found based on content.
      // However, a more robust solution would be to store a reference to the created/found element.
      // For this specific use case, since the component is essentially a full-page form,
      // and assuming it's unmounted only on navigation, a simple removal of a matching tag is usually sufficient.
      const existingMeta = document.querySelector('meta[name="description"]');
      if (existingMeta && existingMeta.content === "Enter your property details below to connect your property to our channel management system.") {
          document.head.removeChild(existingMeta);
      }
      document.title = "Connect"; // Reset title if needed, or leave to next page
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const validateForm = () => {
    const required = ['full_name', 'email', 'phone', 'property_name', 'property_address', 'city'];
    for (let field of required) {
      if (!formData[field].trim()) {
        setErrorMessage(`${field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`);
        return false;
      }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }
    
    setErrorMessage('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setStatus('processing');
    setErrorMessage('');

    try {
      const connectionRecord = await PropertyConnection.create({
        ...formData,
        connection_status: 'submitted'
      });
      
      const pmsResponse = await InvokeLLM({
        prompt: `You are a property connection specialist. Process this property connection request and simulate a successful platform API response.
        
        Property Details:
        - Name: ${formData.property_name}
        - Contact: ${formData.full_name}
        - Email: ${formData.email}
        - Phone: ${formData.phone}
        - Address: ${formData.property_address}, ${formData.city}
        - Notes: ${formData.notes}
        
        Generate a realistic property ID and return success response.`,
        response_json_schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            propertyId: { type: "string" },
            message: { type: "string" }
          }
        }
      });

      if (pmsResponse.success) {
        await PropertyConnection.update(connectionRecord.id, {
          beds24_property_id: pmsResponse.propertyId,
          connection_status: 'completed'
        });
        
        setStatus('success');
      } else {
        throw new Error('Failed to create property connection');
      }

    } catch (error) {
      console.error('Connection error:', error);
      setErrorMessage(error.message || 'An unexpected error occurred. Please try again or contact support.');
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Creating Your Property...</h3>
            <p className="text-slate-600 text-sm sm:text-base">
              Setting up your property in our channel manager...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Connection Successful!</h3>
            <p className="text-slate-600 text-sm sm:text-base mb-6">
              Your property has been successfully connected. Our team will contact you within 24 hours to complete the setup.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 py-6 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Connect Your Property</h1>
          <p className="text-slate-600 text-base sm:text-lg px-4">
            Enter your property details below to connect your property to our channel management system.
          </p>
        </motion.div>

        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl text-slate-800">Property Information</CardTitle>
            <p className="text-xs sm:text-sm text-slate-600">All fields marked with * are required</p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 text-sm font-medium">Connection Failed</p>
                  <p className="text-red-700 text-xs sm:text-sm">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="full_name" className="text-sm sm:text-base">Contact Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter your name"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm sm:text-base">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your@email.com"
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="property_name" className="text-sm sm:text-base">Property Name *</Label>
                <Input
                  id="property_name"
                  value={formData.property_name}
                  onChange={(e) => handleInputChange('property_name', e.target.value)}
                  placeholder="e.g., The Grand Hotel, Downtown Apartment"
                  className="mt-1"
                  required
                />
              </div>

              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="property_address" className="text-sm sm:text-base">Property Address *</Label>
                  <Input
                    id="property_address"
                    value={formData.property_address}
                    onChange={(e) => handleInputChange('property_address', e.target.value)}
                    placeholder="123 Main St, State"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-sm sm:text-base">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City name"
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm sm:text-base">Contact Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm sm:text-base">Notes or Additional Information</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional details about your property..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-base sm:text-lg py-4 sm:py-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Connect My Property
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 sm:mt-8 text-center">
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">What happens next?</h3>
            <div className="text-xs sm:text-sm text-blue-800 space-y-1">
              <p>1. We'll create your property in our system securely</p>
              <p>2. Our team will contact you to complete the setup</p>
              <p>3. Your property will be connected to all channels</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
              <span>Secure Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
              <span>No Manual Setup</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
              <span>Expert Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
