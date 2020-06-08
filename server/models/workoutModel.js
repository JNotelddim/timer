import mongoose from "mongoose";

const workoutSchema = new mongoose.Schema({
  title: {
    type: String,
    unique: false,
    required: true,
  },
  content: {
    type: Object,
    required: false,
  },
});

const workout = mongoose.model("Workout", workoutSchema);
export default workout;
