import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? ` - ${this.props.name}` : ""}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback" style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--text, #e5e5e5)",
        }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>😵</p>
          <h3 style={{ marginBottom: "0.5rem" }}>Κάτι πήγε στραβά</h3>
          <p style={{ fontSize: "0.9rem", opacity: 0.7, marginBottom: "1rem" }}>
            {this.props.name
              ? `Σφάλμα στο ${this.props.name}`
              : "Παρουσιάστηκε σφάλμα"}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: "0.5rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              background: "var(--accent, #3b82f6)",
              color: "#fff",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Δοκίμασε ξανά
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
