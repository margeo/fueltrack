export default function QuickActionsModal({ onClose, onOpenFood, onOpenExercise, onOpenDay }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Quick actions</h3>

        <div className="stack-10">
          <button className="btn btn-light" onClick={onOpenFood}>
            🍔 Άνοιγμα Food
          </button>
          <button className="btn btn-light" onClick={onOpenExercise}>
            🏃 Άνοιγμα Exercise
          </button>
          <button className="btn btn-light" onClick={onOpenDay}>
            📊 Άνοιγμα Day
          </button>
          <button className="btn btn-dark" onClick={onClose}>
            Κλείσιμο
          </button>
        </div>
      </div>
    </div>
  );
}