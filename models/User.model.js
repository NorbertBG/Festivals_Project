const { Schema, model } = require("mongoose");

// TODO: Please make sure you edit the User model to whatever makes sense in this case
const userSchema = new Schema(
  {
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
    },
    firstName: {
      type: String
    },
    lastName: {
      type: String
    },
    bio: {
      type: String
    },
    profileImage: {
      type: String,
    },
    festival: [{ type: Schema.Types.ObjectId, ref: "Festival" }]
  },
  {
    // this second object adds extra properties: `createdAt` and `updatedAt`
    timestamps: true,
  }
);

const User = model("User", userSchema);

module.exports = User;
