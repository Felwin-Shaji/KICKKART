
const User = require("../../models/userSchema");
const nodemailer = require('nodemailer')
const bcrypt = require("bcrypt")
const env = require('dotenv').config
const session = require("express-session")

function generateOtp() {
   console.log('forgotPass OTP', Math.floor(100000 + Math.random() * 900000).toString());
   return Math.floor(100000 + Math.random() * 900000).toString();
}

const sendVerificationEmail = async (email, otp) => {
   try {
      const transporter = nodemailer.createTransport({
         host: 'smtp.gmail.com',
         port: 587,
         secure: false, // true for port 465, false for 587
         requireTLS: true,
         auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD,
         },
      });

      const info = await transporter.sendMail({
         from: process.env.NODEMAILER_EMAIL,
         to: email,
         subject: 'Verify your Email',
         text: `Your OTP is ${otp}`,
         html: `<b>Your OTP: ${otp}</b>`,
      });

      return info.accepted.length > 0; // Return true if email is sent successfully
   } catch (error) {
      console.error("Error in sending verification OTP email:", error.message);
      return false; // Indicate failure
   }
};


const getForgotPassWordPage = async (req, res) => {
   try {
      res.render("forgot-password-page")
   } catch (error) {
      console.log("getForgotPassWordPage error", error)
      res.redirect("/pageNotFound")
   }
}

const forgotEmailVarifiation = async (req, res) => {
   try {
      const { email } = req.body;
      const findUser = await User.findOne({ email: email })

      if (findUser) {
         const otp = generateOtp();
         const emailSent = await sendVarificationEmail(email, otp);
      }

   } catch (error) {

   }
}

module.exports = {
   getForgotPassWordPage,
   forgotEmailVarifiation
}