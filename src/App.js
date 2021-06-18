import React from 'react';
import { BrowserRouter, Route, Switch } from "react-router-dom";
import CreateRoom from "./routes/CreateRoom";
import Room from "./routes/Room";

function App() {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/" exact component={Room} />
        <Route path="/create-room" component={CreateRoom} />
      </Switch>
    </BrowserRouter>
  );
}

export default App;
