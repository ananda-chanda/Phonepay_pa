import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const PHONEPE_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1";
const MERCHANT_ID = process.env.MERCHANT_ID;
const SALT_KEY = process.env.SALT_KEY;
const SALT_INDEX = process.env.SALT_INDEX;

app.post("/create-payment", async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Invalid amount" });
        }

        const transactionId = "TXN_" + Date.now();
        const payload = {
            merchantId: MERCHANT_ID,
            merchantTransactionId: transactionId, // Note: Key might be "merchantTransactionId"
            amount: amount * 100,
            redirectUrl: "https://greenbacksmicroservices.com/success",
            redirectMode: "REDIRECT", // Add required field
            callbackUrl: "https://phonepay-pa.vercel.app/payment-status",
            paymentInstrument: { type: "PAY_PAGE" } // Add required field
        };

        const payloadString = JSON.stringify(payload);
        const base64Payload = Buffer.from(payloadString).toString("base64");
        const checksum = crypto
            .createHash("sha256")
            .update(base64Payload + "/pg/v1/pay" + SALT_KEY) // Include endpoint path
            .digest("hex") + "###" + SALT_INDEX;

        const response = await axios.post(
            `${PHONEPE_BASE_URL}/pay`, // Use correct endpoint (/pay)
            { request: base64Payload }, // Send encoded payload as `request`
            {
                headers: {
                    "X-VERIFY": checksum,
                    "Content-Type": "application/json",
                },
            }
        );

        // Adjust response path based on PhonePe's actual structure
        const url = response.data.data.instrumentResponse.redirectInfo.url;
        res.json({ checkoutPageUrl: url });
    } catch (error) {
        console.error("Payment Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Payment initiation failed" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});