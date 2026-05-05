
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Breadcrumb from '../components/marketing/Breadcrumb';
import { CheckCircle, Download, ArrowRight } from 'lucide-react';

export default function MultiChannelDistributionChecklist() {
  useEffect(() => {
    document.title = "Multi-Channel Distribution Checklist | Channels Connect";
    const metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Use this checklist to set up and optimize multi-channel distribution for your properties.';
    document.head.appendChild(metaDesc);
    return () => {
      document.head.removeChild(metaDesc);
    };
  }, []);

  const crumbs = [
    { name: 'Resources', path: createPageUrl('Resources') },
    { name: 'Multi-Channel Distribution Checklist', path: '#' },
  ];

  const handleDownloadPDF = () => {
    // Create a new window with the current page content for printing/PDF
    const printWindow = window.open('', '_blank');
    
    const cleanContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>The Ultimate Checklist for Multi-Channel Distribution Success</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #1e293b; font-size: 28px; margin-bottom: 20px; }
          h2 { color: #1e293b; font-size: 24px; margin-top: 30px; margin-bottom: 15px; }
          h3 { color: #1e293b; font-size: 20px; margin-top: 25px; margin-bottom: 10px; }
          p { color: #475569; margin-bottom: 15px; }
          ul { margin-bottom: 15px; }
          ol { margin-bottom: 15px; padding-left: 20px; }
          li { color: #475569; margin-bottom: 8px; }
          .checklist { background-color: #f8fafc; padding: 25px; border-radius: 8px; margin: 30px 0; }
          .checklist-item { display: flex; align-items: center; margin-bottom: 15px; font-size: 18px; }
          .checkbox { width: 20px; height: 20px; border: 2px solid #10b981; border-radius: 50%; margin-right: 15px; background-color: #10b981; position: relative; }
          .checkbox::after { content: '✓'; color: white; font-weight: bold; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 14px; }
          .conclusion { background-color: #f8fafc; padding: 25px; border-radius: 8px; text-align: center; }
          .bg-blue-50 { background-color: #eff6ff; }
          .rounded-lg { border-radius: 0.5rem; }
          .p-6 { padding: 1.5rem; }
          .my-8 { margin-top: 2rem; margin-bottom: 2rem; }
          .font-semibold { font-weight: 600; }
          .mb-4 { margin-bottom: 1rem; }
          .list-decimal { list-style-type: decimal; }
          .list-inside { list-style-position: inside; }
          .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>Seamlessly Sync Your PMS Data</h1>
        <p><strong>Integrate with leading Property Management Systems to automate operations and keep every channel up to date.</strong></p>
        
        <h2>Understanding Multi-Channel Distribution</h2>
        <p>
          Multi-channel distribution involves replicating your property listings across multiple booking platforms 
          to maximize exposure and bookings. Rather than manually managing each platform, modern solutions 
          like Channels Connect automate this process while maintaining centralized control.
        </p>

        <p>Managing distribution across multiple channels is complex. This checklist will help you stay organized, avoid mistakes, and capture more bookings.</p>
        
        <div class="checklist">
          <h2>Multi-Channel Distribution Checklist</h2>
          <div class="checklist-item">
            <div class="checkbox"></div>
            <span>Connect all your channels</span>
          </div>
          <div class="checklist-item">
            <div class="checkbox"></div>
            <span>Enable automatic inventory sync</span>
          </div>
          <div class="checklist-item">
            <div class="checkbox"></div>
            <span>Maintain rate parity</span>
          </div>
          <div class="checklist-item">
            <div class="checkbox"></div>
            <span>Automate guest messaging workflows</span>
          </div>
          <div class="checklist-item">
            <div class="checkbox"></div>
            <span>Leverage promotions</span>
          </div>
          <div class="checklist-item">
            <div class="checkbox"></div>
            <span>Review performance monthly</span>
          </div>
          <div class="checklist-item">
            <div class="checkbox"></div>
            <span>Train your team</span>
          </div>
        </div>

        <h3>Technical Implementation</h3>
        <div class="bg-blue-50 p-6 rounded-lg my-8">
          <h4 class="text-lg font-semibold mb-4">How Channel Distribution Works</h4>
          <ol class="list-decimal list-inside space-y-2">
            <li>Connect your existing PMS or primary booking platform</li>
            <li>Our system replicates your property data and availability</li>
            <li>Listings are automatically distributed to partner channels</li>
            <li>Real-time synchronization keeps all platforms updated</li>
            <li>Bookings flow back to your primary management system</li>
          </ol>
        </div>
        
        <div class="conclusion">
          <h2>Conclusion</h2>
          <p>Multi-channel distribution doesn't have to be overwhelming. Follow this checklist to stay ahead and maximize your results.</p>
        </div>
        
        <p style="text-align: center; margin-top: 40px; color: #64748b;">
          <strong>Want help optimizing your distribution?</strong><br>
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
              Seamlessly Sync Your PMS Data
            </h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Integrate with leading Property Management Systems to automate operations and keep every channel up to date.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="space-y-8">
            <p className="text-slate-700 leading-relaxed text-lg">
              Managing distribution across multiple channels is complex. This checklist will help you stay organized, avoid mistakes, and capture more bookings.
            </p>

            <div className="prose prose-lg mx-auto">
              <h2>Understanding Multi-Channel Distribution</h2>
              <p>
                Multi-channel distribution involves replicating your property listings across multiple booking platforms 
                to maximize exposure and bookings. Rather than manually managing each platform, modern solutions 
                like Channels Connect automate this process while maintaining centralized control.
              </p>
            </div>

            <Card className="bg-slate-50 border-0">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Multi-Channel Distribution Checklist</h2>
                <div className="space-y-4">
                  {[
                    "Connect all your channels",
                    "Enable automatic inventory sync",
                    "Maintain rate parity",
                    "Automate guest messaging workflows",
                    "Leverage promotions",
                    "Review performance monthly",
                    "Train your team"
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-emerald-500 mt-1 flex-shrink-0" />
                      <span className="text-slate-700 text-lg">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <h3>Technical Implementation</h3>
            <div className="bg-blue-50 p-6 rounded-lg my-8">
              <h4 className="text-lg font-semibold mb-4">How Channel Distribution Works</h4>
              <ol className="list-decimal list-inside space-y-2">
                <li>Connect your existing PMS or primary booking platform</li>
                <li>Our system replicates your property data and availability</li>
                <li>Listings are automatically distributed to partner channels</li>
                <li>Real-time synchronization keeps all platforms updated</li>
                <li>Bookings flow back to your primary management system</li>
              </ol>
            </div>

            <p className="text-slate-700 leading-relaxed text-lg">
              Multi-channel distribution doesn't have to be overwhelming. Follow this checklist to stay ahead and maximize your results.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Ready to Optimize Your Distribution?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Download the complete checklist and get expert guidance on implementing these strategies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="text-lg bg-slate-900 hover:bg-slate-800"
              onClick={handleDownloadPDF}
            >
              <Download className="w-5 h-5 mr-2" />
              Download Checklist
            </Button>
            <Link to={createPageUrl('Connect')}>
              <Button size="lg" variant="outline" className="text-lg">
                Get Help Implementing <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
