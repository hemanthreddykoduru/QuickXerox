export const getRazorpayOptions = (RAZORPAY_KEY: string, order: { amount: number; currency: string; id: string }, onSuccess: (response: any) => void) => {
  const options = {
    key: RAZORPAY_KEY,
    amount: order.amount,
    currency: order.currency,
    name: 'QuickXerox',
    description: 'Print Service Payment',
    order_id: order.id,
    prefill: {
      name: localStorage.getItem('userName') || undefined,
      contact: localStorage.getItem('userPhone') || undefined,
    },
    theme: {
      color: '#2563EB',
    },
    modal: {
      ondismiss: () => {
        console.log('Payment modal dismissed');
      },
    },
    config: {
      display: {
        blocks: {
          qr: {
            name: 'Scan and Pay',
            instruments: [
              {
                method: 'upi',
              },
            ],
          },
        },
        sequence: ['block.qr'],
        preferences: {
          show_default_blocks: false,
        },
      },
    },
    handler: function (response: any) {
      console.log('Razorpay Payment Response:', response);
      if (response.razorpay_payment_id) {
        onSuccess(response);
      } else {
        console.error('Payment Failed:', response.error?.description);
      }
    },
  };
  return options;
};