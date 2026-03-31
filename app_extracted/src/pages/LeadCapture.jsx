import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2, Rocket, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { submitLeadToClose } from '@/api/functions';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';

export default function LeadCapture() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    properties_count: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('form'); // form, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    document.title = "Get Started with Channels Connect | Free Lead Capture";
    
    const checkUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        // Pre-fill form with user data if available
        if (currentUser) {
          setFormData(prev => ({
            ...prev,
            name: currentUser.full_name || '',
            email: currentUser.email || ''
          }));
        }
      } catch (error) {
        setUser(null);
      }
    };
    checkUser();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setErrorMessage('Please enter your name');
      return false;
    }
    if (!formData.email.trim()) {
      setErrorMessage('Please enter your email');
      return false;
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
    setErrorMessage('');

    try {
      // If not logged in, require login first
      if (!user) {
        await User.loginWithRedirect(window.location.href);
        return;
      }

      const response = await submitLeadToClose(formData);
      
      if (response.data.success) {
        setStatus('success');
      } else {
        throw new Error(response.data.error || 'Failed to submit lead');
      }
    } catch (error) {
      console.error('Lead submission error:', error);
      setErrorMessage(error.message || 'Failed to submit. Please try again.');
      setStatus('error');
      setTimeout(() => setStatus('form'), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-2xl border-0">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">You're All Set! 🎉</h3>
              <p className="text-slate-600 mb-6">
                Thank you for your interest! Our team will reach out to you within 24 hours to get your properties connected and generating more bookings.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.href = createPageUrl('Dashboard')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  onClick={() => window.location.href = createPageUrl('Home')}
                  variant="outline"
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
            Start Getting FREE Bookings Today
          </h1>
          <p className="text-lg text-slate-600">
            Fill out the form below and we'll get you connected in 24 hours
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-xl">Your Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="John Smith"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="john@example.com"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="company">Company / Property Name</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="Acme Vacation Rentals"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="properties_count">How many properties do you manage?</Label>
                    <Input
                      id="properties_count"
                      type="number"
                      value={formData.properties_count}
                      onChange={(e) => handleInputChange('properties_count', e.target.value)}
                      placeholder="5"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">What are you looking to achieve?</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="e.g., Increase bookings, connect to more channels, automate operations..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  {errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                      {errorMessage}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Get Started FREE
                        <Rocket className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-slate-500">
                    By submitting, you agree to our Terms of Service and Privacy Policy
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">What You'll Get:</h3>
                <ul className="space-y-3">
                  {[
                    '100% FREE instant bookings',
                    'Immediate guest payment',
                    'Works with your existing PMS',
                    'Distribution to 100+ channels',
                    '24/7 customer support',
                    'No credit card required'
                  ].map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">Guaranteed Results</h4>
                    <p className="text-slate-600 text-sm">
                      Property owners typically see 15-30% more bookings within the first 30 days. 
                      And since we're completely free, that's 100% profit increase!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm font-medium">
                ⚡ <strong>Limited Time:</strong> First 100 property managers get priority onboarding 
                and dedicated account support for free!
              </p>
            </div>
          </motion.div>
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-slate-600 mb-4">Trusted by 10,000+ property owners worldwide</p>
          <div className="flex justify-center gap-8 flex-wrap">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">100%</div>
              <div className="text-sm text-slate-600">Free Forever</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">24hrs</div>
              <div className="text-sm text-slate-600">Setup Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">30%+</div>
              <div className="text-sm text-slate-600">More Bookings</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}