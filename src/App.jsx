import { useState } from "react";
import "./index.css";

const FOODS = [
  { name: "Τοστ με τυρί", calories: 250 },
  { name: "2 αυγά", calories: 140 },
  { name: "Κοτόπουλο", calories: 300 },
  { name: "Ρύζι", calories: 200 },
  { name: "Μπανάνα", calories: 100 }
];

export default function App() {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState([]);

  const filtered = FOODS.filter((food) =>
    food.name.toLowerCase().includes(query.toLowerCase())
  );

  function addFood(food) {
    setEntries([...entries, food]);
  }

  const total = entries.reduce((sum, item) => sum + item.calories, 0);

  return (
    <div className="app">
      <div className="container">
        <h1>FuelTrack</h1>
        <p>Απλό tracker θερμίδων</p>

        <input
          placeholder="γράψε φαγητό"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div>
          {filtered.map((food, i) => (
            <div key={i} className="food-row">
              <span>
                {food.name} ({food.calories} kcal)
              </span>
              <button className="add-btn" onClick={() => addFood(food)}>
                +
              </button>
            </div>
          ))}
        </div>

        <h2>Σήμερα</h2>

        <div className="total-box">Σύνολο: {total} kcal</div>

        <div>
          {entries.map((item, i) => (
            <div key={i} className="entry">
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}