const Ride          = require("../Model/rideModel");
const User          = require("../Model/userModel");
const getUser       = require("../helper/get_user");
const Request       = require("../Model/requestModel");
const { sendEmail } = require("../helper/helperFunctions");

const offer_ride_get = (req,res)=>{
  res.render("offer_ride");
}

const offer_ride_post = async(req,res)=>{
  try{

    let { from , to , time , date , seats , price } = req.body;
    // rikkgnp
    // get the user
    let user = await getUser(res.locals.currUser);
    // console.log(user);

    let newRide = new Ride;

    newRide.to     = to;
    newRide.time   = time;
    newRide.date   = date;
    newRide.from   = from;
    newRide.price  = price;
    newRide.seats  = seats;
    newRide.driver = user._id;

    await newRide.save();

    user.offers.push(newRide._id);
    await user.save();

    console.log(newRide);
    console.log(user);
    res.status(201).json(newRide);
  }
  catch(err)
  {
    console.log(err);
    res.status(400).send(err);
  }
}


const request_ride_get = async(req,res)=>{
  res.render("requestRide");
}


const request_ride_post = async(req,res)=>{
  try{

    let { from , to } = req.body;
    console.log(req.body);

    // find offers with this route
    const toRides   = await Ride.find({ to: to , from : from}).populate("driver");

    console.log(toRides);

    res.status(200).send(toRides);

  }
  catch(err)
  {
    console.log(err);
    res.status(400).send("something went wrong!");
  }
}


const get_ride = async(req,res)=>{
  try{
    let { from , to } = req.query;
    let { id } = req.params;

    let ride = await Ride.findById(id);
    console.log(ride);

    res.status(200).render("ride",{ to , from });

  }
  catch(err)
  {
    console.log(err);
    res.status(404).send("<h1>404 NOT FOUND</h1>");
  }
}


const send_request_mail = async(req,res)=>{
  try{
    let { to , ride } = req.body;
      console.log(req.body);
    let toUser = await User.findById(to);
    let requestedRide = await Ride.findById(ride);
    let fromUser = await getUser(res.locals.currUser);

    console.log(toUser);
    console.log(fromUser);
    console.log(requestedRide);
    // console.log(req.body.to);

    const newRequest = new Request;
    newRequest.from = fromUser._id;
    newRequest.ride = requestedRide._id;

    await newRequest.save();

    toUser.requests.push(newRequest);
    toUser.save();

    let htmlContent= `
      <h3>Hi ${toUser.username}, you have a request from ${fromUser.username}</h3><br>
    `;

    let response = await sendEmail(toUser.email,htmlContent);
    console.log(response);

    res.status(202).send("OK");

  }
  catch(er)
  {
    console.log(er);
    res.status(400).send(er);
  }
}

module.exports = {
  get_ride,
  offer_ride_get,
  offer_ride_post,
  request_ride_get,
  send_request_mail,
  request_ride_post,
}
