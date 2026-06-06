import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

//generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
}
//register user
export const register = async (req, res) => {
    try{
        const { name, email, password } = req.body;
        if(!name || !email || !password){
            return res.status(400).json({success:false, message: "All fields are required" });
        }
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if(existingUser){
            return res.status(400).json({success:false, message: "User already exists" });
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
        // Create new user
        const user = await User.create({ name, email, password: hashedPassword });
        const token = generateToken(user._id);
        return res.status(201).json({success:true, token,user });
    }
    catch(error){
        console.error("register error", error.message);
        return res.status(500).json({success:false, message: "Internal server error" });
    }
}
//login user
export const login = async (req, res) => {
    try{
        const { email, password } = req.body;
        if( !email || !password){
            return res.status(400).json({success:false, message: "All fields are required" });
        }
        // find user
        const user = await User.findOne({ email });
        if(!user){
            return res.status(400).json({success:false, message: "Invalid credentials" });
        }
        //check password       
         const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(400).json({success:false, message: "Invalid credentials" });

        }
        const token = generateToken(user._id);
        return res.status(201).json({success:true, token,user });
    }
    catch(error){
        console.error("login error", error.message);
        return res.status(500).json({success:false, message: "Internal server error" });
    }
}

//get current user
export const getUser = async (req, res) => {
    try{
        const user = await User.findById(req.userId).select("-password"); //middleware auth sets req.userId
        if(!user){
            return res.status(404).json({success:false, message: "User not found" });
        }
        return res.json({success:true, user });
    }
    catch(error){
        console.error("get user error", error.message);
        return res.status(500).json({success:false, message: "Internal server error" });
    }
}


