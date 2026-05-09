import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// REGISTER
export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "candidate",
      company = ""
    } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const normalizedRole = role === "recruiter" ? "recruiter" : "candidate";
    const normalizedCompany = String(company || "").trim();

    if (normalizedRole === "recruiter" && !normalizedCompany) {
      return res.status(400).json({ message: "Recruiters must provide a company name" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: normalizedRole,
      company: normalizedRole === "recruiter" ? normalizedCompany : ""
    });

    res.status(201).json({
      message: "User registered",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
