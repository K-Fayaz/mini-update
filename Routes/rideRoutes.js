const express        = require("express");
const { isLoggedIn } = require("../helper/authControl");
const rideController = require("../Controller/rideController");


const router  = express.Router();


router.route("/offer/ride")
  .get(isLoggedIn,rideController.offer_ride_get)
  .post(isLoggedIn,rideController.offer_ride_post);

router.route("/request/ride")
  .get(isLoggedIn,rideController.request_ride_get)
  .post(isLoggedIn,rideController.request_ride_post);

router.get("/ride/:id",rideController.get_ride);

router.post("/ride/request/",rideController.send_request_mail);


module.exports = router;
