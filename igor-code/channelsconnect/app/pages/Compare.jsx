
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Star, Network } from 'lucide-react'; // Added Network import
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Compare() {
  React.useEffect(() => {
    document.title = "Compare Channels Connect to Other Platforms | Channel Manager Comparison";
    
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'See how Channels Connect stacks up against Guesty, Rentals United, and SiteMinder. Compare features, pricing, and benefits side by side.';
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDesc);
    }

    // Add smooth scrolling behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-slate-700 py-20 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Compare Channels Connect to Other Platforms
          </h1>
          <p className="text-lg text-slate-200 max-w-3xl mx-auto">
            See how Channels Connect stacks up against Guesty, Rentals United, and SiteMinder.
          </p>
        </div>
      </section>

      {/* New Section: Why Choose Channels Connect */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Why Choose Channels Connect Over Traditional Solutions?
            </h2>
            <p className="text-xl text-slate-600 mb-12">
              We replicate your existing listings and distribute them across 100+ channels to maximize your bookings
            </p>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Network className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Smart Distribution</h3>
              <p className="text-lg text-slate-600 mb-6">
                We replicate your property listings and intelligently distribute them across our network of 100+ booking channels, ensuring maximum exposure while maintaining your control over rates and availability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guesty Comparison Section */}
      <section id="guesty" className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Channels Connect vs Guesty</h2>
              <p className="text-lg text-slate-600">
                Unlike Guesty, Channels Connect doesn't lock essential features behind enterprise plans or subscriptions.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-2xl overflow-hidden border">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-4 text-left font-semibold">Feature</th>
                    <th className="p-4 text-center font-semibold bg-blue-700">
                      <div className="flex items-center justify-center gap-2">
                        <Star className="w-4 h-4" />
                        Channels Connect
                      </div>
                    </th>
                    <th className="p-4 text-center font-semibold">Guesty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">Free to connect</td>
                    <td className="p-4 text-center bg-blue-50/50"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" /></td>
                    <td className="p-4 text-center"><X className="w-6 h-6 text-red-500 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">No per-booking fees</td>
                    <td className="p-4 text-center bg-blue-50/50"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" /></td>
                    <td className="p-4 text-center"><X className="w-6 h-6 text-red-500 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">Keep your current PMS</td>
                    <td className="p-4 text-center bg-blue-50/50"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" /></td>
                    <td className="p-4 text-center"><X className="w-6 h-6 text-red-500 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">Free to Connect</h3>
                  <p className="text-slate-600">No setup fees or monthly subscriptions required.</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">No Per-booking Fees</h3>
                  <p className="text-slate-600">Keep 100% of your booking revenue.</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">Keep Your Existing PMS</h3>
                  <p className="text-slate-600">No need to migrate or change systems.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Rentals United Comparison Section */}
      <section id="rentals-united" className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Channels Connect vs Rentals United</h2>
              <p className="text-lg text-slate-600">
                Enjoy a simpler, faster setup process and transparent pricing without contracts or monthly minimums.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-2xl overflow-hidden border">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-4 text-left font-semibold">Feature</th>
                    <th className="p-4 text-center font-semibold bg-blue-700">Channels Connect</th>
                    <th className="p-4 text-center font-semibold">Rentals United</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">Full calendar and pricing sync</td>
                    <td className="p-4 text-center bg-blue-50/50"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">Instant connection to 100+ channels</td>
                    <td className="p-4 text-center bg-blue-50/50"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">No setup fees</td>
                    <td className="p-4 text-center bg-blue-50/50"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" /></td>
                    <td className="p-4 text-center"><X className="w-6 h-6 text-red-500 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">No Setup Fees</h3>
                  <p className="text-slate-600">Start connecting your channels immediately without upfront costs.</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">No Monthly Minimums</h3>
                  <p className="text-slate-600">Pay nothing until you start getting bookings.</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">More Flexibility</h3>
                  <p className="text-slate-600">No contracts or long-term commitments required.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* SiteMinder Comparison Section */}
      <section id="siteminder" className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Channels Connect vs SiteMinder</h2>
              <p className="text-lg text-slate-600">
                Connect instantly without per-booking charges or complex onboarding.
              </p>
            </div>
            
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
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">No contracts required</td>
                    <td className="p-4 text-center bg-blue-50/50"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" /></td>
                    <td className="p-4 text-center"><X className="w-6 h-6 text-red-500 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">Real-time listing sync</td>
                    <td className="p-4 text-center bg-blue-50/50"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" /></td>
                    <td className="p-4 text-center"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">100% free to start</td>
                    <td className="p-4 text-center bg-blue-50/50"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" /></td>
                    <td className="p-4 text-center"><X className="w-6 h-6 text-red-500 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-12">
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
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Make the Switch?</h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            See why property managers choose Channels Connect for transparent pricing and powerful features.
          </p>
          <Link to={`${createPageUrl('Home')}#contact-form`}>
            <Button size="lg" className="text-lg bg-white text-slate-900 hover:bg-slate-100">
              Get Started Free Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
