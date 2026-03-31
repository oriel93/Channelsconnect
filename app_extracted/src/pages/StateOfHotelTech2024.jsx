
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Breadcrumb from '../components/marketing/Breadcrumb';
import { CheckCircle, Download, ArrowRight, TrendingUp, Users, MessageSquare, Smartphone } from 'lucide-react';

export default function StateOfHotelTech2024() {
  useEffect(() => {
    document.title = "State of Hotel Tech – The Latest Trends & Benchmarks | Channels Connect";
    const metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Our 2024 industry report on hotel technology trends, benchmarks, and opportunities.';
    document.head.appendChild(metaDesc);
    return () => {
      document.head.removeChild(metaDesc);
    };
  }, []);

  const crumbs = [
    { name: 'Resources', path: createPageUrl('Resources') },
    { name: 'State of Hotel Tech 2024', path: '#' },
  ];

  const handleDownloadPDF = () => {
    // Create a new window with the current page content for printing/PDF
    const printWindow = window.open('', '_blank');
    
    const cleanContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>State of Hotel Tech – The Latest Trends & Benchmarks</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #1e293b; font-size: 28px; margin-bottom: 20px; }
          h2 { color: #1e293b; font-size: 24px; margin-top: 30px; margin-bottom: 15px; }
          h3 { color: #1e293b; font-size: 20px; margin-top: 25px; margin-bottom: 10px; }
          p { color: #475569; margin-bottom: 15px; }
          ul { margin-bottom: 15px; }
          li { color: #475569; margin-bottom: 8px; }
          .section { margin-bottom: 40px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
          .stat-box { background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; margin: 10px; display: inline-block; min-width: 120px; vertical-align: top; }
          .stat-number { font-size: 24px; font-weight: bold; color: #1e40af; }
          .conclusion { background-color: #f8fafc; padding: 25px; border-radius: 8px; text-align: center; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>The 2024 Hotel Technology Benchmark Report</h1>
        <p><strong>Data-driven insights to guide your technology investments in the year ahead.</strong></p>
        
        <p>From AI-powered pricing to fully automated guest messaging, hotel technology is transforming operations worldwide. This report highlights the key trends and performance benchmarks you need to stay ahead in 2024.</p>
        
        <div class="section">
          <h2>Section 1: Adoption Trends in PMS & Channel Managers</h2>
          <div class="stat-box">
            <div class="stat-number">83%</div>
            <p>of properties now use a cloud-based PMS</p>
          </div>
          <div class="stat-box">
            <div class="stat-number">72%</div>
            <p>rely on integrated channel managers</p>
          </div>
          <p><strong>Benefits reported include:</strong></p>
          <ul>
            <li>Fewer overbookings</li>
            <li>Faster rate updates</li>
            <li>Increased direct bookings</li>
          </ul>
        </div>
        
        <div class="section">
          <h2>Section 2: The Rise of Direct Bookings</h2>
          <p>Travelers increasingly prefer booking directly with hotels.</p>
          <p><strong>Key strategies driving growth:</strong></p>
          <ul>
            <li>Loyalty programs and exclusive discounts</li>
            <li>Seamless booking engines</li>
            <li>Personalized communication before arrival</li>
          </ul>
          <p><strong>In 2023, hotels using targeted direct booking strategies saw an average 27% increase in direct reservations.</strong></p>
        </div>
        
        <div class="section">
          <h2>Section 3: Revenue Management & Dynamic Pricing</h2>
          <p>AI and data-driven pricing tools are becoming standard:</p>
          <ul>
            <li>Properties with dynamic pricing solutions reported a <strong>15–20% RevPAR uplift</strong>.</li>
            <li>Automation reduces the manual workload on revenue managers.</li>
          </ul>
        </div>
        
        <div class="section">
          <h2>Section 4: Guest Messaging & Personalization</h2>
          <p>Automated communication is now the norm:</p>
          <div class="stat-box">
            <div class="stat-number">70%</div>
            <p>use pre-arrival messaging</p>
          </div>
          <div class="stat-box">
            <div class="stat-number">65%</div>
            <p>automate review requests</p>
          </div>
          <div class="stat-box">
            <div class="stat-number">52%</div>
            <p>use WhatsApp or SMS</p>
          </div>
          <p>Personalized, timely messaging improves guest satisfaction and drives repeat business.</p>
        </div>
        
        <div class="conclusion">
          <h2>Conclusion</h2>
          <p>The most successful hotels combine modern tech with human hospitality. Use this report as a roadmap to evaluate your tools and uncover new opportunities.</p>
        </div>
        
        <p style="text-align: center; margin-top: 40px; color: #64748b;">
          <strong>Ready to future-proof your operations?</strong><br>
          Visit www.channelsconnect.com
        </p>
      </body>
      </html>
    `;
    
    printWindow.document.write(cleanContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print dialog
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="bg-white">
      <section className="bg-slate-50 py-12">
        <div className="container mx-auto px-6">
          <Breadcrumb crumbs={crumbs} />
          <div className="text-center pt-12 pb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
              The 2024 Hotel Technology Benchmark Report
            </h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Data-driven insights to guide your technology investments in the year ahead.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="space-y-12">
            <div className="text-center">
              <p className="text-slate-700 leading-relaxed text-lg">
                From AI-powered pricing to fully automated guest messaging, hotel technology is transforming operations worldwide. This report highlights the key trends and performance benchmarks you need to stay ahead in 2024.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6 text-blue-600" />
                  Section 1: Adoption Trends in PMS & Channel Managers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-6 rounded-xl text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">83%</div>
                    <p className="text-slate-700">of properties now use a cloud-based PMS</p>
                  </div>
                  <div className="bg-emerald-50 p-6 rounded-xl text-center">
                    <div className="text-3xl font-bold text-emerald-600 mb-2">72%</div>
                    <p className="text-slate-700">rely on integrated channel managers</p>
                  </div>
                </div>
                <p className="font-semibold text-slate-800">Benefits reported include:</p>
                <ul className="space-y-2">
                  {["Fewer overbookings", "Faster rate updates", "Increased direct bookings"].map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-blue-600" />
                  Section 2: The Rise of Direct Bookings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700">Travelers increasingly prefer booking directly with hotels.</p>
                <p className="font-semibold text-slate-800">Key strategies driving growth:</p>
                <ul className="space-y-2">
                  {[
                    "Loyalty programs and exclusive discounts",
                    "Seamless booking engines", 
                    "Personalized communication before arrival"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="bg-emerald-50 p-6 rounded-xl">
                  <p className="text-slate-700">
                    <strong>In 2023, hotels using targeted direct booking strategies saw an average 27% increase in direct reservations.</strong>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  Section 3: Revenue Management & Dynamic Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700">AI and data-driven pricing tools are becoming standard:</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Properties with dynamic pricing solutions reported a <strong>15–20% RevPAR uplift</strong>.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Automation reduces the manual workload on revenue managers.</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  Section 4: Guest Messaging & Personalization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700">Automated communication is now the norm:</p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-slate-800 mb-1">70%</div>
                    <p className="text-sm text-slate-600">use pre-arrival messaging</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-slate-800 mb-1">65%</div>
                    <p className="text-sm text-slate-600">automate review requests</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-slate-800 mb-1">52%</div>
                    <p className="text-sm text-slate-600">use WhatsApp or SMS</p>
                  </div>
                </div>
                <p className="text-slate-700">
                  Personalized, timely messaging improves guest satisfaction and drives repeat business.
                </p>
              </CardContent>
            </Card>

            <div className="text-center bg-slate-50 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-slate-800 mb-4">Conclusion</h3>
              <p className="text-slate-700 leading-relaxed text-lg">
                The most successful hotels combine modern tech with human hospitality. Use this report as a roadmap to evaluate your tools and uncover new opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Ready to Future-Proof Your Operations?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Download the complete report and benchmark your property against industry leaders.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="text-lg bg-slate-900 hover:bg-slate-800"
              onClick={handleDownloadPDF}
            >
              <Download className="w-5 h-5 mr-2" />
              Download the Report
            </Button>
            <Link to={createPageUrl('Connect')}>
              <Button size="lg" variant="outline" className="text-lg">
                Learn More <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
