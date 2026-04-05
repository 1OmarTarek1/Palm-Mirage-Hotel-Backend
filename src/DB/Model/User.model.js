import mongoose, { Schema, model } from "mongoose";
import { generateDecryptHash, generateEncryptHash, generateHash } from "../../utils/security/hash.security.js";
export const genderTypes = { male: 'male', female: 'female' };
export const otpTypes = { confirmEmail: "confirmEmail", forgetPassword: "forgetPassword" };
export const roleTypes = { user: "user", admin: "admin" }
export const providerTypes = { system: "system", google: "google" }



export const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 30,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 15,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    
    
    provider: {
      type: String,
      enum: Object.values(providerTypes),
      default: providerTypes.system,
    },
    gender: {
      type: String,
      enum: Object.values(genderTypes),
      default: genderTypes.male,
    },
    DOB: Date,
    phoneNumber: String,
    image: String,
    role: {
      type: String,
      enum: Object.values(roleTypes),
      default: roleTypes.user,
    },
    isConfirmed: {
      type: Boolean,
      default: false,
    },
    cartItems: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    wishlistItems: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    deletedAt: Date,
    bannedAt: Date,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    changeCredentialTime: Date,
    OTP: [
      {
        code: { type: String },
        type: { type: String, enum: Object.values(otpTypes), default: otpTypes.confirmEmail },
        expiresIn: { type: Date },
        attempts: { type: Number, default: 0 },
      },
    ],
    
  },
  { timestamps: true }
);


userSchema.set('toJSON', { virtuals: true })
userSchema.set('toObject', { virtuals: true })


// hash password and mobileNumber
userSchema.pre("save", function (next) {
    if (this.isModified("password")) {
        this.password = generateHash({ plainText: this.password, salt: process.env.SALT });
    }
    if (this.isModified("mobileNumber") && this.mobileNumber) {
        this.mobileNumber = (generateEncryptHash({ message: this.mobileNumber })).toString();
    }
    next();
});


// hash password if updated 
userSchema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate();

    if (update.password) {
        update.password = generateHash({ plainText: update.password, salt: process.env.SALT });
    }

    next();
});

//Decrypt mobileNumber Hash
userSchema.post(["find", "findOne"], function (data) {
    if (!data) return;

    if (Array.isArray(data)) {
        data.forEach(doc => {
            if (doc.mobileNumber) {
                doc.mobileNumber = generateDecryptHash({ encryptedMessage: doc.mobileNumber });
            }
        });
    } else if (data.mobileNumber) {
        data.mobileNumber = generateDecryptHash({ encryptedMessage: data.mobileNumber });
    }
});




export const userModel = mongoose.models.User || model('User', userSchema);
