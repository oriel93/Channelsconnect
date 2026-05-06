import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function HeroForm() {

  const handleSubmit = (e) => {
    e.preventDefault();
    // Redirect to the import page where the login wall is handled.
    window.location.href = createPageUrl('ImportListings');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
      <div className="flex-1">
        <Input
          type="email"
          placeholder="Enter your email to get started"
          className="w-full py-3 px-4 text-base rounded-lg bg-white text-gray-900 placeholder:text-gray-400 border-0 shadow-sm focus:ring-2 focus:ring-blue-300"
          required
        />
      </div>
      <Button 
        type="submit"
        size="lg" 
        className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-6 py-3 whitespace-nowrap shadow-sm"
      >
        Get Started Free
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </form>
  );
}