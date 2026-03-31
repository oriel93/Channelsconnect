import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Mail } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function HeroForm() {

  const handleSubmit = (e) => {
    e.preventDefault();
    // Redirect to the import page where the login wall is handled.
    window.location.href = createPageUrl('ImportListings');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="email"
          placeholder="Enter your email to get started"
          className="pl-10 py-3 text-base border-white/20 bg-white/10 text-white placeholder:text-white/70 focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-500"
          // Email input is now just for show, but can be used for analytics later
          required
        />
      </div>
      <Button 
        type="submit"
        size="lg" 
        className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-6 py-3 whitespace-nowrap"
      >
        Get Started Free
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </form>
  );
}