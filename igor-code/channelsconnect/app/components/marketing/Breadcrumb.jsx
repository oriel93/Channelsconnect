import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Breadcrumb({ crumbs }) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link to={createPageUrl('Home')} className="inline-flex items-center text-sm font-medium text-slate-700 hover:text-blue-600">
            Home
          </Link>
        </li>
        {crumbs.map((crumb, index) => (
          <li key={index}>
            <div className="flex items-center">
              <ChevronRight className="w-4 h-4 text-slate-400" />
              {index === crumbs.length - 1 ? (
                <span className="ml-1 text-sm font-medium text-slate-500 md:ml-2">
                  {crumb.name}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="ml-1 text-sm font-medium text-slate-700 hover:text-blue-600 md:ml-2"
                >
                  {crumb.name}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}