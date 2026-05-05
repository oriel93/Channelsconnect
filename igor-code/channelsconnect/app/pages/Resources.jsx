
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Users, BarChart, X, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const resources = [
  {
    category: "Guides",
    icon: BookOpen,
    title: "The 2024 Guide to Hotel Channel Management",
    description: "Everything you need to know to build a successful distribution strategy and maximize your online reach.",
    image: "https://images.unsplash.com/photo-1554224155-1696413565d3?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max",
    fullContent: "This comprehensive guide covers the essential strategies for modern hotel distribution. Learn how to optimize your channel mix, understand commission structures, and implement dynamic pricing strategies that maximize your revenue. We'll walk you through setting up integrations with major OTAs, managing inventory across multiple platforms, and using data analytics to make informed decisions about your distribution strategy.",
    path: createPageUrl('HotelChannelManagementGuide2024')
  },
  {
    category: "Customer Story",
    icon: Users,
    title: "How Seaside Resort Increased Direct Bookings by 40%",
    description: "Learn how Channels Connect helped a boutique resort optimize their channel mix and drive more profitable revenue.",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max",
    fullContent: "Seaside Resort was struggling with high commission fees and overdependence on OTAs. After implementing Channels Connect, they were able to streamline their distribution strategy, reduce manual workload by 60%, and most importantly, increase their direct bookings by 40% within just 6 months. The resort's revenue manager, Sarah Johnson, shares the exact strategies and tools they used to achieve these remarkable results.",
    path: null // This one stays as modal for now
  },
  {
    category: "Industry Report",
    icon: BarChart,
    title: "State of Hotel Tech: The Latest Trends & Benchmarks",
    description: "Our annual report on the technology shaping the hospitality industry, with data from over 5,000 properties.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max",
    fullContent: "Based on data from over 5,000 properties worldwide, this report reveals the latest trends in hotel technology adoption. Key findings include: 78% of hotels are investing in channel management solutions, average RevPAR increases of 23% after implementing automated distribution tools, and emerging technologies that are reshaping guest experiences. The report also includes benchmarking data to help you understand where your property stands in the market.",
    path: createPageUrl('StateOfHotelTech2024')
  },
  {
    category: "Checklist",
    icon: BookOpen,
    title: "The Ultimate Checklist for Multi-Channel Distribution Success",
    description: "Download our comprehensive checklist for successful multi-channel distribution and streamline your property management.",
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max",
    fullContent: "Managing distribution across multiple channels is complex. This checklist will help you stay organized, avoid mistakes, and capture more bookings. Follow our step-by-step guide to ensure your property is optimized across all major booking platforms.",
    path: createPageUrl('MultiChannelDistributionChecklist')
  }
];

export default function Resources() {
  const [selectedResource, setSelectedResource] = useState(null);

  useEffect(() => {
    document.title = "Resources | Channels Connect";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = "Guides, checklists, and tools to help property managers improve distribution and grow bookings.";
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDesc);
    }
     return () => {
      if (document.head.contains(metaDesc)) {
        document.head.removeChild(metaDesc);
      }
    };
  }, []);

  const handleDownloadPDF = (resource) => {
    // This will now open the PDF in a new tab.
    // For demo purposes - in production, these would link to actual PDFs
    window.open('#', '_blank');
  };

  return (
    <div className="bg-white">
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
            Insights & Resources
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Explore our library of guides, reports, and customer stories to stay ahead in the hospitality industry.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {resources.map((resource) => (
              <Card key={resource.title} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img src={resource.image} alt={resource.title} className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-6 flex-grow flex flex-col">
                  <Badge variant="secondary" className="mb-3 self-start">{resource.category}</Badge>
                  <h3 className="text-xl font-bold text-slate-800 mb-3 flex-grow">{resource.title}</h3>
                  <p className="text-slate-600 mb-6">{resource.description}</p>
                  {resource.path ? (
                    <Link to={resource.path}>
                      <Button variant="outline" className="w-full">
                        Read More <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedResource(resource)}
                      className="w-full"
                    >
                      Read More <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Resource Modal */}
      <Dialog open={!!selectedResource} onOpenChange={() => setSelectedResource(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">
              {selectedResource?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Badge variant="secondary">{selectedResource?.category}</Badge>
            <img 
              src={selectedResource?.image} 
              alt={selectedResource?.title}
              className="w-full h-48 object-cover rounded-lg"
            />
            <p className="text-slate-600 leading-relaxed">
              {selectedResource?.fullContent}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setSelectedResource(null)}>
                Close
              </Button>
              <Button 
                className="bg-slate-900 hover:bg-slate-800"
                onClick={() => handleDownloadPDF(selectedResource)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
