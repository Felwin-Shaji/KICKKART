const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema")

const nodemailer = require('nodemailer')
const bcrypt = require("bcrypt")
const env = require('dotenv').config
const session = require("express-session")

function generateOtp() {
   //console.log('forgotPass OTP', Math.floor(100000 + Math.random() * 900000).toString());
   return Math.floor(100000 + Math.random() * 900000).toString();
}

const sendVerificationEmail = async (email, otp) => {
   try {
      // Validate email and OTP
      if (!email || !otp) {
         throw new Error("Invalid email or OTP");
      }

      const transporter = nodemailer.createTransport({
         host: 'smtp.gmail.com',
         port: 587,
         secure: false, // true for port 465, false for 587
         requireTLS: true,
         auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD, // Use app-specific password for Gmail
         },
      });

      const info = await transporter.sendMail({
         from: process.env.NODEMAILER_EMAIL,
         to: email,
         subject: 'Verify your Email',
         text: `Your OTP is ${otp}`,
         html: `<b>Your OTP: ${otp}</b>`,
      });

      if (info.accepted.length > 0) {
         console.log(`Verification email sent successfully to ${email}`);
         return { success: true, message: "Email sent successfully" };
      } else {
         console.warn(`Failed to send verification email to ${email}`);
         return { success: false, message: "Email not accepted by recipient server" };
      }
   } catch (error) {
      console.error("Error in sending verification OTP email:", {
         message: error.message,
         stack: error.stack,
      });
      return { success: false, message: error.message }; // Return detailed error message
   }
};

const securePassword = async (password) => {
   try {
      const passwordHash = await bcrypt.hash(password, 10)
      return passwordHash
   } catch (error) {
      console.log('Errorn occured while hashing the password')
   }
}

const getForgotPassWordPage = async (req, res) => {
   try {
      res.render("forgot-password-page")
   } catch (error) {
      console.log("getForgotPassWordPage error", error)
      res.redirect("/pageNotFound")
   }
};

const forgotEmailVarifiation = async (req, res) => {
   try {
      const email = req.body.email;
      console.log("req.body in forgotEmailVarifiation", req.body)
      const findUser = await User.findOne({ email: email })

      if (findUser) {
         const otp = generateOtp();
         console.log('otp in forgotEmailVarifiation', otp);
         const emailSent = await sendVerificationEmail(email, otp);
         if (emailSent) {
            req.session.userOtp = otp;
            req.session.email = email;
            res.json({
               success: true,
               message: "OTP sent successfully. Please verify.",
               redirectUrl: '/Verify-OTP-page'
            });
         } else {
            res.json({ success: false, message: "failed to send OTP. Please try again" })
         }
      } else {
         res.render("forgot-password-page", {
            message: "User with this email does not exist"
         })
      }

   } catch (error) {
      res.redirect("pageNotFound")
   }
}

const getVerifyOTPPage = async (req, res) => {
   try {
      res.render("forgot-Verify-Otp")
   } catch (error) {

   }
}

const verifyOtp = async (req, res) => {
   try {
      const otp = req.body.otp
      console.log("zzzz", req.body)
      if (otp === req.session.userOtp) {
         res.json({ success: true, redirectUrl: "/reset-password" })
      } else {
         res.json({ success: false, message: "OTP not matching" });
      }
   } catch (error) {
      res.status(500).json({ success: false, message: "an Error Occured Please try again" });
   }
}

const resendOtp = async (req, res) => {
   try {

      const otp = generateOtp();
      req.session.userOtp = otp;
      const email = req.session.email;
      console.log(`resend OTP :${otp} to ${email}`);
      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
         res.status(200).json({ success: true, message: "OTP resented sucessfully" })
      }
   } catch (error) {
      console.log("Error in resend OTP", error);
      res.status(500).json({ success: false, message: "Internel server error" })

   }
}

const getResetPassword = async (req, res) => {
   try {
      res.render("reset-password")
   } catch (error) {
      res.redirect("/pageNotFound")
   }
}

const resetPassword = async (req, res) => {
   try {
      console.log("req.bodyyyy", req.body)
      const { password, confirmPassword } = req.body;
      const email = req.session.email;

      if (password === confirmPassword) {
         const passwordHash = await securePassword(password)
         await User.updateOne(
            { email: email },
            { $set: { password: passwordHash } }
         )
         res.redirect("/login");
      } else {
         res.render("reset-password", { message: 'password does not match' })
      }

   } catch (error) {
      console.log('Error occured at resetPassword function', error);
      res.redirect("/pageNotFound")
   }
}

