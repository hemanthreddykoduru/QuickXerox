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
                method: 'upi', // QR supports UPI-based payments
              },
            ],
          },
        },
        sequence: ['block.qr'],
        preferences: {
          show_default_blocks: false, // Avoid showing other methods by default
        },
      },
    },
    handler: function (response: any) {
        console.log('Razorpay Payment Response:', response);
        if (response.razorpay_payment_id) {
          alert('Payment Successful! Payment ID: ' + response.razorpay_payment_id);
        } else {
          alert('Payment Failed: ' + response.error?.description);
        }
      },
      