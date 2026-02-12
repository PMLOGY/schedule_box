'use client';

/**
 * Widget Content Client Component
 *
 * Handles PostMessage communication with parent window and user interactions.
 */

import { useEffect } from 'react';
import { Star } from 'lucide-react';

interface Service {
  uuid: string;
  name: string;
  description: string;
  duration: number;
  price: string;
  currency: string;
}

interface Company {
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  averageRating: number;
  reviewCount: number;
}

interface WidgetContentProps {
  company: Company;
  services: Service[];
  locale: string;
  theme: string;
}

export function WidgetContent({ company, services, locale }: WidgetContentProps) {
  useEffect(() => {
    // Send resize event after initial render
    const sendResize = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage(
        {
          type: 'RESIZE',
          height,
        },
        '*',
      );
    };

    // Send initial resize
    sendResize();

    // Send resize on window resize
    window.addEventListener('resize', sendResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', sendResize);
    };
  }, []);

  const handleBookService = (service: Service) => {
    // Send service selection event to parent
    window.parent.postMessage(
      {
        type: 'SERVICE_SELECTED',
        service: {
          uuid: service.uuid,
          name: service.name,
          price: service.price,
        },
      },
      '*',
    );

    // Open full booking page in new tab
    const bookingUrl = `/${locale}/${company.slug}?service=${service.uuid}`;
    window.open(bookingUrl, '_blank', 'noopener,noreferrer');
  };

  const formatPrice = (price: string, currency: string) => {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) return `0 ${currency}`;
    return `${priceNum.toLocaleString(locale)} ${currency}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} h`;
    }
    return `${hours} h ${remainingMinutes} min`;
  };

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto">
      {/* Company Header */}
      <div className="mb-6 text-center">
        {company.logo && (
          <img
            src={company.logo}
            alt={company.name}
            className="w-16 h-16 mx-auto mb-3 rounded-full object-cover"
          />
        )}
        <h1 className="text-2xl font-bold mb-2">{company.name}</h1>
        {company.averageRating > 0 && (
          <div className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{company.averageRating.toFixed(1)}</span>
            {company.reviewCount > 0 && <span>({company.reviewCount} reviews)</span>}
          </div>
        )}
      </div>

      {/* Services List */}
      {services.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">No services available at the moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.uuid}
              className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">
                      {formatPrice(service.price, service.currency)}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span>{formatDuration(service.duration)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleBookService(service)}
                  className="px-4 py-2 rounded-md font-medium text-white transition-colors flex-shrink-0"
                  style={{
                    backgroundColor: company.primaryColor,
                  }}
                  onMouseEnter={(e) => {
                    // Darken on hover (simple approach)
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  Book
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-500">
        Powered by ScheduleBox
      </div>
    </div>
  );
}
