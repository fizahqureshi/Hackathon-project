import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import gameReducer from "./slices/gameSlice";

export default configureStore({
  reducer: {
    auth: authReducer,
    game: gameReducer,
  },
});
