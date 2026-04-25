import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Explainer from "./components/Explainer";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Explainer />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
