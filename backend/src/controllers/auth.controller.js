import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { signToken } from "../utils/generateToken.js";

// Used so a login for an unknown email takes as long as one for a real email.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

export async function register(req, res) {
  const { name, email, password } = req.body;

  if (await User.exists({ email })) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const user = await User.create({ name, email, password });
  res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;

  // password is hidden by default, so ask for it explicitly.
  const user = await User.findOne({ email }).select("+password");

  let valid = false;
  if (user) {
    valid = await user.comparePassword(password);
  } else {
    await bcrypt.compare(password, DUMMY_HASH);
  }

  // Same message either way, so attackers can't learn which emails are registered.
  if (!valid) throw new ApiError(401, "Invalid email or password");

  res.json({ token: signToken(user._id), user: publicUser(user) });
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
