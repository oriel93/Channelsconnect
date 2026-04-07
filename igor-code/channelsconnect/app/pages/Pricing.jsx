
import React, { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Pricing() {
  useEffect(() => {
    document.title = "Pricing | Channels Connect";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = "Simple, transparent pricing. Channels Connect is free to get started. We only succeed when you do.";
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDesc);
    }
    return () => {
      // Check if the metaDesc element is still a child of document.head before attempting to remove it
      // This prevents errors if another component or process has already removed it
      if (document.head.contains(metaDesc)) {
        document.head.removeChild(metaDesc);
      }
      // Optionally reset title if this is the only place it's set
      // For single-page apps, usually a more global title management strategy is used
      // For simplicity, we'll just leave it as it is after unmount unless specified
    };
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Channels Connect is completely free to get started. We only succeed when you do - we earn by optimizing your rates to increase your revenue.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center p-12">
              <div className="flex justify-center mb-4">
                <div className="bg-emerald-100 text-emerald-600 px-4 py-2 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-slate-800 mb-2">Free Forever</CardTitle>
              <p className="text-slate-600 text-lg">No setup fees, no monthly costs, no hidden charges</p>
              <div className="text-center mt-8">
                <span className="text-6xl font-extrabold text-slate-900">$0</span>
                <span className="text-xl text-slate-500 ml-2">to get started</span>
              </div>
              <p className="text-sm text-slate-500 mt-4">
                We earn a small commission only when we increase your bookings through rate optimization
              </p>
            </CardHeader>
            
            <CardContent className="p-12">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-4">What's Included:</h3>
                  <ul className="space-y-3">
                    {[
                      'Connect to 100+ booking channels',
                      'Real-time inventory synchronization',
                      'Automated rate optimization',
                      'Booking management dashboard',
                      'Performance analytics',
                      '24/7 customer support',
                      'Mobile app access',
                      'Multi-property management'
                    ].map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="w-5 h-5 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-slate-50 p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">How It Works:</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <p className="font-semibold text-slate-800">Sign Up Free</p>
                        <p className="text-sm text-slate-600">Create your account and connect your property</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <p className="font-semibold text-slate-800">We Connect Your Channels</p>
                        <p className="text-sm text-slate-600">Our team sets up all major booking platforms for you</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <p className="font-semibold text-slate-800">Start Getting More Bookings</p>
                        <p className="text-sm text-slate-600">Watch your revenue grow with optimized rates</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="p-12 text-center">
              <div className="w-full">
                <Link to={`${createPageUrl('Home')}#contact-form`}>
                  <Button size="lg" className="w-full max-w-md text-lg bg-slate-900 hover:bg-slate-800 py-4">
                    Get Started Free - No Credit Card Required
                  </Button>
                </Link>
                <p className="text-sm text-slate-500 mt-4">
                  Ready in 24 hours or less. Cancel anytime.
                </p>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "How do you make money if it's free?",
                a: "We earn a small commission only when we successfully optimize your rates and increase your bookings. If you don't make more money, we don't make any money."
              },
              {
                q: "How long does setup take?",
                a: "Most properties are fully connected and live on all major booking channels within 24-48 hours of signing up."
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes, absolutely. There are no contracts or commitments. You can disconnect your channels at any time."
              },
              {
                q: "Which booking channels do you connect to?",
                a: "We connect to 100+ channels including Booking.com, Expedia, Airbnb, Agoda, Hotels.com, and many more."
              }
            ].map((faq, i) => (
              <Card key={i} className="border-0 shadow-md">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-800 mb-2">{faq.q}</h3>
                  <p className="text-slate-600">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to={`${createPageUrl('Compare')}#rentals-united`}>
              <Button size="lg" variant="outline" className="text-lg">
                Compare vs Rentals United
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
