import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CompareSiteminder() {
  React.useEffect(() => {
    document.title = "Channels Connect vs SiteMinder | Channel Manager Comparison";
    
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Discover how Channels Connect offers a simpler way to connect and distribute your vacation rental listings—without per-booking charges.';
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDesc);
    }
  }, []);

  const features = [
    { feature: "No contracts required", channelsConnect: true, siteminder: false },
    { feature: "Instant connection to major channels", channelsConnect: true, siteminder: true },
    { feature: "Transparent, commission-free pricing", channelsConnect: true, siteminder: false },
    { feature: "Works with vacation rentals", channelsConnect: true, siteminder: false },
    { feature: "No setup fees", channelsConnect: true, siteminder: false },
    { feature: "Multi-calendar sync", channelsConnect: true, siteminder: true }
  ];

  const renderCell = (value) => {
    if (value === true) return <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" />;
    if (value === false) return <X className="w-6 h-6 text-red-500 mx-auto" />;
    return value;
  };

  return (
    <div className="bg-white">
      <section className="bg-slate-700 py-20 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Channels Connect vs SiteMinder
          </h1>
          <p className="text-lg text-slate-200 max-w-3xl mx-auto">
            Discover how Channels Connect offers a simpler way to connect and distribute your vacation rental listings—without per-booking charges.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-2xl overflow-hidden border">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-4 text-left font-semibold">Feature</th>
                    <th className="p-4 text-center font-semibold bg-blue-700">Channels Connect</th>
                    <th className="p-4 text-center font-semibold">SiteMinder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {features.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-800">{row.feature}</td>
                      <td className="p-4 text-center bg-blue-50/50">{renderCell(row.channelsConnect)}</td>
                      <td className="p-4 text-center">{renderCell(row.siteminder)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">No Contracts Required</h3>
                  <p className="text-slate-600">Start and stop anytime without long-term commitments.</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">Vacation Rental Focused</h3>
                  <p className="text-slate-600">Built specifically for short-term rental properties.</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">Transparent Pricing</h3>
                  <p className="text-slate-600">No hidden fees or per-booking charges.</p>
                </CardContent>
              </Card>
            </div>

            <Link to={`${createPageUrl('Home')}#contact-form`}>
              <Button size="lg" className="bg-slate-900 hover:bg-slate-800">
                Choose Channels Connect
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}