const userProfile = async (req, res) => {
   try {
      console.log('Session User:', req.session.user);
      const userId = req.session.user;
      const userData = await User.findById(userId);
      const addressData = await Address.findOne({ userId: userId });
      const orderData = await Order.find({userId:userId}).populate("items.productId")



      res.render("profile-page", {
         user: userData,
         addresses: addressData ? addressData.address : [], // Pass the array
         orders: orderData || [], 
      });

   } catch (error) {
      console.error("Error retrieving profile data:", error);
      res.redirect("/pageNotFound");
   }
};

const changePassword = async (req, res) => {
   try {
      const userId = req.query.id
      const { currPassword, password, confirmPassword } = req.body

      if (!currPassword || !password || !confirmPassword) {
         return res.status(400).json({ success: false, message: "All fields are required" });
      }

      if (password !== confirmPassword) {
         return res.status(400).json({ success: false, message: "Passwords do not match" });
      }

      const user = await User.findById(userId);
      console.log("user schema ", user)
      if (!user) {
         return res.status(404).json({ success: false, message: "User not found" });
      }

      const isMatch = await bcrypt.compare(currPassword, user.password);
      if (!isMatch) {
         return res.status(401).json({ success: false, message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      user.password = hashedPassword;
      await user.save();

      res.status(200).json({ success: true, message: "Password updated successfully" });

   } catch (error) {

      console.error("Error changing password:", error);
      res.status(500).json({ message: "Internal server error" });

   }
}

const getAddAddress = async (req, res) => {
   try {
      const user = req.session.user;
      res.render("user-address", { user: user })

   } catch (error) {
      res.redirect("/pageNotFound")
   }
}

const addAddress = async (req, res) => {
   try {
      const userId = req.session.user
      console.log("aqqqqqqqq", req.body)
      const userData = await User.findOne({ _id: userId });
      const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body
      const userAddress = await Address.findOne({ userId: userData._id });

      if (!userAddress) {
         const newAddress = new Address({
            userId: userData._id,
            address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }]
         })
         await newAddress.save();
      } else {
         userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone });
         await userAddress.save();
      }

      res.redirect("/userProfile");

   } catch (error) {
      console.error("Error adding address:", error);
      res.redirect("/pageNotFound");
   }
}

const getEditAddress = async (req, res) => {
   try {
      const addressId = req.query.id;
      const user = req.session.user;
      const currentAddress = await Address.findOne({
         "address._id": addressId,
      });

      if (!currentAddress) {
         return res.redirect('/pageNotFound');
      }

      const addressData = currentAddress.address.find((item) => {
         return item._id.toString() === addressId.toString();
      })

      if (!addressData) {
         return res.redirect('/pageNotFound')
      }

      res.render("edit-address", { address: addressData, user: user })

   } catch (error) {
      console.log("Error on getEditAddress function :", error);
      res.redirect("/pageNotFound")

   }
}

const editAddress = async (req, res) => {
   try {
      const data = req.body;
      const addressId = req.query.id
      const user = req.session.user;

      const findAddress = await Address.findOne({ "address._id": addressId })
      if (!findAddress) {
         res.redirect("/pageNotFound");
      }
      await Address.updateOne(
         { "address._id": addressId },
         {
            $set: {
               "address.$": {
                  _id: addressId,
                  addressType: data.addressType,
                  name: data.name,
                  city: data.city,
                  landMark: data.landMark,
                  state: data.state,
                  pincode: data.pincode,
                  phone: data.phone,
                  altPhone: data.altPhone
               }
            }
         }
      )

      res.redirect("/userProfile");
   } catch (error) {
      console.log("Error in editAddress function :", error);
      res.redirect("/pageNotFound")

   }
}

const deleteAddress = async (req, res) => {
   try {

      const addressId = req.query.id;
      const findAddress = await Address.findOne({ "address._id": addressId })
      if (!findAddress) {
         return res.status(404).send("address not found ")
      }

      await Address.updateOne(
         { "address._id": addressId },
         { $pull: { address: { _id: addressId } } }
      )

      res.redirect("/userProfile")

   } catch (error) {
      console.error("Error in deleteAddress function :", error);
      res.redirect("/pageNotFound")
   }

}

module.exports = {
   getForgotPassWordPage,
   forgotEmailVarifiation,
   getVerifyOTPPage,
   verifyOtp,
   getResetPassword,
   resendOtp,
   resetPassword,
   userProfile,
   changePassword,
   getAddAddress,
   addAddress,
   getEditAddress,
   editAddress,
   deleteAddress
}