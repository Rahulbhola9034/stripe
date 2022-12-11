const express = require("express");
const YOUR_DOMAIN = "http://localhost:3000";

var bodyParser = require("body-parser");
const app = express();
const stripe = require("stripe")(
  "sk_test_51KD6gYSAvpHmv9RUtYsayeqVgxKnjkad3tOh62cX3eb4OrHGgXGXQ5vFaf6krGP0tEzZ0dNT4WDxm3Jiu7A2e1tm00Akxab7g0"
);

const cors = require("cors");

const { json } = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.static("public"));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // update to match the domain you will make the request from
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.post("/create-one-time-payment", async (req, res) => {
  //console.log(req.body)
  const amount = req.body.amount * 100;
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "inr",
          unit_amount: amount,
          tax_behavior: "exclusive",
          product_data: {
            name: "Stripe One Time Payment",
          },
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${YOUR_DOMAIN}/success`,
    cancel_url: `${YOUR_DOMAIN}/canceled`,
  });
  res.json({ url: session.url });
});

app.post("/authorize-payment-process", async (req, res) => {
  console.log(req.body);
  const email = req.body.email;
  const amount = req.body.amount * 100;
  var data = {};

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "inr",
    description: "Sample Authorize Payment",
    automatic_payment_methods: {
      enabled: true,
    },
    payment_method_options: {
      card: {
        capture_method: "manual",
      },
    },
  });

  if (paymentIntent) {
    //console.log(price);
    data = {
      success: true,
      id: paymentIntent.id,
      secret: paymentIntent.client_secret,
      email: email,
      price: amount,
      name: email,
    };
  } else {
    data = {
      success: false,
      msg: "invalid package",
    };
  }
  return res.json(data);
});

app.post("/payment_intent", async (req, res) => {
  console.log(req.body);
  var price = req.body.price;
  var clientName = req.body.name;
  var email = req.body.email;
  var isChecked = req.body.isChecked;
  var type = req.body.type;

  var stripe_customer_id = false;
  var client_customer_id = false;

  if (isChecked) {
    console.log("isChecked " + isChecked);
    if (stripe_customer_id) {
      client_customer_id = stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        description: "new customer",
        email: req.body.email,
      });
      client_customer_id = customer.id;
    }

    //Save Card
    if (type === "capture_manual") {
      var params = {
        amount: price * 100,
        currency: "inr",
        payment_method_types: ["card"],
        description: "Sample Authorize Payment is Checked Save Card",
        customer: client_customer_id,
        setup_future_usage: "off_session",
        capture_method: "manual",
      };
    } else {
      params = {
        amount: price * 100,
        currency: "inr",
        payment_method_types: ["card"],
        description: "Subscription Payment is Checked Save Card",
        customer: client_customer_id,
        setup_future_usage: "off_session",
      };
    }
  } else {
    //Payment Intent
    console.log("isChecked " + isChecked);
    if (type === "capture_manual") {
      var params = {
        amount: price * 100,
        currency: "inr",
        payment_method_types: ["card"],
        receipt_email: email,
        description: "Sample Authorize Payment not Checked Don't Save Card",
        capture_method: "manual",
      };
    } else {
      params = {
        amount: price * 100,
        currency: "usd",
        payment_method_types: ["card"],
        capture_method: "automatic",
        receipt_email: email,
        description: "Subscription Payment not Checked Don't Save Card",
      };
    }
  }

  const paymentIntent = await stripe.paymentIntents.create(params).then(
    function (result) {
      if (result) {
        //console.log("this is result " + JSON.stringify(result));
        var data = {
          success: true,
          id: result.id,
          secret: result.client_secret,
          email: email,
          name: clientName,
          stripe_customer_id: client_customer_id,
          type: result.description,
        };
      } else {
        data = {
          success: false,
          msg: "invalid request",
        };
      }
      return res.json(data);
    },
    function (err) {
      var data = {
        success: false,
        msg: err.message,
      };
      return res.json(data);
    }
  );
});

app.post("/Authorize_Capture_Process", async (req, res) => {
  var payment_intent = req.body.payment_intent;
  const intent = await stripe.paymentIntents.capture(payment_intent);
  if (intent.id != null) {
    var data = {
      success: true,
      pi_id: intent.id,
    };
  } else {
    data = {
      success: false,
    };
  }
  console.log(intent);
  return res.json(data);
});

app.post("/payment_intent_already_save_card", async (req, res) => {
  console.log(req.body);
  var stripe_customer_id = req.body.stripe_customer_id;
  var client_customer_id = false;
  var price = req.body.price;
  var email = req.body.email;
  var name = req.body.name;
  var paymentMethod = false;
  var paymentIntent = false;
  var type = req.body.type;

  var customer = await stripe.customers.retrieve(stripe_customer_id);
  if (customer.id) {
    var pm = customer.invoice_settings.default_payment_method;

    paymentMethod = await stripe.paymentMethods.retrieve(pm);
  }

  // var id = paymentMethod.id;
  if (type === "authorize_payment_already_save_card") {
    var params = {
      amount: price * 100,
      currency: "inr",
      payment_method_types: ["card"],
      receipt_email: email,
      description: "authorize_payment_already_save_card",
      //paymentMethod: req.body.payment_method,
      confirm: true,
      customer: stripe_customer_id,
      payment_method: paymentMethod.id,
      capture_method: "manual",
    };
  } else {
    params = {
      amount: price * 100,
      currency: "inr",
      payment_method_types: ["card"],
      capture_method: "automatic",
      receipt_email: email,
      description: "authorize_payment_already_save_card",
      //paymentMethod: req.body.payment_method,
      confirm: true,
      customer: stripe_customer_id,
      payment_method: paymentMethod.id,
    };
  }
  if (paymentMethod.id) {
    console.log(paymentMethod);
    paymentIntent = await stripe.paymentIntents.create(params).then(
      function (result) {
        console.log("result");
        console.log(result);

        if (result) {
          var data = {
            success: true,
            id: result.id,
            secret: result.client_secret,
            email: email,
            name: name,
            stripe_customer_id: stripe_customer_id,
            pi_status: result.status,
            paymentMethod: paymentMethod.status,
            price: price,
            msg: "Payment Successful",
            type: type,
          };
        } else {
          data = {
            success: false,
            msg: "invalid request",
          };
        }
        return res.json(data);
      },
      function (err) {
        var data = {
          success: false,
          msg: err.message,
        };
        return res.json(data);
      }
    );
  }
});

app.post("/payment_intent_save_new_card", async (req, res) => {
  console.log(req.body);
  var stripe_customer_id = req.body.stripe_customer_id;
  var client_customer_id = false;
  var price = req.body.price;
  var email = req.body.email;
  var name = req.body.name;
  var type = req.body.type;

  //Save Card
  if (type === "authorize_payment_already_save_card_save_new_card") {
    var params = {
      amount: price * 100,
      currency: "inr",
      payment_method_types: ["card"],
      description: type,
      customer: stripe_customer_id,
      setup_future_usage: "off_session",
      capture_method: "manual",
    };
  } else {
    params = {
      amount: price * 100,
      currency: "inr",
      payment_method_types: ["card"],
      description: type,
      customer: stripe_customer_id,
      setup_future_usage: "off_session",
    };
  }

  await stripe.paymentIntents.create(params).then(
    function (result) {
      if (result) {
        var data = {
          success: true,
          id: result.id,
          secret: result.client_secret,
          email: email,
          name: name,
          stripe_customer_id: stripe_customer_id,
          price: price,
          type: type,
        };
      } else {
        data = {
          success: false,
          msg: "invalid request",
        };
      }
      return res.json(data);
    },
    function (err) {
      var data = {
        success: false,
        msg: err.message,
      };
      return res.json(data);
    }
  );
});

app.post("/set_as_default", async (req, res) => {
  console.log(req.body);
  //var customer_id = req.body.customer_id;
  //var customer_id = 'cus_MZ0y4Vd0GQqHIc';
  var payment_intent = req.body.payment_intent;
  var payment_method = req.body.payment_method;

  const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
  const customer = await stripe.customers
    .update(paymentIntent.customer, {
      invoice_settings: { default_payment_method: payment_method },
    })
    .then(
      function (result) {
        if (result) {
          var data = {
            success: true,
            msg: "Success",
          };
        } else {
          data = {
            success: false,
            msg: "invalid request",
          };
        }
        return res.json(data);
      },
      function (err) {
        var data = {
          success: false,
          msg: err.message,
        };
        return res.json(data);
      }
    );
});

app.post("/get_payment_methods", async (req, res) => {
  console.log(req.body);
  // var id = false
  // var brand = false
  // var  status = false
  // var logged_user_stripe_customer_id = req.body.logged_user_stripe_customer_id;
  const customer = await stripe.customers.retrieve(req.body.stripe_customer_id);
  if (customer) {
    var pm = customer.invoice_settings.default_payment_method;

    const paymentMethod = await stripe.paymentMethods.retrieve(pm);
    if (paymentMethod.id) {
      var id = paymentMethod.id;
      var brand = paymentMethod.card.brand;
      var last4 = paymentMethod.card.last4;
      var status = true;
    }
  }
  var data = {
    status: status,
    id: id,
    brand,
    last4,
  };
  return res.json(data);
});

app.post("/create-subscription-payment", async (req, res) => {
  console.log(req.body);

    const { email, paymentMethod, stripe_customer_id } = req.body;
    var isChecked = req.body.isChecked;
    var client_customer_id = false;
    if (isChecked) {
      if (stripe_customer_id) {
        client_customer_id = stripe_customer_id;
      } else {
        const customer = await stripe.customers.create({
          description: "new customer",
          email: email,
          payment_method: paymentMethod,
          invoice_settings: { default_payment_method: paymentMethod },
        });
        client_customer_id = customer.id;
      }

      // Create a product
      const product = await stripe.products.create({
        name: "Monthly subscription",
      });

      console.log('product')
      console.log(product)

        // Create a subscription
    const subscription = await stripe.subscriptions.create({
      customer: client_customer_id,
      items: [
        {
          price_data: {
            currency: "INR",
            product: product.id,
            unit_amount: "50000",
            recurring: {
              interval: "month",
            },
          },
        },
      ],

      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
    });

    console.log('subscription');
    console.log(subscription);

    // Send back the client secret for payment
    res.json({
      message: "Subscription successfully initiated",
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
     });
    }

});

app.listen(4242, () => console.log("Running on port 4242"));
