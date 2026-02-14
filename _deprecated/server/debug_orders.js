
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

async function listOrders() {
  console.log("Fetching orders...");
  const snapshot = await db.collection("orders").get();
  
  if (snapshot.empty) {
    console.log("No orders found in 'orders' collection.");
    return;
  }

  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log("--------------------------------------------------");
    console.log(`Order ID (Doc): ${doc.id}`);
    console.log(`Order ID (Field): ${data.id}`);
    console.log(`Shop ID: ${data.shopId}`);
    console.log(`Customer: ${data.customerName}`);
    console.log(`Timestamp: ${data.timestamp}`);
    console.log(`Status: ${data.status}`);
  });
}

listOrders();
