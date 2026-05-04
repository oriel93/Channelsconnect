import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Linkedin, Mail, Globe, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const teamMembers = [
  {
    name: "Eli Rouimi",
    role: "CEO",
    bio: "A visionary leader, Eli drives the company's strategic direction, leveraging extensive experience in hospitality technology to innovate and inspire growth.",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e499bc31c_eliphoto.jpeg",
    linkedin: "https://www.linkedin.com/in/elirouimi-7867085552/",
    email: "Eli@erorentals.com"
  },
  {
    name: "Oriel Hagbi",
    role: "COO",
    bio: "Oriel masterfully oversees all daily operations, ensuring organizational excellence and scaling our business processes to support rapid global expansion.",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/99b9c7584_orielphoto.jpg",
    linkedin: "https://www.linkedin.com/in/oriel-hagbi-427096169/",
    email: "Oriel@erorentals.com"
  },
  {
    name: "Maria Loazia",
    role: "Executive Assistant",
    bio: "Maria provides exceptional support to our leadership team, managing executive communications and workflows to enhance organizational efficiency.",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/876bdf4a9_marphoto.jpeg",
    linkedin: "#",
    email: "maria@channelsconnect.com"
  },
  {
    name: "Dianh Aguinaldo",
    role: "Director of Sales",
    bio: "As the head of our sales division, Dianh develops powerful strategies to expand our market share and builds lasting relationships with key enterprise clients.",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/c52ef3bc5_PicsArt_07-02-050312.jpg",
    linkedin: "https://www.linkedin.com/in/dianh-aguinaldo-73383589/",
    email: "Sales@erorentals.com"
  },
  {
    name: "Neil Fran",
    role: "Director of Global Marketing",
    bio: "Neil spearheads our global marketing initiatives, driving brand awareness and executing campaigns that generate impactful leads and fuel worldwide growth.",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dd9113438_Neilphoto.jpeg",
    linkedin: "#",
    email: "Sales@erorentals.com"
  },
  {
    name: "Chadel Lao",
    role: "Head of Customer Relations",
    bio: "Chadel is dedicated to fostering strong, long-term client partnerships, ensuring unparalleled satisfaction and acting as the primary advocate for our customers.",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/ea9a205b7_Photo2.jpg",
    linkedin: "#",
    email: "Reservations@erorentals.com"
  },
  {
    name: "Marjorie Busilig",
    role: "Customer Support",
    bio: "Marjorie delivers exceptional front-line support, promptly resolving technical issues to ensure a consistently positive and helpful experience for all our users.",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f6e82d583_marjphoto.jpg",
    linkedin: "#",
    email: "Reservations@erorentals.com"
  }
];

export default function Team() {
  useEffect(() => {
    document.title = "Our Team | Channels Connect";
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      document.head.appendChild(metaDesc);
    }
    metaDesc.name = 'description';
    metaDesc.content = "Meet the industry veterans behind Channels Connect, with decades of experience in hospitality technology and revenue optimization.";
    
    return () => {
      // It's generally better to reset or remove only the meta tags you specifically added,
      // or if you know this page is the only one setting it, otherwise it might affect
      // other parts of the site that expect a description.
      // For this specific change, we'll revert to a common practice of leaving it if it was already there,
      // but ensure if we created it, we remove it.
      // Given the outline, the expectation is to always remove.
      if (document.head.contains(metaDesc)) { // Check if it's still in the head before removal
        document.head.removeChild(metaDesc);
      }
      // You might also want to reset document.title here if needed, but often not required for SPA.
    };
  }, []);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-800 mb-4 sm:mb-6">
            Meet Our Expert Team
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Industry veterans with decades of combined experience in hospitality technology, 
            channel management, and revenue optimization.
          </p>
        </div>
      </section>

      {/* Team Grid */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
            {teamMembers.map((member, i) => (
              <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="aspect-square overflow-hidden bg-slate-100">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">{member.name}</h3>
                  <p className="text-blue-600 font-semibold mb-4 text-sm sm:text-base">{member.role}</p>
                  <p className="text-slate-600 mb-6 leading-relaxed text-sm sm:text-base">{member.bio}</p>
                  <div className="flex gap-3">
                    {member.linkedin && member.linkedin !== "#" ? (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer"
                      >
                        <Linkedin className="w-4 h-4 mr-2 text-[#0A66C2]" />
                        <span className="sm:inline">LinkedIn</span>
                      </a>
                    ) : null}
                    <a
                      href={`mailto:${member.email}?subject=Inquiry%20about%20Channels%20Connect&body=Hi%20${member.name}%2C%0A%0AI%20would%20like%20to%20learn%20more%20about%20Channels%20Connect%20and%20how%20it%20can%20help%20my%20property.%0A%0APlease%20let%20me%20know%20when%20would%20be%20a%20good%20time%20to%20discuss.%0A%0AThank%20you%21`}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      <span className="sm:inline">Email</span>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Company Values */}
      <section className="bg-slate-50 py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 mb-4 sm:mb-6">
              Our Values
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
              The principles that guide everything we do at Channels Connect
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                title: "Customer First",
                description: "Every decision we make is driven by what's best for our customers and their success."
              },
              {
                title: "Innovation",
                description: "We continuously push the boundaries of what's possible in hospitality technology."
              },
              {
                title: "Transparency",
                description: "Honest communication and clear pricing with no hidden fees or surprises."
              },
              {
                title: "Reliability",
                description: "Building robust, dependable systems that our customers can count on 24/7."
              },
              {
                title: "Partnership",
                description: "We succeed when our customers succeed. Their growth is our primary goal."
              },
              {
                title: "Excellence",
                description: "Striving for perfection in every aspect of our product and service delivery."
              }
            ].map((value, i) => (
              <Card key={i} className="border-0 shadow-md">
                <CardContent className="p-6 sm:p-8 text-center">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-3 sm:mb-4">{value.title}</h3>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Join Our Team CTA */}
      <section className="py-16 sm:py-20 lg:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 mb-4 sm:mb-6">
            Join Our Growing Team
          </h2>
          <p className="text-base sm:text-lg text-slate-600 mb-8 sm:mb-10 max-w-2xl mx-auto">
            We're always looking for talented individuals who share our passion for transforming the hospitality industry.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to={`${createPageUrl('Home')}#contact-form`}>
              <Button size="lg" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                <Globe className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                View Open Positions
              </Button>
            </Link>
            <Link to={`${createPageUrl('Compare')}#guesty`}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                Why Choose Us vs Guesty
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
