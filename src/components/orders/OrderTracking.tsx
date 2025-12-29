import React, { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle, Package, Truck, Home, AlertCircle } from 'lucide-react';
import { Order, OrderStatus } from '../../types';

interface TrackingEvent {
  id: string;
  status: OrderStatus;
  timestamp: string;
  description: string;
  location?: string;
  estimatedTime?: string;
}

interface OrderTrackingProps {
  order: Order;
  onStatusUpdate?: (newStatus: OrderStatus) => void;
}

const OrderTracking: React.FC<OrderTrackingProps> = ({ order, onStatusUpdate }) => {
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>('');
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);

  useEffect(() => {
    generateTrackingEvents();
    simulateLocationUpdates();
  }, [order]);

  const generateTrackingEvents = () => {
    const events: TrackingEvent[] = [
      {
        id: '1',
        status: 'pending',
        timestamp: order.timestamp,
        description: 'Order placed successfully',
        location: 'Customer Location'
      },
      {
        id: '2',
        status: 'processing',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        description: 'Order confirmed and sent to print shop',
        location: 'Print Shop - ' + order.shopId
      },
      {
        id: '3',
        status: 'processing',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        description: 'Printing in progress',
        location: 'Print Shop - ' + order.shopId
      }
    ];

    if (order.status === 'completed') {
      events.push({
        id: '4',
        status: 'completed',
        timestamp: new Date().toISOString(),
        description: 'Order ready for pickup',
        location: 'Print Shop - ' + order.shopId
      });
    }

    setTrackingEvents(events);
  };

  const simulateLocationUpdates = () => {
    // Simulate real-time location updates
    const locations = [
      'Print Shop - Processing',
      'Print Shop - Quality Check',
      'Print Shop - Packaging',
      'Ready for Pickup'
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < locations.length) {
        setCurrentLocation(locations[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 3000);

    // Set estimated delivery time
    const deliveryTime = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes from now
    setEstimatedDelivery(deliveryTime.toLocaleTimeString());

    return () => clearInterval(interval);
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Order Tracking</h3>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Order ID</p>
            <p className="font-medium text-gray-900">#{order.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="font-medium text-gray-900">₹{order.total.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Items</p>
            <p className="font-medium text-gray-900">{order.items.length} files</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Estimated Ready</p>
            <p className="font-medium text-gray-900">{estimatedDelivery}</p>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            {getStatusIcon(order.status)}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Current Status</h4>
            <p className="text-sm text-gray-600">{currentLocation}</p>
          </div>
        </div>
      </div>

      {/* Tracking Timeline */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Order Timeline</h4>
        <div className="relative">
          {trackingEvents.map((event, index) => (
            <div key={event.id} className="relative flex items-start space-x-4">
              {/* Timeline line */}
              {index < trackingEvents.length - 1 && (
                <div className="absolute left-4 top-8 w-0.5 h-16 bg-gray-200"></div>
              )}
              
              {/* Event icon */}
              <div className={`relative z-10 p-2 rounded-full ${
                event.status === order.status
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {getStatusIcon(event.status)}
              </div>
              
              {/* Event details */}
              <div className="flex-1 pb-8">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-gray-900">{event.description}</h5>
                  <span className="text-sm text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center space-x-1 mt-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex space-x-3">
        <button className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <MapPin className="h-4 w-4" />
          <span className="text-sm font-medium">View on Map</span>
        </button>
        <button className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Home className="h-4 w-4" />
          <span className="text-sm font-medium">Get Directions</span>
        </button>
      </div>

      {/* Contact Information */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h5 className="font-medium text-gray-900 mb-2">Need Help?</h5>
        <p className="text-sm text-gray-600 mb-3">
          If you have any questions about your order, contact the print shop directly.
        </p>
        <div className="flex space-x-3">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Call Print Shop
          </button>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
