import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{ type: String, required: true , trim: true},
    email:{ type: String, required: true , trim: true, unique: true,lowercase: true},
    password:{ type: String, required: true},
    plan:{ type: String, enum: ['free', 'premium'], default: 'free' },
    analysisCount:{ type: Number, default: 0 },
    lastAnalysisDate:{ type: Date, default: null },
    createdAt:{ type: Date, default: Date.now }
}, { timestamps: true });

const User= mongoose.model("User", userSchema);
export default User;