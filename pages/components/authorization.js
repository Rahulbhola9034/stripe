import React, { useState, useEffect } from "react";
import Link from "next/link";
import Router from "next/router";
import {
  doc,
  setDoc,
  collection,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Auth from "layouts/Auth.js";
import axios from "axios";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "firebaseConfig";
import { async } from "@firebase/util";

export default function AuthorizationPage() {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [authorizeEmail, setAuthorizeEmail] = useState("");
  const [authorizeAmount, setAuthorizeAmount] = useState("");
  const [logged_user, set_logged_user] = useState("");
  const [stripeError, setStripeError] = useState("");
  const [subscription_email, set_subscription_email] = useState("");
  const [subscription_amount, set_subscription_amount] = useState("");
  const [payment_intent_field, set_payment_intent_field] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [useSaveCard, setUseSaveCard] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [user, setUser] = useState({});
  const [authorize_payments_data, setAuthorize_payments_data] = useState([]);
  const [is_already_customer, set_is_already_customer] = useState(false);
  const [is_already_customer_id, set_is_already_customer_id] = useState("");
  const [cardBrand, setCardBrand] = useState(true);
  const [is_change_card, set_is_Change_Card] = useState(true);
  const [show_stripe_element, set_is_show_stripe_element] = useState(true);
  const [last4, setLast4] = useState(true);
  const stripe = useStripe();
  const elements = useElements();
  const stripe_collection_ref = collection(db, "authorize_payment");

  onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
  });

  //set_logged_user(user?.email)

  useEffect(() => {
    getDataFromAuthorize_payment();
  }, [user?.email]);

  const stripe_one_time_pay_button_click = () => {
    console.log("button clicked");
    console.log("email  " + email);
    console.log("amount  " + amount);

    const headers = {
      "Access-Control-Allow-Origin": "*",
    };
    axios
      .post(
        "http://localhost:4242/create-one-time-payment",
        {
          email,
          amount,
        },
        { headers: headers }
      )
      .then(function (response) {
        console.log(response.data.url);

        window.location.href = response.data.url;
      })
      .catch(function (error) {
        console.log(error.message);
      });
  };

  const save_Data_in_Stripe_Customer = (stripe_customer_data) => {
    console.log(stripe_customer_data);
    setDoc(doc(db, "stripe_customers", user.email), stripe_customer_data);
  };

  const saveDataInAuthorize_payment = async (data) => {
    await setDoc(doc(db, "authorize_payment", user.email), data);
  };

  const handleCheckBox = (event) => {
    if (event.target.checked) {
      console.log("✅ Checkbox is checked");
    } else {
      console.log("⛔️ Checkbox is NOT checked");
    }
    setIsSubscribed((current) => !current);
  };

  const capture_payment = () => {
    axios
      .post("http://localhost:4242/Authorize_Capture_Process", {
        payment_intent: payment_intent_field,
      })
      .then(function (response) {
        alert("Payment Captured Successfully");
        // console.log(response)
      })
      .catch(function (error) {
        console.log(error.message);
      });
  };

  const handleCheckBox_changeCard = () => {
    set_is_show_stripe_element(!show_stripe_element);
    set_is_Change_Card(!is_change_card);
  };

  const clicked_on_authorize_pay_button = async (event) => {
    event.preventDefault();

    if (authorizeEmail === "" || authorizeAmount === "") {
      setStripeError("All fields are required");
      alert("all fileds req");
      return;
    }

    if (is_already_customer) {
      console.log('hi')
      if (show_stripe_element) {
        console.log("already save card");
        axios
          .post("http://localhost:4242/payment_intent_already_save_card", {
            name: authorizeEmail,
            email: authorizeEmail,
            price: authorizeAmount,
            isChecked: is_change_card,
            useSaveCard: is_change_card,
            stripe_customer_id: is_already_customer_id,
            type: "authorize_payment_already_save_card",
          })
          .then(function (response) {
            /// for status = require capture
            if (response.data.pi_status !== "succeeded") {
              console.log(elements.getElement(CardElement))
              stripe
                .confirmCardPayment(response.data.secret, {
                  payment_method: {
                    card: elements.getElement(CardElement),
                    billing_details: {
                      name: authorizeEmail,
                      email: authorizeEmail,
                    },
                  },
                })
                .then(function (result) {
                  if (result.error) {
                    setStripeError(result.error.message);
                  } else {
                    alert("Payment Successful");
                    var data = {
                      email: response.data.email,
                      price: authorizeAmount,
                      stripe_customer_id: response.data.stripe_customer_id,
                      payment_id: result.id,
                      status: result.status,
                      type: "Authorize Already Save Card",
                      time: serverTimestamp(),
                    };
                    var stripe_customer_data = {
                      customer_id: response.data.stripe_customer_id,
                    };
                    //console.log(data)
                    save_Data_in_Stripe_Customer(stripe_customer_data);

                    //console.log(data)
                    saveDataInAuthorize_payment(data);
                    alert("payment success");
                  }
                });
            } else if (response.data.pi_status === "succeeded") {
              /// for status = suceeded
              console.log("succedded");
              var data = {
                email: response.data.email,
                price: response.data.price,
                stripe_customer_id: response.data.stripe_customer_id,
                payment_id: response.data.id,
                status: response.data.pi_status,
                type: response.data.type,
                time: serverTimestamp(),
              };
              var stripe_customer_data = {
                customer_id: response.data.stripe_customer_id,
              };
              //console.log(data)
              save_Data_in_Stripe_Customer(stripe_customer_data);

              //console.log(data)
              saveDataInAuthorize_payment(data);
              setStripeError(response.data.msg);
              alert("Payment Success");
            }
          })
          .catch(function (error) {
            setStripeError(error.message);
          });
      } else {
        console.log("use new card/change card");
        //use new card/change card
        if (!stripe || !elements) {
          return "Fail to load";
        }
        console.log(elements.getElement(CardElement));
        await stripe
          .createPaymentMethod({
            type: "card",
            card: elements.getElement(CardElement),
            billing_details: {
              name: authorizeEmail,
            },
          })
          //console.log('result.paymentMethod')
          .then(function (result) {
            console.log(result);
            if (result.error) {
              setStripeError(result.error.message);
            }
            if (result.paymentMethod) {
              console.log(result.paymentMethod);
              axios
                .post("http://localhost:4242/payment_intent_save_new_card", {
                  email: authorizeEmail,
                  name: authorizeEmail,
                  price: authorizeAmount,
                  isChecked: is_change_card,
                  useSaveCard: is_change_card,
                  stripe_customer_id: is_already_customer_id,
                  type: "authorize_payment_already_save_card_save_new_card",
                })
                .then((response) => {
                  console.log(response);
                  if (response.data.success === true) {
                    var clientSecret = response.data.secret;
                    var name = response.data.name;
                    var email = response.data.email;
                    var price = response.data.price;
                    var response_type = response.data.type;
                    stripe
                      .confirmCardPayment(clientSecret, {
                        payment_method: {
                          card: elements.getElement(CardElement),
                          billing_details: {
                            name: name,
                            email: email,
                          },
                        },
                      })
                      .then(function (result) {
                        if (result.error) {
                          setStripeError(result.error.message);
                        }
                        if (result.paymentIntent) {
                          console.log("result.paymentIntent");
                          console.log(result.paymentIntent);
                          alert("Payment Successful");
                          var data = {
                            email: response.data.email,
                            price: price,
                            stripe_customer_id:
                              response.data.stripe_customer_id,
                            payment_id: result.paymentIntent.id,
                            status: result.paymentIntent.status,
                            type: response_type,
                            time: serverTimestamp(),
                          };
                          var stripe_customer_data = {
                            customer_id: response.data.stripe_customer_id,
                          };
                          //console.log(data)
                          save_Data_in_Stripe_Customer(stripe_customer_data);
                          saveDataInAuthorize_payment(data);
                          console.log("result.paymentMethod");
                          //console.log(result);
                          axios
                            .post("http://localhost:4242/set_as_default", {
                              payment_method:
                                result.paymentIntent.payment_method,
                              payment_intent: result.paymentIntent.id,
                              isChecked: is_change_card,
                              useSaveCard: is_change_card,
                              stripe_customer_id: is_already_customer_id,
                            })
                            .then(function (response) {
                              //console.log(response);
                            })
                            .catch(function (error) {
                              setStripeError(error.message);
                            });
                        }
                      });
                  } else {
                    setStripeError(response.data.msg);
                  }
                })
                .catch(function (error) {
                  setStripeError(error.message);
                });
            }
          });
      }
    } else {
      // new logged user save card
      await stripe
        .createPaymentMethod({
          type: "card",
          card: elements.getElement(CardElement),
          billing_details: {
            email: authorizeEmail,
          },
        })
        .then(function (result) {
          if (result.error) {
            setStripeError(result.error.message);
          }
          if (result.paymentMethod) {
            console.log("sending data");
            axios
              .post("http://localhost:4242/payment_intent", {
                email: authorizeEmail,
                name: authorizeEmail,
                price: authorizeAmount,
                isChecked: isSubscribed,
                useSaveCard: isActive,
                type: "capture_manual",
              })
              .then((response) => {
                //console.log(response)
                if (response.data.success === true) {
                  var clientSecret = response.data.secret;
                  var name = response.data.name;
                  var email = response.data.email;
                  var stripe_customer_id = response.data.stripe_customer_id;
                  var type = response.data.type;
                  stripe
                    .confirmCardPayment(clientSecret, {
                      payment_method: {
                        card: elements.getElement(CardElement),
                        billing_details: {
                          name: name,
                          email: email,
                        },
                      },
                    })
                    .then(function (result) {
                      if (result.error) {
                        setStripeError(result.error.message);
                      }
                      if (result.paymentIntent) {
                        alert("Payment Successful");
                        var data = {
                          email: email,
                          price: authorizeAmount,
                          stripe_customer_id: stripe_customer_id,
                          payment_id: result.paymentIntent.id,
                          status: result.paymentIntent.status,
                          //campaignId: campaignId,
                          type: type,
                          time: serverTimestamp(),
                        };
                        var stripe_customer_data = {
                          customer_id: response.data.stripe_customer_id,
                        };
                        save_Data_in_Stripe_Customer(stripe_customer_data);
                        saveDataInAuthorize_payment(data);
                        if (isSubscribed) {
                          axios
                            .post("http://localhost:4242/set_as_default", {
                              payment_method:
                                result.paymentIntent.payment_method,
                              payment_intent: result.paymentIntent.id,
                              isChecked: false, //isSubscribed,
                              useSaveCard: false, //isActive,
                            })
                            .then(function (response) {
                              //console.log(response);
                            })
                            .catch(function (error) {
                              setStripeError(error.message);
                            });
                        } else {
                        }
                      }
                    });
                } else {
                  setStripeError(response.data.msg);
                }
              })
              .catch(function (error) {
                console.log(error);
                setStripeError(error.message);
              });
          }
        });
    }
  };

  const payment_method = () => {
    // console.log('callling api');
    //console.log("getting data" +logged_user_stripe_customer_id )

    if (is_already_customer_id) {
      axios
        .post("http://localhost:4242/get_payment_methods", {
          stripe_customer_id: is_already_customer_id,
        })
        .then(function (response) {
          var data = response.data;
          if (data.status) {
            var brand = data.brand;
            var last4 = data.last4;
            setCardBrand(brand);
            setLast4(last4);
            //console.log("getting data" +logged_user_stripe_customer_id )
          } else {
            //setUseSaveCard(false);
            console.log("not getting data");
          }
        })
        .catch(function (error) {
          console.log(error);
        });
    } else {
    }
  };

  const CARD_ELEMENT_OPTIONS = {
    iconStyle: "solid",
    hidePostalCode: true,
    style: {
      base: {
        color: "#817F80",
        "::placeholder": {
          color: "#817F80",
        },
      },
    },
  };

  if (is_already_customer_id) {
    payment_method();
  }

  const getDataFromAuthorize_payment = async () => {
    if (user?.email) {
      const docRef = doc(db, "authorize_payment", user?.email);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        if (docSnap.data().stripe_customer_id) {
          console.log(docSnap.data().stripe_customer_id);
          //console.log(is_already_customer_id);
          set_is_already_customer(true);
          set_is_already_customer_id(docSnap.data().stripe_customer_id);
        } else {
          console.log("else");
        }
      } else {
        // doc.data() will be undefined in this case
        console.log("No such document!");
      }
    }
  };

  const handle_subscription_payment_single_pay = () => {
    axios
      .post("http://localhost:4242/create-subscription-payment", {
        subscription_email,
        subscription_amount,
      })
      .then(function (response) {
        console.log(response);
      })
      .catch(function (error) {
        console.log(error.message);
      });

    // try {
    //   const paymentMethod = await stripe.createPaymentMethod({
    //     card: elements.getElement("card"),
    //     type: "card",
    //   });
    //   const response = await fetch("/api/subscribe", {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       name,
    //       email,
    //       paymentMethod: paymentMethod.paymentMethod.id,
    //     }),
    //   });
    //   if (!response.ok) return alert("Payment unsuccessful!");
    //   const data = await response.json();
    //   const confirm = await stripe.confirmCardPayment(data.clientSecret);
    //   if (confirm.error) return alert("Payment unsuccessful!");
    //   alert("Payment Successful! Subscription active.");
    // } catch (err) {
    //   console.error(err);
    //   alert("Payment failed! " + err.message);
    // }
  };

  const handle_subscription_payment_reccuring_pay = async (event) => {
    event.preventDefault();
    await stripe
      .createPaymentMethod({
        type: "card",
        card: elements.getElement(CardElement),
        billing_details: {
          name: subscription_email,
        },
      })
      .then(function (result) {
        if (result.error) {
          setStripeError(result.error.message);
          alert("Payment unsuccessful!");
        }
        if (result.paymentMethod) {
          axios
            .post("http://localhost:4242/create-subscription-payment", {
              email: subscription_email,
              amount: subscription_amount,
              paymentMethod: result.paymentMethod.id,
              stripe_customer_id:is_already_customer_id,
              isChecked:true,
              type:'subscription payment'
            })
            .then(function (response) {
              console.log(response);
                const confirm = stripe.confirmCardPayment(response.data.clientSecret);
                if (confirm.error) return alert("Payment unsuccessful!");
                alert("Payment Successful! Subscription active.");
            })
            .catch(function (error) {
              console.log(error.message);
            });
        }
      });
  };
  // console.log("is_already_customer : "+ is_already_customer)
  // console.log("is_already_customer_id : " + is_already_customer_id)
  return (
    
    <>
            {is_already_customer ? (
              <div className="relative mr-4 flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0">
                <div className="rounded-t mb-0 px-6 py-6">
                  <div className="text-center mb-3">
                    <h6 className="text-blueGray-500 text-lg font-bold">
                      Stripe authorize/Capture Payment
                    </h6>
                  </div>

                  <hr className="mt-6 border-b-1 border-blueGray-300" />
                </div>
                <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
                  <form onSubmit={clicked_on_authorize_pay_button}>
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="grid-password"
                      >
                        <h3> You are already a user {user?.email}</h3>
                        <p className="mt-5">
                          {" "}
                          This is your card brand : {cardBrand} & last 4 digit :{" "}
                          {last4}
                        </p>
                      </label>
                      <input
                        type="email"
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                        placeholder="Email"
                        value={authorizeEmail}
                        onChange={(e) => {
                          setAuthorizeEmail(e.target.value);
                        }}
                      />
                    </div>

                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-lg font-bold mb-2 text-center"
                        htmlFor="grid-password"
                      >
                        Enter Amount
                      </label>
                      <input
                        type="text"
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                        placeholder="Amount"
                        value={authorizeAmount}
                        onChange={(e) => {
                          setAuthorizeAmount(e.target.value);
                        }}
                      />
                    </div>
                    {show_stripe_element ? (
                       <div className="mt-8 mb-8">
                       {/* <CardElement options={CARD_ELEMENT_OPTIONS} /> */}
                     </div>
                    ) : (
                      <div className="mt-8 mb-8">
                        <CardElement options={CARD_ELEMENT_OPTIONS} />
                      </div>
                    )}

                    <div className="text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          id="customCheckLogin"
                          type="checkbox"
                          className="form-checkbox border-0 rounded text-blueGray-700 ml-1 w-5 h-5 ease-linear transition-all duration-150"
                          value={isSubscribed}
                          onChange={handleCheckBox_changeCard}
                        />
                        <span className="ml-2 text-sm font-semibold text-blueGray-600 ">
                          Change Card
                        </span>
                      </label>
                    </div>
                    <div className="show-error">
                      {stripeError ? stripeError : ""}
                    </div>
                    <div className="text-center mt-6">
                      <button
                        className="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150"
                        type="submit"
                      >
                        Click To authorize & Pay
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="relative mr-4 flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0">
                <div className="rounded-t mb-0 px-6 py-6">
                  <div className="text-center mb-3">
                    <h6 className="text-blueGray-500 text-lg font-bold">
                      Stripe authorize Payment
                    </h6>
                  </div>

                  <hr className="mt-6 border-b-1 border-blueGray-300" />
                </div>
                <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
                  <form onSubmit={clicked_on_authorize_pay_button}>
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="grid-password"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                        placeholder="Email"
                        value={authorizeEmail}
                        onChange={(e) => {
                          setAuthorizeEmail(e.target.value);
                        }}
                      />
                    </div>

                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="grid-password"
                      >
                        Amount
                      </label>
                      <input
                        type="text"
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                        placeholder="Amount"
                        value={authorizeAmount}
                        onChange={(e) => {
                          setAuthorizeAmount(e.target.value);
                        }}
                      />
                    </div>
                    <div className="mt-8 mb-8">
                      <CardElement options={CARD_ELEMENT_OPTIONS} />
                    </div>

                    <div className="text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          id="customCheckLogin"
                          type="checkbox"
                          className="form-checkbox border-0 rounded text-blueGray-700 ml-1 w-5 h-5 ease-linear transition-all duration-150"
                          value={isSubscribed}
                          onChange={handleCheckBox}
                        />
                        <span className="ml-2 text-sm font-semibold text-blueGray-600 ">
                          Save Card
                        </span>
                      </label>
                    </div>

                    <div className="text-center mt-6">
                      <button
                        className="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150"
                        type="submit"
                      >
                        Click To authorize
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
    </>
  );
}

AuthorizationPage.layout = Auth;
