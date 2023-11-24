const mongoose = require("mongoose");
const { Schema , model } = mongoose;


const scheduledRideSchema = new Schema({
  from:{
    type: mongoose.ObjectId,
    ref:"User",
    required: true
  },
  to:{
    type:mongoose.ObjectId,
    ref:"User",
    required: true,
  },
  ride:{
    type:mongoose.ObjectId,
    ref:"Ride",
    required: true,
  }
});



const ScheduledRide = model("ScheduledRide",scheduledRideSchema);
module.exports = ScheduledRide;
