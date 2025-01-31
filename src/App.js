import React from "react";
import Chatbot from "./Chatbot";
import coffee_background from "./assets/coffee-background3.jpg";

function App(){
  return(
    <div className="App" style={{ backgroundImage: `url(${coffee_background})`, backgroundSize: "cover", height: "100vh" }}>
      <h1>Smart Coffee Assistant</h1>
      <Chatbot/>
    </div>
  );
}

export default App;