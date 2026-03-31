import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DynamicPricingTool() {
  React.useEffect(() => {
    document.title = "Dynamic Pricing Tool for Vacation Rentals | Channels Connect";
    
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Maximize your revenue with intelligent pricing. Channels Connect adjusts your rates automatically based on seasonality, demand, and custom rules.';
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDesc);
    }
  }, []);

  return (
    <div className="bg-white">
      <section className="bg-slate-700 py-20 text-white">
        <div className="container mx-auto px-6 text-center">
          <DollarSign className="w-16 h-16 mx-auto mb-6 text-green-400" />
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Dynamic Pricing Tool
          </h1>
          <p className="text-lg text-slate-200 max-w-3xl mx-auto">
            Maximize your revenue with intelligent pricing. Channels Connect adjusts your rates automatically based on seasonality, demand, and custom rules.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <TrendingUp className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Automated Rate Optimization</h3>
                <p className="text-slate-600">AI-powered pricing adjusts rates based on market demand and competition.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Last-minute Discount Rules</h3>
                <p className="text-slate-600">Automatically apply discounts to fill empty nights and maximize occupancy.</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardContent className="p-8">
                <Calendar className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">Seasonal Pricing Strategies</h3>
                <p className="text-slate-600">Set custom pricing rules for holidays, events, and peak seasons.</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Ready to Optimize Your Pricing?</h2>
            <p className="text-lg text-slate-600 mb-8">Start maximizing your revenue with smart pricing today.</p>
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