const bcrypt         = require("bcryptjs");
const jwt            = require("jsonwebtoken");
const User           = require("../Model/userModel");
const Ride           = require("../Model/rideModel");
const getUser        = require("../helper/get_user");
const Request        = require("../Model/requestModel");
const ScheduledRide  = require("../Model/scheduledRide");
const { sendEmail }  = require("../helper/helperFunctions");


const register_get = (req,res)=>{
  res.render("validateEmail");
}

const register_post = async (req,res)=>{
  console.log(typeof(req.body));
  console.log(req.body);
  let { email , password , username } = req.body;
  try{
    // Check if the User already exists
    let user = await User.findOne({ email });
    if(user)
    {
      return res.status(403).json({
        message: "User already exists !",
      })
    }

    // create a new User
    let newUser = new User;
    newUser.username = username;

    // hash the password and save it to Database
    let hashedPassword = await bcrypt.hash(password,10);
    console.log(hashedPassword);

    newUser.password = hashedPassword;
    newUser.email = email;

    await newUser.save();

    // Create a JWT token and set the cookie
    if(newUser._id)
    {
      var payload = {
        id: newUser._id,
        email: newUser.email,
      }
    }

    let token = jwt.sign(payload,process.env.MINT_SECRET,{
      expiresIn: "1d"
    });

    res.cookie("auth",token,{
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    // remove the user cookie
    res.cookie("user","",{
      httpOnly: true,
      maxAge: 1,
    });

    res.status(201).json(newUser);

  }
  catch(err)
  {
    console.log(err);
    res.status(400).json(err);
  }
}

const register_user_details = async(req,res)=>{
  try{
    let { user } = req.cookies;
    console.log(user);
    if(!user)
    {
      return res.redirect("/register");
    }
    console.log(req.cookies);
    res.render("register",{ user });
  }
  catch(err)
  {
    res.send(err);
  }
}

const post_email_validate = async(req,res)=>{
  try{
    const { email } = req.body;

    let htmlContet = `<h1>Click the below link to register</h1>
           <br><a href="http://localhost:8080/register/user/details">Verify Email</a>`;

    console.log(email);
    let resp = await sendEmail(email,htmlContet);
    console.log(resp);
    res.cookie("user",email,{
      httpOnly: true,
      maxAge: 1000 * 60 * 10,
    });
    res.send(resp);
  }
  catch(err)
  {
    console.log(err);
    res.status(400).send(err);
  }
}

const get_account = async (req,res)=>{

  try{
    let { currUser } = res.locals;

    let userData = await jwt.verify(currUser,process.env.MINT_SECRET);
    console.log(userData);
    let user = await User.findById(userData.id);
    console.log(user);
    console.log(user.phone);

    if(!user)
    {
      throw Error("User did not found!");
    }

    res.render("account",{ user });
  }
  catch(err)
  {
    console.log(err);
  }
}

const get_login = (req,res)=>{
  res.render("login");
}

const post_login = async(req,res)=>{
  try{
    const { email , password } = req.body;

    // find the user with given email
    const user = await User.findOne({ email });

    console.log(user);

    if(!user)
      res.redirect("/register");

      // check if the entered password is valid or not
    const truthy = await bcrypt.compare(password , user.password);
    console.log(truthy);
    if(truthy)
    {
      // the password is valid , then sign a JWT token and set an auth cookie
      let payload = {
        id: user._id,
        email: user.email,
      };

      let token = await jwt.sign(payload,process.env.MINT_SECRET,{
        expiresIn: "1d"
      });

      res.cookie("auth",token,{
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
      });

      return res.redirect("/account");
    }else{
      console.log(truthy);
      return res.redirect("/login");
    }
  }
  catch(err)
  {
    console.log("something went wrong !");
    console.log(err);
  }
}

const logout = async(req,res)=>{
  try{

    // console.log("I am IN");

    res.cookie("auth","",{
      httpOnly: true,
      maxAge: 1,
    })

    res.redirect("/login")

  }
  catch(err){
    console.log("something went wrong!");
    console.log(err);
  }
}

const user_edit = async(req,res)=>{
  try{
    const { username , phone , email } = req.body;

    let obj = await jwt.verify(res.locals.currUser , process.env.MINT_SECRET);

    const user = await User.findById(obj.id);
    user.email = email;
    user.phone = phone;
    user.username = username;

    await user.save();
    console.log(user);
    res.json(user);

  }
  catch(err)
  {
    console.log(err);
  }
}

const add_phone = async(req,res)=>{
  try{
    let { phone } = req.body;
    console.log(phone);

    // find the user
    let { auth } = req.cookies;
    let userDetails = await jwt.verify(auth,process.env.MINT_SECRET);
    console.log(userDetails);
    let user = await User.findById(userDetails.id);
    console.log(user);
    user.phone = phone;
    await user.save();

    res.status(200).json(user);

  }
  catch(err)
  {
    console.log(err);
    res.status(400).send(err);
  }
}


const get_requests = async(req,res)=>{
  try{

    let token = await jwt.verify(res.locals.currUser,process.env.MINT_SECRET);
    // console.log(token);

    let user = await User.findById(token.id)
      .populate({ path:"requests", populate:{ path:"from" }})
      .populate({ path:"requests", populate:{ path:"ride" } });
    console.log(user);

    res.render("ride_requests",{user});
  }
  catch(err)
  {
    console.log(err);
    res.status(404).send(err);
  }
}

const delete_request = async(req,res)=>{
  try{

    const { requestId , to , user } = req.body;

    //  get the user who rejected the request i.e current user
    const token = await jwt.verify(res.locals.currUser,process.env.MINT_SECRET);
    console.log(token);
    let fromUser = await User.findByIdAndUpdate(token.id,{ $pull:{ requests: requestId } });

    await fromUser.save();
    // user.requests

    // find the request
    const request = await Request.findByIdAndDelete(requestId);

    let htmlContent = `
      <h1>Hey ${user} , ${fromUser.username} just deleted your request to ride</h1>
      <br>
      <h5>You can request to other rides</h5>
    `
    let response = await SendEmail(to,htmlContent);
    console.log(response);
    res.status(201).send(user);

  }
  catch(err){
    console.log(err);
    res.status(403).send(err);
  }
}

const accept_request = async(req,res)=>{
  try{

    const { requestId , to , user } = req.body;

    // find the user and pull the request from user requests
    const token = await jwt.verify(res.locals.currUser,process.env.MINT_SECRET);
    let requestedUser = await User.findByIdAndUpdate(token.id,{ $pull:{ requests: requestId } });
    console.log(requestedUser);


    const requestingUser = await User.findOne({ email: to });
    console.log(requestingUser);

    // find the request and make scheduled-Ride
    const ride = await Ride.findById(requestId);
    console.log(ride);

    // const schedule = new ScheduledRide;
    // schedule.to = requestedUser;
    // schedule.from = requestedUser;
    // schedule.ride = ride;
    //
    // await schedule.save();

    requestedUser.scheduledRides.push(ride);
    requestingUser.scheduledRides.push(ride);

    await requestedUser.save();
    await requestingUser.save();

    let htmlContent = `
      <h1>Hi ${user},${requestedUser.username} has accepted your request and your ride is scheduled!</h1>
      <br/>
      <a href='/account/rides/scheduled/'>Scheduled Rieds</a>
    `;

    let response = await SendEmail(to,htmlContent);
    console.log(response);
    res.status(200).send("Ride has been scheduled!");
  }
  catch(err)
  {
    console.log(err);
    res.status(401).send(err);
  }
}

const get_scheduled_rides = async(req,res)=>{
  try{

    const token = await jwt.verify(res.locals.currUser,process.env.MINT_SECRET);
    const user  = await User.findById(token.id)
      .populate({ path:"scheduledRides", populate:{ path:"from" }})
      .populate({ path:"scheduledRides", populate:{ path:"ride" }});

    console.log(user);

    res.render('scheduled_rides');
  }
  catch(err)
  {
    console.log(err);
    res.status(404).send("404 NOT FOUND !");
  }
}

const get_offered_rides = async(req,res)=>{
  try{
    // get the tveriyoken
    const token = await jwt.verify(res.locals.currUser,process.env.MINT_SECRET);
    console.log(token);
    let user = await User.findById(token.id)
      .populate({ path:"offers" ,populate:{ path: "driver" } });

    console.log(user);
    res.render("offered_rides",{ user });
  }
  catch(err)
  {
    console.log(err);
    res.status(400).send(err);
  }
}

const delete_offered_ride = async(req,res)=>{
  try{
    let { id } = req.body;
    const token = await jwt.verify(res.locals.currUser,process.env.MINT_SECRET);
    console.log(token);

    // remove the offer from the user offfers array
    let user = await User.findByIdAndUpdate(token.id,{ $pull:{ offers: id } });
    console.log(user);
    await user.save();

    // delete the ride offer from Ride collection
    await Ride.findByIdAndDelete(id);
    res.status(200).send(user);

  }
  catch(err)
  {
    console.log(err);
    res.status(401).send(err);
  }
}

module.exports = {
  logout,
  add_phone,
  user_edit,
  get_login,
  post_login,
  get_account,
  get_requests,
  accept_request,
  delete_request,
  get_offered_rides,
  delete_offered_ride,
  get_scheduled_rides,
  post_email_validate,
  register_user_details,
  get_signup: register_get,
  post_signup: register_post,
}
