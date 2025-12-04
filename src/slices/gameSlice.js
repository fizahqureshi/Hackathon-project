import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isPlaying: false,
  level: 1,
  score: 0,
  lives: 3,
  balloonsPopped: 0,
  balloonsCorrect: 0,      
  reactionTimes: [],         
  sessionId: null,
};

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    startLevel(state, action) {
      state.isPlaying = true;
      state.level = action.payload?.level ?? 1;
      state.score = 0;
      state.lives = 3;
      state.balloonsPopped = 0;
      state.balloonsCorrect = 0;
      state.reactionTimes = [];
      state.sessionId = action.payload?.sessionId ?? null;
    },
    popBalloon(state, action) {
      state.balloonsPopped += 1;
      state.score += action.payload.points ?? 10;
      if (action.payload.isTarget) {
        state.balloonsCorrect += 1;
      }
      if (action.payload.reactionTime != null) {
        state.reactionTimes.push(action.payload.reactionTime);
      }
    },
    missBalloon(state) {
      state.lives -= 1;
      if (state.lives <= 0) state.isPlaying = false;
    },
    endLevel(state) {
      state.isPlaying = false;
    },
    setLevel(state, action) {
      state.level = action.payload;
    },
  },
});

export const { startLevel, popBalloon, missBalloon, endLevel, setLevel } = gameSlice.actions;
export default gameSlice.reducer;
