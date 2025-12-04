import { useEffect, useState } from "react";
import { fetchLeaderboard } from "../firebase/firebaseConfig";
import { Card, CardContent } from "@mui/material";

export default function Leaderboard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const load = async () => {
      const data = await fetchLeaderboard();
      setRows(data);
    };
    load();
  }, []);

  return (
    <div
      style={{
        padding: "40px",
        minHeight: "100vh",
        background: "linear-gradient(145deg, #000014, #0a0024)",
        color: "white",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Card
        sx={{
          width: "600px",
          background: "#12001f",
          borderRadius: "18px",
          boxShadow: "0 0 25px #ff3ca6",
        }}
      >
        <CardContent>
          <h2
            style={{
              textAlign: "center",
              marginBottom: "25px",
              color: "#ff3ca6",
              fontSize: "32px",
            }}
          >
             POP MASTER LEADERBOARD 
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "50px 1fr 80px 80px",
              padding: "12px",
              background: "#220035",
              borderRadius: "12px",
              marginBottom: "12px",
              color: "#ff8bdc",
              fontWeight: "600",
            }}
          >
            <span>#</span>
            <span>Player</span>
            <span>Score</span>
            <span>Level</span>
          </div>
          {rows.map((item, index) => (
            <div
              key={item.uid}
              style={{
                display: "grid",
                gridTemplateColumns: "50px 1fr 80px 80px",
                padding: "10px 12px",
                background:
                  index % 2 === 0 ? "#1a002b" : "#26003d",
                borderRadius: "10px",
                marginBottom: "8px",
              }}
            >
              <span>{index + 1}</span>
              <span>{item.displayName}</span>
              <span>{item.score}</span>
              <span>{item.level}</span>
            </div>
          ))}

          {rows.length === 0 && (
            <p style={{ textAlign: "center", marginTop: "20px" }}>
              No scores yet!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
