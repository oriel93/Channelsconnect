import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Shield, Users, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PmsIntegration() {
  React.useEffect(() => {
    document.title = "PMS Integration for Vacation Rentals | Channels Connect";
    
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Connect Channels Connect to your existing property management system. No migrations needed—just effortless syncing of your inventory and pricing.';
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDesc);
    }
  }, []);

  return (
    <div className="bg-white">
      <section className="bg-slate-700 py-20 text-white">
        <div className="container mx-auto px-6 text-center">
          <Users className="w-16 h-16 mx-auto mb-6 text-blue-400" />
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            PMS Integration
          </h1>
          <p className="text-lg text-slate-200 max-w-3xl mx-auto">
            Connect Channels Connect to your existing property management system. No migrations needed—just effortless syncing of your inventory and pricing.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Works with Leading PMS</h3>
                <p className="text-slate-600">Seamlessly integrates with Hostfully, OwnerRez, Guesty, and more.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <Zap className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">No System Changes Required</h3>
                <p className="text-slate-600">Keep your existing workflow and processes intact.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Fast, Secure Setup</h3>
                <p className="text-slate-600">Connect your PMS in minutes with enterprise-grade security.</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Ready to Connect Your PMS?</h2>
            <p className="text-lg text-slate-600 mb-8">Integrate with your property management system today.</p>
            <Link to={`${createPageUrl('Home')}#contact-form`}>
              <Button size="lg" className="bg-slate-900 hover:bg-slate-800">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}