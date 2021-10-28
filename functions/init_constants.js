// initialize experiment-wide constants

// set process.env variable
require('dotenv').config();

// URLs to use for links
const urls = {
  survey: process.env.EXP_SCREENING_URL,
  exp: process.env.EXP_SESSION_URL
}

const main_experimenter_email = process.env.GOOGLE_USERNAME
const bookings_calendar = process.env.EXP_BOOKINGS_CALENDAR
const availability_calendar = process.env.EXP_AVAILABILITY_CALENDAR // calendar for experimenter availability

// default values for location
const location =  {
  name: process.env.EXP_LOCATION_NAME,
  maps_link: process.env.EXP_LOCATION_URL
}
const daily_email_time = parseInt(process.env.EXP_DAILY_EMAIL_TIME)
const timezone = process.env.EXP_TIMEZONE
const appt_length_mins = process.env.EXP_APPT_MINS
const parking_instructions = process.env.EXP_PARKING_INSTRUCTIONS

const email_templates_dir = './email_templates'

module.exports = {
  urls,
  main_experimenter_email,
  bookings_calendar,
  availability_calendar,
  email_templates_dir,
  location,
  daily_email_time,
  timezone,
  appt_length_mins,
  parking_instructions
};
