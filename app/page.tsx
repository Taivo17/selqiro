"use client";
import { useState } from "react";

export default function Home() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const correctPassword = "selqiro123";

  if (!authorized) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Enter password</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10, marginTop: 10 }}
        />
        <br />
        <button
          onClick={() => {
            if (password === correctPassword) {
              setAuthorized(true);
            } else {
              alert("Wrong password");
            }
          }}
          style={{ marginTop: 10 }}
        >
          Enter
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Marketplace</h1>
      <p>Welcome to Selqiro 🚀</p>
    </div>
  );
}