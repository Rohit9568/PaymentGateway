const express = require("express");
const axios = require("axios");
const app = express();
const PORT = 5000;
const uniqid = require("uniqid");
const sha256 = require('sha256');

// Correct the URL by removing extra space
const PHONE_PE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
const MERCHANT_ID = "PGTESTPAYUAT";
const SALT_INDEX = "1";
const SALT_KEY = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";

app.get("/", (req, res) => {
  res.send("PhonePe app is working");
});



app.get("/pay", (req, res) => {
  const payEndpoint = "/pg/v1/pay";
  const merchantTransactionId = uniqid();
  const userId = 123;

  const payload = {
    merchantId: MERCHANT_ID,
    merchantTransactionId: merchantTransactionId,
    merchantUserId: userId,
    amount: 10000, // in paise
    redirectUrl: `https://localhost:3000/redirect-url/${merchantTransactionId}`,
    redirectMode: "REDIRECT",
    mobileNumber: "9999999999",
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  // SHA256(base64 encoded payload + “/pg/v1/pay” + salt key) + ### + salt index
  const bufferObj = Buffer.from(JSON.stringify(payload), "utf8");
  const base64EncodedPayload = bufferObj.toString("base64");
  const xVerify = sha256(base64EncodedPayload + payEndpoint + SALT_KEY) + "###" + SALT_INDEX;

  const options = {
    method: "post",
    url: `${PHONE_PE_HOST_URL}${payEndpoint}`,
    headers: {
      accept: "application/json", // Accept JSON response
      "Content-Type": "application/json",
      "X-VERIFY": xVerify,
    },
    data: {
      request: base64EncodedPayload, // Send payload wrapped in 'request' key
    },
  };

  axios
    .request(options)
    .then(function (response) {
      console.log(response.data);
      const url = response.data.data.instrumentResponse.redirectInfo.url;
      res.redirect(url);
    })
    .catch(function (error) {
      console.error("Error response:", error.response ? error.response.data : error.message);
      res.status(500).send("Payment request failed");
    });
});

app.get("/redirect-url/:merchantTransactionId", (req,res) => {
    const { merchantTransactionId } = req.params;
    console.log("merchantTransactionId" ,merchantTransactionId);

    if(merchantTransactionId){

        //	SHA256(“/pg/v1/status/{merchantId}/{merchantTransactionId}” + saltKey) + “###” + saltIndex
        const xVerify = sha256(`/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + SALT_KEY)  + "###" + SALT_INDEX;
const options = {
  method: 'get',
  url: `${PHONE_PE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`,
  headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        "X-MERCHANT-ID" :merchantTransactionId,
        "X-VERIFY" : xVerify
				},

};
axios
  .request(options)
      .then(function (response) {
      console.log(response.data);
      if(response.data.code === 'PAYMENT_SUCCESS'){
        // redirect the user to Frontend success page 
      } else if (response.data.code === 'PAYMENT_ERROR'){
         // redirect the uswer to Frontend error page 
      } else{
        // pending page 
      }
      res.send(response.data)
  })
  .catch(function (error) {
    console.error(error);
  });
        
    } else{
       res.send({error : "Error"});
    }
})

app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});
